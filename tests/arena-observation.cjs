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
console.log('Arena diagram: all 336 values, 18 raw fields and legal candidate count match the saved observation and current encoder.');
