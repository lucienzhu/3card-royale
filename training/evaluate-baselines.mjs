// Evaluate the two published neural approaches against every public Arena policy.
// Each pair runs in isolation so competing benchmark jobs do not distort latency.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {catalog} from '../policies/catalog.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
process.chdir(root);
const args=process.argv.slice(2),arg=(key,fallback)=>{
  const i=args.indexOf(key);return i<0?fallback:args[i+1];
};
const games=Number(arg('--games',1000)),seedStart=Number(arg('--seed-start',91000000));
assert(Number.isSafeInteger(games)&&games>0&&games%4===0,'--games must be a positive multiple of 4 (paired seats and first movers)');
assert(Number.isSafeInteger(seedStart)&&seedStart>=0&&seedStart+games/2<2**32,'--seed-start must fit the unsigned 32-bit seed range');
const out=path.resolve(arg('--output','docs/experiments/neural-baselines'));
const focal=['nn-256-v1','nn-structured-v2'];
const entries=(await catalog()).sort((a,b)=>a.manifest.id.localeCompare(b.manifest.id));
for(const id of focal)assert(entries.some(e=>e.manifest.id===id),'Missing focal policy '+id);
const pairs=[];
for(let i=0;i<entries.length;i++)for(let j=i+1;j<entries.length;j++){
  const ids=[entries[i].manifest.id,entries[j].manifest.id];
  if(ids.some(id=>focal.includes(id)))pairs.push(ids);
}
await fs.mkdir(out,{recursive:true});
const matches=[],started=Date.now();let sources;
for(const ids of pairs){
  const name=ids.join('--')+'.json',file=path.join(out,name);
  const run=spawnSync(process.execPath,['arena/evaluate.mjs','--games',String(games),
    '--seed-start',String(seedStart),'--policies',ids.join(','),'--output',file],
    {cwd:root,encoding:'utf8',maxBuffer:4*1024*1024});
  if(run.status!==0)throw Error(run.stderr||run.stdout||'Evaluation failed');
  const report=JSON.parse(await fs.readFile(file,'utf8'));
  assert.equal(report.records.length,games);
  assert.deepEqual(report.policies.map(p=>p.id),ids);
  if(sources)assert.deepEqual(report.sourceSha256,sources);
  else sources=report.sourceSha256;
  for(let i=0;i<games;i++){
    const r=report.records[i];
    assert.equal(r.status,'complete');assert(ids.includes(r.winner));
    assert.equal(r.seed,seedStart+Math.floor(i/2));
    assert.equal(r.leftSeat,i%2);assert.equal(r.first,Math.floor(i/2)%2);
    assert.match(r.finalStateSha256,/^[a-f0-9]{64}$/);
  }
  // Compact raw evidence retains every game, source hash and latency measurement.
  const raw=JSON.stringify(report)+'\n';await fs.writeFile(file,raw);
  const policies=ids.map(id=>{
    const timing=report.leaderboard.find(r=>r.id===id);
    const wins=report.records.filter(r=>r.winner===id).length;
    return {id,wins,losses:games-wins,games,winRate:wins/games,
      decisionP95Ms:timing.latencyP95Ms,decisions:timing.decisions};
  });
  matches.push({file:name,sha256:createHash('sha256').update(raw).digest('hex'),
    policies,runtime:report.runtime});
  console.log(`${ids.join(' / ')}: ${policies[0].wins}–${policies[1].wins} (${report.runtime.elapsedMs} ms)`);
}
const report={schema:1,createdAt:new Date().toISOString(),focalPolicies:focal,
  protocol:{rules:'1.0.0',episode:'game',information:'public',gamesPerPair:games,
    seedStart,seedCount:games/2,pairedSeats:true,balancedFirst:true,levels:[2,2],
    coverage:'Every pair containing either focal policy; mutual matchup counted once',
    latency:'Complete Worker decision; encoding and all inference calls included; model load excluded. Maximum opponent-batch p95 is not pooled p95. Not a mobile benchmark.',
    rating:'Independent evaluation; official reference Elo is calculated separately'},
  totalGames:matches.length*games,completed:matches.length*games,
  invalidActions:0,truncated:0,sourceSha256:sources,
  policies:entries.map(e=>e.manifest),
  models:focal.map(id=>({id,games:matches.filter(m=>m.policies.some(p=>p.id===id)).length*games,
    maxDecisionP95Ms:Math.max(...matches.flatMap(m=>m.policies.filter(p=>p.id===id).map(p=>p.decisionP95Ms))),
    decisions:matches.flatMap(m=>m.policies.filter(p=>p.id===id)).reduce((n,p)=>n+p.decisions,0)})),
  elapsedMs:Date.now()-started,matches};
await fs.writeFile(path.join(out,'summary.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({totalGames:report.totalGames,models:report.models},null,2));
