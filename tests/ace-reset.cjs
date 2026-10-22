'use strict';
const assert=require('node:assert/strict'),GK=require('../gamecore.js');
// Public play/nextGame/restore transitions; only card zones are arranged to make each requested winner deterministic.
function finishAs(g,winner,round){
 const loser=1-winner,attack=[0,13,26,39],defend=[1,4,8];
 const held=new Set([...attack,...defend]),pool=Array.from({length:52},(_,i)=>i).filter(c=>!held.has(c));
 g.players[winner].hand=[...attack,...pool.splice(0,4)];g.players[loser].hand=[...defend,...pool.splice(0,5)];
 g.players[winner].table=[];g.players[loser].table=pool.splice(0,4).map(card=>({card,up:true}));
 Object.assign(g,{stock:pool,discard:[],active:[null,null],lastCombat:null,round,first:g.levelOwner^((round-1)&1),attacker:winner,phase:'attack',roundUses:[0,0],roundCardsPlayed:[0,0],pendingRefresh:null,roundRefreshes:[0,0]});
 g.battleIndex=winner===g.first?0:1;g.check();
 g.play(winner,attack);g.play(loser,defend);g.check();
 const r=g.results.at(-1);assert.equal(r.winner,winner);assert.equal(r.from,14);assert.equal(r.to,14);
 assert.equal(g.events.at(-1).state.phase,g.phase);assert.deepEqual(g.events.at(-1).result,r);
 return r;
}
let cases=0;
for(const version of ['1.0.0','0.3.8'])for(const resetPlayer of [0,1])for(const round of [1,2,3,4])for(const restore of ['none','current','legacy-owner']){
 const rival=1-resetPlayer;let g=new GK.Game(42,{version,first:resetPlayer});
 g.players.forEach(p=>{p.level=14;});g.startGame(resetPlayer);
 const reload=()=>{if(restore==='none')return;const saved=g.save();if(restore==='legacy-owner')delete saved.levelOwner;g=GK.Game.restore(saved);};
 for(const [i,winner] of [rival,resetPlayer,rival,resetPlayer,rival].entries()){
  reload();const r=finishAs(g,winner,round);assert.equal(g.phase,'game_over');assert.equal(r.match_won,false);
  assert.equal(r.ace_challenger,1-winner);assert.equal(!!r.a_reset,i===4);
  if(i===4){assert.deepEqual(r.a_reset,{who:resetPlayer,from:14,to:2,failures:3});assert.equal(g.players[resetPlayer].level,2);assert.equal(g.players[rival].level,14);assert.equal(g.aLosses[resetPlayer],0);}
  reload();g.nextGame();assert.equal(g.levelOwner,winner);assert.equal(g.flowerLevel,14);
 }
 reload();const r=finishAs(g,rival,round);
 assert.equal(g.phase,'match_over');assert.equal(r.match_won,true);assert.equal(r.ace_challenger,rival);assert.equal(g.players[resetPlayer].level,2);
 reload();assert.equal(g.phase,'match_over');assert.throws(()=>g.nextGame());cases++;
}
console.log(JSON.stringify({ace_reset_followed_by_own_ace_win:'passed',cases,versions:['1.0.0','0.3.8'],both_players:true,odd_even_rounds:true,save_restore:true}));
