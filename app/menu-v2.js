/* Presentation only: the New match tab leads with its two actions; seeds sit under an Advanced disclosure; the rule-version switch, the quick rank list and the comparison studies sit under Research & history. No game state is touched. */
(()=>{'use strict';
 const modal=document.getElementById('settings-modal'),settings=document.getElementById('settings');
 if(!modal||!settings)return;
 const actions=settings.querySelector('.menu-match-actions'),readout=settings.querySelector('.seed-readout'),fixedRow=settings.querySelector('.seed-fixed-row'),mode=document.getElementById('seed-mode');
 if(actions)settings.prepend(actions);
 const adv=document.createElement('details');adv.className='menu-detail qb-advanced';const sum=document.createElement('summary');sum.dataset.noI18n='';adv.append(sum);
 if(readout)adv.append(readout);if(fixedRow)adv.append(fixedRow);
 const notice=settings.querySelector(':scope>.notice');(notice||settings).insertAdjacentElement(notice?'beforebegin':'beforeend',adv);
 // Research & history: the records tab's "资料与研究" disclosure also takes the rule-version switch and the quick rank list; nothing is removed.
 const summaryOf=d=>d.querySelector(':scope>summary');
 const research=[...modal.querySelectorAll('details')].find(d=>/资料与研究|Materials|Research/.test(summaryOf(d)?.textContent||''));
 const rsum=research?summaryOf(research):null;if(rsum)rsum.dataset.noI18n='';
 const versionField=modal.querySelector('.version-field'),quick=[...modal.querySelectorAll('details')].find(d=>d!==research&&/牌型速查|Hand ranks|Quick ranks/.test(summaryOf(d)?.textContent||''));
 if(rsum){for(const el of [quick,versionField])if(el)rsum.after(el);}
 const version=document.getElementById('version-select');if(research&&version&&!/^1\./.test(version.value))research.open=true;
 const root=document.documentElement;let lastLanguage='';
 function language(){lastLanguage=root.lang;sum.textContent=root.lang==='en'?'Advanced · seeds':'高级 · 种子';if(rsum)rsum.textContent=root.lang==='en'?'Research & history':'研究与历史';}
 new MutationObserver(()=>{if(root.lang!==lastLanguage)language();}).observe(root,{attributes:true,attributeFilter:['lang']});
 if(mode)mode.addEventListener('change',()=>{if(mode.value==='fixed')adv.open=true;});
 if(mode&&mode.value==='fixed')adv.open=true;
 language();
})();
