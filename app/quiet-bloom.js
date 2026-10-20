/* Presentation only. Existing game controls, saves and listeners are retained. */
(()=>{'use strict';
 const root=document.documentElement,modal=document.getElementById('settings-modal');
 if(!modal)return;
 const body=modal.querySelector('.modal-body'),head=modal.querySelector('.modal-head'),heading=document.getElementById('settings-heading');
 const nav=document.createElement('div');nav.className='qb-menu-tabs';nav.role='tablist';nav.dataset.noI18n='';nav.setAttribute('aria-label','Menu');head.after(nav);
 const panels={},tabs={},names={match:['新开局','New match'],preferences:['偏好','Preferences'],records:['记录','Records']};
 for(const id of Object.keys(names)){const p=document.createElement('section');p.id='qb-menu-'+id;p.className='qb-menu-panel';p.role='tabpanel';p.setAttribute('aria-labelledby','qb-tab-'+id);panels[id]=p;body.append(p);const b=document.createElement('button');b.type='button';b.id='qb-tab-'+id;b.role='tab';b.dataset.menuTab=id;b.setAttribute('aria-controls',p.id);nav.append(b);tabs[id]=b;}
 const move=(selector,id)=>{const n=modal.querySelector(selector);if(n)panels[id].append(n);return n;};
 move('#settings','match');move('#replay-detail','match');
 const help=modal.querySelector('.seed-help');help.dataset.noI18n='';
 const seedDetails=document.createElement('details');seedDetails.className='qb-seed-help';const seedSummary=document.createElement('summary');seedSummary.dataset.noI18n='';seedDetails.append(seedSummary,help);panels.match.append(seedDetails);
 move('.menu-preferences','preferences');move('.version-field','preferences');
 const versionDetails=document.createElement('details');const versionSummary=document.createElement('summary');versionSummary.dataset.noI18n='';versionDetails.append(versionSummary,modal.querySelector('#version-note'));panels.preferences.append(versionDetails);
 move('#export-match','records');for(const d of [...body.querySelectorAll(':scope > details')])panels.records.append(d);
 const research=document.createElement('details'),researchSummary=document.createElement('summary');researchSummary.dataset.noI18n='';research.append(researchSummary);for(const n of panels.records.querySelectorAll('.trial-comparison'))research.append(n);const identity=move('.identity-note','records');if(identity)research.append(identity);for(const n of [...body.children])if(n.tagName==='P')research.append(n);panels.records.append(research);
 const matchActions=modal.querySelector('.menu-match-actions');const back=document.createElement('button');back.type='button';back.dataset.noI18n='';back.addEventListener('click',()=>document.getElementById('close-settings').click());matchActions.prepend(back);
 const hint=modal.querySelector('.settings>.notice');hint.dataset.noI18n='';
 const storageNote=document.createElement('p');storageNote.className='notice';storageNote.dataset.noI18n='';storageNote.hidden=true;try{const key='sz-storage-check';localStorage.setItem(key,'1');localStorage.removeItem(key);}catch(_){storageNote.hidden=false;}panels.match.prepend(storageNote);
 let current='match',lastLanguage='';const scrolls={match:0,preferences:0,records:0};
 function select(id,focus=false){const changed=current!==id;scrolls[current]=body.scrollTop;current=id;for(const k of Object.keys(names)){panels[k].hidden=k!==id;tabs[k].setAttribute('aria-selected',String(k===id));tabs[k].tabIndex=k===id?0:-1;}body.scrollTop=scrolls[id];if(changed){body.getAnimations?.().forEach(a=>a.cancel());if(body.animate&&!matchMedia('(prefers-reduced-motion: reduce)').matches)body.animate([{opacity:.35},{opacity:1}],{duration:160,easing:'ease-out'});}if(focus)tabs[id].focus({preventScroll:true});}
 function language(){lastLanguage=root.lang;const en=root.lang==='en';storageNote.textContent=en?'This browser cannot save your game. Keep this window open to continue playing.':'此浏览器无法保存对局。保留当前窗口即可继续玩。';heading.dataset.noI18n='';heading.textContent=en?'Settings':'设置';nav.setAttribute('aria-label',en?'Settings':'设置');Object.keys(names).forEach(k=>tabs[k].textContent=names[k][en?1:0]);back.textContent=en?'Continue':'继续对局';hint.textContent=en?'New match replaces this version’s saved game.':'开新一场会替换当前版本的存档。';seedSummary.textContent=en?'How seeds work':'种子是什么';help.textContent=en?'One match seed determines the sequence of deals. Use the same seed, first player and moves to reproduce a match.':'整场种子决定各小局发牌。同种子、同先攻、同操作，可以重现整场。';versionSummary.textContent=en?'About this ruleset':'这版规则';researchSummary.textContent=en?'Resources & research':'资料与研究';}
 nav.addEventListener('click',e=>{const b=e.target.closest('[data-menu-tab]');if(b)select(b.dataset.menuTab);});
 nav.addEventListener('keydown',e=>{const keys=Object.keys(names),i=keys.indexOf(current);let n;if(e.key==='ArrowRight')n=(i+1)%3;if(e.key==='ArrowLeft')n=(i+2)%3;if(e.key==='Home')n=0;if(e.key==='End')n=2;if(n!==undefined){e.preventDefault();select(keys[n],true);}});
 new MutationObserver(()=>{if(root.lang!==lastLanguage)language();}).observe(root,{attributes:true,attributeFilter:['lang']});
 document.getElementById('open-settings').addEventListener('click',()=>{select('match');body.scrollTop=0;scrolls.match=0;});
 select('match');language();
})();
