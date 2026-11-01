'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const SDK=require('../sdk/index.js'),S=require('../sdk/structured.js'),A=S.actions,code=require('../sdk/policy.js');
let states=0,prefixes=0;const phases=new Set(),lengths=new Set(),routes=new Set(),fixtures=[];
for(let seed=1;seed<=32;seed++){
 const old=new SDK.Game(seed,seed%2),game=new S.Game(seed,seed%2);
 for(let step=0;step<4096;step++){
  if(['game_over','match_over'].includes(old.g.phase))break;
  const o=old.observation(old.actor===null?0:old.actor);o.legal_actions=old.legalActions();
  const grammar=A.build(o),before=game.save();
  phases.add(o.phase);
  for(const row of grammar.rows){
   assert.deepEqual(grammar.resolve(row.tokens).legacy,row.legacy);
   assert.deepEqual(grammar.validate(row.action).legacy,row.legacy);
   for(let i=0;i<row.tokens.length;i++){
    const p=row.tokens.slice(0,i),q=grammar.next(p);assert(!q.complete);assert.equal(q.mask[row.tokens[i]],1);prefixes++;
    for(let t=0;t<A.VOCAB;t++)assert.equal(q.mask[t],+grammar.rows.some(r=>r.tokens.length>i&&p.every((x,j)=>r.tokens[j]===x)&&r.tokens[i]===t));
   }
   assert(grammar.next(row.tokens).complete);
   if(row.action.type==='play')lengths.add(row.action.cards.length);
   if(row.action.type==='swap')routes.add(row.action.target.zone);
  }
  assert.deepEqual(game.save(),before,'Prefix queries do not alter RNG/state');
  assert.throws(()=>game.stepTokens([A.T.PLAY_3,51,51,51]));assert.deepEqual(game.save(),before);
  const action=old.actor===null?o.legal_actions[0]:code.chooseAction(o);
  old.step(action);game.stepStructured(A.fromLegacy(o,action));assert.deepEqual(game.save(),old.save());states++;
  if(fixtures.length<8||o.phase==='refresh'&&fixtures.length<16)fixtures.push({observation:o,rows:grammar.rows.map(r=>({action:r.action,tokens:r.tokens})),state:Array.from(A.state(o))});
 }
 assert(['game_over','match_over'].includes(old.g.phase));
}
// Exhaustive 3/4/5 sizes with the wild card, including a non-bomb exclusion.
const o=new SDK.Game(9,0).observation(0);o.hand=[5,18,31,44,13,1,9,11];o.wounds=[];o.flower_level=2;
const GK=require('../gamecore.js');
o.legal_actions=GK.legalPlays(o.hand,2,'1.0.0').map(cards=>({type:'play',cards:[...cards].sort((a,b)=>a-b)}));
const grammar=A.build(o);for(const row of grammar.rows)lengths.add(row.action.cards.length);
assert.deepEqual([...lengths].sort(),[3,4,5]);
assert.equal(grammar.next([A.T.PLAY_5]).mask[5],1);
assert.throws(()=>grammar.resolve([A.T.PLAY_4,1,5,9,11]));
assert.throws(()=>grammar.resolve([A.T.PLAY_3,1,5,9,A.PAD,2]));
assert.throws(()=>grammar.validate({...grammar.rows[0].action,extra:true}));
assert.deepEqual([...routes].sort(),['blind','deck','own_hand','own_wounds','rival_wounds']);
fixtures.push({observation:o,rows:grammar.rows.map(r=>({action:r.action,tokens:r.tokens})),state:Array.from(A.state(o))});
if(process.argv.includes('--fixtures'))fs.writeFileSync('tests/fixtures/actions-v2.json',JSON.stringify(fixtures)+'\n');
console.log(JSON.stringify({states,prefixes,phases:[...phases],lengths:[...lengths],routes:[...routes]}));
