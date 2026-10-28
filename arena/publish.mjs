// Trusted publication job: read JSON and validate it. Never import a policy here.
import fs from 'node:fs/promises';
import path from 'node:path';
import {context} from './reference.mjs';
import {mergeLeaderboard} from './leaderboard.mjs';
const args=process.argv.slice(2),arg=(key,fallback)=>{const i=args.indexOf(key);return i<0?fallback:args[i+1];};
const file=arg('--input',''),expectedCommit=arg('--commit',''),runUrl=arg('--run-url','');
if(!file||!/^([a-f0-9]{40}|local)$/.test(expectedCommit))throw Error('Expected report and evaluated commit');
if((await fs.stat(file)).size>12_000_000)throw Error('Oversized rating artifact');
const bundle=JSON.parse(await fs.readFile(file)),ctx=await context(),destination='arena/results/leaderboard.json';
let previous=null;try{previous=JSON.parse(await fs.readFile(destination));}catch(e){if(e.code!=='ENOENT')throw e;}
const storedResults=[];
for(const row of previous?.leaderboard||[]){
 if(row.reference||bundle.targets?.includes(row.id)||!ctx.manifests.has(row.id))continue;
 storedResults.push(JSON.parse(await fs.readFile(path.join('arena/results/reference-elo-v1',row.id+'.json'))));
}
const board=mergeLeaderboard(previous,bundle,ctx,{expectedCommit,runUrl,storedResults});
if(!bundle.targets.length){console.log('No ratings to publish');process.exit(0);}
await fs.mkdir('arena/results/reference-elo-v1',{recursive:true});
for(const entry of bundle.results){
 if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.id)||entry.id.length>80)throw Error('Invalid result path');
 await fs.writeFile(path.join('arena/results/reference-elo-v1',entry.id+'.json'),JSON.stringify({...entry,panelSha256:ctx.panelSha256,sourceCommit:expectedCommit,runUrl},null,2)+'\n');
}
await fs.writeFile(destination,JSON.stringify(board,null,2)+'\n');
console.log(`Updated ${bundle.targets.length} policies in ${destination}`);
