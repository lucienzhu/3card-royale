// Static PR validation: never imports contestant JS or executes an ONNX graph.
import fs from 'node:fs/promises';
import {validateManifest} from '../policies/contract.mjs';
import {createHash} from 'node:crypto';
const root=new URL('../policies/',import.meta.url),registry=JSON.parse(await fs.readFile(new URL('registry.json',root)));
if(registry.version!==1||!Array.isArray(registry.policies))throw Error('Invalid registry');
const seen=new Set();
for(const entry of registry.policies){
 if(!entry||typeof entry.id!=='string'||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.id)||seen.has(entry.id)||entry.manifest!==`entries/${entry.id}/manifest.json`)throw Error('Bad registry path / duplicate');
 seen.add(entry.id);const url=new URL(entry.manifest,root),manifest=validateManifest(JSON.parse(await fs.readFile(url)));
 if(manifest.id!==entry.id)throw Error('ID mismatch');
 const b=await fs.readFile(new URL(manifest.artifact.file,url));
 if(b.length!==manifest.artifact.bytes||createHash('sha256').update(b).digest('hex')!==manifest.artifact.sha256)throw Error('Artifact hash / size mismatch');
 console.log(`${entry.id}: ${manifest.type}, ${b.length} bytes`);
}
