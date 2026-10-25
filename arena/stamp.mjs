import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {ID,validateManifest} from '../policies/contract.mjs';
const id=process.argv[2];if(!ID.test(id||''))throw Error('Usage: node arena/stamp.mjs <policy-id>');
const url=new URL(`../policies/entries/${id}/manifest.json`,import.meta.url),m=JSON.parse(await fs.readFile(url));
if(!/^[a-zA-Z0-9][a-zA-Z0-9._-]*\.(mjs|onnx)$/.test(m.artifact?.file))throw Error('Invalid artifact path');
const b=await fs.readFile(new URL(m.artifact.file,url));m.artifact.bytes=b.length;m.artifact.sha256=createHash('sha256').update(b).digest('hex');
validateManifest(m);await fs.writeFile(url,JSON.stringify(m,null,2)+'\n');console.log(m.artifact);
