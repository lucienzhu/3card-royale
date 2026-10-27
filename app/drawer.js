/* One navigation lifecycle: right-hand sheets on phones, centered modals on desktop. */
(()=>{'use strict';
 const $=id=>document.getElementById(id),mobile=matchMedia('(max-width:700px), (max-height:500px) and (max-width:1000px)'),reduce=matchMedia('(prefers-reduced-motion: reduce)');
 const dialogs={settings:$('settings-modal'),rules:$('rule-page')},triggers={settings:$('open-settings'),rules:$('open-rules'),ranks:$('hr-toggle'),replay:document.querySelector('[data-tab="replay"]')};
 const en=()=>GKLocale.language==='en',labels={settings:['设置','Settings'],ranks:['牌型与分数','Hand ranks & points'],replay:['回放','Replay']};
 const closeButtons=[],languageButtons=[];
 function header(dialog,name){
  const head=dialog.querySelector('.modal-head'),title=head.querySelector('h2');
  if(name!=='rules'){title.dataset.noI18n='';title.dataset.drawerTitle=name;}
  let actions=head.querySelector('.drawer-head-actions,.rg-head-actions');
  if(!actions){actions=document.createElement('div');head.append(actions);}
  actions.className='drawer-head-actions';actions.dataset.noI18n='';
  let language=actions.querySelector('#rg-language');
  if(!language){language=document.createElement('button');language.type='button';language.id=name+'-language';language.addEventListener('click',()=>GKLocale.setLanguage(en()?'zh-CN':'en'));}
  const back=head.querySelector('#close-settings,#close-rules')||document.createElement('button');
  back.id='close-'+name;back.type='button';back.dataset.drawerClose='';
  actions.append(language,back);languageButtons.push(language);closeButtons.push(back);
  back.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();close();},true);
 }
 function create(name){const dialog=document.createElement('dialog');dialog.id=name+'-modal';dialog.className='modal sz-drawer';dialog.setAttribute('aria-labelledby',name+'-heading');dialog.innerHTML='<div class="modal-head"><h2 id="'+name+'-heading"></h2></div><div class="modal-body"></div>';document.body.append(dialog);dialogs[name]=dialog;return dialog;}
 const ranks=create('ranks'),replay=create('replay');
 ranks.querySelector('.modal-body').append($('hr-panel'));$('hr-panel').hidden=false;
 triggers.ranks.setAttribute('aria-controls',ranks.id);
 const stage=document.createElement('div');stage.className='app-main is-replay drawer-replay-stage';replay.querySelector('.modal-body').append(stage);
 const board=$('play-area'),transport=$('replay-controls'),main=board.parentElement,anchor=document.createComment('live table');board.before(anchor);
 const fallbackBackdrop=document.createElement('div');fallbackBackdrop.className='drawer-fallback-backdrop';fallbackBackdrop.setAttribute('aria-hidden','true');fallbackBackdrop.addEventListener('click',()=>close());
 let frozen=null,replayUI=null,active=null,queue=Promise.resolve(),animation=null,closing=false;
 function register(name,dialog,trigger,title){
  dialogs[name]=dialog;triggers[name]=trigger;if(title)labels[name]=title;
  dialog.classList.add('sz-drawer');header(dialog,name);
  dialog.querySelector('.rg-toolbar')?.classList.add('drawer-tabs');
  dialog.addEventListener('cancel',e=>{e.preventDefault();e.stopImmediatePropagation();close();},true);
  dialog.addEventListener('keydown',e=>{
   if(e.key!=='Tab')return;
   const items=[...dialog.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),summary,[tabindex="0"]')].filter(n=>{
    if(!n.getClientRects().length||n.tabIndex<0||getComputedStyle(n).visibility==='hidden')return false;
    // Closed details may still report layout boxes, but only their summary is focusable.
    for(let parent=n.parentElement;parent&&parent!==dialog;parent=parent.parentElement)if(parent.tagName==='DETAILS'&&!parent.open&&!parent.querySelector(':scope>summary')?.contains(n))return false;
    return true;
   });
   const first=items[0],last=items[items.length-1],focused=document.activeElement;
   if(first&&(focused===dialog||e.shiftKey&&focused===first||!e.shiftKey&&focused===last)){e.preventDefault();(e.shiftKey?last:first).focus({preventScroll:true});}
  });
  dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();}});
  triggers[name].setAttribute('aria-haspopup','dialog');triggers[name].setAttribute('aria-controls',dialog.id);
  // Stop old popover/mode handlers: the drawer owns opening, closing and pause/resume.
  triggers[name].addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();open(name);},true);
 }
 for(const [name,dialog]of Object.entries(dialogs))register(name,dialog,triggers[name]);
 document.querySelector('[data-tab="play"]').addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();close();},true);
 const nav=document.querySelector('.app-header .tabs'),controls=document.querySelector('.header-controls');
 nav.classList.add('app-navigation');nav.removeAttribute('role');nav.dataset.noI18n='';nav.append($('open-rules'),$('open-settings'));controls.remove();
 $('open-settings').replaceChildren(document.createElement('span'));$('open-settings').removeAttribute('title');
 const play=nav.querySelector('[data-tab="play"]');play.removeAttribute('role');play.removeAttribute('aria-selected');play.setAttribute('aria-current','page');
 function translate(){
  for(const title of document.querySelectorAll('[data-drawer-title]'))title.textContent=labels[title.dataset.drawerTitle][en()?1:0];
  for(const b of closeButtons)b.textContent=en()?'Back to game':'回到牌桌';
  for(const b of languageButtons){b.textContent=en()?'中文':'EN';b.lang=en()?'zh-CN':'en';b.setAttribute('aria-label',en()?'Switch to Chinese':'Switch to English');}
  play.textContent=en()?'Play':'对局';$('open-rules').textContent=en()?'Rules':'规则';$('open-settings').textContent=en()?'Settings':'设置';$('open-settings').setAttribute('aria-label',en()?'Settings':'设置');
  nav.setAttribute('aria-label',en()?'Table navigation':'牌桌导航');triggers.replay.textContent=en()?'Watch sample replay':'观看示例回放';
 }
 let locale='';new MutationObserver(()=>{if(locale!==GKLocale.language){locale=GKLocale.language;translate();}}).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});locale=GKLocale.language;translate();
 function run(fn){queue=queue.then(fn,fn);return queue;}
 async function motion(dialog,out){
  animation?.cancel();dialog.dataset.drawerMotion=out?'closing':'opening';fallbackBackdrop.dataset.drawerMotion=dialog.dataset.drawerMotion;
  if(reduce.matches||!dialog.animate){delete dialog.dataset.drawerMotion;return;}
  const rest={transform:'translateX(0) scale(1)',opacity:1},away=mobile.matches?{transform:'translateX(100%)',opacity:1}:{transform:'translateY(8px) scale(.985)',opacity:0};
  const current=dialog.animate(out?[rest,away]:[away,rest],{duration:out?200:240,easing:out?'cubic-bezier(.4,0,1,1)':'cubic-bezier(.2,.8,.2,1)',fill:'both'});animation=current;
  try{await current.finished;}catch(_){}finally{current.cancel();if(animation===current)animation=null;delete dialog.dataset.drawerMotion;}
 }
 function mountReplay(){
  frozen=board.cloneNode(true);frozen.removeAttribute('id');frozen.classList.add('drawer-table-placeholder');frozen.setAttribute('aria-hidden','true');frozen.setAttribute('inert','');
  frozen.querySelectorAll('[id]').forEach(n=>n.removeAttribute('id'));frozen.querySelectorAll('button,input,select,a').forEach(n=>{n.tabIndex=-1;n.disabled=true;});board.before(frozen);
  replay.insertBefore(transport,replay.querySelector('.modal-body'));stage.append(board);
  replayUI=window.SZTablePanels.enterReplay();main.classList.remove('is-replay');
 }
 function unmountReplay(){
  anchor.after(board);main.prepend(transport);frozen?.remove();frozen=null;
  window.SZTablePanels.leaveReplay(replayUI);replayUI=null;
 }
 async function dismiss(resume=true){
  if(!active)return;
  const name=active,dialog=dialogs[name];closing=true;window.SZTablePanels.pause();await motion(dialog,true);
  dialog.close();if(name==='replay')unmountReplay();dialog.hidden=true;triggers[name].setAttribute('aria-expanded','false');
  active=null;closing=false;fallbackBackdrop.remove();document.body.classList.remove('drawer-open');
  if(resume){const target=name==='replay'?triggers.settings:triggers[name];(target.getClientRects().length?target:play).focus({preventScroll:true});window.SZTablePanels.resume();}
 }
 function open(name){return run(async()=>{
  if(active===name)return;if(active)await dismiss(false);
  active=name;window.SZTablePanels.pause();
  if(name==='settings'){window.SZTablePanels.settings();dialogs.settings.querySelector('.modal-body').scrollTop=0;}
  if(name==='ranks')window.SZHandReference.paint();
  if(name==='replay')mountReplay();
  const dialog=dialogs[name];dialog.hidden=false;document.body.classList.add('drawer-open');dialog.showModal();if(dialog.classList.contains('qb-dialog-fallback'))document.body.append(fallbackBackdrop);triggers[name].setAttribute('aria-expanded','true');
  window.dispatchEvent(new CustomEvent('sz-drawer-open',{detail:{name}}));
  // Predictable focus, without scrolling the lesson or settings body.
  dialog.tabIndex=-1;dialog.focus({preventScroll:true});await motion(dialog,false);
 });}
 function close(options={}){return run(()=>dismiss(options.resume!==false));}
 window.SZDrawer={open,close,register(name,dialog,trigger,title){register(name,dialog,trigger,title);translate();},get active(){return active;},get closing(){return closing;}};
 reduce.addEventListener('change',()=>{if(reduce.matches)animation?.finish();});
})();
