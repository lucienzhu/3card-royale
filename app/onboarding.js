/* A first-visit picture, independent of game state, seeds and AI difficulty. */
(()=>{'use strict';
 const key='sz-onboarding-v1';
 function preferences(stores){
  let value={seen:false,enabled:true};
  for(const get of stores)try{const saved=JSON.parse(get().getItem(key));if(saved&&typeof saved==='object'){value={seen:saved.seen===true,enabled:saved.enabled!==false};break;}}catch(_){}
  function save(){for(const get of stores)try{get().setItem(key,JSON.stringify(value));}catch(_){}}
  return {get enabled(){return value.enabled;},get shouldShow(){return value.enabled&&!value.seen;},seen(){value.seen=true;save();},enable(enabled){value.enabled=!!enabled;save();}};
 }
 if(typeof module==='object'&&module.exports){module.exports={preferences,key};return;}
 const prefs=preferences([()=>localStorage,()=>sessionStorage]);
 // Loaded before table.js: even a slow first load cannot start the AI behind help.
 let pending=prefs.shouldShow;
 window.SZOnboarding={get pending(){return pending;}};
 function mount(){
  const setting=document.createElement('section');setting.className='sz-onboarding-setting';setting.dataset.noI18n='';
  setting.innerHTML='<div><label for="onboarding-enabled"><input id="onboarding-enabled" type="checkbox" role="switch" aria-describedby="onboarding-setting-note"><span></span></label><p id="onboarding-setting-note"></p></div><button id="onboarding-reopen" type="button"></button>';
  document.querySelector('.menu-preferences').after(setting);
  const toggle=setting.querySelector('input'),reopen=setting.querySelector('button');
  toggle.checked=prefs.enabled;toggle.addEventListener('change',()=>prefs.enable(toggle.checked));
  const dialog=document.createElement('dialog');dialog.id='onboarding-modal';dialog.className='modal';dialog.hidden=true;dialog.dataset.noI18n='';dialog.setAttribute('aria-labelledby','onboarding-heading');
  dialog.innerHTML='<div class="modal-head"><h2 id="onboarding-heading"></h2></div><div class="modal-body"><div class="onboarding-picture"></div></div><div class="onboarding-footer"><button type="button" class="primary" id="onboarding-start"></button></div>';
  document.body.append(dialog);
  const picture=dialog.querySelector('.onboarding-picture'),start=dialog.querySelector('#onboarding-start');
  const en=()=>document.documentElement.lang==='en';
  const card=([rank,suit],selected=false)=>'<span class="intro-card '+(SZSuit.isRed(suit)?'intro-red ':'')+(selected?'intro-selected':'')+'"><b>'+rank+'</b><span>'+SZSuit.svg(suit)+'</span><i>'+SZSuit.svg(suit)+'</i>'+(selected?'<em>✓</em>':'')+'</span>';
  const hand=[['4','d'],['7','d'],['Q','d'],['8','h'],['8','s'],['2','d'],['J','s'],['9','h']];
  const flower=color=>'<svg class="player-flower player-flower-'+color+'" viewBox="0 0 64 72" aria-hidden="true">'+window.SZBloomAssets.flower+'</svg>';
  const bracts=Array.from({length:5},()=>'<svg viewBox="22 11 20 26" aria-hidden="true">'+window.SZBloomAssets.bract+'</svg>').join('');
  function text(){
   const english=en(),t=(zh,en)=>english?en:zh;
   setting.querySelector('label span').textContent=t('新手引导','Quick start');
   setting.querySelector('p').textContent=t('首次进入时显示','Show on your first visit');
   reopen.textContent=t('再看一次','View guide');
   start.textContent=t('开始玩','Let’s play');
   picture.innerHTML=`<section class="intro-hand"><h3><span class="intro-number">1</span>${t('每人 8 张手牌','Start with 8 cards each')}</h3>
    <div class="intro-rack" role="img" aria-label="${t('8 张手牌，已选中方块 4、7、Q','Eight cards, with 4, 7 and Q of diamonds selected')}">${hand.map((c,i)=>card(c,i<3)).join('')}</div>
    <p class="intro-instruction">${t('点选 3 张 → 进攻','Tap 3 cards → Attack')}</p></section>
   <section class="intro-defense"><h3><span class="intro-number">2</span>${t('对手进攻，你选 3 张防守','They attack. You defend with 3.')}</h3>
    <div class="intro-combat"><div class="intro-rival"><strong>${flower('gold')}${t('对手 · 进攻','Rival · Attack')}</strong><div class="intro-trio" aria-hidden="true">${[['4','c'],['7','c'],['Q','c']].map(c=>card(c)).join('')}</div><small>${t('同花 · 3 分','Flush · 3 pts')}</small></div>
    <span class="intro-vs" aria-hidden="true">→</span><div class="intro-you"><strong>${flower('red')}${t('你 · 防守','You · Defense')}</strong><div class="intro-trio" aria-hidden="true">${hand.slice(3,6).map(c=>card(c)).join('')}</div><small>${t('对子 · 1 分','Pair · 1 pt')}</small></div></div>
    <p class="intro-equation">${t('3 − 1 = 你受 2 伤','3 − 1 = 2 wounds for you')}</p></section>
   <section class="intro-end"><h3><span class="intro-number">3</span>${t('先到 5 伤，输掉本局','Reach 5 wounds, lose the game')}</h3><div class="intro-wounds" aria-hidden="true">${bracts}</div></section>
   <p class="intro-loop">${t('双方各攻守一次，再补回 8 张。','After both have attacked, refill to 8.')}</p>`;
  }
  window.SZDrawer.register('onboarding',dialog,reopen,['新手引导','Quick start']);
  window.addEventListener('sz-drawer-open',e=>{if(e.detail.name==='onboarding'){prefs.seen();pending=false;}});
  start.addEventListener('click',async()=>{await window.SZDrawer.close();document.querySelector('#own-hand button:not(:disabled)')?.focus({preventScroll:true});});
  let language=document.documentElement.lang;new MutationObserver(()=>{if(language!==document.documentElement.lang){language=document.documentElement.lang;text();}}).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});text();
  if(pending)window.SZDrawer.open('onboarding');
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();
