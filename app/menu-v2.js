/* Presentation only: the New match tab leads with its two actions; seeds and fixed-seed input sit under an Advanced disclosure. No game state is touched. */
(()=>{'use strict';
 const modal=document.getElementById('settings-modal'),settings=document.getElementById('settings');
 if(!modal||!settings)return;
 const actions=settings.querySelector('.menu-match-actions'),readout=settings.querySelector('.seed-readout'),fixedRow=settings.querySelector('.seed-fixed-row'),mode=document.getElementById('seed-mode');
 if(actions)settings.prepend(actions);
 const adv=document.createElement('details');adv.className='menu-detail qb-advanced';const sum=document.createElement('summary');sum.dataset.noI18n='';adv.append(sum);
 if(readout)adv.append(readout);if(fixedRow)adv.append(fixedRow);
 const notice=settings.querySelector(':scope>.notice');(notice||settings).insertAdjacentElement(notice?'beforebegin':'beforeend',adv);
 const root=document.documentElement;let lastLanguage='';
 function language(){lastLanguage=root.lang;sum.textContent=root.lang==='en'?'Advanced · seeds':'高级 · 种子';}
 new MutationObserver(()=>{if(root.lang!==lastLanguage)language();}).observe(root,{attributes:true,attributeFilter:['lang']});
 if(mode)mode.addEventListener('change',()=>{if(mode.value==='fixed')adv.open=true;});
 if(mode&&mode.value==='fixed')adv.open=true;
 language();
})();
