'use strict';
const assert=require('node:assert/strict'),SDK=require('../sdk/index.js'),V2=require('../sdk/structured.js'),code=require('../sdk/policy.js');
let matches=0,decisions=0,subgames=0;
for(let seed=120;seed<128;seed++){
 let old=new SDK.Game(seed,seed%2),game=new V2.Game(seed,seed%2);
 for(let i=0;i<100000;i++){
  if(old.g.phase==='match_over')break;
  const o=old.observation(old.actor??0);o.legal_actions=old.legalActions();
  const a=old.actor===null?o.legal_actions[0]:code.chooseAction(o);
  const row=game.grammar().validate(V2.actions.fromLegacy(o,a));
  if(a.type==='next_game')subgames++;
  game.stepTokens([...row.tokens,...Array(6-row.tokens.length).fill(V2.actions.PAD)]);old.step(a);
  assert.deepEqual(game.save(),old.save());decisions++;
  if(i%31===0){game=V2.Game.restore(game.save());old=SDK.Game.restore(old.save());}
 }
 assert.equal(game.g.phase,'match_over');assert(game.g.results.at(-1).match_won);matches++;
}
// A third failed Ace challenge resets the challenger. Rival's following own-Ace win must end the match.
function arrange(game,winner,round){
 const g=game.g,attack=[0,13,26,39],defend=[1,4,8],used=new Set([...attack,...defend]);
 const pool=Array.from({length:52},(_,i)=>i).filter(c=>!used.has(c));
 g.players[winner].hand=[...attack,...pool.splice(0,4)];g.players[1-winner].hand=[...defend,...pool.splice(0,5)];
 g.players[winner].table=[];g.players[1-winner].table=pool.splice(0,4).map(card=>({card,up:true}));
 Object.assign(g,{stock:pool,discard:[],active:[null,null],lastCombat:null,round,first:g.levelOwner^((round-1)&1),attacker:winner,phase:'attack',roundUses:[0,0],roundCardsPlayed:[0,0],pendingRefresh:null,roundRefreshes:[0,0]});
 g.battleIndex=winner===g.first?0:1;g.check();
 game.stepStructured({type:'play',cards:attack});game.stepTokens([52,...defend]);g.check();return g.results.at(-1);
}
let aceCases=0;
for(const player of [0,1])for(const round of [1,2,3,4]){
 let game=new V2.Game(42,player);game.g.players.forEach(p=>p.level=14);game.g.startGame(player);
 const rival=1-player;
 for(const [i,winner] of [rival,player,rival,player,rival].entries()){
  game=V2.Game.restore(game.save());const r=arrange(game,winner,round);assert(!r.match_won);
  if(i===4)assert.deepEqual(r.a_reset,{who:player,from:14,to:2,failures:3});
  game.stepTokens([V2.actions.T.NEXT_GAME]);
 }
 const r=arrange(game,rival,round);assert(r.match_won);assert.equal(game.g.phase,'match_over');
 assert.equal(V2.Game.restore(game.save()).g.phase,'match_over');assert.throws(()=>game.stepStructured({type:'next_game'}));aceCases++;
}
console.log(JSON.stringify({structured_full_matches:matches,completed_games:subgames+matches,decisions,ace_reset_sequences:aceCases,atomic_restore_parity:true}));
