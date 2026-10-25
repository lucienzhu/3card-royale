'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const GK=require('../gamecore.js'),SDK=require('../sdk/index.js'),policy=require('../sdk/godlike-policy.js');
const serialize=a=>JSON.stringify(a),valid=(o,a)=>assert(policy.legalActions(o).some(x=>serialize(x)===serialize(a)));
const g=new GK.Game(53,{version:'1.0.0',first:0,record:false}),before=g.save();
const allowed=new Set(['version','currentActor','players','phase','attacker','battleIndex','flowerLevel','active','pendingRefresh']);
const guarded=new Proxy(g,{get(target,key){assert(allowed.has(key),`Forbidden policy read: ${String(key)}`);return target[key];}});
const o=policy.observe(guarded),a=policy.chooseAction(o);valid(o,a);
assert.deepEqual(g.save(),before,'Search must not change the game or deal RNG');
assert.deepEqual(policy.chooseAction({...o,discard:[...Array(52).keys()],seed:123,stock:[1,2],events:[{}]}),a,'Unapproved fields cannot affect a decision');
assert(!('discard' in o)&&!('stock' in o)&&!('results' in o));
assert.deepEqual(Object.keys(o).sort(),['rules','player','phase','attacker','battle_index','flower_level','hand','wounds','enemy_hand','enemy_wounds','attack','swap_remaining'].sort());
assert.throws(()=>policy.observe({...g,version:'0.3.8'}),/Standard/);
const unseen=policy.unknownCards(o);
assert.equal(unseen.length,36);assert(unseen.includes(g.stock[0]));
assert.deepEqual(policy.unknownCards({...o,discard:unseen}),unseen,'All forgotten identities remain hypothetical draws');
assert.deepEqual(policy.chooseAction(policy.observe(guarded)),a,'No cross-decision memory');

const defense={rules:'1.0.0',player:0,phase:'defend',attacker:1,battle_index:0,flower_level:2,
 hand:[7,20,33,46,13,8,10,12],wounds:[0,1,2,3],enemy_hand:[6,9,11,15],enemy_wounds:[],
 attack:{cards:[4,17,30,43],...GK.evaluate([4,17,30,43],2,'1.0.0')},swap_remaining:0};
const defenseAction=policy.chooseAction(defense);valid(defense,defenseAction);
assert(GK.outcome(defense.attack,GK.evaluate(defenseAction.cards,2,'1.0.0'),'1.0.0').effectiveDelta<=0,'Never take avoidable lethal damage');
assert(policy.legalActions(defense).some(x=>x.cards.length===5),'Five-card flower bomb is searched');
assert(policy.legalActions(defense).some(x=>x.cards.length===4),'Four-card bombs are searched');
const attack={...defense,phase:'attack',attacker:0,attack:null,enemy_hand:[5,18,27,40],enemy_wounds:[16,29,42,48]};
const attackAction=policy.chooseAction(attack);valid(attack,attackAction);
for(const reply of GK.legalPlays([...attack.enemy_hand,...attack.enemy_wounds],2,'1.0.0')){
 assert(GK.outcome(GK.evaluate(attackAction.cards,2,'1.0.0'),GK.evaluate(reply,2,'1.0.0'),'1.0.0').effectiveDelta>=1,'Take a guaranteed current-combat win');
}
let handMatters=false;
for(let seed=0;seed<20&&!handMatters;seed++){
 const game=new GK.Game(seed,{version:'1.0.0',first:0,record:false}),view=policy.observe(game);
 const changed={...view,enemy_hand:game.stock.slice(0,8)};
 handMatters=serialize(policy.chooseAction(view))!==serialize(policy.chooseAction(changed));
}
assert(handMatters,'Current rival cards must inform the strategy');
let swaps=0,blind=0;
for(let seed=0;seed<16;seed++){
 const sdk=new SDK.Game(91000000+seed,seed%2),game=sdk.g;
 for(let steps=0;!['game_over','match_over'].includes(game.phase);steps++){
  assert(steps<4096);
  if(game.currentActor()!==seed%2){game.aiStep();continue;}
  const snapshot=sdk.save(),view=policy.observe(new Proxy(game,{get(target,key){assert(allowed.has(key),`Forbidden read in ${target.phase}: ${String(key)}`);return target[key];}}));
  const move=policy.chooseAction(view);valid(view,move);
  assert.deepEqual(sdk.save(),snapshot);
  assert.equal(serialize(sdk.legalActions()),serialize(policy.legalActions(view)),'Exact standard legal-action coverage');
  if(move.type==='swap'){swaps++;if(move.target.zone==='blind'){blind++;assert.equal(move.target.index,undefined);}}
  sdk.step(move);game.check();
 }
}
assert(swaps>0&&blind>0);
for(let level=2;level<=14;level++){
 const sdk=new SDK.Game(92000000+level,0);sdk.g.players[0].level=level;sdk.g.startGame(0);
 for(let step=0;!['game_over','match_over'].includes(sdk.g.phase);step++){
  assert(step<4096);
  if(sdk.actor===null)sdk.g.aiStep();
  else sdk.step(policy.chooseAction(policy.observe(sdk.g)));
  sdk.g.check();
 }
}
console.log(`Godlike: read boundary, forgotten-card hypotheses, lethal play/defense, bombs and ${swaps} legal swaps (${blind} blind) across 16 complete games.`);
console.log('Godlike: full legal self-play games at every flower rank, 2 through A.');

