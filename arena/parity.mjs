import fs from 'node:fs/promises';
import {Worker} from 'node:worker_threads';
import {PolicyClient} from '../policies/client.mjs';
const args=process.argv.slice(2),arg=name=>args[args.indexOf(name)+1];
if(!args.includes('--policy')||!args.includes('--fixtures'))throw Error('Use --policy ID --fixtures reference.json');
const corpus=JSON.parse(await fs.readFile(arg('--fixtures')));if(!corpus.cases?.length)throw Error('Empty reference');
const client=new PolicyClient({makeWorker:()=>new Worker(new URL('../policies/worker.mjs',import.meta.url))});
try {
 await client.load(arg('--policy'));
 for(const [i,c]of corpus.cases.entries()){
  if(!Number.isInteger(c.expectedIndex))throw Error('Original policy expectedIndex required at '+i);
  await client.reset(1);const r=await client.act(c.observation);
  if(r.index!==c.expectedIndex)throw Error(`Case ${i}: expected ${c.expectedIndex}, got ${r.index}`);
 }
 console.log(`${corpus.cases.length} original / JavaScript decisions match`);
}finally{client.cancel();}
