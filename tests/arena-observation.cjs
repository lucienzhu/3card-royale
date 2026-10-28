'use strict';
// Keep the public diagram tied to the same recorded, encoder-verified example as the blog.
const assert=require('node:assert/strict');
const sample=require('../arena/observation-example.json');
const fixture=require('./fixtures/nn-observations.json')[sample.sample];
const o=fixture.observation, encoded=require('../sdk/features.js').encode(o,sample.episode);
assert.deepEqual(sample.state,Array.from(encoded.state));
assert.equal(sample.state.length,336);
sample.state.forEach((v,i)=>assert(Math.abs(v-fixture.state[i])<1e-7));
assert.equal(sample.phase,'refresh');assert.equal(sample.player,1);
assert.equal(sample.game,o.game);assert.equal(sample.round,o.round);
assert.equal(sample.candidateCount,encoded.count);
assert.equal(sample.state.slice(312,318).reduce((a,b)=>a+b,0),1);
assert.equal(sample.rawMeta.length,18);
assert.deepEqual(sample.rawMeta,[...o.levels,o.flower_level,o.wounds.length,o.enemy_wounds.length,o.enemy_hand_count,o.deck_count,o.discard.length,...o.a_losses,+(o.first===o.player),+(o.attacker===o.player),o.battle_index,o.pending.remaining,+(o.actor===o.player),o.round,o.game,+(sample.episode==='match')]);
/* Keep table inspection and all displayed action encodings tied to SDK output. */
const {last_combat,results,...visible}=o;
assert.deepEqual(sample.observation,visible);
assert.deepEqual(sample,require('../scripts/observation-example.cjs'));
assert.equal(sample.candidates.length,encoded.count);
sample.candidates.forEach((features,i)=>{
  assert.equal(features.length,72);
  assert.deepEqual(features,Array.from(encoded.candidates.slice(i*72,(i+1)*72)));
});
const counts={};
o.legal_actions.forEach((a,i)=>{
 const key=a.type!=='swap'?a.type:['deck','blind'].includes(a.target.zone)?a.target.zone:a.target.who===o.player?'own':'rival';
 counts[key]=(counts[key]||0)+1;
 const f=sample.candidates[i];
 if(a.type==='swap'){assert.equal(f[o[a.source.zone][a.source.index]],1);if(['deck','blind'].includes(a.target.zone))assert.deepEqual(f.slice(64,67),[0,0,0]);}
 if(a.type==='skip_swap'){assert.equal(f[54],1);assert.equal(f[59],1);}
 if(a.type==='stop_swaps'){assert.equal(f[54],1);assert.equal(f.reduce((a,b)=>a+b,0),1);}
});
assert.deepEqual(counts,{deck:9,blind:9,rival:18,own:36,skip_swap:1,stop_swaps:1});
console.log('Arena diagram: all 336 values, 18 raw fields and all 74 candidate encodings match the saved observation and current encoder.');
