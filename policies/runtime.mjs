import {validateManifest, validateIndex, seededRandom, freeze} from './contract.mjs';
import {sdk, core, code, easy, features} from './dependencies.mjs';
const isNode = typeof process !== 'undefined' && !!process.versions?.node;
let ortPromise;
export async function readBytes(url) {
  if (isNode && url.protocol === 'file:') return new Uint8Array(await (await import('node:fs/promises')).readFile(url));
  const response = await fetch(url, {cache:'no-cache'});
  if (!response.ok) throw Error('Policy download failed: '+response.status);
  return new Uint8Array(await response.arrayBuffer());
}
export async function sha256(bytes) {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
}
export async function loadManifest(url) {
  return validateManifest(JSON.parse(new TextDecoder().decode(await readBytes(url))));
}
export async function loadPolicy(manifestURL) {
  const manifest = await loadManifest(manifestURL);
  const bytes = await readBytes(new URL(manifest.artifact.file, manifestURL));
  if (bytes.length !== manifest.artifact.bytes || await sha256(bytes) !== manifest.artifact.sha256) throw Error('Policy integrity check failed');
  let engine, dispose = () => {};
  if (manifest.type === 'javascript') {
    // Single-file modules: reviewed source is imported only after integrity verification.
    const url = isNode ? 'data:text/javascript;base64,'+Buffer.from(bytes).toString('base64') : URL.createObjectURL(new Blob([bytes],{type:'text/javascript'}));
    let module;
    try {module = await import(url);} finally {if (!isNode) URL.revokeObjectURL(url);}
    if (typeof module.createPolicy !== 'function') throw Error('Policy must export createPolicy');
    engine = module;
  } else {
    ortPromise ||= import('../vendor/onnxruntime/ort.wasm.min.mjs').then(ort => {
      ort.env.wasm.numThreads = 1;
      ort.env.wasm.wasmPaths = new URL('../vendor/onnxruntime/',import.meta.url).href;
      return ort;
    });
    const ort = await ortPromise;
    const session = await ort.InferenceSession.create(bytes,{executionProviders:['wasm']});
    if (session.inputNames.join(',') !== 'state,candidates' || session.outputNames.join(',') !== 'logits') {await session.release(); throw Error('Expected state / candidates → logits');}
    engine = {createPolicy:()=>({act:async observation=>{
      const f = features.encode(observation,'game');
      const out = await session.run({state:new ort.Tensor('float32',f.state,[1,336]), candidates:new ort.Tensor('float32',f.candidates,[1,f.count,72])});
      if (out.logits.dims.length !== 2 || out.logits.dims[0] !== 1 || out.logits.dims[1] !== f.count) throw Error('Invalid logits shape');
      return features.bestLegal(out.logits.data,f.count);
    }})};
    dispose = () => session.release();
  }
  let instance;
  function reset(seed) {
    instance = engine.createPolicy({sdk,core,code,easy,random:seededRandom(seed)});
    if (!instance || typeof instance.act !== 'function') throw Error('createPolicy must return {act}');
  }
  reset(1);
  return {manifest,reset,dispose,async act(observation) {
    if (observation.rules !== manifest.rules || !observation.legal_actions?.length) throw Error('Unsupported observation');
    // No engine, deck, rival hand, deal seed or RNG enters the plugin.
    const copy = freeze(structuredClone(observation));
    return validateIndex(await instance.act(copy),copy.legal_actions.length);
  }};
}
