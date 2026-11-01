'use strict';
// Verify the saved suite from individual outcomes, not the displayed summary alone.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const root=path.resolve(__dirname,'..'),dir='docs/experiments/neural-baselines/';
const bytes=p=>fs.readFileSync(path.join(root,p)),read=p=>JSON.parse(bytes(p));
const hash=b=>createHash('sha256').update(b).digest('hex');
const summary=read(dir+'summary.json'),{gamesPerPair,seedStart,seedCount}=summary.protocol;
assert.equal(gamesPerPair,1000);assert.equal(seedCount,gamesPerPair/2);
assert.equal(summary.protocol.pairedSeats,true);assert.equal(summary.protocol.balancedFirst,true);
assert.deepEqual(summary.protocol.levels,[2,2]);
const ids=summary.policies.map(p=>p.id),focal=summary.focalPolicies;
assert.deepEqual(focal,['nn-256-v1','nn-structured-v2']);
assert.equal(new Set(ids).size,ids.length);
const expected=[];
for(let i=0;i<ids.length;i++)for(let j=i+1;j<ids.length;j++)if(focal.includes(ids[i])||focal.includes(ids[j]))expected.push([ids[i],ids[j]].sort().join('/'));
assert.equal(summary.matches.length,expected.length);
for(const [file,digest] of Object.entries(summary.sourceSha256))assert.equal(hash(bytes(file)),digest,'Stale evaluation source: '+file);
for(const manifest of summary.policies){
 const base='policies/entries/'+manifest.id+'/';
 assert.deepEqual(manifest,read(base+'manifest.json'));
 assert.equal(hash(bytes(base+manifest.artifact.file)),manifest.artifact.sha256);
}
let total=0;
const seen=new Set();
for(const entry of summary.matches){
 const raw=bytes(dir+entry.file),report=JSON.parse(raw),pair=report.policies.map(p=>p.id),key=pair.join('/');
 assert.equal(hash(raw),entry.sha256,entry.file+' digest');
 assert(expected.includes(key)&&!seen.has(key),key+' coverage');seen.add(key);
 assert.deepEqual(report.policies,pair.map(id=>summary.policies.find(p=>p.id===id)));
 assert.deepEqual(report.sourceSha256,summary.sourceSha256);
 assert.deepEqual(report.runtime,entry.runtime);
 for(const k of ['rules','episode','information'])assert.equal(report[k],summary.protocol[k]);
 for(const k of ['gamesPerPair','seedStart','seedCount','pairedSeats','balancedFirst','levels'])assert.deepEqual(report.protocol[k],summary.protocol[k]);
 assert.equal(report.records.length,gamesPerPair);
 for(const [i,r] of report.records.entries()){
  assert.equal(r.pair,key);assert.equal(r.left,pair[0]);assert.equal(r.right,pair[1]);
  assert.equal(r.status,'complete');assert(pair.includes(r.winner));
  assert.equal(r.seed,seedStart+Math.floor(i/2));assert.equal(r.leftSeat,i%2);assert.equal(r.first,Math.floor(i/2)%2);
  assert(Number.isInteger(r.decisions)&&r.decisions>0&&r.decisions<=report.protocol.maxDecisions);
  assert.match(r.finalStateSha256,/^[a-f0-9]{64}$/);
 }
 assert.equal(entry.policies.length,2);
 for(const id of pair){
  const p=entry.policies.find(p=>p.id===id),timing=report.leaderboard.find(p=>p.id===id);
  const wins=report.records.filter(r=>r.winner===id).length;
  assert.deepEqual(p,{id,wins,losses:gamesPerPair-wins,games:gamesPerPair,winRate:wins/gamesPerPair,decisionP95Ms:timing.latencyP95Ms,decisions:timing.decisions});
  assert.equal(timing.wins,wins);assert.equal(timing.games,gamesPerPair);assert.equal(timing.losses,gamesPerPair-wins);
  assert(Number.isFinite(p.decisionP95Ms)&&p.decisionP95Ms>0);assert(Number.isInteger(p.decisions)&&p.decisions>0);
 }
 total+=report.records.length;
}
assert.equal(total,summary.totalGames);assert.equal(total,summary.completed);
assert.equal(summary.invalidActions,0);assert.equal(summary.truncated,0);
for(const id of focal){
 const rows=summary.matches.flatMap(m=>m.policies.filter(p=>p.id===id));
 assert.equal(rows.length,ids.length-1);
 assert.deepEqual(summary.models.find(m=>m.id===id),{id,games:rows.reduce((n,p)=>n+p.games,0),maxDecisionP95Ms:Math.max(...rows.map(p=>p.decisionP95Ms)),decisions:rows.reduce((n,p)=>n+p.decisions,0)});
}
console.log(`Neural evaluation: ${total.toLocaleString('en-US')} complete games, all opponents, paired seats, source/artifact/report hashes and latency summaries verified.`);
