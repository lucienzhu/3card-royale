/* Appearance only: a separate preference key; never reads or writes game saves. */
(()=>{'use strict';
 const root=document.documentElement,key='sz_visual_theme_v1',media=matchMedia('(prefers-color-scheme: dark)');
 const tokens=window.SZThemeTokens;
 let preference=root.dataset.szThemePreference||'system',lastLanguage='';
 const english=()=>root.lang==='en'||window.GKLocale?.language==='en';
 const t=(zh,en)=>english()?en:zh;
 function render(){
  lastLanguage=root.lang;
  const mode=preference==='system'?(media.matches?'dark':'light'):preference,palette=tokens[mode];
  root.dataset.szTheme=mode;root.dataset.szThemePreference=preference;document.querySelector('meta[name="theme-color"]')?.setAttribute('content',palette.paper);
  for(const field of document.querySelectorAll('[data-sz-theme-select]')){
   field.value=preference;field.setAttribute('aria-label',t('外观','Appearance'));
   for(const option of field.options)option.textContent=option.value==='system'?t('跟随系统','System'):option.value==='light'?t('浅色 · 白鹭','Light · Egret'):t('深色 · 黑盘','Dark · Board');
  }
  for(const e of document.querySelectorAll('[data-sz-theme-label]'))e.textContent=t('外观','Appearance');
  for(const e of document.querySelectorAll('[data-sz-theme-choice]'))e.setAttribute('aria-pressed',String(e.dataset.szThemeChoice===mode));
  const swatches=document.querySelector('.swatches[data-sz-palette]');
  if(swatches){const labels=mode==='light'?['白鹭','墨','红花','对手金','牌背']:['黑盘','白鹭','红花','对手金','牌背'];const vals=[palette.paper,palette.ink,palette.red,palette.gold,tokens.card.back];swatches.innerHTML=labels.map((l,i)=>`<div class="swatch"><i style="background:${vals[i]}"></i><b>${l}</b><small>${vals[i]}</small></div>`).join('');}
  const status=document.querySelector('[data-sz-theme-status]');if(status)status.textContent=mode==='light'?'白鹭 · 白底；你是红花，对手是金花。':'黑盘 · 黑底；你是红花，对手是金花。';
 }
 function choose(value){if(!['system','light','dark'].includes(value))return;preference=value;try{localStorage.setItem(key,value);}catch{}render();}
 document.addEventListener('change',e=>{if(e.target.matches('[data-sz-theme-select]'))choose(e.target.value);});
 document.addEventListener('click',e=>{const button=e.target.closest('[data-sz-theme-choice]');if(button)choose(button.dataset.szThemeChoice);});
 if(media.addEventListener)media.addEventListener('change',render);else media.addListener(render);
 // GKLocale reapplies lang after translating new DOM. Only an actual language
 // change needs new labels; repainting on every write would create a loop.
 new MutationObserver(()=>{if(root.lang!==lastLanguage)render();}).observe(root,{attributes:true,attributeFilter:['lang']});
 window.addEventListener('storage',e=>{if(e.key===key){preference=['light','dark'].includes(e.newValue)?e.newValue:'system';render();}});
 render();
})();
