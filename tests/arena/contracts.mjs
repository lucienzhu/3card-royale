import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {Worker} from 'node:worker_threads';
import {catalog} from '../../policies/catalog.mjs';
import {validateManifest,validateIndex,seededRandom} from '../../policies/contract.mjs';
import {loadPolicy,sha256} from '../../policies/runtime.mjs';
import {PolicyClient} from '../../policies/client.mjs';
import {sdk,core,code} from '../../policies/dependencies.mjs';
import {ratings} from '../../arena/elo.mjs';
import testBrowser from './browser.cjs';
await testBrowser();
const root=new URL('../../',import.meta.url),entries=await catalog();
assert(!entries.some(e=>e.manifest.id.includes('godlike')));
const base=entries[0].manifest;
for(const update of [{id:undefined},{id:'../bad'},{rules:'0.3.3'},{information:'privileged'},{episode:'match'},{type:'python'},{license:{}},{memory:'forever'},{artifact:{...base.artifact,file:'../policy.mjs'}},{artifact:{...base.artifact,bytes:5000001}},{artifact:{...base.artifact,sha256:'wrong'}}])assert.throws(()=>validateManifest({...base,...update}));
for(const index of [-1,1.5,NaN,Infinity,'0',3])assert.throws(()=>validateIndex(index,3));
const a=seededRandom(19),b=seededRandom(19);for(let i=0;i<100;i++)assert.equal(a(),b());
const temp=await fs.mkdtemp(path.join(os.tmpdir(),'royale-arena-'));
try {
 // Hash validation happens before a modified module can execute.
 const artifact='throw Error("EXECUTED");';
 await fs.writeFile(path.join(temp,'policy.mjs'),artifact);
 await fs.writeFile(path.join(temp,'manifest.json'),JSON.stringify({...base,type:'javascript',artifact:{file:'policy.mjs',bytes:artifact.length,sha256:'0'.repeat(64)}}));
 await assert.rejects(loadPolicy(new URL('file://'+temp+'/manifest.json')),/integrity/);
 const phases=new Set();let parity=0;
 const plugins=await Promise.all(entries.map(e=>loadPolicy(e.url)));
 try {
  for(let seed=1;seed<=4;seed++){
   const game=new sdk.Game(seed,seed%2);for(const p of plugins)p.reset(seed);
   let steps=0;
   while(!['game_over','match_over'].includes(game.g.phase)){
    assert(++steps<4096);
    if(game.actor===null){game.step(game.legalActions()[0]);continue;}
    const o=game.observation(game.actor);phases.add(o.phase);const before=JSON.stringify(o);
    for(const key of ['seed','rng','stock','enemy_hand'])assert(!(key in o));
    const indices=await Promise.all(plugins.map(p=>p.act(o)));assert.equal(JSON.stringify(o),before);
    for(const index of indices)assert(o.legal_actions[index]);
    assert.deepEqual(o.legal_actions[indices[entries.findIndex(e=>e.manifest.id==='sdk-code-v1')]],code.chooseAction(o));
    // Original Hard heuristic must select the same card set / swap route from the public adapter.
    const choice=o.legal_actions[indices[entries.findIndex(e=>e.manifest.id==='code-table-v1')]];
    const view=game.g.view(game.actor);
    if(o.phase==='refresh'){
     const target=choice.target,actual={source:{zone:choice.source.zone==='wounds'?'table':'hand',index:choice.source.index},...(target.zone==='deck'?{exchange:'deck'}:target.zone==='blind'?{exchange:'opponent',who:1-o.player,zone:'hand',blind:true}:{exchange:'card',who:target.who,zone:target.zone==='wounds'?'table':'hand',index:target.index})};
     assert.deepEqual(actual,core.chooseRefresh(view));
    }else assert.deepEqual(choice.cards,[...core.choosePlay(view)].sort((a,b)=>a-b));
    parity++;game.step(code.chooseAction(o));
   }
  }
  assert.deepEqual([...phases].sort(),['attack','defend','refresh']);
  const random=plugins[entries.findIndex(e=>e.manifest.id==='random-v1')],o=new sdk.Game(15,0).observation(0);
  random.reset(81);const seq=await Promise.all(Array.from({length:12},()=>random.act(o)));random.reset(81);assert.deepEqual(await Promise.all(Array.from({length:12},()=>random.act(o))),seq);
 }finally{for(const p of plugins)await p.dispose();}
 console.log(`Arena: manifest / integrity, public observations, five JS/ONNX plugins, ${parity} Hard/SDK decisions, seeded reset.`);
 // Timeout, cancellation and an error from a dead worker must not affect a replacement.
 const workers=[];const client=new PolicyClient({decisionMs:20,makeWorker:()=>{const w={terminate(){this.dead=true;},postMessage(m){this.last=m;}};workers.push(w);return w;}});
 await assert.rejects(client.act({legal_actions:[{}]}),/timed out/);assert.equal(client.pending.size,0);assert(workers[0].dead);
 const canceled=client.reset(2);client.cancel();await assert.rejects(canceled,/canceled/);
 const next=client.reset(3);workers[1].onerror();const active=workers.at(-1);active.onmessage({data:{id:active.last.id,result:{ready:true}}});assert.deepEqual(await next,{ready:true});
 const illegal=client.act({legal_actions:[{}]});active.onmessage({data:{id:active.last.id,result:{index:2}}});await assert.rejects(illegal,/illegal/);client.cancel();
 const workerClient=new PolicyClient({makeWorker:()=>new Worker(new URL('../../policies/worker.mjs',import.meta.url))});
 try{await assert.rejects(workerClient.load('godlike'),/not in/);await workerClient.load('random-v1');await workerClient.reset(5);const o=new sdk.Game(3,0).observation(0);assert(o.legal_actions[(await workerClient.act(o)).index]);}finally{workerClient.cancel();}
 console.log('Arena: Worker timeout, cancellation, stale errors, illegal action and registry-only loading.');
 // Paired Elo is invariant to input / seat ordering and stays anchored.
 const rows=[0,1].map(leftSeat=>({pair:'code-table-v1/test-v1',left:'code-table-v1',right:'test-v1',seed:1,first:0,leftSeat,winner:leftSeat?'test-v1':'code-table-v1',status:'complete'}));
 const scores=ratings(rows,['code-table-v1','test-v1']);assert(scores.every(x=>x.elo===1500&&x.wins===1&&x.games===2));assert.deepEqual(scores,ratings([...rows].reverse(),['test-v1','code-table-v1']));
 assert.throws(()=>ratings(rows.slice(0,1),['code-table-v1','test-v1']));assert.throws(()=>ratings([{...rows[0],leftSeat:2},rows[1]],['code-table-v1','test-v1']));
 const report=JSON.parse(await fs.readFile(new URL('arena/results/season-1.json',root)));
 assert.equal(report.records.length,2000);assert(report.leaderboard.every(r=>r.games===800));
 const recalculated=ratings(report.records,report.policies.map(p=>p.id));for(const r of report.leaderboard){const x=recalculated.find(x=>x.id===r.id);for(const k of ['elo','games','wins','losses','provisional'])assert.equal(r[k],x[k]);}
 for(const [file,hash]of Object.entries(report.sourceSha256))assert.equal(await sha256(await fs.readFile(new URL(file,root))),hash,`Regenerate evaluation after changing ${file}`);
 for(const m of report.policies)assert.deepEqual(entries.find(e=>e.manifest.id===m.id)?.manifest,m);
 const output=path.join(temp,'smoke.json');execFileSync(process.execPath,['arena/evaluate.mjs','--games','4','--policies',report.policies.map(p=>p.id).join(','),'--output',output],{cwd:root,stdio:'pipe'});
 const smoke=JSON.parse(await fs.readFile(output));assert.equal(smoke.records.length,40);
 for(const r of smoke.records)assert.deepEqual(r,report.records.find(x=>x.pair===r.pair&&x.seed===r.seed&&x.leftSeat===r.leftSeat));
 console.log('Arena: paired Elo, source hashes, and all 40 replayed games match the published report.');
}finally{await fs.rm(temp,{recursive:true,force:true});}
