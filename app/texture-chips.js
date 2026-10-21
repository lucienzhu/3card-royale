/* The table as a mainboard, drawn the way a real one looks. Every card zone is a part on its footprint: copper pads at a fixed pin pitch around the cards (an empty rack shows the bare footprint where its cards will land), silkscreen corner marks, a pin-1 marker and a reference designator. Three materials, as on a real board: copper under the solder mask (traces, tented vias, the ground pour), exposed finish (pads, test points, fiducials, plated mounting holes) and silkscreen (outlines, designators, the board label and logo). Chips are wired by a maze router under a design-rule check: traces of real width leave consecutive pads, neck down into a bus and find their way at 45° around every label, chip and piece of copper; the stock and discard piles take no part in the circuit, and a bus may run under the action panel on an inner layer. The wiring follows the game: each hand to its wound rack, each wound rack to the attack zone, the attack zone to the defence zone. Every free pad carries a trace: the pins near a corner escape together as a bus, the rest dog-bone to vias, and a few go to ground, to a test point or to a wide power trace; decoupling capacitors sit beside the chips. The free area is a ground pour with a clearance moat around every other net, ground pads tied in through their own traces, and a lattice of stitching vias. Anything that would overlap is not placed. Status LEDs at the top-left of the attack and defence footprints light in the colour of whoever has to act, together with the buses that drive them: the attacker's hand drives the attack LED, the attack zone drives the defence LED. One SVG behind the cards (and a second for the light), recomputed from the live layout (offset boxes, so card flights and lifts never move it) on resize and after every render. Drawn while <html data-sz-chips> is set; the strength slider in settings (app/board.js) scales the whole layer through --sz-board. */
(()=>{'use strict';
 const table=document.querySelector('.table');if(!table)return;
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('class','sz-chips');svg.setAttribute('aria-hidden','true');svg.setAttribute('data-no-i18n','');
 /* a second layer above the board for light: the status LEDs and the trace that drives them, which keep their brightness when the board is faint */
 const sigSvg=document.createElementNS('http://www.w3.org/2000/svg','svg');sigSvg.setAttribute('class','sz-signal');sigSvg.setAttribute('aria-hidden','true');sigSvg.setAttribute('data-no-i18n','');const pulseSvg=document.createElementNS('http://www.w3.org/2000/svg','svg');pulseSvg.setAttribute('class','sz-pulse');pulseSvg.setAttribute('aria-hidden','true');pulseSvg.setAttribute('data-no-i18n','');table.prepend(sigSvg);table.prepend(pulseSvg);table.prepend(svg);
 /* chip padding, trace width, bus pitch, pin pitch, pad size, pad-to-neck, via radius, copper clearance, via stagger, pour clearance, board-edge clearance, silkscreen font size */
 let P=6,W=2,S=4,PITCH=8,PADW=3,PADL=6,L1=4,VR=2.2,CL=2,ST=5,CLP=3,E=5,FS=6;
 const vis=el=>!!el&&el.offsetWidth>0&&el.offsetHeight>0;
 const box=el=>{let x=0,y=0,e=el;while(e&&e!==table){x+=e.offsetLeft;y+=e.offsetTop;e=e.offsetParent;}return {x,y,w:el.offsetWidth,h:el.offsetHeight};};
 const union=list=>{let r=null;for(const el of list){if(!vis(el))continue;const b=box(el);r=r?{x:Math.min(r.x,b.x),y:Math.min(r.y,b.y),x2:Math.max(r.x2,b.x+b.w),y2:Math.max(r.y2,b.y+b.h)}:{x:b.x,y:b.y,x2:b.x+b.w,y2:b.y+b.h};}return r&&{x:r.x,y:r.y,w:r.x2-r.x,h:r.y2-r.y};};
 const px=(cs,p,d)=>parseFloat(cs.getPropertyValue(p))||d;
 function zone(sel,slots){const c=table.querySelector(sel);if(!vis(c))return null;const r=union(c.querySelectorAll('.card'));if(r)return r;if(!slots)return null;const b=box(c),cs=getComputedStyle(c),pl=px(cs,'padding-left',0),pr=px(cs,'padding-right',0),pt=px(cs,'padding-top',0),pb=px(cs,'padding-bottom',0),w1=px(cs,'--combatw',32),h=px(cs,'--combath',46),gap=px(cs,'column-gap',5),w=slots*w1+(slots-1)*gap;return {x:b.x+pl+(b.w-pl-pr-w)/2,y:b.y+pt+(b.h-pt-pb-h)/2,w,h};}
 function text(sel){const out=[],el=table.querySelector(sel);if(!vis(el))return out;const tb=table.getBoundingClientRect(),w=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);let n;while((n=w.nextNode())){if(!n.textContent.trim())continue;const g=document.createRange();g.selectNodeContents(n);for(const b of g.getClientRects())if(b.width>0)out.push({x:b.left-tb.left-2,y:b.top-tb.top-2,w:b.width+4,h:b.height+4});}return out;}
 const boxes=sel=>[...table.querySelectorAll(sel)].filter(vis).map(box);
 const inside=(p,r,g)=>p.x>=r.x-g&&p.x<=r.x+r.w+g&&p.y>=r.y-g&&p.y<=r.y+r.h+g;
 const overlap=(a,b,m)=>a.x<b.x+b.w+m&&b.x<a.x+a.w+m&&a.y<b.y+b.h+m&&b.y<a.y+a.h+m;
 function hits(pts,rects,g){let x1=1e9,y1=1e9,x2=-1e9,y2=-1e9;for(const p of pts){x1=Math.min(x1,p.x);y1=Math.min(y1,p.y);x2=Math.max(x2,p.x);y2=Math.max(y2,p.y);}const near=rects.filter(r=>x2>=r.x-g&&x1<=r.x+r.w+g&&y2>=r.y-g&&y1<=r.y+r.h+g);if(!near.length)return false;for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i],n=Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/2)||1;for(let k=0;k<=n;k++){const p={x:a.x+(b.x-a.x)*k/n,y:a.y+(b.y-a.y)*k/n};for(const r of near)if(inside(p,r,g))return true;}}return false;}
 const chip=r=>({x:r.x-P,y:r.y-P,w:r.w+2*P,h:r.h+2*P});
 const isV=side=>side==='top'||side==='bottom';
 const port=(c,side,t)=>isV(side)?{x:c.x+t,y:side==='top'?c.y:c.y+c.h,dx:0,dy:side==='top'?-1:1}:{x:side==='left'?c.x:c.x+c.w,y:c.y+t,dx:side==='left'?-1:1,dy:0};
 function pinMap(c){const sides=Math.min(c.w,c.h)>=44?['top','bottom','left','right']:(c.w>=c.h?['top','bottom']:['left','right']),m={};for(const s of sides){const len=isV(s)?c.w:c.h,n=Math.max(2,Math.floor((len-2*PITCH)/PITCH)+1),start=(len-(n-1)*PITCH)/2,pos=[];for(let i=0;i<n;i++)pos.push(start+i*PITCH);m[s]=pos;}return m;}
 function offset(pts,o){if(!o)return pts.slice();const segs=[];for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i],l=Math.hypot(b.x-a.x,b.y-a.y),nx=-(b.y-a.y)/l*o,ny=(b.x-a.x)/l*o;segs.push([{x:a.x+nx,y:a.y+ny},{x:b.x+nx,y:b.y+ny}]);}
  const out=[segs[0][0]];for(let i=1;i<segs.length;i++){const [p1,p2]=segs[i-1],[p3,p4]=segs[i],d=(p1.x-p2.x)*(p3.y-p4.y)-(p1.y-p2.y)*(p3.x-p4.x);if(Math.abs(d)<1e-6){out.push(p2);continue;}const t=((p1.x-p3.x)*(p3.y-p4.y)-(p1.y-p3.y)*(p3.x-p4.x))/d;out.push({x:p1.x+t*(p2.x-p1.x),y:p1.y+t*(p2.y-p1.y)});}out.push(segs[segs.length-1][1]);return out;}
 const n1=v=>String(Math.round(v*10)/10);
 const d=pts=>'M'+pts.map(p=>n1(p.x)+' '+n1(p.y)).join('L');
 const plen=pts=>pts.reduce((m,p,k)=>k?m+Math.hypot(p.x-pts[k-1].x,p.y-pts[k-1].y):0,0);
 /* a packet: a short dash that runs the length of a line, then rests; cycle and delay set the rhythm */
 const packet=(pts,w,dash,speed,del,cls,style='')=>{const L=plen(pts);if(L<dash*1.5)return '';const cyc=L/speed/.55;return `<path class="pk ${cls}" d="${d(pts)}" stroke-width="${n1(w)}" style="--len:${n1(L)};--dash:${dash}px;--cyc:${cyc.toFixed(2)}s;--del:${(-((del*2.71)%cyc)).toFixed(2)}s;${style}"/>`;};
 /* design rules: every piece of copper is registered in a grid; a new trace or via must keep CL from everything not on its own net and not in its allowed set (the pads it lands on) */
 let feats=[],grid=new Map(),netSeq=0;const CELL=48;
 function addFeat(f){f.id=feats.length;feats.push(f);const g=(f.r!=null?f.r:f.w/2)+CL+VR+W+4,xs=f.r!=null?[f.c.x]:[f.a.x,f.b.x],ys=f.r!=null?[f.c.y]:[f.a.y,f.b.y];for(let cx=Math.floor((Math.min(...xs)-g)/CELL);cx<=Math.floor((Math.max(...xs)+g)/CELL);cx++)for(let cy=Math.floor((Math.min(...ys)-g)/CELL);cy<=Math.floor((Math.max(...ys)+g)/CELL);cy++){const k=cx+','+cy;if(!grid.has(k))grid.set(k,[]);grid.get(k).push(f);}return f.id;}
 function nearFeats(x1,y1,x2,y2){const out=[],seen=new Set();for(let cx=Math.floor(x1/CELL);cx<=Math.floor(x2/CELL);cx++)for(let cy=Math.floor(y1/CELL);cy<=Math.floor(y2/CELL);cy++){const l=grid.get(cx+','+cy);if(l)for(const f of l)if(!seen.has(f.id)){seen.add(f.id);out.push(f);}}return out;}
 function ptSeg(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,l2=dx*dx+dy*dy;let t=l2?((p.x-a.x)*dx+(p.y-a.y)*dy)/l2:0;t=Math.max(0,Math.min(1,t));return Math.hypot(p.x-(a.x+t*dx),p.y-(a.y+t*dy));}
 function cross(p,q,a,b){const dd=(q.x-p.x)*(b.y-a.y)-(q.y-p.y)*(b.x-a.x);if(Math.abs(dd)<1e-9)return false;const t=((a.x-p.x)*(b.y-a.y)-(a.y-p.y)*(b.x-a.x))/dd,u=((a.x-p.x)*(q.y-p.y)-(a.y-p.y)*(q.x-p.x))/dd;return t>=0&&t<=1&&u>=0&&u<=1;}
 const segSeg=(p,q,a,b)=>cross(p,q,a,b)?0:Math.min(ptSeg(p,a,b),ptSeg(q,a,b),ptSeg(a,p,q),ptSeg(b,p,q));
 const skip=(f,net,allow)=>f.net===net||(!!allow&&allow.has(f.id));
 function okLine(pts,w,net,allow){for(let i=1;i<pts.length;i++){const p=pts[i-1],q=pts[i],g=w/2+CL+VR+W;for(const f of nearFeats(Math.min(p.x,q.x)-g,Math.min(p.y,q.y)-g,Math.max(p.x,q.x)+g,Math.max(p.y,q.y)+g)){if(skip(f,net,allow))continue;const need=(f.r!=null?f.r:f.w/2)+w/2+CL;if((f.r!=null?ptSeg(f.c,p,q):segSeg(p,q,f.a,f.b))<need-.02)return false;}}return true;}
 function okVia(c,r,net,allow){const g=r+CL+VR+W;for(const f of nearFeats(c.x-g,c.y-g,c.x+g,c.y+g)){if(skip(f,net,allow))continue;const need=(f.r!=null?f.r:f.w/2)+r+CL;if((f.r!=null?Math.hypot(f.c.x-c.x,f.c.y-c.y):ptSeg(c,f.a,f.b))<need-.02)return false;}return true;}
 const putLine=(pts,w,net,gnd)=>{for(let i=1;i<pts.length;i++)addFeat({a:pts[i-1],b:pts[i],w,net,gnd:!!gnd});};
 const putVia=(c,r,net,gnd)=>addFeat({c,r,net,gnd:!!gnd});
 function segRect(a,b,R){let t0=0,t1=1;const dx=b.x-a.x,dy=b.y-a.y,p=[-dx,dx,-dy,dy],q=[a.x-R.x,R.x+R.w-a.x,a.y-R.y,R.y+R.h-a.y];for(let i=0;i<4;i++){if(Math.abs(p[i])<1e-9){if(q[i]<0)return false;continue;}const t=q[i]/p[i];if(p[i]<0){if(t>t1)return false;if(t>t0)t0=t;}else{if(t<t0)return false;if(t<t1)t1=t;}}return true;}
 /* no copper within m of a rectangle (silkscreen text, fiducials, mounting holes) */
 function rectFree(R,m){const g=m+2;for(const f of nearFeats(R.x-g,R.y-g,R.x+R.w+g,R.y+R.h+g)){if(f.r!=null){const cx=Math.max(R.x,Math.min(f.c.x,R.x+R.w)),cy=Math.max(R.y,Math.min(f.c.y,R.y+R.h));if(Math.hypot(f.c.x-cx,f.c.y-cy)<f.r+m)return false;}else{const e=f.w/2+m;if(segRect(f.a,f.b,{x:R.x-e,y:R.y-e,w:R.w+2*e,h:R.h+2*e}))return false;}}return true;}
 /* the light layer: in the attack phase the attacker's hand drives the attack LED, in the defence phase the attack zone drives the defence LED; the path is traced through the buses actually placed. Red when it is you to act, gold when it is the opponent */
 function paintSignal(cache){
  let sig='';const {LEDS,LINKS,LL,LW,LP,W}=cache;const phase=table.dataset.szPhase,att=Number(table.dataset.szAttacker);
  if((phase==='attack'||phase==='defend')&&(att===0||att===1)){const actor=phase==='attack'?att:1-att,ledK=phase,src=phase==='attack'?(att===0?'ownHand':'oppHand'):'attack',L=LEDS[ledK];
   if(L){const col=actor===0?'var(--sig-me,var(--red))':'var(--sig-opp,var(--gold))',adj={};for(const l of LINKS){(adj[l.a]=adj[l.a]||[]).push(l);(adj[l.b]=adj[l.b]||[]).push(l);}
    const prev={[src]:null},q=[src];while(q.length){const u=q.shift();if(u===ledK)break;for(const l of adj[u]||[]){const v=l.a===u?l.b:l.a;if(!(v in prev)){prev[v]=l;q.push(v);}}}
    const lines=[L.feed],flowing=[L.feed];if(ledK in prev){let v=ledK;while(prev[v]){const l=prev[v];lines.push(...l.lines);for(const ln of l.lines)flowing.push(l.a===v?ln.slice().reverse():ln);v=l.a===v?l.b:l.a;}}
    const dd=lines.map(d).join(''),gx=L.x0+LL/2,bx=L.x0+LP*.55,bw=LL-LP*1.1;
    sig=`<defs><radialGradient id="sz-led-glow"><stop offset="0" style="stop-color:${col};stop-opacity:.75"/><stop offset=".35" style="stop-color:${col};stop-opacity:.28"/><stop offset="1" style="stop-color:${col};stop-opacity:0"/></radialGradient></defs>`
     +`<g class="sig-path" style="color:${col}"><path class="halo" d="${dd}" fill="none" stroke="currentColor" stroke-width="${n1(W*3.4)}"/><path class="base" d="${dd}" fill="none" stroke="currentColor" stroke-width="${n1(W)}"/>${flowing.map((ln,i)=>packet(ln,W*1.1,10,190,i*.37,'flow','stroke:#FFFFFF;opacity:.9')).join('')}</g>`
     +`<g class="sig-led" style="color:${col}"><circle cx="${n1(gx)}" cy="${n1(L.cy)}" r="${n1(LL*1.7)}" fill="url(#sz-led-glow)"/><rect x="${n1(bx)}" y="${n1(L.cy-LW*.46)}" width="${n1(bw)}" height="${n1(LW*.92)}" rx=".6" fill="currentColor"/><rect x="${n1(gx-LL*.16)}" y="${n1(L.cy-LW*.22)}" width="${n1(LL*.32)}" height="${n1(LW*.44)}" rx=".8" fill="#fff" opacity=".8"/></g>`;}}
  sigSvg.innerHTML=sig;}
 let lastKey='',lastCache=null;
 let queued=false;
 function draw(){queued=false;if(!document.documentElement.dataset.szChips){svg.innerHTML='';sigSvg.innerHTML='';pulseSvg.innerHTML='';lastKey='';return;}const tw=table.clientWidth,th=table.clientHeight;if(!tw)return;
  const big=tw>=900;P=tw<600?6:10;W=big?2.4:2;S=big?5:4;PITCH=big?10:8;PADW=big?4:3;PADL=big?7:6;L1=4;VR=big?2.6:2.2;CL=big?2.4:2;ST=big?5.8:5;CLP=(PITCH-W)/2;E=5;FS=big?7:6;
  const RAD=Math.max(E+2,parseFloat(getComputedStyle(table).borderTopLeftRadius)||16);
  svg.setAttribute('viewBox',`0 0 ${tw} ${th}`);sigSvg.setAttribute('viewBox',`0 0 ${tw} ${th}`);pulseSvg.setAttribute('viewBox',`0 0 ${tw} ${th}`);feats=[];grid=new Map();netSeq=0;
  const Z={oppHand:zone('.opponent-hand-group .cards',0),oppWound:zone('.opponent-wound-group .wound-cards',1),attack:zone('#attack-cards',3),defend:zone('#defend-cards',3),ownWound:zone('.own-wound-group .wound-cards',1),ownHand:zone('.own-hand-group .cards',0)};
  const C={},pins={};for(const k in Z)if(Z[k]){C[k]=chip(Z[k]);pins[k]=pinMap(C[k]);}
  /* the stock and discard piles take no part in the circuit: no footprint, no pins, no wiring; their area is a keep-out for copper and pour */
  const pilesR=union(table.querySelectorAll('#deck-count .pile-stack')),pilesKeep=pilesR&&{x:pilesR.x-4,y:pilesR.y-4,w:pilesR.w+8,h:pilesR.h+8};
  const labels=[...text('#attack-label'),...text('#defend-label'),...text('#deck-count'),...text('.opponent-heading'),...text('.hand-tools'),...boxes('.damage'),...boxes('.shared-flower'),...boxes('.topline'),...boxes('.table-heading')];
  const rows=[...boxes('.opponent-heading'),...boxes('.hand-tools'),...boxes('.combat-title'),...boxes('.pile-label')];
  const ab=table.querySelector('.actionbar'),abox=vis(ab)?box(ab):null;
  const blockers=Object.values(C).concat(labels,rows,abox?[abox]:[],pilesKeep?[pilesKeep]:[]);
  const rk=r=>r?[r.x,r.y,r.w,r.h].map(v=>Math.round(v)).join(' '):'-',key=[tw,th,...Object.keys(Z).map(k=>rk(Z[k])),...labels.map(rk),...rows.map(rk),rk(abox),rk(pilesKeep)].join('|');
  if(key===lastKey&&lastCache){paintSignal(lastCache);return;}
  /* inside the rounded board outline, inset by the edge clearance and m */
  const onBoard=(p,m)=>{const x0=E+m,y0=E+m,x1=tw-E-m,y1=th-E-m;if(p.x<x0||p.y<y0||p.x>x1||p.y>y1)return false;const r=Math.max(0,RAD-E-m),cx=p.x<x0+r?x0+r:p.x>x1-r?x1-r:p.x,cy=p.y<y0+r?y0+r:p.y>y1-r?y1-r:p.y;return Math.hypot(p.x-cx,p.y-cy)<=r+.01;};
  const clear=(pts,g)=>pts.every(p=>onBoard(p,1)&&!blockers.some(r=>inside(p,r,g)));
  const T=[],V=[],PADS=[],TPS=[],FIDS=[],MHS=[],CAPS=[],LINKS=[],silkRects=[];let silk='';
  const usedPins=new Set(),padId=new Map();
  /* footprints first: every pad is copper that all routing must respect; a pad that would fall off the board is left out */
  for(const k in C){const c=C[k];for(const side in pins[k])pins[k][side].forEach((t,i)=>{const p=port(c,side,t);if(!onBoard({x:p.x+p.dx*(PADL-1),y:p.y+p.dy*(PADL-1)},.5)){usedPins.add(k+side+i);return;}
    PADS.push(isV(side)?{x:p.x-PADW/2,y:p.dy<0?p.y-PADL+1:p.y-1,w:PADW,h:PADL,key:k+side+i}:{x:p.dx<0?p.x-PADL+1:p.x-1,y:p.y-PADW/2,w:PADL,h:PADW,key:k+side+i});
    padId.set(k+side+i,addFeat({a:{x:p.x+p.dx*(PADW/2-1),y:p.y+p.dy*(PADW/2-1)},b:{x:p.x+p.dx*(PADL-1-PADW/2),y:p.y+p.dy*(PADL-1-PADW/2)},w:PADW,net:++netSeq,gnd:false}));});}
  /* status LEDs: a small rectangular SMD LED just off the top-left corner of the attack and defend footprints; the chip's first top pin drives its anode, its cathode goes to a ground via */
  const LEDS={},LL=big?12:10,LW=big?5.5:4.5,LP=big?3.6:3;
  for(const k of ['attack','defend']){const c=C[k];if(!c||!pins[k].top||!padId.has(k+'top0'))continue;
   const ax=c.x+pins[k].top[0],cy=c.y-PADL-CL-LW/2-1.5,x0=ax+LP/2-LL,body={x:x0,y:cy-LW/2,w:LL,h:LW},gv={x:x0-2-VR,y:cy},net=++netSeq;
   const feed=[{x:ax,y:c.y-(PADL-1)},{x:ax,y:cy+LW/2-.5}],tie=[{x:x0+LP/2,y:cy},gv];
   if(!onBoard({x:x0,y:cy-LW/2},1)||!onBoard(gv,VR+1)||labels.some(r=>overlap(body,r,1)||inside(gv,r,VR+1))||!rectFree(body,CL)||!okLine(feed,W,net,new Set([padId.get(k+'top0')]))||!okVia(gv,VR,net))continue;
   addFeat({a:{x:x0+LP/2,y:cy},b:{x:x0+LL-LP/2,y:cy},w:LW,net});
   putLine(feed,W,net);T.push({pts:feed,w:W,gnd:false});usedPins.add(k+'top0');
   putLine(tie,W,net,true);T.push({pts:tie,w:W,gnd:true});putVia(gv,VR,net,true);V.push({c:gv,r:VR,gnd:true});
   PADS.push({x:x0,y:cy-LW/2,w:LP,h:LW},{x:x0+LL-LP,y:cy-LW/2,w:LP,h:LW});
   LEDS[k]={x0,cy,feed};}
  function meander(line,sgn,bumps){let bi=-1,bl=0;for(let i=1;i<line.length;i++){const l=Math.hypot(line[i].x-line[i-1].x,line[i].y-line[i-1].y);if(l>bl){bl=l;bi=i;}}const a=S,need=bumps*4*a-a+12;if(bi<0||bl<need)return line;
   const p0=line[bi-1],p1=line[bi],ux=(p1.x-p0.x)/bl,uy=(p1.y-p0.y)/bl,mx=-uy*sgn,my=ux*sgn;let t=(bl-(bumps*4*a-a))/2;const ins=[];
   for(let b=0;b<bumps;b++){const q=k=>({x:p0.x+ux*k,y:p0.y+uy*k});const s0=q(t),s1=q(t+a),s2=q(t+2*a),s3=q(t+3*a);ins.push(s0,{x:s1.x+mx*a,y:s1.y+my*a},{x:s2.x+mx*a,y:s2.y+my*a},s3);t+=4*a;}
   if(!clear(ins,W+1))return line;return line.slice(0,bi).concat(ins,line.slice(bi));}
  /* the n lines of a bus along a centre line: at a chip end the lines leave consecutive pads at the pin pitch and neck down to the bus pitch; a via end lands on a staggered row of vias. Nothing is placed until it passes the design rules */
  function busLines(pts,n,a,b,viaA,viaB,lead,wiggle){const h=(n-1)/2,neck=lead>=L1+h*(PITCH-S)+2,sp=neck?S:PITCH,lines=[],vs=[];
   for(let j=0;j<n;j++){const oi=j-h,l=offset(pts,oi*sp),st=oi*ST;let line=l;
    if(a&&!viaA){const nx=-a.dy,ny=a.dx;if(neck){const pad={x:a.x+nx*oi*PITCH,y:a.y+ny*oi*PITCH},j1={x:pad.x+a.dx*L1,y:pad.y+a.dy*L1},r=L1+Math.abs(oi)*(PITCH-S),j2={x:a.x+a.dx*r+nx*oi*S,y:a.y+a.dy*r+ny*oi*S};line=[pad,j1,j2].concat(l.slice(1));}}
    else if(viaA){line=[{x:l[0].x,y:l[0].y+st}].concat(l.slice(1));vs.push(line[0]);}
    if(b&&!viaB){const nx=b.dy,ny=-b.dx;if(neck){const e=line.length-1,pad={x:b.x+nx*oi*PITCH,y:b.y+ny*oi*PITCH},j1={x:pad.x+b.dx*L1,y:pad.y+b.dy*L1},r=L1+Math.abs(oi)*(PITCH-S),j2={x:b.x+b.dx*r+nx*oi*S,y:b.y+b.dy*r+ny*oi*S};line=line.slice(0,e).concat([j2,j1,pad]);}}
    else if(viaB){const e=line.length-1;line=line.slice(0,e).concat([{x:line[e].x,y:line[e].y+st}]);vs.push(line[line.length-1]);}
    if(wiggle&&n>=3&&(j===0||j===n-1))line=meander(line,j===0?-1:1,j===0?3:2);
    lines.push(line);}
   return {lines,vs};}
  /* the maze router: a bus centre line found by A* on a 2–3px grid, eight directions and 45° turns only (so every corner is chamfered), around labels, heading rows, the other chips, the piles, the LEDs and all copper already placed, each grown by the bus half-width plus clearance. A link allowed under the action panel treats it as free: those stretches run on an inner layer and are not drawn */
  const DIRS=[[1,0],[1,-1],[0,-1],[-1,-1],[-1,0],[-1,1],[0,1],[1,1]],dirOf=(dx,dy)=>DIRS.findIndex(q=>q[0]===Math.sign(dx)&&q[1]===Math.sign(dy));
  const GS=big?3:2,headRows=[...boxes('.opponent-heading'),...boxes('.hand-tools')],chipKeep=Object.values(C).map(c=>({x:c.x-PADL-CL,y:c.y-PADL-CL,w:c.w+2*(PADL+CL),h:c.h+2*(PADL+CL)}));
  const PRAD=abox?Math.max(4,parseFloat(getComputedStyle(ab).borderTopLeftRadius)||12):0,t0=performance.now();
  const keepRects=under=>{const r=chipKeep.concat(labels.map(l=>({x:l.x-1,y:l.y-1,w:l.w+2,h:l.h+2})),headRows,pilesKeep?[pilesKeep]:[]);if(abox&&!under)r.push({x:abox.x-2,y:abox.y-2,w:abox.w+4,h:abox.h+4});return r;};
  const quickFree=(p,R,under)=>onBoard(p,R+.5)&&!keepRects(under).some(r=>inside(p,r,R))&&okVia(p,Math.max(.1,R-CL),-999);
  function astar(st,sDir,gl,gDir,R,under,M){
   const x0=Math.max(0,Math.min(st.x,gl.x)-M),y0=Math.max(0,Math.min(st.y,gl.y)-M),x1=Math.min(tw,Math.max(st.x,gl.x)+M),y1=Math.min(th,Math.max(st.y,gl.y)+M);
   const ox=st.x-Math.floor((st.x-x0)/GS)*GS,oy=st.y-Math.floor((st.y-y0)/GS)*GS,nx=Math.floor((x1-ox)/GS)+1,ny=Math.floor((y1-oy)/GS)+1,N=nx*ny;
   const si=Math.round((st.x-ox)/GS),sj=Math.round((st.y-oy)/GS),gi=Math.round((gl.x-ox)/GS),gj=Math.round((gl.y-oy)/GS);
   if(gi<0||gj<0||gi>=nx||gj>=ny)return null;
   const blk=new Uint8Array(N);
   const markRect=(r,m)=>{const a0=Math.max(0,Math.ceil((r.x-m-ox)/GS)),a1=Math.min(nx-1,Math.floor((r.x+r.w+m-ox)/GS)),b0=Math.max(0,Math.ceil((r.y-m-oy)/GS)),b1=Math.min(ny-1,Math.floor((r.y+r.h+m-oy)/GS));for(let j=b0;j<=b1;j++)for(let i=a0;i<=a1;i++)blk[j*nx+i]=1;};
   const markFeat=(f,e)=>{const xa=f.r!=null?f.c.x:Math.min(f.a.x,f.b.x),xb=f.r!=null?f.c.x:Math.max(f.a.x,f.b.x),ya=f.r!=null?f.c.y:Math.min(f.a.y,f.b.y),yb=f.r!=null?f.c.y:Math.max(f.a.y,f.b.y);
    const a0=Math.max(0,Math.ceil((xa-e-ox)/GS)),a1=Math.min(nx-1,Math.floor((xb+e-ox)/GS)),b0=Math.max(0,Math.ceil((ya-e-oy)/GS)),b1=Math.min(ny-1,Math.floor((yb+e-oy)/GS));
    for(let j=b0;j<=b1;j++)for(let i=a0;i<=a1;i++){if(blk[j*nx+i])continue;const p={x:ox+i*GS,y:oy+j*GS};if((f.r!=null?Math.hypot(p.x-f.c.x,p.y-f.c.y):ptSeg(p,f.a,f.b))<e)blk[j*nx+i]=1;}};
   for(let j=0;j<ny;j++)for(let i=0;i<nx;i++)if(!onBoard({x:ox+i*GS,y:oy+j*GS},R+.5))blk[j*nx+i]=1;
   for(const r of keepRects(under))markRect(r,R);
   if(abox&&under)for(const c of [{x:abox.x,y:abox.y},{x:abox.x+abox.w,y:abox.y},{x:abox.x,y:abox.y+abox.h},{x:abox.x+abox.w,y:abox.y+abox.h}])markFeat({c,r:PRAD},PRAD+R);
   for(const f of nearFeats(x0,y0,x1,y1))markFeat(f,(f.r!=null?f.r:f.w/2)+R);
   const S0=sj*nx+si,G0=gj*nx+gi;if(blk[S0]||blk[G0])return null;
   const SQ=Math.SQRT2,TURN=GS*3,g=new Float32Array(N*8).fill(Infinity),par=new Int32Array(N*8).fill(-1),hv=(i,j)=>{const dx=Math.abs(i-gi),dy=Math.abs(j-gj);return GS*(Math.max(dx,dy)+(SQ-1)*Math.min(dx,dy));};
   const hf=[],hs=[],push=(f,x)=>{hf.push(f);hs.push(x);let k=hf.length-1;while(k>0){const q=(k-1)>>1;if(hf[q]<=hf[k])break;[hf[q],hf[k]]=[hf[k],hf[q]];[hs[q],hs[k]]=[hs[k],hs[q]];k=q;}};
   const pop=()=>{const x=hs[0],lf=hf.pop(),ls=hs.pop();if(hf.length){hf[0]=lf;hs[0]=ls;let k=0;for(;;){const l=2*k+1,r=l+1;let m=k;if(l<hf.length&&hf[l]<hf[m])m=l;if(r<hf.length&&hf[r]<hf[m])m=r;if(m===k)break;[hf[m],hf[k]]=[hf[k],hf[m]];[hs[m],hs[k]]=[hs[k],hs[m]];k=m;}}return x;};
   const s0=S0*8+sDir;g[s0]=0;push(hv(si,sj),s0);let found=-1,pops=0;
   while(hf.length&&pops<90000){const x=pop();pops++;const node=x>>3,dr=x&7,i=node%nx,j=(node-i)/nx;if(node===G0&&dr===gDir){found=x;break;}const gx=g[x];
    for(const dd of [dr,(dr+1)&7,(dr+7)&7]){const mx=DIRS[dd][0],my=DIRS[dd][1],ni=i+mx,nj=j+my;if(ni<0||nj<0||ni>=nx||nj>=ny)continue;const nn=nj*nx+ni;if(blk[nn])continue;if(mx&&my&&(blk[j*nx+ni]||blk[nj*nx+i]))continue;
     const ns=nn*8+dd,cost=gx+(mx&&my?GS*SQ:GS)+(dd!==dr?TURN:0);if(cost<g[ns]){g[ns]=cost;par[ns]=x;push(cost+hv(ni,nj),ns);}}}
   if(found<0)return null;
   const chain=[];for(let x=found;x>=0;x=par[x])chain.push(x);chain.reverse();
   const out=[{x:st.x,y:st.y}];for(let k=1;k<chain.length;k++)if((chain[k]&7)!==(chain[k-1]&7)&&k>1){const nd=chain[k-1]>>3,ii=nd%nx;out.push({x:ox+ii*GS,y:oy+(nd-ii)/nx*GS});}
   if(out.length>1){const pv=out[out.length-1];if(DIRS[gDir][0]===0)pv.x=gl.x;else pv.y=gl.y;}
   out.push({x:gl.x,y:gl.y});return out;}
  function segIn(a,b,R){let u0=0,u1=1;const dx=b.x-a.x,dy=b.y-a.y,p=[-dx,dx,-dy,dy],q=[a.x-R.x,R.x+R.w-a.x,a.y-R.y,R.y+R.h-a.y];for(let i=0;i<4;i++){if(Math.abs(p[i])<1e-9){if(q[i]<0)return null;continue;}const t=q[i]/p[i];if(p[i]<0){if(t>u1)return null;if(t>u0)u0=t;}else{if(t<u0)return null;if(t<u1)u1=t;}}return u1-u0>1e-6?[u0,u1]:null;}
  /* the parts of a polyline outside a rectangle */
  function clipOut(pl,R){const out=[];let cur=[];const lerp=(a,b,t)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t}),add=p=>{const l=cur[cur.length-1];if(!l||Math.hypot(p.x-l.x,p.y-l.y)>.05)cur.push(p);};
   for(let i=1;i<pl.length;i++){const a=pl[i-1],b=pl[i],iv=segIn(a,b,R);if(!iv){add(a);add(b);continue;}if(iv[0]>0){add(a);add(lerp(a,b,iv[0]));}if(cur.length>1)out.push(cur);cur=[];if(iv[1]<1){add(lerp(a,b,iv[1]));add(b);}}
   if(cur.length>1)out.push(cur);return out.filter(f=>f.reduce((m,p,k)=>k?m+Math.hypot(p.x-f[k-1].x,p.y-f[k-1].y):0,0)>1.5);}
  const groups=(key,c,side,frac,h)=>{const pos=pins[key][side],want=frac*(isV(side)?c.w:c.h),out=[];for(let i=h;i<pos.length-h;i++){let ok=true;for(let j=i-h;j<=i+h;j++)if(usedPins.has(key+side+j)||!padId.has(key+side+j))ok=false;if(ok)out.push(i);}return out.sort((x,y)=>Math.abs(pos[x]-want)-Math.abs(pos[y]-want));};
  function sidesFor(a,b){const dx=(b.x+b.w/2)-(a.x+a.w/2),dy=(b.y+b.h/2)-(a.y+a.h/2),hA=dx>0?'right':'left',vA=dy>0?'bottom':'top',hB=dx>0?'left':'right',vB=dy>0?'top':'bottom',out=[Math.abs(dx)>Math.abs(dy)?[hA,hB]:[vA,vB],[hA,vB],[vA,hB]];return out.filter((p,i)=>out.findIndex(q=>q[0]===p[0]&&q[1]===p[1])===i);}
  /* a link joins two chips with the widest bus that fits (five lines, three, one), trying the facing sides first, then the L-shaped pairs, a few pin groups each */
  const flows={};const flowOf=(ka,kb)=>flows[ka+'>'+kb]||'ab';
  function connect(ka,kb,o={}){const a=C[ka],b=C[kb];if(!a||!b)return false;if(o.flow)flows[ka+'>'+kb]=o.flow;
   const pairs=o.sides||sidesFor(a,b);
   for(const under of o.under?[false,true]:[false])for(const [sa,sb] of pairs)for(const n of [5,3,1]){if(!pins[ka][sa]||!pins[kb][sb])continue;
    const h=(n-1)/2,H=h*S,R=H+W/2+CL,neck=n>1?L1+h*(PITCH-S):0,D0=Math.max(neck+2,PADL+CL+R+1+GS);
    const A0=groups(ka,a,sa,o.fa??.5,h).slice(0,n===5?1:2);
    for(const ia of A0){if(performance.now()-t0>150)return false;const pa=port(a,sa,pins[ka][sa][ia]);
     /* facing sides: go straight across with one 45° jog when the pins do not line up */
     let tried=false;
     if(pa.dx===-port(b,sb,0).dx&&pa.dy===-port(b,sb,0).dy){const tx=-pa.dy,ty=pa.dx,ib=groups(kb,b,sb,.5,h).sort((x,y)=>{const px1=port(b,sb,pins[kb][sb][x]),px2=port(b,sb,pins[kb][sb][y]);return Math.abs((px1.x-pa.x)*tx+(px1.y-pa.y)*ty)-Math.abs((px2.x-pa.x)*tx+(px2.y-pa.y)*ty);})[0];
      if(ib!=null){const pb=port(b,sb,pins[kb][sb][ib]),dl=(pb.x-pa.x)*tx+(pb.y-pa.y)*ty,gap=(pb.x-pa.x)*pa.dx+(pb.y-pa.y)*pa.dy,lead=Math.min(D0,(gap-Math.abs(dl))/2-.5);
       if(gap>4&&lead>=1){tried=true;const A={x:pa.x+pa.dx*lead,y:pa.y+pa.dy*lead},J={x:A.x+tx*dl+pa.dx*Math.abs(dl),y:A.y+ty*dl+pa.dy*Math.abs(dl)},B={x:pb.x+pb.dx*lead,y:pb.y+pb.dy*lead};
        const center=[pa,A,J,B,pb].filter((p,k,arr)=>!k||Math.hypot(p.x-arr[k-1].x,p.y-arr[k-1].y)>.3);
        if(place(ka,kb,sa,sb,ia,ib,n,center,pa,pb,lead,under))return true;}}}
     if(tried&&!o.sides)continue;
     const st={x:pa.x+pa.dx*D0,y:pa.y+pa.dy*D0};if(!quickFree(st,R,under))continue;
     const B0=groups(kb,b,sb,o.fb??.5,h).slice(0,n===5?1:2);
     for(const ib of B0){const pb=port(b,sb,pins[kb][sb][ib]),gl={x:pb.x+pb.dx*D0,y:pb.y+pb.dy*D0};if(!quickFree(gl,R,under))continue;
      /* a link allowed to go the long way (round the action panel) gets one search over the whole board */
      let path=astar(st,dirOf(pa.dx,pa.dy),gl,dirOf(-pb.dx,-pb.dy),R,under,70);if(!path&&o.far&&!under&&ia===A0[0]&&ib===B0[0])path=astar(st,dirOf(pa.dx,pa.dy),gl,dirOf(-pb.dx,-pb.dy),R,under,Math.max(tw,th));if(!path)continue;
      if(place(ka,kb,sa,sb,ia,ib,n,[pa,...path,pb],pa,pb,D0,under))return true;}}}
   return false;}
  /* lay a bus along a centre line if every visible line passes the design rules; under the panel the lines are clipped away */
  function place(ka,kb,sa,sb,ia,ib,n,center,pa,pb,lead,under){const h=(n-1)/2,net=++netSeq,allow=new Set();for(let j=-h;j<=h;j++){allow.add(padId.get(ka+sa+(ia+j)));allow.add(padId.get(kb+sb+(ib+j)));}
   for(const wiggle of [true,false]){let lines=busLines(center,n,pa,pb,false,false,lead,wiggle).lines;
    if(under&&abox){const cr={x:abox.x+W,y:abox.y+W,w:abox.w-2*W,h:abox.h-2*W};lines=lines.flatMap(l=>clipOut(l,cr));}
    if((!under&&!lines.length)||!lines.every(l=>okLine(l,W,net,allow)&&(under||!hits(l.slice(1,-1),labels,W/2+1))))continue;
    for(const l of lines){putLine(l,W,net);T.push({pts:l,w:W,gnd:false});}
    for(let j=-h;j<=h;j++){usedPins.add(ka+sa+(ia+j));usedPins.add(kb+sb+(ib+j));}
    LINKS.push({a:ka,b:kb,lines,flow:flowOf(ka,kb)});return true;}
   return false;}
  /* the wiring follows the game: each hand to its wound rack, each wound rack to the attack zone (yours runs under the action panel), and the attack zone to the defence zone */
  connect('oppHand','oppWound');connect('ownWound','ownHand',{flow:'ba'});
  connect('attack','defend',{sides:[['bottom','bottom']],fa:1,fb:0,under:true});
  connect('oppWound','attack',{fb:.85});
  connect('ownWound','attack',{sides:[['left','left'],['left','bottom'],['top','bottom']],fb:.5,under:true,far:true});
  /* every free pin carries a trace if the rules allow: on a long side the six pins nearest each corner turn 45° together and run past the corner as a bus, ending in a diagonal of vias; the middle pin of a long side takes a wide power trace to a via pair; the rest dog-bone to vias in three staggered rows, every few of the long ones going to ground (tied into the pour) or to a test point */
  for(const k in C){const c=C[k];
   for(const side in pins[k]){const pos=pins[k][side],n=pos.length,len=isV(side)?c.w:c.h,v=isV(side);
    const O=v?{x:0,y:side==='top'?-1:1}:{x:side==='left'?-1:1,y:0},A=v?{x:1,y:0}:{x:0,y:1},c0=v?{x:c.x,y:side==='top'?c.y:c.y+c.h}:{x:side==='left'?c.x:c.x+c.w,y:c.y},g=(t,o)=>({x:c0.x+A.x*t+O.x*o,y:c0.y+A.y*t+O.y*o});
    const free=i=>!usedPins.has(k+side+i),longSide=len>=Math.max(c.w,c.h)-1,EG=longSide?6:0;
    let head=0;while(head<Math.min(EG,n)&&free(head))head++;let tail=0;while(tail<Math.min(EG,n-head)&&free(n-1-tail))tail++;
    const others=blockers.filter(b=>b!==c);
    const place=(i,pts,ends,o={})=>{const net=++netSeq,w=o.w||W,allow=new Set([padId.get(k+side+i)]);
     if(!clear(pts.slice(1),w/2+1)||hits(pts,others,w/2+1.5)||!okLine(pts,w,net,allow))return false;
     for(const e of ends)if(!clear([e.c],e.r+1)||!okVia(e.c,e.r,net,allow))return false;
     putLine(pts,w,net,o.gnd);T.push({pts,w,gnd:!!o.gnd});
     for(const e of ends){putVia(e.c,e.r,net,o.gnd);(o.tp?TPS:V).push({c:e.c,r:e.r,gnd:!!o.gnd});}
     usedPins.add(k+side+i);return true;};
    const stub=(i,kind)=>{const t=pos[i],s0=g(t,PADL-1);
     if(kind==='power'){for(const L of [24,30]){const e=g(t,PADL+L);if(place(i,[s0,e],[{c:g(t-(VR+.8),PADL+L),r:VR},{c:g(t+(VR+.8),PADL+L),r:VR}],{w:2*W}))return true;}return false;}
     if(kind==='gnd'||kind==='tp'){const r=kind==='tp'?VR+.8:VR,e=g(t,PADL+16+r);if(place(i,[s0,e],[{c:e,r}],{gnd:kind==='gnd',tp:kind==='tp'}))return true;}
     for(const L of [[4,10,16][i%3],4]){const e=g(t,PADL+L+VR);if(place(i,[s0,e],[{c:e,r:VR}]))return true;}return false;};
    const escape=(idx,dir)=>{const m=idx.length;if(!m)return;const o0=PADL+S+1;idx.forEach(i=>{const r=dir>0?idx[m-1]-i:i-idx[0],o=o0+r*S,t=pos[i],ends=[dir>0?len+6+r*(2*VR+2):-(6+r*(2*VR+2)),t+dir*(S+10+r*(2*VR+2))];
      for(const te of ends){const pts=[g(t,PADL-1),g(t,o-S),g(t+dir*S,o),g(te,o)];if(place(i,pts,[{c:pts[3],r:VR}]))return;}stub(i,'sig');});};
    escape(Array.from({length:head},(_,i)=>i).filter(free),-1);escape(Array.from({length:tail},(_,i)=>n-tail+i).filter(free),1);
    const mid=Math.floor(n/2);
    for(let i=head;i<n-tail;i++){if(!free(i))continue;if(longSide&&i===mid&&stub(i,'power'))continue;const kk=Math.floor(i/3)%3;stub(i,i%3===2?(kk===0?'gnd':kk===1?'tp':'sig'):'sig');}
    for(let i=0;i<n;i++){if(!free(i))continue;const t=pos[i],s0=g(t,PADL-1),e=g(t,PADL-1+CLP+1.5),net=++netSeq,allow=new Set([padId.get(k+side+i)]);
     if(onBoard(e,1)&&!labels.some(r=>inside(e,r,1))&&!others.some(b=>!rows.includes(b)&&!labels.includes(b)&&inside(e,b,1))&&okLine([s0,e],W,net,allow)&&okVia(e,W/2+CLP-CL+.5,net,allow)){putLine([s0,e],W,net,true);T.push({pts:[s0,e],w:W,gnd:true});usedPins.add(k+side+i);}}}}
  const unrouted=new Set();for(const p of PADS)if(p.key&&!usedPins.has(p.key))unrouted.add(p.key);
  /* decoupling capacitors beyond the via rows: a populated two-pad part, one pad to a power via, the other to a ground via in the pour */
  const CA=PADW,CB=PADW+1,CG=2,D=PADL+16+2*VR+CL+CB/2+2;
  for(const k in C){const c=C[k];for(const side in pins[k]){const len=isV(side)?c.w:c.h;if(len<56)continue;
   for(const f of [.24,.76]){const p=port(c,side,f*len),cx=p.x+p.dx*D,cy=p.y+p.dy*D,ex=-p.dy,ey=p.dx,net=++netSeq,parts=[];
    for(const [sgn,gnd] of [[-1,false],[1,true]]){const q={x:cx+ex*sgn*(CA/2+CG/2),y:cy+ey*sgn*(CA/2+CG/2)},vv={x:cx+ex*sgn*(CA/2+CG/2+4.5)+p.dx*(CB/2+3),y:cy+ey*sgn*(CA/2+CG/2+4.5)+p.dy*(CB/2+3)};parts.push({q,tr:[{x:q.x+p.dx*CB/2,y:q.y+p.dy*CB/2},vv],v:vv,gnd});}
    if(!clear(parts.flatMap(t=>[t.q,t.v]),VR+2))continue;
    if(!parts.every(t=>okVia(t.q,CB/2+.5,net)&&okLine(t.tr,W,net)&&okVia(t.v,VR,net)))continue;
    const horiz=ex!==0;
    for(const t of parts){putVia(t.q,CB/2+.5,net,false);putLine(t.tr,W,net,t.gnd);putVia(t.v,VR,net,t.gnd);T.push({pts:t.tr,w:W,gnd:t.gnd});V.push({c:t.v,r:VR,gnd:t.gnd});
     PADS.push(horiz?{x:t.q.x-CA/2,y:t.q.y-CB/2,w:CA,h:CB}:{x:t.q.x-CB/2,y:t.q.y-CA/2,w:CB,h:CA});}
    CAPS.push({cx,cy,horiz});}}}
  /* plated mounting holes in free corners, then three fiducials near the corners */
  const MR=big?7.5:6.5;
  for(const [hx,hy] of [[E+RAD-E,E+RAD-E],[tw-RAD,E+RAD-E],[E+RAD-E,th-RAD],[tw-RAD,th-RAD]]){const c={x:Math.max(hx,E+MR+1),y:Math.max(hy,E+MR+1)};c.x=hx>tw/2?Math.min(c.x,tw-E-MR-1):c.x;c.y=hy>th/2?Math.min(c.y,th-E-MR-1):c.y;
   if(!onBoard(c,MR)||blockers.some(b=>inside(c,b,MR+1))||!rectFree({x:c.x-MR,y:c.y-MR,w:2*MR,h:2*MR},1))continue;putVia(c,MR,++netSeq,true);MHS.push(c);}
  const FK=big?6.5:5.5,spiral=(x,y,maxD,fn)=>{for(let dd=0;dd<=maxD;dd+=4)for(let a=0;a<(dd?8:1);a++){const c={x:x+Math.cos(a*Math.PI/4)*dd,y:y+Math.sin(a*Math.PI/4)*dd};if(fn(c))return c;}return null;};
  for(const [fx,fy] of [[E+RAD+14,E+RAD+2],[tw-E-RAD-14,E+RAD+2],[E+RAD+2,th-E-RAD-14]]){const c=spiral(fx,fy,40,c=>onBoard(c,FK+1)&&!blockers.some(b=>inside(c,b,FK+1))&&rectFree({x:c.x-FK,y:c.y-FK,w:2*FK,h:2*FK},.5));if(c){putVia(c,FK,++netSeq,false);FIDS.push(c);}}
  /* silkscreen: footprint corner marks (never on a pad), pin-1 markers, reference designators, the board label and logo, mounting-hole rings */
  const spotFree=(R,m)=>onBoard({x:R.x,y:R.y},1)&&onBoard({x:R.x+R.w,y:R.y},1)&&onBoard({x:R.x,y:R.y+R.h},1)&&onBoard({x:R.x+R.w,y:R.y+R.h},1)&&!blockers.some(b=>overlap(R,b,m))&&!silkRects.some(b=>overlap(R,b,1))&&rectFree(R,m);
  let corners='';
  for(const k in C){const c=C[k],pm=pins[k];
   for(const side of ['top','bottom','left','right']){const len=isV(side)?c.w:c.h,pos=pm[side],seg=(t0,t1)=>{const a=port(c,side,t0),b=port(c,side,t1);corners+=`M${n1(a.x)} ${n1(a.y)}L${n1(b.x)} ${n1(b.y)}`;};
    if(!pos){seg(0,len);continue;}const m=pos[0]-PADW/2-1.6;if(m>=2.5){seg(0,m);seg(len-m,len);}}
   const out={x:c.x-3.4,y:c.y-3.4},pin1=rectFree({x:out.x-1.2,y:out.y-1.2,w:2.4,h:2.4},.8)&&!blockers.some(b=>b!==c&&inside(out,b,1))&&onBoard(out,1)?out:{x:c.x+3.4,y:c.y+3.4};silk+=`<circle class="skf" cx="${n1(pin1.x)}" cy="${n1(pin1.y)}" r="1.1"/>`;}
  silk+=`<path class="sk" d="${corners}"/>`;
  let u=0;for(const k of ['oppHand','oppWound','attack','defend','ownWound','ownHand']){const c=C[k];if(!c)continue;u++;const s='U'+u,w=s.length*FS*.62+.6,h=FS*.78,cand=[];
   for(let dd=3;dd<=27;dd+=3)cand.push({x:c.x-w-dd,y:c.y-h-dd},{x:c.x-w-dd,y:c.y+2},{x:c.x+2,y:c.y-h-dd},{x:c.x+c.w+dd,y:c.y-h-dd},{x:c.x-w-dd,y:c.y+c.h-h-2});
   for(const R0 of cand){const R={x:R0.x,y:R0.y,w,h};if(spotFree(R,1.2)){silk+=`<text class="skt" x="${n1(R.x)}" y="${n1(R.y+FS*.74)}" font-size="${FS}">${s}</text>`;silkRects.push(R);break;}}}
  let dn=0;for(const k of ['attack','defend']){const L=LEDS[k];if(!L)continue;dn++;const s='D'+dn,w=s.length*FS*.62+.6,h=FS*.78;
   silk+=`<path class="sk" d="M${n1(L.x0)} ${n1(L.cy-LW/2-1.3)}H${n1(L.x0+LL)}M${n1(L.x0)} ${n1(L.cy+LW/2+1.3)}H${n1(L.x0+LL)}M${n1(L.x0-1.4)} ${n1(L.cy-LW/2-1.3)}V${n1(L.cy+LW/2+1.3)}"/>`;
   for(const R0 of [{x:L.x0,y:L.cy-LW/2-h-3},{x:L.x0+LL+3,y:L.cy-h/2},{x:L.x0-w-3-2*VR,y:L.cy-LW/2-h-2}]){const R={x:R0.x,y:R0.y,w,h};if(spotFree(R,1)){silk+=`<text class="skt" x="${n1(R.x)}" y="${n1(R.y+FS*.74)}" font-size="${FS}">${s}</text>`;silkRects.push(R);break;}}}
  {const L1s='HUAPAI MB-01 REV A',L2s='MADE IN SHENZHEN 2643',lw=Math.max(L1s.length,L2s.length)*FS*.62,logo=FS*2.3,R={w:logo+FS*.6+lw,h:FS*2.3},step=big?8:6;let best=null,bs=1e9;
   for(let y=E+4;y+R.h<th-E-4;y+=step)for(let x=E+4;x+R.w<tw-E-4;x+=step){const edge=Math.min(x-E,tw-E-(x+R.w)),s=edge+Math.abs(y+R.h/2-th*.62)*.35;if(s>=bs)continue;const Rc={x,y,w:R.w,h:R.h};if(spotFree(Rc,2.5)){best=Rc;bs=s;}}
   if(best){silkRects.push(best);const mark=(window.SZFlowerMark||'').replace(/^<svg[^>]*>/,'').replace(/<\/svg>$/,'');
    if(mark)silk+=`<svg class="sklogo" x="${n1(best.x)}" y="${n1(best.y)}" width="${n1(logo)}" height="${n1(logo)}" viewBox="8 12 48 48">${mark}</svg>`;
    const tx=best.x+(mark?logo+FS*.6:0);silk+=`<text class="skt" x="${n1(tx)}" y="${n1(best.y+FS*.86)}" font-size="${FS}">${L1s}</text><text class="skt" x="${n1(tx)}" y="${n1(best.y+FS*2.02)}" font-size="${FS}">${L2s}</text>`;}}
  for(const m of MHS)silk+=`<circle class="sk" cx="${n1(m.x)}" cy="${n1(m.y)}" r="${n1(MR-.6)}"/>`;
  /* stitching vias: a lattice through the pour, each at least a pour clearance from any other net */
  const G=big?30:24,RS=VR*.85;
  for(let row=0,y=E+10;y<th-E-6;y+=G*.866,row++)for(let x=E+10+(row%2?G/2:0);x<tw-E-6;x+=G){const c={x,y};
   if(!onBoard(c,RS+4)||blockers.some(b=>inside(c,b,RS+4))||silkRects.some(b=>inside(c,b,RS+1.5)))continue;
   let ok=true;for(const f of nearFeats(c.x-14,c.y-14,c.x+14,c.y+14)){const need=(f.r!=null?f.r:f.w/2)+RS+(f.gnd?CL:CLP+1);if((f.r!=null?Math.hypot(f.c.x-c.x,f.c.y-c.y):ptSeg(c,f.a,f.b))<need){ok=false;break;}}
   if(!ok)continue;putVia(c,RS,++netSeq,true);V.push({c,r:RS,gnd:true,stitch:true});}
  /* the pour: the board inset from its edge, minus every chip body and a moat around all copper that is not ground; ground traces and vias are part of it. It runs under text and the panel, as on a real board */
  const rr=(r,m,rx)=>`<rect x="${n1(r.x-m)}" y="${n1(r.y-m)}" width="${n1(r.w+2*m)}" height="${n1(r.h+2*m)}" rx="${n1(rx)}"/>`,cc=(c,r)=>`<circle cx="${n1(c.x)}" cy="${n1(c.y)}" r="${n1(r)}"/>`;
  let black='',white='';const moats=new Map(),ties=new Map(),strokes=new Map();
  for(const k in C)black+=rr(C[k],0,3);if(pilesKeep)black+=rr(pilesKeep,0,5);
  const shown=PADS.filter(p=>!p.key||!unrouted.has(p.key));for(const p of shown)black+=rr(p,CLP,CLP);
  for(const t of T){const m=t.gnd?ties:moats,key=n1(t.gnd?t.w:t.w+2*CLP);m.set(key,(m.get(key)||'')+d(t.pts));const sk=n1(t.w);strokes.set(sk,(strokes.get(sk)||'')+d(t.pts));}
  for(const [w,p] of moats)black+=`<path d="${p}" fill="none" stroke="#000" stroke-width="${w}"/>`;
  for(const v of V)if(!v.gnd)black+=cc(v.c,v.r+CLP);for(const t of TPS)black+=cc(t.c,t.r+CLP);for(const f of FIDS)black+=cc(f,FK);
  for(const [w,p] of ties)white+=`<path d="${p}" fill="none" stroke="#fff" stroke-width="${w}"/>`;for(const v of V)if(v.gnd&&!v.stitch)white+=cc(v.c,v.r);
  let cu='';for(const [w,p] of strokes)cu+=`<path class="t" stroke-width="${w}" d="${p}"/>`;for(const v of V)cu+=`<circle class="via" cx="${n1(v.c.x)}" cy="${n1(v.c.y)}" r="${n1(v.r)}"/>`;
  let fin='';for(const p of shown)fin+=`<rect x="${n1(p.x)}" y="${n1(p.y)}" width="${n1(p.w)}" height="${n1(p.h)}" rx="${n1(Math.min(p.w,p.h)*.32)}"/>`;
  for(const t of TPS)fin+=cc(t.c,t.r);for(const f of FIDS)fin+=cc(f,big?1.7:1.4);for(const m of MHS)fin+=cc(m,MR*.66);
  let open='';for(const f of FIDS)open+=cc(f,FK-2);
  let parts='';for(const p of CAPS){const L=2*CA+CG-.6,Wd=CB-.9,bl=CG+.8,o=p.horiz?{x:p.cx-L/2,y:p.cy-Wd/2,w:L,h:Wd}:{x:p.cx-Wd/2,y:p.cy-L/2,w:Wd,h:L},b=p.horiz?{x:p.cx-bl/2,y:p.cy-Wd/2,w:bl,h:Wd}:{x:p.cx-Wd/2,y:p.cy-bl/2,w:Wd,h:bl};parts+=`<rect class="term" x="${n1(o.x)}" y="${n1(o.y)}" width="${n1(o.w)}" height="${n1(o.h)}" rx=".5"/><rect class="body" x="${n1(b.x)}" y="${n1(b.y)}" width="${n1(b.w)}" height="${n1(b.h)}"/>`;}
  for(const k in LEDS){const L=LEDS[k],bx=L.x0+LP*.55,bw=LL-LP*1.1;parts+=`<rect class="lens" x="${n1(bx)}" y="${n1(L.cy-LW*.46)}" width="${n1(bw)}" height="${n1(LW*.92)}" rx=".6"/><rect class="die" x="${n1(L.x0+LL/2-.8)}" y="${n1(L.cy-.8)}" width="1.6" height="1.6"/>`;}
  let holes='';for(const v of V)holes+=cc(v.c,v.r*.42);for(const m of MHS)holes+=cc(m,MR*.4);
  const defs=`<defs><mask id="sz-pour" maskUnits="userSpaceOnUse" x="0" y="0" width="${tw}" height="${th}"><rect x="${E}" y="${E}" width="${tw-2*E}" height="${th-2*E}" rx="${n1(RAD-E)}" fill="#fff"/><g fill="#000">${black}</g><g fill="#fff">${white}</g></mask></defs>`;
  {let pk='';const sp=big?150:120,dash=big?22:16;LINKS.forEach((l,i)=>{if(!l.lines.length)return;const ord=l.lines.slice().sort((x,y)=>plen(y)-plen(x)),pick=[ord[0]];if(l.lines.length>=5)pick.push(l.lines[l.lines.length-1]);pick.forEach((ln,j)=>{const pts=l.flow==='ba'?ln.slice().reverse():ln;pk+=packet(pts,W*3,dash,sp,i*1.9+j*1.3,'glow')+packet(pts,W*.9,dash,sp,i*1.9+j*1.3,'core');});});pulseSvg.innerHTML=pk;}
  lastKey=key;lastCache={LEDS,LINKS,LL,LW,LP,W};paintSignal(lastCache);
  svg.innerHTML=defs+`<g class="g-pour"><rect x="0" y="0" width="${tw}" height="${th}" mask="url(#sz-pour)"/></g><g class="g-open">${open}</g><g class="g-cu">${cu}</g><g class="g-fin">${fin}</g><g class="g-part">${parts}</g><g class="g-sk">${silk}</g><g class="g-hole">${holes}</g>`;}
 let timer=0;const schedule=()=>{clearTimeout(timer);timer=setTimeout(()=>{if(queued)return;queued=true;requestAnimationFrame(draw);},40);};
 new ResizeObserver(schedule).observe(table);addEventListener('resize',schedule);if(document.fonts)document.fonts.ready.then(schedule);
 new MutationObserver(m=>{if(m.some(x=>!svg.contains(x.target)&&!sigSvg.contains(x.target)&&!pulseSvg.contains(x.target)))schedule();}).observe(table,{childList:true,subtree:true,attributes:true,attributeFilter:['class','hidden','data-sz-phase','data-sz-attacker']});
 const root=document.documentElement,rootKey=()=>root.lang+'|'+root.dataset.szTheme+'|'+(root.dataset.szChips||'');let lastRoot=rootKey();
 new MutationObserver(()=>{const k=rootKey();if(k!==lastRoot){lastRoot=k;schedule();}}).observe(root,{attributes:true,attributeFilter:['lang','data-sz-theme','data-sz-chips']});
 window.SZChips={redraw:schedule,drawNow:()=>{queued=false;lastKey='';draw();}};
 schedule();setTimeout(schedule,500);
})();