async function browserRouting(){
 let fail=false,resolvePending,hold=false,cancels=0,sent;
 const elements=new Map(),element=id=>{if(!elements.has(id))elements.set(id,{value:'godlike',options:[{value:'godlike'}],listeners:{},addEventListener(k,f){this.listeners[k]=f;}});return elements.get(id);};
 const ctx={URL,Event,Date,Promise,Error,setTimeout,clearTimeout,queueMicrotask,MutationObserver:class{observe(){}},
  document:{currentScript:{src:'http://localhost/app/policy-ai.js'},documentElement:{lang:'en'},getElementById:element},
  localStorage:{getItem:()=> 'godlike',setItem(){}},
  ThreeCardRoyale:{Game:function(){}},
  window:{GKLocale:{language:'en'},dispatchEvent(){},SZGodlikeAI:{cancel(){cancels++;},async decide(game){sent=policy.observe(game);if(hold)return new Promise(r=>resolvePending=r);if(fail)throw Error('Worker failed');return {action:policy.chooseAction(sent),version:policy.version};}}}};
 ctx.ThreeCardRoyale.Game.prototype.observation=()=>{throw Error('Godlike must not receive public discard/history');};
 vm.createContext(ctx);vm.runInContext(fs.readFileSync(require.resolve('../app/policy-ai.js'),'utf8'),ctx);
 assert.equal(ctx.window.SZPolicy.selected,'godlike');assert.match(element('policy-status').textContent,/Sees your hand/);
 assert.equal((await ctx.window.SZPolicy.decide(g)).kind,'godlike');assert.deepEqual(sent,o);
 fail=true;const fallback=await ctx.window.SZPolicy.decide(g);assert.equal(fallback.kind,'code');assert.equal(fallback.fallback,'godlike');
 assert.match(element('policy-status').textContent,/using Hard Code AI/);
 assert.equal((await ctx.window.SZPolicy.decide({...g,version:'0.3.8'})).kind,'legacy');
 fail=false;element('policy-select').listeners.change();hold=true;
 const delayed=ctx.window.SZPolicy.decide(g);
 element('policy-select').value='code';element('policy-select').listeners.change();
 resolvePending({action:a,version:policy.version});await delayed;
 assert.equal(ctx.window.SZPolicy.selected,'code');assert.equal(element('policy-status').hidden,true);assert(cancels>=2);
 console.log('Godlike: opt-in preference, explicit privilege notice, isolated route, visible Hard fallback, legacy rules and changed-selection lifecycle.');
}
browserRouting().catch(e=>{console.error(e);process.exitCode=1;});

async function workerBoundary(){
 let posted,worker,terminated=0;
 const ctx={URL,Promise,Error,Map,Set,JSON,setTimeout,clearTimeout,RoyaleGodlikePolicy:policy,
  document:{currentScript:{src:'http://localhost/app/godlike-ai.js'}},window:{},
  Worker:class{constructor(){worker=this;}postMessage(data){posted=data;}terminate(){terminated++;}}};
 vm.createContext(ctx);vm.runInContext(fs.readFileSync(require.resolve('../app/godlike-ai.js'),'utf8'),ctx);
 const request=ctx.window.SZGodlikeAI.decide(guarded);
 assert.deepEqual(posted.observation,o);assert.deepEqual(Object.keys(posted).sort(),['id','observation']);
 worker.onmessage({data:{id:posted.id,action:a,version:policy.version}});
 assert.equal((await request).version,policy.version);
 const invalid=ctx.window.SZGodlikeAI.decide(guarded);
 worker.onmessage({data:{id:posted.id,action:{type:'play',cards:[50,51,52]}}});
 await assert.rejects(invalid,/Illegal/);
 const canceled=ctx.window.SZGodlikeAI.decide(guarded),oldId=posted.id,oldWorker=worker;
 ctx.window.SZGodlikeAI.cancel();await assert.rejects(canceled,/canceled/);assert.equal(terminated,1);
 oldWorker.onmessage({data:{id:oldId,action:a}}); // A late result cannot resurrect a canceled request.
 const retry=ctx.window.SZGodlikeAI.decide(guarded);
 worker.onmessage({data:{id:posted.id,action:a,version:policy.version}});await retry;
 ctx.window.SZGodlikeAI.cancel();
 console.log('Godlike Worker: allowlisted payload only, illegal results rejected, canceled searches ignored, retry works.');
}
workerBoundary().catch(e=>{console.error(e);process.exitCode=1;});

const report=require('../docs/experiments/godlike-v1/evaluation.json');
assert.equal(report.records.length,report.games);assert.equal(report.records.filter(r=>r.won).length,report.wins);
assert.equal(report.win_rate,report.wins/report.games);assert.equal(report.policy,policy.version);
for(let i=0;i<report.games;i+=2){
 const [a,b]=report.records.slice(i,i+2);assert.equal(a.seed,b.seed);assert.equal(a.first,b.first);assert.equal(a.seat,0);assert.equal(b.seat,1);
}
for(const [file,hash] of Object.entries(report.sha256))assert.equal(require('node:crypto').createHash('sha256').update(fs.readFileSync(require('node:path').join(__dirname,'..',file))).digest('hex'),hash,`Stale Godlike evaluation: ${file}`);
