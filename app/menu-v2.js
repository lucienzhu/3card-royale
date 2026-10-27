/* A single settings page. Existing controls retain their game/storage listeners. */
(()=>{'use strict';
 const root=document.documentElement,modal=document.getElementById('settings-modal');if(!modal)return;
 const replay=modal.querySelector('.menu-replay-shortcut button');if(replay){modal.querySelector('.settings-record-actions').prepend(replay);modal.querySelector('.menu-replay-shortcut').remove();}
 const seedDetails=document.getElementById('settings-seeds'),mode=document.getElementById('seed-mode'),research=document.getElementById('settings-research');
 const note=document.getElementById('settings-storage-note');try{const key='sz-storage-check';localStorage.setItem(key,'1');localStorage.removeItem(key);}catch(_){note.hidden=false;}
 const headings={preferences:['偏好','Preferences'],match:['开局','New match'],records:['记录','Records']};
 const copy={advanced:['高级 · 种子','Advanced · seeds'],seeds:['同种子、同先攻、同操作，可重现对局。','Same seed, first attacker and moves reproduce the match.'],replace:['新开局会替换当前存档。','New match replaces this save.'],research:['研究与历史','Research & history']};
 let lastLanguage='';function language(){lastLanguage=root.lang;const en=root.lang==='en';for(const el of modal.querySelectorAll('[data-settings-heading]'))el.textContent=headings[el.dataset.settingsHeading][en?1:0];for(const el of modal.querySelectorAll('[data-settings-copy]'))el.textContent=copy[el.dataset.settingsCopy][en?1:0];note.textContent=en?'Saving unavailable. Keep this window open.':'无法存档，请保留此窗口。';}
 function sync(){if(mode.value==='fixed')seedDetails.open=true;if(!/^1\./.test(document.getElementById('version-select').value))research.open=true;}
 document.getElementById('new-match').addEventListener('click',()=>{if(mode.value==='fixed'&&!document.getElementById('seed-input').validity.valid)seedDetails.open=true;},true);
 mode.addEventListener('change',sync);window.addEventListener('sz-drawer-open',e=>{if(e.detail.name==='settings')sync();});
 new MutationObserver(()=>{if(root.lang!==lastLanguage)language();}).observe(root,{attributes:true,attributeFilter:['lang']});language();sync();
})();
