/* UI-only pacing and swipe selection. Rules, random draws and policies stay in GameCore. */
(function(root){'use strict';
 function autoAdvance({read,ready,advance,schedule=setTimeout,cancel=clearTimeout,delay=1100}){
  let timer=null,owner=null,event=null;
  function stop(){if(timer!==null)cancel(timer);timer=null;owner=null;event=null;}
  function sync(){
   const game=read();
   if(game.phase!=='resolved'||!ready()){stop();return;}
   if(timer!==null&&owner===game&&event===game.lastEvent)return;
   stop();owner=game;event=game.lastEvent;const expected=owner,stamp=event;
   timer=schedule(()=>{timer=null;owner=null;event=null;if(read()===expected&&expected.lastEvent===stamp&&expected.phase==='resolved'&&ready())advance();},delay);
  }
  return {sync,stop};
 }
 // Capture initial visible hit regions: lifted cards and re-renders must not move
 // the targets under a finger. A vertical gesture remains native scrolling.
 function swipe({container,cards,selected,apply,limit=()=>3,enabled=()=>true}){
  let drag=null,suppressUntil=0;
  const bounds=node=>{const r=node.getBoundingClientRect();return {id:node.dataset.card,left:r.left,right:r.right,top:r.top,bottom:r.bottom};};
  function down(e){
   suppressUntil=0;
   if(!e.isPrimary||e.button!==0||!enabled())return;
   const node=e.target.closest('[data-card]');if(!node||!cards().includes(node))return;
   drag={pointer:e.pointerId,x:e.clientX,y:e.clientY,start:node.dataset.card,initial:selected().slice(),regions:cards().map(bounds),visited:new Set(),active:false};
  }
  function add(id){if(drag.visited.has(id))return;drag.visited.add(id);const next=selected().slice();if(!next.includes(id)&&next.length<limit()){next.push(id);apply(next);}}
  function move(e){
   if(!drag||e.pointerId!==drag.pointer||!enabled()){drag=null;return;}
   const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
   if(!drag.active){
    if(Math.abs(dy)>10&&Math.abs(dy)>Math.abs(dx)){drag=null;return;}
    if(Math.abs(dx)<10)return;
    drag.active=true;add(drag.start);
   }
   if(e.cancelable)e.preventDefault();
   // Include all crossed visible columns, even when the browser coalesces moves.
   const previous=drag.lastX??drag.x;
   const regions=drag.regions.map((r,i,a)=>({...r,right:i<a.length-1?Math.min(r.right,a[i+1].left):r.right}));
   const crossed=regions.filter(r=>e.clientY>=r.top-24&&e.clientY<=r.bottom+24&&r.right>Math.min(previous,e.clientX)&&r.left<=Math.max(previous,e.clientX));
   crossed.sort((a,b)=>dx>=0?a.left-b.left:b.left-a.left).forEach(r=>add(r.id));drag.lastX=e.clientX;
  }
  function end(e){if(!drag||e.pointerId!==drag.pointer)return;if(drag.active){suppressUntil=performance.now()+500;if(e.type==='pointercancel')apply(drag.initial);}drag=null;}
  container.addEventListener('pointerdown',down);
  document.addEventListener('pointermove',move,{passive:false});
  document.addEventListener('pointerup',end);document.addEventListener('pointercancel',end);
  container.addEventListener('click',e=>{if(e.detail!==0&&performance.now()<suppressUntil){e.preventDefault();e.stopImmediatePropagation();}},true);
  return ()=>{drag=null;container.removeEventListener('pointerdown',down);document.removeEventListener('pointermove',move);document.removeEventListener('pointerup',end);document.removeEventListener('pointercancel',end);};
 }
 const api={autoAdvance,swipe};if(typeof module==='object'&&module.exports)module.exports=api;else root.SZTableInteraction=api;
})(globalThis);
