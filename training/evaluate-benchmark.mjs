// Complete the public benchmark using retained checkpoints and one seed protocol.
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {Worker} from 'node:worker_threads';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {catalog} from '../policies/catalog.mjs';
import {PolicyClient} from '../policies/client.mjs';
import {loadManifest} from '../policies/runtime.mjs';
import {validateIndex} from '../policies/contract.mjs';
import {sdk} from '../policies/dependencies.mjs';
import godlike from '../sdk/godlike-policy.js';

const root=fileURLToPath(new URL('../',import.meta.url));
process.chdir(root);
const args=process.argv.slice(2),arg=(key,fallback)=>{
  const i=args.indexOf(key);return i<0?fallback:args[i+1];
};
const games=Number(arg('--games',1000)),seedStart=Number(arg('--seed-start',91000000));
assert(Number.isSafeInteger(games)&&games>0&&games%4===0,'Use a positive multiple of four games');
assert(Number.isSafeInteger(seedStart)&&seedStart>=0&&seedStart+games/2<2**32,'Invalid seed range');
const out=path.resolve(arg('--output','docs/experiments/complete-baseline'));
const hash=b=>createHash('sha256').update(b).digest('hex');
const entries=await catalog();
for(const id of ['64','128','256x512']) {
  const url=new URL(`./evaluation-models/nn-${id}/manifest.json`,import.meta.url);
  entries.push({url,manifest:await loadManifest(url)});
}
const subjects=['random-v1','easy-v2','sdk-code-v1','nn-64','nn-128','nn-256-v1','nn-256x512','nn-512-v1','nn-structured-v2','godlike'];
const opponents=['code-table-v1','sdk-code-v1'];
const only=arg('--subjects','').split(',').filter(Boolean);
assert(only.every(id=>subjects.includes(id)),'Unknown subject');
const sourceFiles=['gamecore.js','sdk/index.js','sdk/features.js','sdk/actions.js','sdk/scoring.js','sdk/policy.js','sdk/easy-policy.js','sdk/godlike-policy.js','policies/contract.mjs','policies/runtime.mjs','policies/client.mjs','policies/dependencies.mjs','policies/catalog.mjs','training/benchmark-worker.mjs','training/evaluate-benchmark.mjs'];
const sourceSha256={};for(const file of sourceFiles)sourceSha256[file]=hash(await fs.readFile(file));
const protocol={rules:'1.0.0',episode:'game',gamesPerPair:games,seedStart,seedCount:games/2,pairedSeats:true,balancedFirst:true,levels:[2,2],maxDecisions:4096,decisionTimeoutMs:1000};
const runtime={node:process.version,platform:process.platform,arch:process.arch,cpu:os.cpus()[0].model,backend:'ONNX Runtime Web / single-thread WASM'};
const policies=entries.map(e=>({manifestPath:path.relative(root,fileURLToPath(e.url)),manifest:e.manifest}));
const matches=[],start=Date.now();
await fs.mkdir(out,{recursive:true});
for(const subject of subjects.filter(id=>!only.length||only.includes(id)))for(const opponent of opponents) {
  // A self match is not a strength measurement.
  if(subject===opponent)continue;
  const ids=[subject,opponent].sort(),pair=ids.join('/');
  const clients=new Map(),latencies=Object.fromEntries(ids.map(id=>[id,[]])),records=[];
  const began=Date.now();
  try {
    for(const id of ids) {
      const client=new PolicyClient({makeWorker:()=>new Worker(new URL('./benchmark-worker.mjs',import.meta.url),{resourceLimits:{maxOldGenerationSizeMb:256}})});
      clients.set(id,client);
      await client.load(id==='godlike'?'godlike':entries.find(e=>e.manifest.id===id).url.href);
    }
    for(let i=0;i<games;i++) {
      const seed=seedStart+Math.floor(i/2),leftSeat=i%2,first=Math.floor(i/2)%2;
      const g=new sdk.Game(seed,first),players=leftSeat===0?ids:[ids[1],ids[0]];
      for(let seat=0;seat<2;seat++)await clients.get(players[seat]).reset((0x9e3779b9 ^ Math.imul(i+1,2654435761) ^ seat)>>>0);
      let decisions=0;
      while(!['game_over','match_over'].includes(g.g.phase)) {
        if(++decisions>4096)throw Error('Truncated game');
        if(g.actor===null){g.step(g.legalActions()[0]);continue;}
        const id=players[g.actor],observation=g.observation(g.actor);
        // Only Godlike receives the explicitly allowlisted current rival hand.
        const result=await clients.get(id).request('act',{observation,...(id==='godlike'?{privileged:godlike.observe(g.g)}:{})});
        validateIndex(result.index,observation.legal_actions.length);
        latencies[id].push(result.elapsedMs);g.step(observation.legal_actions[result.index]);
      }
      records.push({seed,leftSeat,first,winner:players[g.g.results.at(-1).winner],status:'complete',decisions,finalStateSha256:hash(JSON.stringify(g.save()))});
      if((i+1)%250===0)console.log(`${pair}: ${i+1}/${games}`);
    }
  } finally {for(const client of clients.values())client.cancel();}
  const results=ids.map(id=>{
    const v=latencies[id].sort((a,b)=>a-b),wins=records.filter(r=>r.winner===id).length;
    return {id,games,wins,losses:games-wins,winRate:wins/games,decisions:v.length,
      decisionP95Ms:Number(v[Math.floor(v.length*.95)].toFixed(3))};
  });
  const report={schema:1,createdAt:new Date().toISOString(),subject,opponent,policies:ids,
    information:subject==='godlike'?'privileged-current-hand':'public',protocol,runtime,sourceSha256,
    elapsedMs:Date.now()-began,results,records};
  const file=ids.join('--')+'.json',raw=JSON.stringify(report)+'\n';
  await fs.writeFile(path.join(out,file),raw);
  matches.push({file,sha256:hash(raw),subject,opponent,information:report.information,results});
  console.log(`${pair}: ${results.map(r=>`${r.id} ${r.wins} wins, p95 ${r.decisionP95Ms} ms`).join('; ')}`);
}
const summary={schema:1,createdAt:new Date().toISOString(),protocol,runtime,sourceSha256,policies,
  subjects:subjects.filter(id=>!only.length||only.includes(id)),opponents,totalGames:matches.length*games,
  completed:matches.length*games,invalidActions:0,truncated:0,elapsedMs:Date.now()-start,
  latency:'Maximum opponent-batch p95 for complete Worker decisions; encoding and all inference included, initial loading and inter-thread messaging excluded. Not pooled p95; not a mobile benchmark.',
  models:subjects.filter(id=>matches.some(m=>m.subject===id)).map(id=>({id,
    maxDecisionP95Ms:Math.max(...matches.filter(m=>m.subject===id).flatMap(m=>m.results.filter(r=>r.id===id)).map(r=>r.decisionP95Ms))})),matches};
await fs.writeFile(path.join(out,'summary.json'),JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify({totalGames:summary.totalGames,elapsedMs:summary.elapsedMs,models:summary.models},null,2));
