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
   for(const option of field.options)option.textContent=option.value==='system'?t('跟随系统','System'):option.value==='light'?t('浅色 · 晴日','Light · Day'):t('暗色 · 晚风','Dark · Dusk');
  }
  for(const e of document.querySelectorAll('[data-sz-theme-label]'))e.textContent=t('外观','Appearance');
  for(const e of document.querySelectorAll('[data-sz-theme-choice]'))e.setAttribute('aria-pressed',String(e.dataset.szThemeChoice===mode));
  const swatches=document.querySelector('.swatches[data-sz-palette]');
  if(swatches){const labels=mode==='light'?['瓷白','墨色','三角梅花红','板绿','花心金']:['夜蓝','柔白','三角梅花红','板绿','花心金'];swatches.innerHTML=['paper','ink','flower','mint','sun'].map((k,i)=>`<div class="swatch"><i style="background:${k==='flower'?'#C5416B':k==='sun'?'#C5A365':k==='mint'?'#16765F':palette[k]}"></i><b>${labels[i]}</b><small>${k==='flower'?'#C5416B':k==='sun'?'#C5A365':k==='mint'?'#16765F':palette[k]}</small></div>`).join('');}
  const status=document.querySelector('[data-sz-theme-status]');if(status)status.textContent=mode==='light'?'晴日 · 瓷白与板绿，花红做识别。':'晚风 · 夜蓝与柔光，花红做识别。';
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
