/* Presentational hints only. No card, selection, game or save mutations. */
(function(){
 'use strict';
 const hover=matchMedia('(hover:hover) and (pointer:fine)');
 document.querySelectorAll('.table .player-zone .hand-group,.table .player-zone .wound-group').forEach(area=>{
  let timer;
  const hide=state=>{clearTimeout(timer);area.dataset.rackHint=state;};
  area.addEventListener('pointerenter',event=>{
   if(event.pointerType!=='mouse'||!hover.matches||!area.querySelector('.card'))return;
   hide('show');
   timer=setTimeout(()=>hide('fade'),1200);
  });
  area.addEventListener('pointerleave',()=>hide('off'));
  area.addEventListener('pointerdown',()=>hide('pressed'),{capture:true});
 });
})();
