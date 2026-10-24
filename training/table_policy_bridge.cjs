// Evaluate the actual browser policies on the unchanged browser engine.
'use strict';
const SDK=require('../sdk/index.js'),GK=require('../gamecore.js'),baseline=require('../sdk/policy.js'),crypto=require('node:crypto');
let sdk,player,left,right,trace,decisions,routes,steps;
function terminal(){return ['game_over','match_over'].includes(sdk.g.phase);}
function apply(name,action){
 const g=sdk.g;decisions[name]=(decisions[name]||0)+1;
 if(name==='table-code'){
  if(g.phase==='refresh'){
   const a=GK.chooseRefresh(g.view(g.currentActor()));
   routes[a.exchange==='opponent'?'blind':a.exchange==='deck'?'deck':'wounds']++;
  }
  g.aiStep();
 }else if(action)sdk.step(action);
 else sdk.step(baseline.chooseAction(sdk.observation(sdk.actor)));
 g.check();trace.update(JSON.stringify(sdk.save()));
}
function drive(){
 while(!terminal()){
  if(++steps>10000)throw Error('Internal step limit');
  if(sdk.actor===null){sdk.g.aiStep();continue;}
  if(sdk.actor===player)break;
  apply(right);
 }
 if(terminal())return {done:true,reward:sdk.g.results.at(-1).winner===player?1:-1,decisions,routes,trace:trace.digest('hex')};
 return {done:false,observation:sdk.observation(player)};
}
require('node:readline').createInterface({input:process.stdin}).on('line',line=>{
 try{
  const v=JSON.parse(line);
  if(v.op==='init'){
   sdk=new SDK.Game(v.seed,v.first);player=v.player;left=v.left;right=v.right;
   trace=crypto.createHash('sha256');decisions={};routes={deck:0,blind:0,wounds:0};steps=0;
  }else if(v.op==='step')apply(left,v.action);
  else throw Error('Unknown operation');
  console.log(JSON.stringify(drive()));
 }catch(e){console.log(JSON.stringify({error:e.message}));}
});
