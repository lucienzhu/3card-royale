import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {context,targetsFor,LIMITS,checkMatch,checkReceipt,fixedRating} from './reference.mjs';
import {runPair} from './run-pair.mjs';
const args=process.argv.slice(2),arg=(key,fallback)=>{const i=args.indexOf(key);return i<0?fallback:args[i+1];};
const out=path.resolve(arg('--output','/tmp/royale-reference')),ctx=await context();
const changedFile=arg('--changed',''),changed=changedFile?(await fs.readFile(changedFile,'utf8')).trim().split('\n').filter(Boolean):null;
const baseFile=arg('--base-manifests',''),baseManifests=baseFile?JSON.parse(await fs.readFile(baseFile)):null;
const targets=targetsFor(ctx,{baseManifests,explicit:arg('--policies',''),changed,limit:arg('--event','manual')==='manual'?LIMITS.batchTargets:LIMITS.prTargets});
await fs.mkdir(out,{recursive:true});await fs.rm(path.join(out,'result.json'),{force:true});const start=Date.now(),deadline=start+LIMITS.totalMs;let complete=0,passed=false;
try{
 const receipts=new Map(),smokes=new Map();
 // Gate the entire batch before spending any rating games.
 for(const id of targets){
  const receipt=JSON.parse(await fs.readFile(`policies/entries/${id}/validation.json`));
  const report=await runPair(id,'code-table-v1',{games:4,seedStart:ctx.panel.smokeSeedStart,file:path.join(out,id+'-smoke.json'),deadline});
  checkMatch(report,ctx,id,'code-table-v1',4,ctx.panel.smokeSeedStart);checkReceipt(receipt,ctx,id,report);receipts.set(id,receipt);smokes.set(id,report);complete+=4;
 }
 const results=[];
 if(args.includes('--rate'))for(const id of targets){
  const matches=[];
  for(const opponent of ctx.panel.opponents){
   const report=await runPair(id,opponent.id,{games:20,seedStart:ctx.panel.seedStart,file:path.join(out,`${id}--${opponent.id}.json`),deadline});
   checkMatch(report,ctx,id,opponent.id,20,ctx.panel.seedStart);complete+=20;matches.push({opponent:opponent.id,report});
  }
  results.push({id,manifest:ctx.manifests.get(id),receipt:receipts.get(id),smokeReport:smokes.get(id),matches,rating:fixedRating(ctx,id,matches)});
 }
 const bundle={schema:1,method:'reference-elo-v1',panelSha256:ctx.panelSha256,sourceCommit:arg('--commit','local'),createdAt:new Date().toISOString(),targets,rated:args.includes('--rate'),results};
 await fs.writeFile(path.join(out,'result.json'),JSON.stringify(bundle,null,2)+'\n');passed=true;
 console.log(JSON.stringify({targets,ratings:results.map(r=>r.rating)},null,2));
}finally{
 const read=async p=>{try{return(await fs.readFile(p,'utf8')).trim();}catch{return null;}};
 const peak=await read('/sys/fs/cgroup/memory.peak');
 const summary={status:passed?'passed':'failed',elapsedMs:Date.now()-start,completedGames:complete,targets,cpu:os.cpus()[0].model,node:process.version,platform:process.platform,memoryPeakBytes:peak===null?null:Number(peak),limits:LIMITS};
 await fs.writeFile(path.join(out,'summary.json'),JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify(summary,null,2));
}
