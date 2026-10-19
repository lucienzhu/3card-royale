'use strict';
const assert=require('node:assert/strict'),GK=require('../gamecore.js');
function checkDeal(g){
 const rng=new GK.RNG(g.gameSeed),deck=Array.from({length:52},(_,i)=>i),hands=[[],[]];rng.shuffle(deck);
 for(let i=0;i<8;i++)for(const who of [g.first,1-g.first])hands[who].push(deck.pop());
 assert.deepEqual(g.players.map(p=>p.hand),hands,'The game seed must reconstruct the actual deal');assert.deepEqual(g.stock,deck);
}
let decisions=0,deals=0;
for(const version of ['0.3.8','1.0.0'])for(const seed of [0,42,4294967295]){
 const a=new GK.Game(seed,{version,first:0,record:false}),b=new GK.Game(seed,{version,first:0,record:false}),seen=[];
 for(let i=0;i<900&&a.phase!=='match_over'&&a.game<4;i++){
  if(!seen.some(x=>x.game===a.game)){checkDeal(a);seen.push({game:a.game,seed:a.gameSeed});deals++;}
  assert.equal(a.seed,seed);assert.deepEqual(a.save(),b.save());
  const c=GK.Game.restore(a.save());assert.equal(c.gameSeed,a.gameSeed);assert.equal(c.rng.state,a.rng.state);
  a.aiStep();b.aiStep();decisions++;
 }
 assert(seen.length>=2);assert.equal(new Set(seen.map(x=>x.seed)).size,seen.length,'Each played game starts at a distinct point in the match random stream');
}
const legacy=new GK.Game(42,{version:'0.3.8',first:0}).save();delete legacy.gameSeed;const restored=GK.Game.restore(legacy);assert.equal(restored.gameSeed,undefined);assert.equal(restored.seed,42);
console.log(`OK: match seeds, ${deals} distinct game deals, ${decisions} deterministic decisions, exact deal reconstruction and save restoration.`);
