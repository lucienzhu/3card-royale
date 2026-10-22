/* MIT. The match finale: the winner's three cards fold into one bougainvillea, it bursts into a spiral of flowers,
   and their petals drift into corners of the Shenzhen skyline, opening its own flowers as they arrive.
   Presentation only: reads public results, never writes game state. The skyline art itself is unchanged. */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else root.SZFinale=api;})(typeof window==='undefined'?globalThis:window,function(root){
'use strict';
const TAU=Math.PI*2,GOLDEN=Math.PI*(3-Math.sqrt(5));
// One bract of the brand flower: base at the origin, tip 24 units up (the logo's bract, recentred).
const BRACT='M0 0L-2.5981 -1.5C-7.2 -4 -9.9 -8 -8.1 -13C-6.3 -17 -2.7 -20 0 -24C2.7 -20 6.3 -17 8.1 -13C9.9 -8 7.2 -4 2.5981 -1.5L0 0Z';
const HEART_Y=-5.5,HEART_R=1.32;
// The winner's flower: you are red with gold hearts, the rival is gold with red hearts.
const FLOWERS={own:{tones:['#962C4F','#C5416B','#E38BA6'],heart:'#F2CD5D',glow:'197,65,107'},rival:{tones:['#A17C35','#D6A41C','#E4C46A'],heart:'#C5416B',glow:'214,164,28'}};
const CARD={face:'#FFFEFA',edge:'#CBD9D0',ink:'#10231B',red:'#C5416B',back:'#ECCE80',backEdge:'#A17C35',heart:'#F2CD5D'};
const validCard=id=>Number.isInteger(id)&&id>=0&&id<52;
// Read the public, physical cards in played order. A wildcard stays the actual card, not its scored substitute.
function winningCards(snapshot,winner){
 if(winner!==0&&winner!==1)return [];
 const cards=snapshot?.lastCombat?.moves?.[winner]?.cards;
 return Array.isArray(cards)?cards.slice(0,3).map(id=>validCard(id)?id:null):[];
}
const clamp=(v,a,b)=>v<a?a:v>b?b:v,lerp=(a,b,t)=>a+(b-a)*t,smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
const ease={out:t=>1-Math.pow(1-t,3),inOut:t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2,sine:t=>-(Math.cos(Math.PI*t)-1)/2,back:t=>{const c=1.70158,d=c+1;return 1+d*Math.pow(t-1,3)+c*Math.pow(t-1,2);},in:t=>t*t*t};
function rng(seed){let a=(seed>>>0)||1;return()=>{a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function mix(a,b,t){const p=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)),x=p(a),y=p(b);return 'rgb('+x.map((v,i)=>Math.round(lerp(v,y[i],t))).join(',')+')';}

/* ---------- geometry shared by the screen and the PNG ---------- */
// A spiral of flowers around (hx,hy): golden-angle placement, the wave reaching the corners last.
function burstLayout(W,H,hx,hy,heroLength,seed,density=1){
 const r=rng(seed^0x51ED27),R=Math.hypot(Math.max(hx,W-hx),Math.max(hy,H-hy)),n=Math.round(clamp(W*H/1450,90,260)*density),c=R/Math.sqrt(n),a0=r()*TAU,out=[];
 for(let i=0;i<n;i++){
  const d=c*Math.sqrt(i+.5);if(d<heroLength*.9)continue;
  const a=i*GOLDEN+a0,x=hx+d*Math.cos(a),y=hy+d*Math.sin(a);if(x<-c||x>W+c||y<-c||y>H+c)continue;
  const k=d/R,u=r();out.push({x,y,d,a,k,size:c*.5*(.86+.28*r())*(.92+.22*k),rot:a+Math.PI/2+(r()-.5)*.5,tilt:.74+.26*r(),tone:u<.2?0:u<.75?1:2,spin:(r()-.5)*2.4,drift:(r()-.5)});
 }
 return {list:out,R,spacing:c};
}
// Keep a loose, full canopy from the original burst, with room for the headline and the hero flower.
// Flowers near the city become smaller, letting the buildings show through.
// The same retained flowers appear in motion, the reduced-motion still, and after a resize.
function canopyLayout(flowers,W,top,bottom,hx,hy,len){
 const half=Math.min(W*.47,470),candidates=flowers.map((p,index)=>({...p,index})).filter(p=>Math.abs(p.x-hx)<half-p.size*.5&&p.y-p.size*.65>top&&p.y+p.size*.65<bottom&&p.d>len*1.28);
 const target=Math.round(clamp(half*2*Math.max(0,bottom-top)/6000,22,40)),chosen=[];
 while(candidates.length&&chosen.length<target){
  let best=0,score=-1;
  for(let i=0;i<candidates.length;i++){const p=candidates[i],space=Math.min(Math.hypot(p.x-hx,p.y-hy)-len,...chosen.map(q=>Math.hypot(p.x-q.x,p.y-q.y)));if(space>score){score=space;best=i;}}
  chosen.push(candidates.splice(best,1)[0]);
 }
 return chosen.map(p=>({index:p.index,size:p.size*clamp(1.45-p.d/Math.max(W,bottom-top)*.7,.9,1.3)*(.72+.28*(.5+.5*Math.sin(p.a*2.3+p.k*11)))*lerp(1,.42,smooth(bottom-(bottom-top)*.28,bottom,p.y))}));
}
function canopyPose(p,time){
 const settle=smooth(2100,6800,time),breeze=Math.sin((time-p.born)/1050+p.a)*2*(1-settle)*smooth(1800,2800,time);
 return {x:p.x-5*settle+breeze,y:p.y+3*settle,rot:p.rot+.08*settle,size:lerp(p.size,p.canopySize||p.size,settle)};
}
function petalOrigin(p,index){
 const a=index*TAU/3,dx=Math.sin(a)*p.size*.5,dy=-Math.cos(a)*p.size*.5*p.tilt;
 return {x:p.x+dx*Math.cos(p.rot)-dy*Math.sin(p.rot),y:p.y+dx*Math.sin(p.rot)+dy*Math.cos(p.rot)};
}
// Assign individual airborne petals to nearby city corners. Arrival follows flight distance and wind,
// never the SVG's left-to-right reveal delays. This is deterministic for a given match and viewport.
function landingPlan(flowers,slots,seed,H){
 const r=rng(seed^0x7A31C5),pool=[];
 flowers.forEach((p,source)=>{if(p.wreath)return;for(let petal=0;petal<3;petal++){
  pool.push({source,petal,...petalOrigin(p,petal)});
 }});
 const targets=[...slots];for(let i=targets.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[targets[i],targets[j]]=[targets[j],targets[i]];}
 const wind=-22-r()*20;
 return targets.map(slot=>{
  let best=-1,score=Infinity;
  for(let i=0;i<pool.length;i++){const q=pool[i],dy=slot.y-q.y;if(dy<8)continue;const cost=Math.abs(slot.x-q.x)+dy*.24+r()*22;if(cost<score){score=cost;best=i;}}
  // Tiny viewports can run short of petals above a slot; use the closest remaining petal before fading in.
  if(best<0)for(let i=0;i<pool.length;i++){const q=pool[i],cost=Math.hypot(slot.x-q.x,slot.y-q.y);if(cost<score){score=cost;best=i;}}
  if(best<0)return {slot,source:null,at:4000+r()*1200};
  const q=pool.splice(best,1)[0],p=flowers[q.source],leave=p.petals?.[q.petal]?.leave??p.fall,distance=Math.hypot(slot.x-q.x,slot.y-q.y),flight=clamp(1200+distance/Math.max(H,1)*1200+r()*600,1450,2600);
  return {...q,slot,leave,at:leave+flight,bend:wind-r()*30,sway:5+r()*9,phase:r()*TAU};
 });
}
function landingPose(route,time){
 const u=clamp((time-route.leave)/(route.at-route.leave),0,1),v=ease.sine(u),w=1-v,dy=route.slot.y-route.y;
 const flutter=Math.sin(Math.PI*v)*Math.sin(v*TAU+route.phase)*route.sway;
 return {u,v,x:w*w*w*route.x+3*w*w*v*(route.x+route.bend)+3*w*v*v*(route.slot.x-route.bend*.4)+v*v*v*route.slot.x+flutter,
  y:w*w*w*route.y+3*w*w*v*(route.y+dy*.22)+3*w*v*v*(route.slot.y-dy*.28)+v*v*v*route.slot.y};
}
// An egret in flight, facing left, about 100 units from bill to toes; phase 0 = wings up, 1 = wings down.
// The wing is one curve up the leading edge and four feathered notches back down to the body.
const WING_UP=[[40,-3],[36,-14],[37,-27],[46,-38],[50,-42],[56,-44],[63,-45],[60,-41],[60,-37],[62,-33],[58,-32],[57,-29],[59,-25],[55,-25],[54,-21],[56,-17],[52,-17],[52,-13],[54,-9],[53,-6],[55,-4],[57,-2]];
const WING_DOWN=[[40,-1],[37,6],[38,16],[44,26],[47,30],[52,33],[58,35],[56,31],[56,28],[58,25],[55,23],[55,20],[57,17],[54,15],[54,12],[56,9],[53,7],[54,4],[55,2],[55,1],[56,0],[57,-1]];
function wingPath(p,dx=0,dy=0,k=1){const q=WING_UP.map((u,i)=>[(lerp(u[0],WING_DOWN[i][0],p)-48)*k+48+dx,(lerp(u[1],WING_DOWN[i][1],p))*k+dy]),f=v=>v[0].toFixed(1)+' '+v[1].toFixed(1);let d='M'+f(q[0]);for(let i=1;i<q.length;i+=3)d+='C'+f(q[i])+' '+f(q[i+1])+' '+f(q[i+2]);return d+'Z';}
function egretParts(p){
 return {far:wingPath(Math.min(1,p+.12),5,-1.5,.86),wing:wingPath(p),body:'M29 -1C34 -7 52 -7 66 -2C68 0 66 3 63 3C52 6 36 6 29 -1Z',neck:'M18.6 -3.4C18 3 24.5 7.5 31.5 3.6L33.2 -0.8C27.5 2.2 22.6 0.6 22.6 -3.8Z',head:'M16.8 -5.2a3.4 3.4 0 1 0 6.8 0a3.4 3.4 0 1 0 -6.8 0Z',bill:'M18.8 -6.6L3.6 -3.6L19 -3.6Z',eye:'M19.4 -5.6a.65 .65 0 1 0 1.3 0a.65 .65 0 1 0 -1.3 0Z',legs:'M63 2.2L96.5 4.6M62 3.4L94.5 7.6',feet:'M96.5 4.6l3.2 .9M94.5 7.6l3.1 1.3'};
}
// The outline sits behind the fills, so the bird has one clean silhouette and no seams between neck, head and body.
function egretSVG(p,x,y,scale,ink){
 const e=egretParts(p),solid=[e.body,e.neck,e.head,e.wing].map(d=>`<path d="${d}"/>`).join(''),w=(2.4/scale).toFixed(2);
 return `<g transform="translate(${x} ${y}) scale(${scale})" stroke-linejoin="round" stroke-linecap="round">${ink?`<g fill="none" stroke="${ink}" stroke-opacity=".5" stroke-width="${w}"><path d="${e.far}"/>${solid}</g>`:''}<path d="${e.far}" fill="#DCE6E0"/><path d="${e.legs}" stroke="#26302C" stroke-width="1.3" fill="none"/><path d="${e.feet}" stroke="#E2BE3A" stroke-width="1.5" fill="none"/><g fill="#FFFFFF">${solid}</g><path d="${e.bill}" fill="#26302C"/><path d="${e.eye}" fill="#26302C"/></g>`;
}

/* ---------- canvas drawing ---------- */
let bractPath=null;const sprites=new Map();
const bract=()=>bractPath||(bractPath=new Path2D(BRACT));
function heart(ctx,color,alpha=1){if(alpha<=0)return;ctx.globalAlpha*=alpha;ctx.fillStyle=color;ctx.beginPath();for(let i=0;i<=24;i++){const a=i/24*TAU,r=HEART_R*(1+.13*Math.cos(6*a));ctx.lineTo(r*Math.cos(a),HEART_Y+r*Math.sin(a));}ctx.fill();ctx.globalAlpha/=alpha;}
function flowerVector(ctx,x,y,len,rot,fill,heartColor,tilt=1,heartAlpha=1){ctx.save();ctx.translate(x,y);ctx.rotate(rot);ctx.scale(1,tilt);ctx.scale(len/24,len/24);for(let i=0;i<3;i++){ctx.save();ctx.rotate(i*TAU/3);ctx.fillStyle=fill;ctx.fill(bract());heart(ctx,heartColor,heartAlpha);ctx.restore();}ctx.restore();}
function sprite(kind,fill,heartColor,px){const key=kind+fill+heartColor+px;if(sprites.has(key))return sprites.get(key);const c=document.createElement('canvas');c.width=c.height=px;const x=c.getContext('2d');x.translate(px/2,px/2);x.scale(px/52,px/52);if(kind==='flower'){for(let i=0;i<3;i++){x.save();x.rotate(i*TAU/3);x.fillStyle=fill;x.fill(bract());heart(x,heartColor);x.restore();}}else{x.translate(0,12);x.fillStyle=fill;x.fill(bract());heart(x,heartColor);}sprites.set(key,c);return c;}
// A sprite covers 52 units, so a bract of length len needs a box of len*52/24.
function stamp(ctx,img,x,y,len,rot,tilt,alpha){if(alpha<=0||len<=.2)return;const s=len*52/24;ctx.save();ctx.globalAlpha=alpha;ctx.translate(x,y);ctx.rotate(rot);ctx.scale(1,tilt);ctx.drawImage(img,-s/2,-s/2,s,s);ctx.restore();}
function egret(ctx,x,y,span,p,alpha,ink){
 const e=egretParts(p),k=span/100,solid=[e.body,e.neck,e.head,e.wing].map(d=>new Path2D(d)),far=new Path2D(e.far);ctx.save();ctx.translate(x,y);ctx.scale(k,k);ctx.lineJoin='round';ctx.lineCap='round';
 if(ink){ctx.globalAlpha=alpha*.5;ctx.strokeStyle=ink;ctx.lineWidth=2.4/k;ctx.stroke(far);for(const q of solid)ctx.stroke(q);}
 ctx.globalAlpha=alpha;ctx.fillStyle='#DCE6E0';ctx.fill(far);ctx.strokeStyle='#26302C';ctx.lineWidth=1.3;ctx.stroke(new Path2D(e.legs));ctx.strokeStyle='#E2BE3A';ctx.lineWidth=1.5;ctx.stroke(new Path2D(e.feet));
 ctx.fillStyle='#FFFFFF';for(const q of solid)ctx.fill(q);ctx.fillStyle='#26302C';ctx.fill(new Path2D(e.bill));ctx.fill(new Path2D(e.eye));ctx.restore();
}

// Use the same suit paths as the table; keep the standalone renderer usable without the table module.
const suitCache=new Map();
function suitMark(ctx,suit,x,y,size){
 const svg=root.SZSuit?.svg(suit);
 if(svg){
  if(!suitCache.has(suit))suitCache.set(suit,[...svg.matchAll(/ d="([^"]+)"/g)].map(m=>new Path2D(m[1])));
  ctx.save();ctx.translate(x-size/2,y-size/2);ctx.scale(size/24,size/24);for(const p of suitCache.get(suit))ctx.fill(p);ctx.restore();
 }else{ctx.save();ctx.font=`${size}px Arial,sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(['♠','♥','♣','♦'][suit],x,y);ctx.restore();}
}
function cardInk(ctx,id,back,w,h,g,level){
 const top=-g-h;
 if(back||!validCard(id)){flowerVector(ctx,0,top+h/2,w*.3,0,CARD.red,CARD.heart);return;}
 const rank=id%13+2,suit=Math.floor(id/13),label=rank<11?String(rank):['J','Q','K','A'][rank-11],wild=suit===1&&rank===level;
 ctx.fillStyle=suit===1||suit===3?CARD.red:CARD.ink;
 ctx.font=`800 ${h*.29}px "SZ Rank",Arial,sans-serif`;ctx.textAlign='left';ctx.textBaseline='top';
 ctx.fillText(label,-w*.4,top+h*.08,w*.72);
 suitMark(ctx,suit,-w*.25,top+h*.46,w*.25);
 ctx.save();ctx.globalAlpha*=.1;suitMark(ctx,suit,w*.18,top+h*.76,w*.56);ctx.restore();
 if(wild){ctx.save();ctx.fillStyle=CARD.backEdge;ctx.font=`${w*.19}px Arial,sans-serif`;ctx.fillText('★',-w*.4,-g-h*.18);ctx.restore();}
}

/* ---------- card to bract ---------- */
function resample(pts,n){const d=[0];for(let i=1;i<pts.length;i++)d.push(d[i-1]+Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]));const out=[],T=d.at(-1);let j=0;for(let i=0;i<n;i++){const s=T*i/(n-1);while(j<d.length-2&&d[j+1]<s)j++;const t=(s-d[j])/((d[j+1]-d[j])||1);out.push([lerp(pts[j][0],pts[j+1][0],t),lerp(pts[j][1],pts[j+1][1],t)]);}return out;}
function cubic(out,p0,p1,p2,p3,n=14){for(let i=1;i<=n;i++){const t=i/n,u=1-t;out.push([u*u*u*p0[0]+3*u*u*t*p1[0]+3*u*t*t*p2[0]+t*t*t*p3[0],u*u*u*p0[1]+3*u*u*t*p1[1]+3*u*t*t*p2[1]+t*t*t*p3[1]]);}}
const HALF=40;let bractHalves=null;
function bractOutline(){if(bractHalves)return bractHalves;const r=[[0,-24]];cubic(r,[0,-24],[2.7,-20],[6.3,-17],[8.1,-13]);cubic(r,[8.1,-13],[9.9,-8],[7.2,-4],[2.5981,-1.5]);r.push([0,0]);const l=[[0,0],[-2.5981,-1.5]];cubic(l,[-2.5981,-1.5],[-7.2,-4],[-9.9,-8],[-8.1,-13]);cubic(l,[-8.1,-13],[-6.3,-17],[-2.7,-20],[0,-24]);return bractHalves=[resample(r,HALF),resample(l,HALF)];}
// A card standing on the flower centre: inner edge g from the centre, h tall, w wide, its outer edge where the tip goes.
function cardOutline(w,h,g,rad){
 const t=-(g+h),b=-g,x=w/2,arc=(cx,cy,a0,a1,out)=>{for(let i=1;i<=6;i++){const a=lerp(a0,a1,i/6);out.push([cx+rad*Math.cos(a),cy+rad*Math.sin(a)]);}};
 const r=[[0,t],[x-rad,t]];arc(x-rad,t+rad,-Math.PI/2,0,r);r.push([x,b-rad]);arc(x-rad,b-rad,0,Math.PI/2,r);r.push([0,b]);
 const l=[[0,b],[-x+rad,b]];arc(-x+rad,b-rad,Math.PI/2,Math.PI,l);l.push([-x,t+rad]);arc(-x+rad,t+rad,Math.PI,Math.PI*1.5,l);l.push([0,t]);
 return [resample(r,HALF),resample(l,HALF)];
}
function morphPath(card,len,t){const b=bractOutline(),k=len/24,p=new Path2D();for(let h=0;h<2;h++)for(let i=0;i<HALF;i++){const c=card[h][i],q=b[h][i],x=lerp(c[0],q[0]*k,t),y=lerp(c[1],q[1]*k,t);if(!h&&!i)p.moveTo(x,y);else p.lineTo(x,y);}p.closePath();return p;}

/* ---------- the screen ---------- */
const CARD_LEAD=400,VINE_START=3100,TITLE_START=3600,FILM_END=12500,END=CARD_LEAD+FILM_END,turn=t=>.035*clamp(t-1100,0,FILM_END-1100)/1000;
const now=()=>root.performance?.now?.()??Date.now();
const reduced=()=>!!root.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
function readSlots(host,box){
 const slots=[...host.querySelectorAll('.fc-bloom-slot')];
 return slots.map(slot=>{const m=slot.getScreenCTM?.(),corolla=slot.querySelector('.fc-bloom-corolla');if(!m||!corolla)return null;const p=new DOMPoint(32,36).matrixTransform(m);return {corolla,x:p.x-box.left,y:p.y-box.top,len:24*Math.hypot(m.a,m.b),garden:slot.dataset.cityGarden||'',seed:corolla.hasAttribute('data-city-seed')};}).filter(Boolean);
}
function play(host,opts={}){
 const canvas=host.querySelector('.szf-canvas'),sky=host.querySelector('.szf-sky');if(!canvas||!sky)return {stop(){},skip(){}};
 const ctx=canvas.getContext('2d'),winner=opts.winner===1?'rival':'own',F=FLOWERS[winner],dark=opts.theme==='dark',seed=(opts.seed>>>0)||7;
 const faceCards=Array.from({length:3},(_,i)=>validCard(opts.cards?.[i])?opts.cards[i]:null);
 const animations=[],timers=[];let raf=0,t0=0,done=false,scene=null,stopped=false;
 // The lower burst clears while petals are still falling: start the vine then, before the headline arrives.
 const vine=host.querySelector('.szf-vine'),stem=vine?.querySelector('.fc-vine-stem');let vineLength=0;
 const vineMarks=[...(vine?.querySelectorAll('.fc-win-stamp,.fc-ace-attempt,.fc-ace-knot,.fc-final-flower,.fc-vine-axis span')||[])].map(el=>{
  el.style.removeProperty('opacity');
  return {el,opacity:Number(root.getComputedStyle(el).opacity)||1,position:clamp((parseFloat(el.style.left)-5)/88.5,0,1)};
 });
 let vineTime=null;
 function drawVine(time){
  const elapsed=clamp(time-VINE_START,0,1890);if(elapsed===vineTime)return;vineTime=elapsed;
  if(stem)stem.style.strokeDashoffset=String(vineLength*(1-clamp(elapsed/1650,0,1)));
  for(const mark of vineMarks)mark.el.style.opacity=String(mark.opacity*smooth(mark.position*1650,mark.position*1650+240,elapsed));
 }
 const setPhase=p=>{if(host.dataset.phase===p)return;host.dataset.phase=p;if(p==='settled')opts.onSettled?.();};
 function layout(){
  // The vine uses non-scaling-stroke: dash distances are CSS pixels, not its 640-unit viewBox.
  const matrix=stem?.getScreenCTM?.();vineLength=(stem?.getTotalLength()||0)*(matrix?Math.hypot(matrix.a,matrix.b):1);vineTime=null;
  if(stem)stem.style.strokeDasharray=String(vineLength);
  const box=canvas.getBoundingClientRect(),dpr=Math.min(2,root.devicePixelRatio||1),W=box.width,H=box.height;canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);
  const s=sky.getBoundingClientRect(),hx=s.left-box.left+s.width/2,hy=s.top-box.top+s.height/2,len=clamp(Math.min(s.height*.36,W*.2),34,150);
  const r=rng(seed),burst=burstLayout(W,H,hx,hy,len,seed,opts.density||1),slots=readSlots(host,box);
  const city=host.querySelector('.szf-city')?.getBoundingClientRect(),skyTop=s.top-box.top+10,skyBottom=Math.min(H-110,city?city.bottom-box.top-20:s.bottom-box.top+H*.18),kept=new Map(canopyLayout(burst.list,W,skyTop,skyBottom,hx,hy,len).map(p=>[p.index,p.size]));
  const px=Math.round(clamp(Math.max(...burst.list.map(b=>b.size),12)*1.3*52/24*dpr,48,256));
  const parts=burst.list.map((b,index)=>{
   const born=1080+820*Math.pow(b.k,.9)+r()*60,fall=Math.max(born+700,2150+r()*950+b.k*350);
   return {...b,born,fall,wreath:kept.has(index),canopySize:kept.get(index),img:sprite('flower',F.tones[b.tone],F.heart,px),petal:sprite('petal',F.tones[b.tone],F.heart,px),petals:[0,1,2].map(k=>({a:b.rot+k*TAU/3,...petalOrigin(b,k),leave:fall+k*75+r()*65,v:12+r()*22,wind:-10-r()*12,spin:(r()-.5)*2.2,sway:6+r()*9,phase:r()*TAU,flip:.8+r()*1.2,g:40+r()*45,life:2.6+r()*1.8,land:null}))};
  });
  const land=landingPlan(parts,slots,seed,H);
  for(const route of land)if(route.source!==null)parts[route.source].petals[route.petal].land=route;
  const cw=clamp(W*.19,58,110),ch=cw*1.42,g=len*.06,rowY=hy+ch/2+g,start=winner==='own'?H+ch+g:-ch;
  const cards=faceCards.map((id,i)=>({id,x0:hx+(i-1)*cw*1.14,y0:rowY,start,a0:0,a1:i*TAU/3}));
  const landTimes=land.map(x=>x.at).sort((a,b)=>a-b),firstLanding=landTimes[0]||3400;
  const birds=[{y:Math.max(skyTop+32,hy-len*1.2),span:clamp(W*.135,40,104),speed:W/5.6,at:firstLanding-450,alpha:.96,phase:0},{y:hy+len*1.15,span:clamp(W*.095,28,76),speed:W/6.2,at:firstLanding+200,alpha:.82,phase:1.7}];
  scene={W,H,hx,hy,len,skyTop,cityBottom:skyBottom+20,parts,cards,birds,card:cardOutline(cw,ch,len*.06,Math.min(cw,ch)*.09),cw,ch,land,settledAt:Math.max(3150,...land.map(x=>x.at+320))};

 }
 function cityBloom(){
  const base=t0?now()-t0:0,run=(el,frames,at,duration)=>{const a=el.animate(frames,{fill:'both',easing:'cubic-bezier(.22,.65,.3,1)',delay:Math.max(0,CARD_LEAD+at-base),duration});animations.push(a);};
  for(const route of scene.land)run(route.slot.corolla,[{transform:'scale(.82)',opacity:0},{transform:'scale(1)',opacity:1}],route.at-240,650);
  // The branches quietly appear near the first landing in each garden; no stroke sweep across the city.
  host.querySelectorAll('.fc-bloom-stem').forEach(stem=>{
   const nearby=scene.land.filter(x=>x.slot.garden===stem.dataset.cityGarden),at=nearby.length?Math.min(...nearby.map(x=>x.at))-320:2800;
   run(stem,[{strokeDashoffset:0,opacity:0},{strokeDashoffset:0,opacity:.72}],at,650);
  });
 }
 // As the petals descend, gently clear the headline's sky before the words fade in.
 function clearSky(y,time){return lerp(1,smooth(scene.skyTop-22,scene.skyTop+12,y),smooth(TITLE_START-400,TITLE_START,time));}
 function frame(elapsed){
  const t=elapsed-CARD_LEAD,{W,H,hx,hy,len,parts,cards,birds,card,cw,ch}=scene;ctx.clearRect(0,0,W,H);
  // glow behind the new flower
  if(t>980&&t<2600){const u=(t-980)/1620,g=ctx.createRadialGradient(hx,hy,len*.2,hx,hy,len*(1.2+3.2*ease.out(u)));const a=(dark?.42:.26)*Math.sin(Math.PI*Math.min(1,u*1.25));g.addColorStop(0,`rgba(${F.glow},${a})`);g.addColorStop(1,`rgba(${F.glow},0)`);ctx.fillStyle=g;ctx.fillRect(0,0,W,H);}
  // burst flowers, then their flight down to the skyline or their fall as petals
  for(const p of parts){
   if(t<p.born)continue;const u=clamp((t-p.born)/620,0,1),ex=lerp(hx+Math.cos(p.a)*len*.4,p.x,ease.out(u)),ey=lerp(hy+Math.sin(p.a)*len*.4,p.y,ease.out(u)),grow=p.size*ease.back(u),rot=p.rot-.9*(1-ease.out(u)),breathe=1+.04*Math.sin((t-p.born)/260)*(1-smooth(4000,6000,t));
   if(p.wreath){const f=canopyPose(p,t);stamp(ctx,p.img,ex+f.x-p.x,ey+f.y-p.y,grow*breathe*f.size/p.size,rot+f.rot-p.rot,p.tilt,Math.min(1,u*3));continue;}
   const split=smooth(p.fall-100,p.fall+260,t);
   if(split<1)stamp(ctx,p.img,ex,ey,grow*breathe,rot,p.tilt,Math.min(1,u*3)*(1-split)*clearSky(ey,t));
   if(split<=0)continue;
   for(const q of p.petals){
    const seconds=Math.max(0,(t-q.leave)/1000);
    if(q.land){
     const L=q.land;if(t>=L.at)continue;const f=landingPose(L,t),tilt=lerp(p.tilt,.38+.62*Math.abs(Math.cos(seconds*q.flip)),smooth(0,.28,seconds));
     stamp(ctx,p.petal,f.x,f.y,lerp(p.size,L.slot.len*1.1,smooth(.08,.94,f.u)),q.a+q.spin*seconds,tilt,split*(1-smooth(.78,1,f.u))*clearSky(f.y,t));continue;
    }
    // The tail is made of the burst's own petals, never a new shower spawned above the screen.
    const fade=1-smooth(q.life*.55,q.life,seconds);if(fade<=0)continue;
    const dx=Math.sin(q.a),dy=-Math.cos(q.a),k=1.4,e=(1-Math.exp(-k*seconds))/k,vt=q.g/k*H/844,air=seconds-(1-Math.exp(-2*seconds))/2;
    const x=q.x+dx*q.v*e+q.wind*air+q.sway*(Math.sin(q.phase+seconds*1.6)-Math.sin(q.phase))*smooth(0,.6,seconds),y=q.y+vt*seconds+(dy*q.v-vt)*e;
    const region=(1-smooth(scene.cityBottom-24,scene.cityBottom+8,y))*clearSky(y,t);
    stamp(ctx,p.petal,x,y,p.size*lerp(1,.75,smooth(0,q.life,seconds)),q.a+q.spin*seconds,lerp(p.tilt,.4+.6*Math.abs(Math.cos(seconds*q.flip)),smooth(0,.6,seconds)),split*fade*region);
   }
  }

  // Arrival, flipping and gathering overlap: keep one continuous flight from the actual play into the bloom.
  for(let i=0;i<3;i++){
   const c=cards[i],arrival=ease.out(clamp((elapsed-i*55)/850,0,1)),gather=ease.inOut(clamp((elapsed-650-i*45)/800,0,1));
   const flip=ease.inOut(clamp((elapsed-520-i*50)/460,0,1)),back=flip>=.5||c.id===null,m=clamp((t-700)/450,0,1),mm=ease.inOut(m);
   const wild=c.id!==null&&Math.floor(c.id/13)===1&&c.id%13+2===opts.flowerLevel;
   const x=lerp(c.x0,hx,gather),y=lerp(lerp(c.start,c.y0,arrival),hy,gather)-Math.sin(Math.PI*gather)*ch*.12;
   const a=lerp(c.a0,c.a1,gather)-.18*Math.sin(Math.PI*gather),spin=t>1100?ease.out(clamp((t-1100)/1500,0,1))*.42+turn(t):0,pulse=1+.08*Math.sin(Math.PI*clamp((t-1050)/500,0,1));
   ctx.save();ctx.translate(x,y);ctx.rotate(a+spin);ctx.scale(pulse*Math.max(.015,Math.abs(Math.cos(Math.PI*flip))),pulse);
   const fill=mix(back||wild?CARD.back:CARD.face,F.tones[1],smooth(.15,.75,mm)),path=morphPath(card,len,mm);
   if(m<.6){ctx.shadowColor=dark?'rgba(0,0,0,.45)':'rgba(16,35,27,.18)';ctx.shadowBlur=10*(1-m/.6);ctx.shadowOffsetY=3*(1-m/.6);}
   ctx.fillStyle=fill;ctx.fill(path);ctx.shadowColor='transparent';
   if(m<.5){ctx.globalAlpha=1-m/.5;ctx.lineWidth=1;ctx.strokeStyle=back||wild?CARD.backEdge:CARD.edge;ctx.stroke(path);
    cardInk(ctx,c.id,back,cw,ch,len*.06,opts.flowerLevel);ctx.globalAlpha=1;}
   if(mm>.55){ctx.save();ctx.scale(len/24,len/24);heart(ctx,F.heart,smooth(.55,1,mm));ctx.restore();}
   ctx.restore();}
  // The egrets join the same breeze as the petals, alternating an occasional wingbeat with a long glide.
  for(const b of birds){
   if(t<b.at)continue;const seconds=(t-b.at)/1000,x=W+b.span-seconds*b.speed;if(x<-b.span*1.2)continue;
   const cycle=(seconds+b.phase)%3.8,flap=cycle<1.4?Math.sin(Math.PI*cycle/1.4)**2:0,p=.2+.75*flap;
   egret(ctx,x,b.y+Math.sin(seconds*.65+b.phase)*5,b.span,p,b.alpha*smooth(0,.5,seconds),dark?null:'#4F665A');
  }

 }
 
 function phaseAt(t){const caption=t>=CARD_LEAD+TITLE_START?'visible':'hidden';if(host.dataset.caption!==caption)host.dataset.caption=caption;drawVine(t-CARD_LEAD);setPhase(t>=CARD_LEAD+scene.settledAt?'settled':t>=CARD_LEAD+2350?'city':t>=CARD_LEAD+1000?'bloom':'gather');}
 function tick(){if(stopped)return;const t=now()-t0;frame(Math.min(t,END));phaseAt(t);if(t<END)raf=requestAnimationFrame(tick);else{done=true;}}
 function still(){scene||layout();ctx.clearRect(0,0,scene.W,scene.H);const {hx,hy,len,parts}=scene;for(const p of parts)if(p.wreath){const f=canopyPose(p,FILM_END);stamp(ctx,p.img,f.x,f.y,f.size,f.rot,p.tilt,1);}flowerVector(ctx,hx,hy,len,.42+turn(FILM_END),F.tones[1],F.heart);drawVine(FILM_END);host.dataset.caption='visible';setPhase('settled');}

 function cancel(){cancelAnimationFrame(raf);animations.forEach(a=>a.cancel());animations.length=0;timers.forEach(clearTimeout);}
 const api={
  stop(){stopped=true;cancel();},
  skip(){if(done)return;cancel();still();done=true;},
  get settled(){return host.dataset.phase==='settled';},
  // Draws one moment and holds it (used by tests and stills).
  at(t){cancelAnimationFrame(raf);for(const a of animations){try{a.pause();a.currentTime=t;}catch(_){}}frame(t);phaseAt(t);},
  relayout(){if(stopped)return;cancel();layout();still();done=true;}
 };
 layout();
 if(reduced()||opts.play===false){still();done=true;return api;}
 host.dataset.caption='hidden';setPhase('gather');drawVine(0);t0=now();cityBloom();raf=requestAnimationFrame(tick);
 return api;
}

return {BRACT,FLOWERS,winningCards,burstLayout,canopyLayout,canopyPose,landingPlan,landingPose,egretParts,egretSVG,rng,play};
});
