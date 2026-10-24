/* Presentation only: use visible cards and anonymous rival-hand positions.
 * No opponent hand identities, stock order, RNG or game mutations enter here. */
(()=>{'use strict';
 const zones=['own-hand','own-table','opp-hand','opp-table','attack-cards','defend-cards'];
 const motion=window.SZMotion;
 let active=null,held=false,lastRun=null;
 const rect=el=>{const r=el?.getBoundingClientRect();return r&&r.width&&r.height?{x:r.x,y:r.y,w:r.width,h:r.height}:null;};
 const cssProperties=['background','color','border','border-radius','padding','font-family','font-size','font-weight','line-height','letter-spacing','opacity','display','position','left','right','top','bottom','width','height'];
 function picture(el){
  const copy=el.cloneNode(true),src=[el,...el.querySelectorAll('*')],dst=[copy,...copy.querySelectorAll('*')];
  src.forEach((s,i)=>{const d=dst[i],style=getComputedStyle(s);for(const k of cssProperties)d.style.setProperty(k,style.getPropertyValue(k));for(const a of [...d.attributes])if(a.name!=='class'&&a.name!=='style'&&!['viewBox','d','fill','transform','xmlns','width','height'].includes(a.name))d.removeAttribute(a.name);});
  copy.classList.remove('selected','selectable','has-swap-icon','swap-destination','sz-motion-arrival');
  if(el.classList.contains('selected')){const s=getComputedStyle(el);copy.style.background=s.getPropertyValue(el.querySelector('.wild')?'--paper':'--card-face');copy.style.borderColor=s.getPropertyValue('--card-edge');}
  copy.querySelectorAll('.sz-swap-icon,.badge').forEach(e=>e.remove());copy.setAttribute('aria-hidden','true');copy.tabIndex=-1;return copy;
 }
 function capture(g){
  const rows={};for(const z of zones){const el=document.getElementById(z);rows[z]=[...(el?.querySelectorAll(':scope > .card')||[])].map((node,index)=>({zone:z,index,key:node.dataset.card??null,back:node.classList.contains('back'),pending:node.classList.contains('pending'),node,rect:rect(node),picture:picture(node)}));}
  return {rows,game:g.seed+':'+g.game,round:g.round,phase:g.phase,actor:g.currentActor(),stock:rect(document.querySelector('#stock-pile .pile-stack')),discard:rect(document.querySelector('#discard-pile .pile-stack')),refresh:g.lastEvent?.kind==='refresh'?g.lastEvent.target?.exchange:null};
 }
 const cards=s=>zones.flatMap(z=>s.rows[z]).filter(c=>c.rect&&!c.pending);
 const publicCards=s=>cards(s).filter(c=>c.key!==null);
 const handZone=z=>z==='own-hand'||z==='opp-hand';
 const battleZone=z=>z==='attack-cards'||z==='defend-cards';
 function anchor(s,z){const cs=s.rows[z].filter(c=>c.rect);return cs[Math.floor(cs.length/2)]?.rect;}
 function plan(before,after){
  const flights=[],shifts=[],old=publicCards(before),now=publicCards(after),fresh=before.game!==after.game,swap=before.phase==='refresh',blind=swap&&after.refresh==='opponent',redraw=swap&&after.refresh==='deck',used=new Set();let dealt=0,wounded=0,played=0;
  const backPicture=[...after.rows['opp-hand'],...before.rows['opp-hand']].find(c=>c.back)?.picture;
  const incomingPlays=now.filter(c=>battleZone(c.zone)&&!old.some(p=>p.key===c.key&&p.zone===c.zone)).length;
  const woundDelay=before.phase==='defend'?320+Math.max(0,incomingPlays-1)*35+60:0;
  const add=(source,dest,kind,delay=0,back=false)=>{if(!source?.rect||!dest?.rect)return;flights.push({source,dest,kind,delay,duration:kind==='discard'?240:320,back,backPicture});if(dest.node)used.add(dest.node);};
  const stock={rect:after.stock||before.stock,zone:'stock'};
  const hidden={rect:anchor(before,'opp-hand')||before.stock,zone:'opp-hand'};
  const discard={rect:after.discard||before.discard,zone:'discard'};
  for(const dest of now){
   const source=!fresh&&old.find(c=>c.key===dest.key&&c.zone===dest.zone);
   if(source){if(Math.abs(source.rect.x-dest.rect.x)+Math.abs(source.rect.y-dest.rect.y)>1)shifts.push({source,dest});continue;}
   if(battleZone(dest.zone)){
    const from=!fresh&&old.find(c=>c.key===dest.key&&!battleZone(c.zone));
    add(from||hidden,dest,'play',played++*35,!from);continue;
   }
   const other=!fresh&&old.find(c=>c.key===dest.key&&!battleZone(c.zone));
   if(swap&&other&&!redraw){add(other,dest,'swap',0);continue;}
   const isWound=!handZone(dest.zone),delay=isWound?woundDelay+wounded++*45:dealt++*40;
   const fromPrivate=swap&&!redraw&&!!after.refresh;
   add(fromPrivate?hidden:stock,dest,fromPrivate?'swap':isWound?'wound':'draw',delay,true);
  }
  // Live rival cards stay anonymous; replay's public cards were handled above.
  const previous=before.rows['opp-hand'].filter(c=>c.back&&c.key===null),next=after.rows['opp-hand'].filter(c=>c.back&&c.key===null);
  for(let i=0;i<next.length;i++){
   const dest=next[i];if(fresh||i>=previous.length)add(stock,dest,'draw',(dealt++)*40,true);
   else if(previous[i].rect)shifts.push({source:previous[i],dest});
  }
  if(swap){
   for(const source of old.filter(c=>!battleZone(c.zone)&&!now.some(d=>d.key===c.key&&!battleZone(d.zone)))){
    if(redraw||!after.refresh)add(source,discard,'discard');
    else{const dest={rect:anchor(after,'opp-hand'),zone:'opp-hand'};add(source,dest,'swap',0,true);}
   }
   if(redraw&&before.actor===1&&!flights.length){
    const source={...hidden,picture:backPicture};add(source,discard,'discard',0,true);
    add(stock,{rect:anchor(after,'opp-hand'),picture:backPicture,zone:'opp-hand'},'draw',150,true);
   }
  }
  // Keep the compared hands visible through the result; collect them when
  // the user advances, before the next round's draw arrives.
  if(!fresh)for(const source of old.filter(c=>battleZone(c.zone)))if(!now.some(d=>battleZone(d.zone)&&d.key===source.key))add(source,discard,'discard',source.index*25);
  if(flights.some(f=>f.kind==='discard')&&!swap)for(const f of flights)if(f.kind==='draw')f.delay+=170;
  return {flights,shifts:shifts.filter(s=>!used.has(s.dest.node)),backPicture};
 }
 function hold(){held=true;document.documentElement.dataset.cardMotion='';document.getElementById('play-area')?.setAttribute('aria-busy','true');}
 function release(){held=false;delete document.documentElement.dataset.cardMotion;document.getElementById('play-area')?.removeAttribute('aria-busy');}
 function cancel(){if(active)active.finish('cancelled');else release();}
 function play(before,g){
  if(active)cancel();
  if(!before||!motion.enabled()||document.hidden){release();lastRun={status:'instant',reason:document.hidden?'hidden':!before?'no-source':'preference',flights:[]};return Promise.resolve();}
  const after=capture(g),moves=plan(before,after);lastRun={status:'playing',flights:moves.flights.map(f=>({kind:f.kind,from:f.source.zone,to:f.dest.zone,delay:f.delay,duration:f.duration,back:f.back})),hiddenHandIdentities:false};
  if(!moves.flights.length&&!moves.shifts.length){release();lastRun.status='unchanged';return Promise.resolve();}
  hold();return new Promise(resolve=>{
   const layer=document.createElement('div');layer.className='sz-card-flight-layer';layer.setAttribute('aria-hidden','true');
   // A body overlay cannot paint above a modal dialog's top layer.
   const host=document.getElementById('play-area')?.closest('dialog[open]')||document.body;host.append(layer);
   const origin=layer.getBoundingClientRect(),sx=origin.width/layer.offsetWidth||1,sy=origin.height/layer.offsetHeight||1;
   const local=r=>({x:(r.x-origin.x)/sx,y:(r.y-origin.y)/sy,w:r.w/sx,h:r.h/sy});
   const animations=[],arrivals=new Set();let done=false,timer;
   const finish=status=>{if(done)return;done=true;clearTimeout(timer);for(const a of animations)a.cancel();for(const node of arrivals)node.classList.remove('sz-motion-arrival');layer.remove();active=null;release();lastRun.status=status;resolve();};active={finish};
   const animate=(el,frames,options)=>{const a=motion.animate(el,frames,options);animations.push(a);return a;};
   try{
    for(const f of moves.flights){
     const a=local(f.source.rect),b=local(f.dest.rect),visual=f.dest.picture||f.source.picture;if(!visual)continue;
     const ghost=document.createElement('div');ghost.className='sz-card-flight';ghost.dataset.kind=f.kind;ghost.dataset.from=f.source.zone;ghost.dataset.to=f.dest.zone;ghost.style.width=b.w+'px';ghost.style.height=b.h+'px';ghost.style.opacity='0';layer.append(ghost);
     const conceal=f.dest.back||(f.dest.zone==='opp-hand'&&f.dest.key==null);
     const face=pictureClone(conceal&&f.backPicture?f.backPicture:visual);ghost.append(face);
     if(f.back&&f.backPicture&&!conceal){const back=pictureClone(f.backPicture);ghost.append(back);animate(back,[{opacity:1},{opacity:1,offset:.68},{opacity:0}],{duration:f.duration,delay:f.delay,fill:'both'});animate(face,[{opacity:0},{opacity:0,offset:.68},{opacity:1}],{duration:f.duration,delay:f.delay,fill:'both'});}
     if(f.dest.node){arrivals.add(f.dest.node);f.dest.node.classList.add('sz-motion-arrival');}
     const transform=(r,angle=0)=>`translate(${r.x}px,${r.y}px) scale(${r.w/b.w},${r.h/b.h}) rotate(${angle}deg)`;
     const mid={x:a.x+(b.x-a.x)*.54,y:a.y+(b.y-a.y)*.54-12,w:a.w+(b.w-a.w)*.54,h:a.h+(b.h-a.h)*.54};
     const animation=animate(ghost,[{transform:transform(a),opacity:1},{transform:transform(mid,f.kind==='swap'?3:-2),opacity:1,offset:.54},{transform:transform(b),opacity:f.kind==='discard'?0:1}],{duration:f.duration,delay:f.delay,easing:'cubic-bezier(.22,.7,.25,1)',fill:'forwards'});
     // Keep child reveal animations attached until all promises settle.
     animation.finished.then(()=>{ghost.style.visibility='hidden';f.dest.node?.classList.remove('sz-motion-arrival');}).catch(()=>{});
    }
    for(const {source,dest}of moves.shifts){if(!source.rect||!dest.rect)continue;const a=local(source.rect),b=local(dest.rect);animate(dest.node,[{transform:`translate(${a.x-b.x}px,${a.y-b.y}px)`},{transform:'translate(0,0)'}],{duration:220,easing:'cubic-bezier(.22,.7,.25,1)'});}
    Promise.all(animations.map(a=>a.finished.catch(()=>{}))).then(()=>finish('finished'));timer=setTimeout(()=>finish('timeout'),Math.max(0,...moves.flights.map(f=>f.delay+f.duration))+250);
   }catch(_){finish('fallback');}
  });
 }
 function pictureClone(p){const el=p.cloneNode(true);el.style.opacity='1';el.style.visibility='visible';el.style.transform='none';return el;}
 // Navigation and viewport changes settle immediately into the true game state.
 motion.watchViewport(cancel);document.addEventListener('scroll',cancel,true);document.addEventListener('visibilitychange',()=>{if(document.hidden)cancel();});
 window.addEventListener('sz-motion-preference',()=>{if(!motion.enabled())cancel();});
 for(const type of ['click','keydown'])document.addEventListener(type,e=>{if(held&&e.target.closest?.('#play-area')&&(type==='click'||['Enter',' '].includes(e.key))){e.preventDefault();e.stopImmediatePropagation();}},true);
 window.SZCardMotion={capture,hold,play,cancel,get busy(){return held;},get lastRun(){return lastRun;}};
})();
