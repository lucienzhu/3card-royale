/* Teaching-only flights. Coordinates and pictures come from the practice table;
 * the live game's cards, state and random source are never read. */
(()=>{'use strict';
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');let active=null,lastRun=null;
 const styles=['background','color','border','border-radius','padding','font-family','font-size','font-weight','line-height','letter-spacing','display','position','left','right','top','bottom','width','height'];
 const cardSelector=z=>z==='stock'?'.fg-stock':z==='discard'?'.fg-discard .fg-pile':`[data-fg-slot="${z}"] .card`;
 function picture(el){const p=el.cloneNode(true),a=[el,...el.querySelectorAll('*')],b=[p,...p.querySelectorAll('*')];a.forEach((n,i)=>{const s=getComputedStyle(n);for(const k of styles)b[i].style.setProperty(k,s.getPropertyValue(k));for(const attr of [...b[i].attributes])if(attr.name.startsWith('data-')||attr.name.startsWith('aria-')||['id','tabindex','title'].includes(attr.name))b[i].removeAttribute(attr.name);});p.classList.remove('selected','fg-chosen','fg-added','fg-received');p.style.transform='none';p.style.animation='none';p.style.opacity='1';p.style.visibility='visible';p.querySelectorAll('.badge,.fg-swap-badge').forEach(n=>n.remove());p.setAttribute('aria-hidden','true');return p;}
 function capture(board){const br=board.getBoundingClientRect(),scale=br.width/board.offsetWidth,rows={};for(const zone of ['own-hand','rival-hand','own-wounds','rival-wounds','attack','defense','stock','discard'])rows[zone]=[...board.querySelectorAll(cardSelector(zone))].map(node=>{const r=node.getBoundingClientRect();return {node,picture:picture(node),rect:{x:(r.x-br.x)/scale,y:(r.y-br.y)/scale,w:r.width/scale,h:r.height/scale}};});return rows;}
 function cancel(){active?.finish('cancelled');}
 async function play(before,board,moves,frame){
  cancel();const after=capture(board),flights=moves.map(m=>({...m,source:before[m.from]?.[m.index||0],dest:after[m.to]?.[m.target||0]})).filter(m=>m.source&&m.dest);
  lastRun={status:'playing',flights:flights.map(({from,to,kind,delay=0})=>({from,to,kind,delay})),bounds:null};
  if(!flights.length||reduced.matches||!Element.prototype.animate||document.hidden){lastRun.status='instant';return;}
  const rects=flights.flatMap(f=>[f.source.rect,f.dest.rect]),bounds={top:Math.min(...rects.map(r=>r.y))-28,bottom:Math.max(...rects.map(r=>r.y+r.h))+28};lastRun.bounds=bounds;
  return new Promise(resolve=>{
   let done=false,timer;const animations=[],hidden=new Map(),layer=document.createElement('div');layer.className='fg-flight-layer';layer.setAttribute('aria-hidden','true');board.append(layer);
   const finish=status=>{if(done)return;done=true;clearTimeout(timer);animations.forEach(a=>a.cancel());hidden.forEach((v,n)=>n.style.visibility=v);layer.remove();active=null;lastRun.status=status;resolve();};active={finish};
   const animate=(node,keyframes,opts)=>{const a=node.animate(keyframes,opts);animations.push(a);return a;};
   let back=after['rival-hand'][0]?.picture||before['rival-hand'][0]?.picture;if(!back){const sample=window.card(null,{back:true});board.append(sample);back=picture(sample);sample.remove();}
   try{
    frame(bounds);const mobile=document.getElementById('rule-page').classList.contains('fg-mobile'),lead=mobile?380:80;
    for(const f of flights){const a=f.source.rect,b=f.dest.rect,discard=f.to==='discard',conceal=f.to==='rival-hand',duration=650,delay=lead+(f.delay||0),ghost=document.createElement('div');ghost.className='fg-flight';ghost.dataset.from=f.from;ghost.dataset.to=f.to;ghost.dataset.kind=f.kind;ghost.style.width=b.w+'px';ghost.style.height=b.h+'px';layer.append(ghost);
     const visual=discard?f.source.picture:f.dest.picture,front=(conceal&&back?back:visual).cloneNode(true);front.style.width=b.w+'px';front.style.height=b.h+'px';ghost.append(front);
     if(back&&(f.from==='stock'||f.from==='rival-hand'||conceal)){
      const start=(conceal?f.source.picture:back).cloneNode(true);start.style.width=b.w+'px';start.style.height=b.h+'px';ghost.append(start);animate(start,[{opacity:1},{opacity:1,offset:.55},{opacity:0}],{duration,delay,fill:'both'});animate(front,[{opacity:0},{opacity:0,offset:.55},{opacity:1}],{duration,delay,fill:'both'});
     }
     if(!discard){hidden.set(f.dest.node,f.dest.node.style.visibility);f.dest.node.style.visibility='hidden';}
     const transform=(r,angle=0)=>`translate(${r.x}px,${r.y}px) scale(${r.w/b.w},${r.h/b.h}) rotate(${angle}deg)`,mid={x:(a.x+b.x)/2+(f.arc||0),y:(a.y+b.y)/2-10,w:(a.w+b.w)/2,h:(a.h+b.h)/2};
     const anim=animate(ghost,[{transform:transform(a),opacity:1},{transform:transform(mid,f.arc?Math.sign(f.arc)*3:-2),opacity:1,offset:.5},{transform:transform(b),opacity:discard?0:1}],{duration,delay,easing:'cubic-bezier(.3,.05,.25,1)',fill:'both'});
     anim.finished.then(()=>{ghost.style.visibility='hidden';if(!discard)f.dest.node.style.visibility=hidden.get(f.dest.node)||'';}).catch(()=>{});
    }
    Promise.all(animations.map(a=>a.finished.catch(()=>{}))).then(()=>finish('finished'));timer=setTimeout(()=>finish('timeout'),lead+Math.max(0,...flights.map(f=>f.delay||0))+950);
   }catch(e){lastRun.error=String(e);finish('fallback');}
  });
 }
 if(reduced.addEventListener)reduced.addEventListener('change',cancel);
 window.SZGuideFlights={capture,play,cancel,get lastRun(){return lastRun;}};
})();
