'use strict';
const assert=require('node:assert/strict'),F=require('../app/finale.js');
// The burst is the same for the same match and screen, and never sits under the winner's flower.
const a=F.burstLayout(390,844,195,420,78,42),b=F.burstLayout(390,844,195,420,78,42),c=F.burstLayout(390,844,195,420,78,43);
assert.deepEqual(a,b);assert.notDeepEqual(a.list.map(x=>x.x),c.list.map(x=>x.x));
assert(a.list.length>=60&&a.list.length<=260,'burst size '+a.list.length);
for(const x of a.list){assert(x.d>=78*.9);assert([0,1,2].includes(x.tone));assert(x.size>0&&x.tilt>=.74&&x.tilt<=1);assert(x.x>-a.spacing&&x.x<390+a.spacing&&x.y>-a.spacing&&x.y<844+a.spacing);}
const big=F.burstLayout(1280,800,640,300,60,7);assert(big.list.length<=260);
// The lasting canopy stays inside the artwork, clears the winner's flower, and survives the motion cutoff.
for(const [W,H,top,bottom,hy,len] of [[390,615,150,446,206,45],[390,844,155,674,317,78],[320,568,130,410,180,36],[1280,720,160,520,260,72]]){
 const burst=F.burstLayout(W,H,W/2,hy,len,42),canopy=F.canopyLayout(burst.list,W,top,bottom,W/2,hy,len);
 assert.deepEqual(canopy,F.canopyLayout(burst.list,W,top,bottom,W/2,hy,len));
 assert(canopy.length>=12&&canopy.length<=40);assert.equal(new Set(canopy.map(p=>p.index)).size,canopy.length);
 for(const kept of canopy){const p={...burst.list[kept.index],born:1500,canopySize:kept.size},at=F.canopyPose(p,12500);
  assert(p.d>len*1.28);assert(at.x>0&&at.x<W&&at.y>top&&at.y<bottom);assert(kept.size>0);
  assert.deepEqual(at,F.canopyPose(p,15000),'the final composition does not keep drifting');
 }
}
// Petals reach the existing city spots from every side; old reveal delays must not affect their flights.
for(const [W,H] of [[390,844],[320,568],[1280,800]]){
 const flowers=F.burstLayout(W,H,W/2,H*.36,Math.min(78,W*.2),42).list.map((p,i)=>({...p,wreath:false,fall:2200+(i*73)%450}));
 const slots=Array.from({length:78},(_,i)=>({x:W*(.1+.8*i/77),y:H*(.74+.05*Math.sin(i)),len:3,garden:String(Math.floor(i/20)),delay:i*50}));
 const before=JSON.stringify({flowers,slots}),routes=F.landingPlan(flowers,slots,42,H),again=F.landingPlan(flowers,slots,42,H);
 assert.deepEqual(routes,again);assert.equal(JSON.stringify({flowers,slots}),before);assert.equal(routes.length,slots.length);
 assert(routes.every(p=>p.source!==null));assert.equal(new Set(routes.map(p=>p.source+':'+p.petal)).size,slots.length);
 assert.equal(new Set([...routes].sort((a,b)=>a.at-b.at).slice(0,20).map(p=>p.slot.garden)).size,4,'early landings are spread across the city');
 const schedule=xs=>xs.map(p=>[p.source,p.petal,p.at,p.slot.x,p.slot.y]);
 assert.deepEqual(schedule(routes),schedule(F.landingPlan(flowers,slots.map(p=>({...p,delay:9000-p.delay})),42,H)));
 for(const p of routes){
  assert(p.at>p.leave);const from=F.landingPose(p,p.leave),to=F.landingPose(p,p.at);
  assert.equal(from.x,p.x);assert.equal(from.y,p.y);assert(Math.abs(to.x-p.slot.x)<1e-8);assert(Math.abs(to.y-p.slot.y)<1e-8);
  for(const f of [.1,.5,.9]){const q=F.landingPose(p,p.leave+(p.at-p.leave)*f);assert(Number.isFinite(q.x)&&Number.isFinite(q.y));}
 }
}
assert.deepEqual(F.landingPlan([],[],42,844),[]);
// You are red with gold hearts; the rival is gold with red hearts.
assert.equal(F.FLOWERS.own.tones[1],'#C5416B');assert.equal(F.FLOWERS.own.heart,'#F2CD5D');assert.equal(F.FLOWERS.rival.tones[1],'#D6A41C');assert.equal(F.FLOWERS.rival.heart,'#C5416B');
// The egret's wing keeps one shape from wings-up to wings-down, so every pose in between is a real wing.
const nums=d=>d.match(/-?\d+(?:\.\d+)?/g).length,cmds=d=>d.replace(/[^MCZ]/g,'');
for(const p of [0,.3,.5,.8,1]){const e=F.egretParts(p);assert.equal(cmds(e.wing),cmds(F.egretParts(0).wing));assert.equal(nums(e.wing),nums(F.egretParts(1).wing));assert.equal(cmds(e.far),cmds(e.wing));}
for(const ink of ['#10231B',null]){const svg=F.egretSVG(.4,10,20,1.5,ink);assert(!/var\(--|<script|<image|foreignObject/.test(svg));assert.equal(svg.includes('stroke-opacity=".5"'),!!ink);}
const r=F.rng(9),s=F.rng(9);for(let i=0;i<5;i++)assert.equal(r(),s());
// The finale uses the winning player's last public play, not their remaining hand or a wildcard substitution.
const GK=require('../gamecore.js');
for(const winner of [0,1])for(const count of [3,4,5]){
 const cards=[0,13,26,39,25].slice(0,count),snapshot={lastCombat:{moves:[{cards:[12,11,10]},{cards:[38,37,36]}]},active:[{cards:[3,4,5]},{cards:[6,7,8]}],players:[{hand:[9,10,11]},{hand:[12,13,14]}]};
 snapshot.lastCombat.moves[winner]={cards,wild:{physical:13,as:39}};
 const before=JSON.stringify(snapshot),picked=F.winningCards(snapshot,winner);
 assert.deepEqual(picked,cards.slice(0,3));picked[0]=51;assert.equal(JSON.stringify(snapshot),before);
}
assert.deepEqual(F.winningCards(null,0),[]);assert.deepEqual(F.winningCards({lastCombat:{moves:[{cards:[0,null,99]}]}},0),[0,null,null]);
assert.deepEqual(F.winningCards({lastCombat:{moves:[{cards:[0,1,2]}]}},2),[]);
// Both winners and restored matches retain the same final cards without altering the save.
const realWinners=new Set();
for(let seed=0;seed<10&&realWinners.size<2;seed++){
 const g=new GK.Game(seed,{version:'1.0.0',first:0});let n=0;
 while(g.phase!=='match_over'&&n++<15000){if(g.phase==='game_over')g.nextGame();else g.aiStep();}
 assert.equal(g.phase,'match_over');const winner=g.results.at(-1).winner,save=JSON.stringify(g.save()),snapshot=g.snapshot();
 assert.deepEqual(F.winningCards(snapshot,winner),snapshot.lastCombat.moves[winner].cards.slice(0,3));
 assert.deepEqual(F.winningCards(GK.Game.restore(g.save()).snapshot(),winner),F.winningCards(snapshot,winner));
 assert.equal(JSON.stringify(g.save()),save);realWinners.add(winner);
}
assert.equal(realWinners.size,2);
// Exercise the drawing path: actual ranks/suits first, then backs, then the bloom. Reduced motion stays still.
const vm=require('node:vm'),fs=require('node:fs');
function renderer(reduced=false){
 const text=[],positions=[],stack=[],ctx={globalAlpha:1,fillStyle:'',save(){stack.push([this.globalAlpha,this.fillStyle]);},restore(){[this.globalAlpha,this.fillStyle]=stack.pop();},fillText(value){text.push(value);},createRadialGradient(){return {addColorStop(){}};}};
 for(const name of ['translate','rotate','scale','fill','stroke','beginPath','lineTo','drawImage','clearRect','fillRect','setTransform'])ctx[name]=()=>{};
 ctx.translate=(x,y)=>{if(stack.length===1)positions.push([x,y]);};
 class Path{moveTo(){}lineTo(){}closePath(){}}
 let scheduled=0;const sandbox={console,Path2D:Path,performance:{now:()=>0},matchMedia:()=>({matches:reduced}),requestAnimationFrame:()=>++scheduled,cancelAnimationFrame(){},clearTimeout(){},getComputedStyle:el=>({opacity:el.baseOpacity??'1',getPropertyValue:()=>''}),document:{createElement:()=>({getContext:()=>ctx})}};
 sandbox.window=sandbox;vm.runInNewContext(fs.readFileSync(require.resolve('../app/finale.js'),'utf8'),sandbox);
 const canvas={getContext:()=>ctx,getBoundingClientRect:()=>({width:390,height:844,left:0,top:0})},sky={getBoundingClientRect:()=>({width:390,height:220,left:0,top:200,bottom:420})};
 const vineStem={style:{},getTotalLength:()=>567,getScreenCTM:()=>({a:.5,b:0})},vineMarks=[5,49.25,93.5].map((left,i)=>({baseOpacity:i===1?'.44':'1',style:{left:left+'%',removeProperty(name){delete this[name];}}}));
 const vine={querySelector:()=>vineStem,querySelectorAll:()=>vineMarks};
 const host={dataset:{},querySelector:s=>s==='.szf-canvas'?canvas:s==='.szf-sky'?sky:s==='.szf-vine'?vine:null,querySelectorAll:()=>[]};
 return {text,positions,host,vineStem,vineMarks,play:opts=>sandbox.SZFinale.play(host,opts),scheduled:()=>scheduled};
}
for(const winner of [0,1]){
 const draw=renderer(),controller=draw.play({winner,cards:[8,25,39],flowerLevel:14,seed:42});
 draw.text.length=0;controller.at(500);assert.deepEqual(draw.text,['10','♠','♠','A','♥','♥','★','2','♦','♦']);
 draw.text.length=0;controller.at(1090);assert.deepEqual(draw.text,[],'gold backs must no longer show ranks or suits');
 let previous;for(const time of [800,900,1000,1100]){draw.positions.length=0;controller.at(time);assert.equal(draw.positions.length,3);if(previous)for(let i=0;i<3;i++)assert.notDeepEqual(draw.positions[i],previous[i],'no stationary hold during the flip');previous=draw.positions.map(p=>[...p]);}
 assert.equal(draw.host.dataset.phase,'gather');controller.at(2000);assert.equal(draw.host.dataset.phase,'bloom');assert.equal(draw.host.dataset.caption,'hidden');
 controller.at(4100);assert.equal(draw.host.dataset.phase,'settled');assert.equal(draw.host.dataset.caption,'visible');controller.stop();
}
// The vine enters during the falling petals: its line and milestones arrive left to right, never all at once.
const timeline=renderer(),sweep=timeline.play({winner:0,cards:[8,25,39],seed:42});
assert.equal(Number(timeline.vineStem.style.strokeDashoffset),283.5);
assert(timeline.vineMarks.every(m=>Number(m.style.opacity)===0));
sweep.at(3400);
assert.equal(Number(timeline.vineStem.style.strokeDashoffset),283.5);
sweep.at(3900);
assert(Number(timeline.vineStem.style.strokeDashoffset)>0&&Number(timeline.vineStem.style.strokeDashoffset)<283.5);
assert.equal(Number(timeline.vineMarks[0].style.opacity),1);
assert.equal(Number(timeline.vineMarks[2].style.opacity),0);
sweep.at(4600);
assert(Number(timeline.vineMarks[1].style.opacity)>0);
assert.equal(Number(timeline.vineMarks[2].style.opacity),0);
sweep.skip();
assert.equal(Number(timeline.vineStem.style.strokeDashoffset),0);
assert.deepEqual(timeline.vineMarks.map(m=>Number(m.style.opacity)),[1,.44,1]);
const replaySweep=timeline.play({winner:0,cards:[8,25,39],seed:42});
assert(timeline.vineMarks.every(m=>Number(m.style.opacity)===0),'replay resets every milestone');assert.equal(timeline.host.dataset.caption,'hidden','replay hides the headline until the sky clears');
replaySweep.relayout();
assert.equal(Number(timeline.vineStem.style.strokeDashoffset),0);
assert.deepEqual(timeline.vineMarks.map(m=>Number(m.style.opacity)),[1,.44,1]);
replaySweep.stop();
const reduced=renderer(true),still=reduced.play({winner:0,cards:[8,25,39]});assert.equal(reduced.scheduled(),0);assert.equal(reduced.host.dataset.phase,'settled');assert.equal(reduced.host.dataset.caption,'visible');assert.equal(Number(reduced.vineStem.style.strokeDashoffset),0);assert.deepEqual(reduced.vineMarks.map(m=>Number(m.style.opacity)),[1,.44,1]);still.stop();
console.log(JSON.stringify({finale:'passed',burst_flowers:a.list.length,deterministic:true,egret_poses:5,identity_colours:true,winning_plays:[3,4,5],real_and_restored_winners:realWinners.size,face_flip_bloom:true,scattered_landings:78,landing_viewports:3,vine_sweep:true,reduced_motion:true}));
