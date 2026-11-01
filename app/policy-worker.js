/* Receives only the SDK's public observation, never a saved/full game. */
'use strict';
importScripts('../gamecore.js', '../sdk/index.js', '../sdk/actions.js');
let sessionPromise;
async function load() {
  if (!sessionPromise) sessionPromise = (async () => {
    const ort = await import('../vendor/onnxruntime/ort.wasm.min.mjs');
    ort.env.wasm.numThreads = 1;
    ort.env.wasm.wasmPaths = new URL('../vendor/onnxruntime/', self.location.href).href;
    const manifestURL = new URL('../models/structured-policy/manifest.json', self.location.href);
    const response = await fetch(manifestURL, {cache:'no-cache'});
    if (!response.ok) throw Error('Model manifest unavailable');
    const manifest = await response.json();
    if (manifest.rules !== '1.0.0' || manifest.features !== 'structured-v2' || manifest.actions !== RoyaleActions.VERSION) throw Error('Model version mismatch');
    const file = await fetch(new URL(manifest.file, manifestURL));
    if (!file.ok) throw Error('Model download failed');
    const bytes = await file.arrayBuffer();
    const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), b => b.toString(16).padStart(2,'0')).join('');
    if (hash !== manifest.sha256 || bytes.byteLength >= 5000000) throw Error('Model integrity check failed');
    const session = await ort.InferenceSession.create(bytes, {executionProviders:['wasm']});
    return {ort, session, manifest};
  })().catch(error => {sessionPromise = null; throw error;});
  return sessionPromise;
}
self.onmessage = async ({data}) => {
  const {id, observation} = data;
  try {
    const {ort, session, manifest} = await load();
    if (!observation) { self.postMessage({id, ready:true, version:manifest.version}); return; }
    const started = performance.now();
    let inferenceMs=0;
    const row = await RoyaleActions.decode(observation,async (state,prefix)=>{
      const before=performance.now();
      const out=await session.run({state:new ort.Tensor('float32',state,[1,336]),prefix:new ort.Tensor('float32',prefix,[1,396])});
      inferenceMs+=performance.now()-before;
      if(out.logits.dims.join(',')!=='1,65')throw Error('Invalid token logits');
      return out.logits.data;
    });
    self.postMessage({id,index:row.index,version:manifest.version,encodeMs:performance.now()-started-inferenceMs,inferenceMs});
  } catch (error) { self.postMessage({id, error:error.message}); }
};
