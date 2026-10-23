/* Local display name only. Does not alter players, deals, RNG, replays or shared URLs. */
(()=>{'use strict';
 const KEY='sz-player-name-v1',t=(zh,en)=>window.GKLocale?.language==='en'?en:zh;
 function normalize(value){const clean=String(value||'').replace(/[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/g,'').replace(/\s+/g,' ').trim();const parts=typeof Intl.Segmenter==='function'?[...new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(clean)].map(x=>x.segment):Array.from(clean);return parts.slice(0,16).join('');}
 let name='';try{name=normalize(localStorage.getItem(KEY));}catch(_){}
 let dialog,button,lastLang='',replay=false;
 const details=document.createElement('p');details.id='combat-wild-info';details.dataset.noI18n='';details.hidden=true;document.getElementById('action-panel').append(details);
 const get=()=>name,label=()=>name||t('你','You');
 function sync(isReplay=replay){replay=isReplay;const el=document.getElementById('own-name');if(!el)return;el.dataset.noI18n='';el.textContent=replay?'A':label();el.disabled=replay;el.setAttribute('aria-label',replay?'A':t('修改名字：','Edit name: ')+label());el.title=replay?'':t('点击修改名字','Click to edit your name');}
 function set(value){name=normalize(value);try{name?localStorage.setItem(KEY,name):localStorage.removeItem(KEY);}catch(_){}sync();window.dispatchEvent(new CustomEvent('sz-player-namechange'));return name;}
 function open(){if(replay||window.SZCardMotion?.busy)return;
  if(!dialog){dialog=document.createElement('dialog');dialog.id='player-name-dialog';dialog.className='modal player-name-dialog';dialog.dataset.noI18n='';document.body.append(dialog);dialog.addEventListener('close',()=>{window.dispatchEvent(new CustomEvent('sz-profile-close'));button?.focus({preventScroll:true});});}
  dialog.innerHTML=`<form><div class="modal-head"><h2 id="player-name-title">${t('名字','Your name')}</h2></div><div class="player-name-body"><label for="player-name-input">${t('你的名字','Your name')}</label><input id="player-name-input" name="playerName" maxlength="64" autocomplete="nickname" enterkeyhint="done" aria-describedby="player-name-note"><p id="player-name-note">${t('最多16字；留空为「你」。','16 characters max. Blank uses “You”.')}</p><div class="player-name-actions"><button type="button" data-name-cancel>${t('取消','Cancel')}</button><button class="primary" type="submit">${t('保存','Save')}</button></div></div></form>`;
  dialog.setAttribute('aria-labelledby','player-name-title');const input=dialog.querySelector('input');input.value=name;input.placeholder=t('你','You');dialog.querySelector('[data-name-cancel]').onclick=()=>dialog.close();dialog.querySelector('form').onsubmit=e=>{e.preventDefault();set(input.value);dialog.close();};window.dispatchEvent(new CustomEvent('sz-profile-open'));dialog.showModal();input.focus();input.select();
 }
 function mount(){document.querySelector('.action-copy').append(details);const old=document.getElementById('own-name');if(!old)return;button=document.createElement('button');button.id='own-name';button.type='button';button.className='player-name-button';button.onclick=open;old.replaceWith(button);sync();}
 window.SZPlayer={get,label,normalize,set,sync,open};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
 new MutationObserver(()=>{const lang=document.documentElement.lang;if(lang===lastLang)return;lastLang=lang;sync();window.dispatchEvent(new CustomEvent('sz-profile-locale'));}).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
 window.addEventListener('storage',e=>{if(e.key!==KEY)return;name=normalize(e.newValue);sync();window.dispatchEvent(new CustomEvent('sz-player-namechange'));});
})();
