'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const GK=require('../gamecore.js'),SDK=require('../sdk/index.js'),easy=require('../sdk/easy-policy.js');
const elements=new Map();
const element=id=>{if(!elements.has(id))elements.set(id,{value:'code',options:[],listeners:{},addEventListener(type,fn){this.listeners[type]=fn;}});return elements.get(id);};
const ctx={URL,Event,Date,Promise,setTimeout,clearTimeout,queueMicrotask,
 document:{currentScript:{src:'http://localhost/app/policy-ai.js'},documentElement:{lang:'en'},getElementById:element},
 localStorage:{getItem:()=> 'code',setItem(){}},ThreeCardRoyale:SDK,
 RoyaleCodePolicy:{chooseAction(){throw Error('Hard must not use the simplified SDK baseline');}},
 RoyaleEasyPolicy:{chooseAction(){throw Error('Hard must not fall back to Easy');}},
 Worker:class{constructor(){throw Error('Hard must not load a neural worker');}},
 MutationObserver:class{observe(){}},window:{GKLocale:{language:'en'},dispatchEvent(){}}};
vm.createContext(ctx);vm.runInContext(fs.readFileSync(require.resolve('../app/policy-ai.js'),'utf8'),ctx);
(async()=>{
 let decisions=0,swaps=0,blind=0;
 for(let seed=0;seed<100;seed++){
  const original=new GK.Game(seed,{version:'1.0.0',first:seed%2,record:false});
  const actual=GK.Game.restore(original.save());
  for(let steps=0;!['game_over','match_over'].includes(actual.phase);steps++){
   assert(steps<4096);
   if(actual.currentActor()===null){actual.aiStep();original.aiStep();continue;}
   const before=actual.save();
   // Merely inspecting/sampling a decision must not consume the deal RNG or reorder cards.
   const sdk=Object.create(SDK.Game.prototype);sdk.g=actual;
   easy.chooseAction(sdk.observation(actual.currentActor()));
   for(const value of ['easy','code']){element('policy-select').value=value;element('policy-select').listeners.change();}
   assert.deepEqual(actual.save(),before,'Changing difficulty and sampling preserve the complete game');
   const decision=await ctx.window.SZPolicy.decide(actual);
   assert.deepEqual(actual.save(),before,'Hard decision planning is read-only');
   assert.equal(decision.kind,'code');assert.equal(decision.version,'code-table-v1');
   if(actual.phase==='refresh'){swaps++;if(GK.chooseRefresh(actual.view(actual.currentActor())).exchange==='opponent')blind++;}
   ctx.window.SZPolicy.apply(actual,decision);original.aiStep();
   assert.deepEqual(actual.save(),original.save(),`Original table parity: seed ${seed}, step ${steps}`);
   decisions++;
  }
 }
 assert(swaps>0);assert(blind>0,'Original Code must still choose blind rival-hand swaps');console.log(`Hard Code: ${decisions} decisions (${swaps} swaps, ${blind} blind), 100 complete games exactly match the original table policy.`);
})().catch(e=>{console.error(e);process.exitCode=1;});
