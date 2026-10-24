'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require.resolve('../app/card-motion.js'),'utf8');
const zones=['own-hand','own-table','opp-hand','opp-table','attack-cards','defend-cards'];
const box=(x,y,w=40,h=60)=>({x,y,w,h});
class Element{
 constructor(){this.children=[];this.dataset={};this.attributes=[];this.style={setProperty(){}};this.classes=new Set();this.classList={add:(...x)=>x.forEach(c=>this.classes.add(c)),remove:(...x)=>x.forEach(c=>this.classes.delete(c)),contains:c=>this.classes.has(c)};this.bounds=box(0,0,800,600);this.offsetWidth=800;this.offsetHeight=600;}
 setAttribute(k,v){this[k]=v;} removeAttribute(k){delete this[k];}
 append(el){el.parentElement=this;this.children.push(el);}
 remove(){if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(e=>e!==this);}
 querySelectorAll(){return this.children;} querySelector(){return null;}
 cloneNode(){const e=new Element();e.classList.add(...this.classes);return e;}
 getBoundingClientRect(){const r=this.className==='sz-card-flight-layer'?this.parentElement.bounds:this.bounds;return {x:r.x,y:r.y,width:r.w,height:r.h};}
}
function harness(){
 const body=new Element(),dialog=new Element(),board=new Element(),elements=Object.fromEntries(zones.map(z=>[z,new Element()]));
 let modal=true,enabled=true;dialog.bounds=box(200,40,720,540);board.closest=()=>modal?dialog:null;
 const stock=new Element(),discard=new Element();stock.bounds=box(500,300);discard.bounds=box(550,300);
 const animations=[],listeners={},document={body,hidden:false,documentElement:new Element(),getElementById:id=>id==='play-area'?board:elements[id],querySelector:q=>q.startsWith('#stock')?stock:discard,createElement:()=>new Element(),addEventListener:(t,f)=>{listeners[t]=f;}};
 const window={addEventListener(){},SZMotion:{enabled:()=>enabled,watchViewport(){},animate(el,frames,options){let resolve;const finished=new Promise(r=>{resolve=r;});const a={el,frames,options,finished,cancel:resolve,finish:resolve};animations.push(a);return a;}}};
 const ctx={window,document,getComputedStyle:()=>({getPropertyValue:()=>''}),setTimeout,clearTimeout};vm.createContext(ctx);
 vm.runInContext(source.replace('window.SZCardMotion={','window.testPlan=plan;window.SZCardMotion={'),ctx);
 const card=(key,x,y,back=false)=>{const n=new Element();n.bounds=box(x,y);if(key!==null)n.dataset.card=String(key);if(back)n.classList.add('back');return n;};
 const game={seed:1,game:1,round:1,phase:'attack',currentActor:()=>0};
 return {body,dialog,board,elements,animations,listeners,document,window,game,card,api:window.SZCardMotion,setModal:x=>modal=x,setEnabled:x=>enabled=x};
}
async function test(){
 const h=harness();h.elements['own-hand'].append(h.card(1,300,500));
 const before=h.api.capture(h.game);h.elements['own-hand'].children=[];h.elements['attack-cards'].append(h.card(1,400,300));
 const done=h.api.play(before,h.game),layer=h.dialog.children[0];
 assert(layer,'Replay flights must join the dialog top layer');assert.equal(h.body.children.length,0);
 const flight=h.animations.find(a=>a.el.className==='sz-card-flight');
 // An offset/scaled desktop modal uses local coordinates, not viewport coordinates.
 assert(flight.frames[0].transform.startsWith('translate(111.11111111111111px,511.1111111111111px)'));
 assert.equal(flight.el.style.width,(40/.9)+'px');
 assert(h.elements['attack-cards'].children[0].classList.contains('sz-motion-arrival'));
 h.listeners.scroll();await done;assert.equal(h.dialog.children.length,0);assert.equal(h.api.busy,false);assert(!h.elements['attack-cards'].children[0].classList.contains('sz-motion-arrival'));
 h.setModal(false);const doneLive=h.api.play(before,h.game);assert.equal(h.body.children.length,1);h.api.cancel();await doneLive;
 h.setEnabled(false);await h.api.play(before,h.game);assert.equal(h.body.children.length,0);assert.equal(h.api.lastRun.reason,'preference');
 h.setEnabled(true);h.document.hidden=true;await h.api.play(before,h.game);assert.equal(h.api.lastRun.reason,'hidden');h.document.hidden=false;

 // Public replay hand refills get one face-up flight, never an anonymous duplicate.
 const r=harness();r.elements['opp-hand'].append(r.card(2,300,100));const old=r.api.capture(r.game);
 r.elements['opp-hand'].append(r.card(3,350,100));const current=r.api.capture(r.game),plan=r.window.testPlan(old,current);
 assert.equal(plan.flights.length,1);assert.equal(plan.shifts.length,0);assert.equal(plan.backPicture,undefined);
 const refill=r.api.play(old,r.game);const ghost=r.dialog.children[0].children[0];assert(!ghost.children[0].classList.contains('back'));r.animations.forEach(a=>a.finish());await refill;assert.equal(r.api.lastRun.status,'finished');assert.equal(r.dialog.children.length,0);
 // Real play remains anonymous, including ghosts traveling into the rival hand.
 const live=harness();live.setModal(false);live.elements['opp-hand'].append(live.card(null,300,100,true));const oldLive=live.api.capture(live.game);
 live.elements['opp-hand'].append(live.card(null,350,100,true));const refillLive=live.api.play(oldLive,live.game);
 assert.equal(live.api.lastRun.flights.length,1);assert(live.body.children[0].children[0].children[0].classList.contains('back'));assert.equal(live.body.children[0].children[0].children[0].dataset.card,undefined);live.api.cancel();await refillLive;

 // Adapter and transport use actual event metadata and cancel before capture.
 const table=fs.readFileSync(require.resolve('../app/table.js'),'utf8');
 const events=[{game:1,round:2,kind:'choice',state:{phase:'refresh',pendingRefresh:{actor:1},active:[[],[]]}},{game:1,round:2,kind:'refresh',target:{exchange:'opponent'},state:{phase:'resolved'}},{game:2,round:1,kind:'deal',state:{phase:'attack',attacker:0}},{game:2,round:1,kind:'attack',state:{phase:'defend',attacker:0}}];
 const calls=[],ctx={ROLLOUT:{seed:123,events},cursor:0,mode:'replay',error:'',render:()=>calls.push('render'),window:{SZCardMotion:{cancel:()=>calls.push('cancel'),capture:state=>{calls.push('capture');return state;},hold:()=>calls.push('hold'),play:(before,after)=>calls.push({before,after})}}};
 vm.createContext(ctx);vm.runInContext(table.slice(table.indexOf('function replayStandIn(){'),table.indexOf('window.gkReplayGo=')),ctx);
 assert.equal(ctx.replayStandIn().currentActor(),1);ctx.replayGo(1);assert.deepEqual(calls.slice(0,4),['cancel','capture','hold','render']);assert.equal(calls[4].after.lastEvent.target.exchange,'opponent');
 calls.length=0;ctx.replayGo(3);assert.deepEqual(calls,['cancel','render']);assert.equal(ctx.replayStandIn().game,2);assert.equal(ctx.replayStandIn().round,1);assert.equal(ctx.replayStandIn().currentActor(),1);
 calls.length=0;ctx.replayGo(2);assert.deepEqual(calls,['cancel','render']);ctx.replayGo(3);assert.equal(calls[2],'cancel');assert.equal(calls.at(-1).before.currentActor(),0);
 console.log('Replay motion: dialog coordinates, cleanup, public/private hands, preferences and seek lifecycle passed.');
}
test().catch(e=>{console.error(e);process.exitCode=1;});
