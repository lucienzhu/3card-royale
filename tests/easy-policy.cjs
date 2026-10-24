'use strict';
const assert=require('node:assert/strict');
const {Game,evaluate,outcome}=require('../sdk/index.js');
const easy=require('../sdk/easy-policy.js'),code=require('../sdk/policy.js');
const fixtures=require('./fixtures/nn-observations.json');
for(const f of fixtures){
 const o=f.observation,before=JSON.stringify(o),a=easy.chooseAction(o);
 assert(o.legal_actions.includes(a));assert.deepEqual(easy.chooseAction(o),a);
 assert.equal(JSON.stringify(o),before);
 assert.deepEqual(easy.chooseAction({...o,stock:[1,2,3],enemy_hand:[4,5,6],results:[{secret:42}]}),a,'No hidden information used');
 if(o.phase==='refresh')assert(a.type==='skip_swap'||a.target.zone==='deck');
}
const danger={...fixtures[0].observation,phase:'defend',player:1,attacker:0,wounds:[8,21,34,47],
 active:[{...evaluate([2,6,9],2),cards:[2,6,9]},null],
 legal_actions:[{type:'play',cards:[0,17,33]},{type:'play',cards:[1,14,27]}]};
assert.equal(easy.chooseAction(danger,undefined,1),danger.legal_actions[1],'Avoid immediate loss when a safe defense is available');
assert.throws(()=>easy.chooseAction({...danger,legal_actions:[]}));
assert.throws(()=>easy.chooseAction(danger,undefined,0));
let choices=0;
for(let seed=0;seed<20;seed++){
 const g=new Game(seed,seed%2);
 for(let steps=0;!['game_over','match_over'].includes(g.g.phase);steps++){
  assert(steps<1000,'Policy game must terminate');
  if(g.actor===null){g.step(g.legalActions()[0]);continue;}
  const o=g.observation(g.actor??0),a=g.actor===1?easy.chooseAction(o):code.chooseAction(o);
  if(g.actor===1){
   choices++;
   if(o.phase==='defend'){
    const damage=a=>Math.max(0,outcome(o.active[o.attacker],evaluate(a.cards,o.flower_level)).effective_delta);
    if(o.legal_actions.some(a=>damage(a)+o.wounds.length<5))assert(damage(a)+o.wounds.length<5);
   }
  }
  g.step(a);g.g.check();
 }
}
console.log(`Easy: deterministic public-only decisions, danger guard, legal swaps; ${choices} decisions across 20 complete JS games.`);
