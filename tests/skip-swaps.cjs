'use strict';
const assert=require('node:assert/strict'),GK=require('../gamecore.js'),SDK=require('../sdk');
function fixture(actor){for(let seed=0;seed<100;seed++){const g=new GK.Game(seed,{version:'1.0.0',first:0});for(let n=0;n<600&&g.phase!=='match_over';n++){if(g.phase==='refresh'&&g.currentActor()===actor&&g.pendingRefresh.remaining===2)return g.save();g.aiStep();}}throw Error('No two-opportunity fixture');}
const physical=g=>JSON.stringify({players:g.players,stock:g.stock,discard:g.discard,rng:g.rng.state,roundRefreshes:g.roundRefreshes});
for(const actor of [0,1]){
 const source=fixture(actor);
 for(const steps of [['skip','swap'],['swap','skip'],['skip','skip']]){
  let g=GK.Game.restore(source);
  for(let i=0;i<steps.length;i++){
   const prior=physical(g),count=g.lastCombat.refreshes.length;
   if(steps[i]==='skip'){g.skipRefresh();assert.equal(physical(g),prior);assert.equal(g.lastCombat.refreshes.length,count);assert.equal(g.events.findLast(e=>e.kind==='refresh_skip').remaining,1-i);}
   else g.refresh(g.refreshOptions()[0]);
   assert.equal(g.phase,i?'resolved':'refresh');assert.equal(g.pendingRefresh?.remaining??0,1-i);g.check();
   g=GK.Game.restore(JSON.parse(JSON.stringify(g.save())));
  }
  const finished=g.save();assert.throws(()=>g.skipRefresh());assert.deepEqual(g.save(),finished);
  g.advance();g.check();assert(['attack','defend'].includes(g.phase));
 }
 const sdk=new SDK.Game(1,0);sdk.g=GK.Game.restore(source);
 const before=sdk.save();assert(sdk.legalActions().some(a=>a.type==='skip_swap'));
 sdk.step({type:'skip_swap'});const once=sdk.save();assert.equal(once.pending.remaining,1);assert.equal(once.rng,before.rng);assert.deepEqual(once.players,before.players);assert.deepEqual(once.stock,before.stock);assert.deepEqual(once.discard,before.discard);
 const restored=SDK.Game.restore(once);restored.step({type:'skip_swap'});assert.equal(restored.save().phase,'resolved');assert(!restored.legalActions().some(a=>a.type==='skip_swap'));
}
console.log(JSON.stringify({skip_swaps:'passed',players:2,sequences:['skip→swap','swap→skip','skip→skip'],rng_unchanged:true,save_restore:true,no_draw_or_discard:true}));
module.exports={fixture};
