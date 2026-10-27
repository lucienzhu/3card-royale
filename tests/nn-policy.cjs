'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),fixtures=require('./fixtures/nn-observations.json');
const features=require('../sdk/features.js'),policy=require('../sdk/policy.js');
let values=0;
for(const f of fixtures){
 const encoded=features.encode(f.observation);
 const close=(a,b)=>{assert.equal(a.length,b.length);for(let i=0;i<a.length;i++){assert(Math.abs(a[i]-b[i])<1e-6,`${i}: ${a[i]} != ${b[i]}`);values++;}};
 close(encoded.state,f.state);close(encoded.candidates,f.candidates.flat());
 assert.deepEqual(policy.chooseAction(f.observation),f.observation.legal_actions[f.label]);
 const dirty={...f.observation,results:[{private:'ignored'}],last_combat:{ignored:true}};
 close(features.encode(dirty).state,encoded.state);
}
assert.equal(features.bestLegal([1,3,100],2),1);
assert.throws(()=>features.bestLegal([NaN],1));
assert.throws(()=>features.bestLegal([],0));
console.log(`NN: ${fixtures.length} Python/JS feature + teacher parity cases; ${values} values; legal selection + non-finite rejection.`);
const manifestPath=path.join(root,'models/nn-policy/manifest.json');
if(fs.existsSync(manifestPath)){
 const m=JSON.parse(fs.readFileSync(manifestPath)),bytes=fs.readFileSync(path.join(path.dirname(manifestPath),m.file));
 assert(bytes.length<5000000);assert.equal(require('node:crypto').createHash('sha256').update(bytes).digest('hex'),m.sha256);
 assert.equal(m.features,features.version);assert.equal(m.rules,'1.0.0');
 console.log(`NN: model checksum and 5 MB budget passed (${bytes.length} bytes).`);
}

// A completed worker result must never play into a replacement game or a paused drawer.
async function testLifecycle(){
 const vm=require('node:vm'),source=fs.readFileSync(path.join(root,'app/table.js'),'utf8');
 const fragment=source.slice(source.indexOf('function driveAI(){'),source.indexOf('function renderReplayControls(){'));
 let callback,resolve,applied=0;
 const game={phase:'attack',currentActor:()=>1};
 const ctx={turnFlow:{stop(){}},game,mode:'play',busy:false,aiSerial:0,aiTimer:null,motionSerial:0,error:'',
  window:{SZCardMotion:{busy:false,cancel(){}},SZPolicy:{decide:()=>new Promise(r=>{resolve=r;}),apply:()=>{applied++;}}},
  $:()=>({open:false}),render(){},tryAction:fn=>fn(),setTimeout:fn=>{callback=fn;return 1;},clearTimeout(){}};
 vm.createContext(ctx);vm.runInContext(fragment,ctx);
 ctx.driveAI();const first=callback();ctx.stopAI();resolve({kind:'code'});await first;assert.equal(applied,0);
 ctx.driveAI();const second=callback();ctx.game={...game};resolve({kind:'nn'});await second;assert.equal(applied,0);
 ctx.busy=false;ctx.driveAI();const third=callback();resolve({kind:'nn'});await third;
 assert.equal(applied,1);assert.equal(ctx.busy,false);
 console.log('NN: canceled and stale inference discarded; active result applied once.');
}
testLifecycle().catch(e=>{console.error(e);process.exitCode=1;});

async function testPolicyFailureAndLocale(){
 const vm=require('node:vm');
 let requests=0,fail=true,mutated,paints=0;
 const elements=new Map();
 function element(id){
  if(!elements.has(id))elements.set(id,{value:'easy',hidden:false,listeners:{},options:[{value:'easy'},{value:'nn'},{value:'code'}],
   addEventListener(name,fn){this.listeners[name]=fn;},
   set textContent(value){this.text=value;paints++;}, get textContent(){return this.text;}});
  return elements.get(id);
 }
 const document={currentScript:{src:'http://localhost/app/policy-ai.js'},documentElement:{lang:'zh-CN'},getElementById:element};
 const action={type:'play',cards:[0,1,2]},o={legal_actions:[action]};
 const game={version:'1.0.0',currentActor:()=>1};
 function Game(){}
 Game.prototype.observation=()=>o;Game.prototype.step=()=>{};
 const ctx={URL,Event,Error,Date,Promise,setTimeout,clearTimeout,queueMicrotask,document,
  localStorage:{getItem:()=>null,setItem(){}},ThreeCardRoyale:{Game},RoyaleCodePolicy:{chooseAction:()=>action},RoyaleEasyPolicy:{chooseAction:()=>action,version:'easy-v2'},
  window:{GKLocale:{language:'zh-CN'},gkGame:game,dispatchEvent(){}},
  MutationObserver:class{constructor(fn){mutated=fn;}observe(){}},
  Worker:class{postMessage(data){requests++;queueMicrotask(()=>this.onmessage({data:fail?{id:data.id,error:'offline'}:{id:data.id,index:0,version:'test'}}));}terminate(){}}};
 vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(root,'app/policy-ai.js'),'utf8'),ctx);
 assert.equal(ctx.window.SZPolicy.selected,'easy');assert.equal((await ctx.window.SZPolicy.decide(game)).kind,'easy');assert.equal(requests,0);
 const initial=paints;mutated();assert.equal(paints,initial,'Repeated lang attribute must not repaint recursively');
 document.documentElement.lang='en';ctx.window.GKLocale.language='en';mutated();assert.equal(element('policy-label').text,'AI opponent');
 assert.deepEqual(element('policy-select').options.map(o=>o.textContent),['Easy · Easy AI','Medium · NN AI','Hard · Code AI']);
 element('policy-select').value='nn';element('policy-select').listeners.change();await new Promise(setImmediate);
 assert.equal(requests,1);assert.equal((await ctx.window.SZPolicy.decide(game)).kind,'easy');assert.equal(requests,1,'Offline requests should back off');
 assert.match(element('policy-status').text,/using Easy AI/);
 assert.equal(ctx.window.SZPolicy.diagnostics.state,'failed');
 fail=false;element('policy-select').listeners.change();await new Promise(setImmediate);
 assert.equal((await ctx.window.SZPolicy.decide(game)).kind,'nn');assert.equal(ctx.window.SZPolicy.diagnostics.state,'ready');
 assert.equal((await ctx.window.SZPolicy.decide({...game,version:'0.3.3'})).kind,'legacy');
 element('policy-select').value='code';element('policy-select').listeners.change();
 const beforeHard=requests;assert.equal((await ctx.window.SZPolicy.decide(game)).kind,'code');assert.equal(requests,beforeHard);assert.equal(element('policy-status').hidden,true);
 for(const stored of ['code','nn','easy','invalid',null]){
  const restored={...ctx,localStorage:{getItem:()=>stored,setItem(){}},window:{...ctx.window},setTimeout:()=>0};
  vm.createContext(restored);vm.runInContext(fs.readFileSync(path.join(root,'app/policy-ai.js'),'utf8'),restored);
  assert.equal(restored.window.SZPolicy.selected,['code','nn','easy'].includes(stored)?stored:'easy');
 }
 console.log('NN: failed load falls back with backoff, manual retry recovers, legacy rules retained, locale repaint loop prevented.');
}
testPolicyFailureAndLocale().catch(e=>{console.error(e);process.exitCode=1;});
