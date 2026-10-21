/* The circuit-board table is an Easter egg: one switch in settings, off by default. It has its own preference key and never reads or writes game saves. */
(()=>{'use strict';
 const root=document.documentElement,key='sz_board_egg_v1';
 const english=()=>root.lang==='en'||window.GKLocale?.language==='en';
 const t=(zh,en)=>english()?en:zh;
 let on=root.dataset.szChips==='1',lastLanguage='';
 function apply(){if(on)root.dataset.szChips='1';else delete root.dataset.szChips;window.SZChips?.redraw();}
 function render(){lastLanguage=root.lang;apply();
  for(const e of document.querySelectorAll('[data-sz-egg-label]'))e.textContent=t('电路板','Circuit board');
  for(const e of document.querySelectorAll('[data-sz-egg-hint]'))e.textContent=t('彩蛋：牌桌变成一块会动的电路板','Easter egg: the table turns into a live circuit board');
  for(const e of document.querySelectorAll('[data-sz-egg-toggle]')){e.checked=on;e.setAttribute('aria-label',t('电路板彩蛋','Circuit board Easter egg'));}}
 function choose(v){on=!!v;try{localStorage.setItem(key,on?'1':'0');}catch{}render();}
 document.addEventListener('change',e=>{if(e.target.matches('[data-sz-egg-toggle]'))choose(e.target.checked);});
 new MutationObserver(()=>{if(root.lang!==lastLanguage)render();}).observe(root,{attributes:true,attributeFilter:['lang']});
 window.addEventListener('storage',e=>{if(e.key===key){on=e.newValue==='1';render();}});
 render();
})();
