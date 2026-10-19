'use strict';
const assert=require('node:assert/strict'),GK=require('../gamecore.js'),B=require('../app/bloom.js');
let matches=0,states=0,resets=0,failed=0,won=[0,0];
for(const [version,seed] of [...[0,1,7,42,20261019,20261020,20261021,20261022].map(s=>['1.0.0',s]),... [0,42].map(s=>['0.3.8',s])]){
 const g=new GK.Game(seed,{version,first:0,record:true});let steps=0;
 while(g.phase!=='match_over'&&steps++<15000){if(g.phase==='game_over')g.nextGame();else g.aiStep();const m=B.project(g.results,g.snapshot(),0);assert.deepEqual(m.current.levels,g.players.map(p=>p.level));assert.deepEqual(m.current.losses,g.aLosses);if(!['game_over','match_over'].includes(g.phase))assert.equal(m.current.playing,g.levelOwner);states++;}
 assert.equal(g.phase,'match_over');matches++;won[g.results.at(-1).winner]++;const history=B.project(g.results,g.snapshot(),0);assert.equal(history.entries.length,g.results.length+1);assert(history.current.won);assert.equal(history.current.winner,g.results.at(-1).winner);for(const r of g.results){if(r.a_reset)resets++;if(r.ace_challenger!==null&&r.ace_challenger!==r.winner)failed++;}
 const saved=JSON.stringify(g.save());B.project(g.results,g.snapshot(),0);assert.equal(JSON.stringify(g.save()),saved);
}
const result=(game,winner,from,to,more={})=>({game,winner,from,to,damage:[0,5],gain:to-from,rounds:1,match_won:false,level_owner:winner,ace_challenger:null,aLosses:[0,0],a_reset:null,...more});
const ownA=[result(1,0,2,14),result(2,1,2,10,{level_owner:0,ace_challenger:0,aLosses:[1,0]}),result(3,0,14,14,{level_owner:1,aLosses:[1,0]})];
let h=B.project(ownA);assert(!h.current.won);assert.equal(h.current.playing,0);assert.equal(h.current.failures[0].length,1);assert.equal(h.entries[2].playing,1);assert.equal(h.entries[3].kind,'return');
const win=B.project([...ownA,result(4,0,14,14,{level_owner:0,ace_challenger:0,match_won:true,aLosses:[1,0]})]);assert(win.current.won);assert.equal(win.current.playing,null);
const reset=B.project([...ownA,result(4,1,10,12,{level_owner:0,ace_challenger:0,aLosses:[2,0]}),result(5,0,14,14,{level_owner:1,aLosses:[2,0]}),result(6,1,12,14,{level_owner:0,ace_challenger:0,a_reset:{who:0,from:14,to:2},aLosses:[0,0]})]);assert.deepEqual(reset.current.levels,[2,14]);assert.equal(reset.current.failures[0].length,0);assert.equal(reset.current.epochs[0],1);
assert.equal(B.pos(15)-B.pos(14),B.pos(3)-B.pos(2));

assert.equal(B.colorCity('<path fill="#D83B74"/><path fill="#DEB04A"/>',1),'<path fill="#DEB04A"/><path fill="#D83B74"/>');

const legacy=B.project([],{players:[{level:14},{level:14}],aLosses:[2,2],phase:'attack',levelOwner:1});assert.deepEqual(legacy.current.failures.map(x=>x.length),[2,2]);assert(legacy.current.failures.flat().every(x=>x.game===null));
console.log(JSON.stringify({status:'passed',matches,states,winners:won,real_ace_failures:failed,real_resets:resets,own_ace_nonowner_win_does_not_pass:true,third_loss_resets_epoch:true,does_not_mutate_game:true}));
