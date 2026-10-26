// CI diagnostics never publish or overwrite the official ladder.
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {estimateRatings,RATING_METHOD} from './rating.mjs';
const args=process.argv.slice(2),arg=(key,fallback)=>{const i=args.indexOf(key);return i<0?fallback:args[i+1];};
const mode=arg('--mode','smoke'),out=path.resolve(arg('--output','/tmp/arena-ci'));
const gamesPerPair=Number(arg('--games','40'));
if(!['smoke','rating','benchmark'].includes(mode))throw Error('Expected smoke, rating or benchmark');
if(mode==='rating'&&![20,40].includes(gamesPerPair))throw Error('Quick ratings use 20 or 40 games per pair');
await fs.mkdir(out,{recursive:true});
const start=performance.now(),reports=[];let passed=false;
function run(script,extra=[]){return new Promise((resolve,reject)=>{
 const child=spawn(process.execPath,[script,...extra],{stdio:'inherit'});
 child.on('error',reject);child.on('exit',(code,signal)=>code===0?resolve():reject(Error(`${script}: ${signal||code}`)));
});}
try{
 await run('arena/validate.mjs');
 await run('tests/arena/rating.mjs');
 if(mode==='rating'){
  const file=path.join(out,'raw-games.json');
  await run('arena/evaluate.mjs',['--games',String(gamesPerPair),'--output',file]);
  const raw=await fs.readFile(file),report=JSON.parse(raw);reports.push(report);
  const leaderboard=estimateRatings(report.records,report.policies.map(p=>p.id)).map(row=>{const timing=report.leaderboard.find(r=>r.id===row.id);return {...row,latencyP95Ms:timing.latencyP95Ms,decisions:timing.decisions};});
  const protocol={...report.protocol,ratingMethod:RATING_METHOD};
  for(const field of ['initialElo','k','anchor','ratingOrder','provisionalBelowGames'])delete protocol[field];
  const digest=data=>createHash('sha256').update(data).digest('hex');
  const rating={...report,protocol,leaderboard,publication:'provisional-review-required',officialRatingsUpdated:false,matchReportSha256:digest(raw),ratingSourceSha256:digest(await fs.readFile(new URL('./rating.mjs',import.meta.url)))};
  await fs.writeFile(path.join(out,'rating.json'),JSON.stringify(rating,null,2)+'\n');
  console.log(JSON.stringify({ratingMethod:RATING_METHOD,leaderboard},null,2));
 }else if(mode==='benchmark'){
  const file=path.join(out,'round-robin.json');
  await run('arena/evaluate.mjs',['--games','200','--output',file]);reports.push(JSON.parse(await fs.readFile(file)));
 }else{
  const registry=JSON.parse(await fs.readFile('policies/registry.json','utf8'));
  for(const entry of registry.policies){
   if(entry.id==='code-table-v1')continue;
   const file=path.join(out,entry.id+'.json');
   // Four games are the smallest balanced block: both seats and first movers.
   await run('arena/evaluate.mjs',['--games','4','--policies',`code-table-v1,${entry.id}`,'--output',file]);
   reports.push(JSON.parse(await fs.readFile(file)));
  }
 }
 passed=true;
}finally{
 const read=async file=>{try{return (await fs.readFile(file,'utf8')).trim();}catch{return null;}};
 const peak=await read('/sys/fs/cgroup/memory.peak');
 const summary={mode,status:passed?'passed':'failed',elapsedMs:Math.round(performance.now()-start),completedGames:reports.reduce((n,r)=>n+r.records.length,0),
  cpu:os.cpus()[0].model,node:process.version,platform:process.platform,arch:process.arch,
  cgroup:{cpuMax:await read('/sys/fs/cgroup/cpu.max'),memoryMax:await read('/sys/fs/cgroup/memory.max'),memoryPeakBytes:peak===null?null:Number(peak)},
  reportFiles:reports.length,officialRatingsUpdated:false};
 await fs.writeFile(path.join(out,'summary.json'),JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify(summary,null,2));
}
