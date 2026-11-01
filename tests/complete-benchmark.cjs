'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const root=path.resolve(__dirname,'..'),dir='docs/experiments/complete-baseline/';
const bytes=p=>fs.readFileSync(path.join(root,p)),read=p=>JSON.parse(bytes(p));
const hash=b=>createHash('sha256').update(b).digest('hex');
const summary=read(dir+'summary.json'),paired=read('docs/experiments/neural-baselines/summary.json');
const {gamesPerPair,seedStart,seedCount}=summary.protocol;
assert.equal(gamesPerPair,1000);assert.equal(seedCount,500);
assert.deepEqual(summary.protocol.levels,[2,2]);
assert.equal(summary.protocol.pairedSeats,true);assert.equal(summary.protocol.balancedFirst,true);
assert.equal(summary.subjects.length,10);assert.equal(summary.opponents.length,2);
const expected=summary.subjects.flatMap(id=>summary.opponents.filter(o=>o!==id).map(o=>id+'/'+o));
assert.equal(new Set(expected).size,19);assert.equal(summary.matches.length,19);
for(const [file,digest] of Object.entries(summary.sourceSha256))assert.equal(hash(bytes(file)),digest,'Stale source '+file);
for(const {manifestPath,manifest} of summary.policies){
 assert.deepEqual(read(manifestPath),manifest);
 const artifact=bytes(path.join(path.dirname(manifestPath),manifest.artifact.file));
 assert.equal(artifact.length,manifest.artifact.bytes);
 assert.equal(hash(artifact),manifest.artifact.sha256);
}
const seen=new Set();let total=0,overlap=0;
for(const entry of summary.matches){
 const key=entry.subject+'/'+entry.opponent;
 assert(expected.includes(key)&&!seen.has(key),key+' coverage');seen.add(key);
 const raw=bytes(dir+entry.file),report=JSON.parse(raw),ids=[entry.subject,entry.opponent].sort();
 assert.equal(hash(raw),entry.sha256);
 assert.deepEqual(report.protocol,summary.protocol);assert.deepEqual(report.runtime,summary.runtime);
 assert.deepEqual(report.sourceSha256,summary.sourceSha256);assert.deepEqual(report.policies,ids);
 assert.equal(entry.information,entry.subject==='godlike'?'privileged-current-hand':'public');
 assert.equal(report.information,entry.information);
 assert.equal(report.records.length,gamesPerPair);
 for(const [i,r] of report.records.entries()){
  assert.equal(r.status,'complete');assert(ids.includes(r.winner));
  assert.equal(r.seed,seedStart+Math.floor(i/2));assert.equal(r.leftSeat,i%2);assert.equal(r.first,Math.floor(i/2)%2);
  assert(Number.isInteger(r.decisions)&&r.decisions>0&&r.decisions<=summary.protocol.maxDecisions);
  assert.match(r.finalStateSha256,/^[a-f0-9]{64}$/);
 }
 assert.deepEqual(entry.results,report.results);
 for(const result of report.results){
  assert(ids.includes(result.id));
  const wins=report.records.filter(r=>r.winner===result.id).length;
  assert.equal(result.games,gamesPerPair);assert.equal(result.wins,wins);
  assert.equal(result.losses,gamesPerPair-wins);assert.equal(result.winRate,wins/gamesPerPair);
  assert(Number.isFinite(result.decisionP95Ms)&&result.decisionP95Ms>0);
  assert(Number.isInteger(result.decisions)&&result.decisions>0);
 }
 // Independent runners must reproduce every outcome and full final game state.
 const shared=paired.matches.find(m=>m.policies.map(p=>p.id).join('/')===ids.join('/'));
 if(shared){
  const other=read('docs/experiments/neural-baselines/'+shared.file);
  assert.deepEqual(report.records,other.records.map(({seed,leftSeat,first,winner,status,decisions,finalStateSha256})=>({seed,leftSeat,first,winner,status,decisions,finalStateSha256})),key+' parity');
  overlap+=gamesPerPair;
 }
 total+=gamesPerPair;
}
assert.equal(overlap,4000);assert.equal(total,19000);
assert.equal(summary.totalGames,total);assert.equal(summary.completed,total);
assert.equal(summary.invalidActions,0);assert.equal(summary.truncated,0);
for(const id of summary.subjects){
 const results=summary.matches.filter(m=>m.subject===id).map(m=>m.results.find(r=>r.id===id));
 assert.deepEqual(summary.models.find(m=>m.id===id),{id,maxDecisionP95Ms:Math.max(...results.map(r=>r.decisionP95Ms))});
}
const ladder=read('arena/results/leaderboard.json');
assert(!JSON.stringify(ladder).includes('"godlike"'),'Privileged policy must stay outside public Elo');
console.log('Complete benchmark: 19,000 games, all 19 pairs, model/source hashes, latency and 4,000 identical cross-runner games verified.');
