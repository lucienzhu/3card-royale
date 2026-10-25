import {ID} from './contract.mjs';
import {readBytes,loadManifest} from './runtime.mjs';
const root=new URL('./',import.meta.url);
export async function catalog() {
  const registry=JSON.parse(new TextDecoder().decode(await readBytes(new URL('registry.json',root))));
  if(registry.version!==1||!Array.isArray(registry.policies))throw Error('Invalid policy registry');
  const seen=new Set();
  return Promise.all(registry.policies.map(async entry=>{
    if(!entry || typeof entry.id!=='string'||!ID.test(entry.id)||seen.has(entry.id)||entry.manifest!==`entries/${entry.id}/manifest.json`)throw Error('Invalid registry entry');
    seen.add(entry.id);
    const url=new URL(entry.manifest,root),manifest=await loadManifest(url);
    if(manifest.id!==entry.id)throw Error('Policy ID mismatch');
    return {manifest,url};
  }));
}
