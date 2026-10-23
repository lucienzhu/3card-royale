/* Essential card routes have an explicit preference; decorative motion still
 * follows the system. This module never reads cards or mutates game state. */
(()=>{'use strict';
 const root=document.documentElement,key='sz-card-motion',reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let mode='system',serial=0;try{const saved=localStorage.getItem(key);if(['system','on','off'].includes(saved))mode=saved;}catch(_){}
 const enabled=()=>mode==='on'||mode==='system'&&!reduced.matches;
 function sync(){root.dataset.cardMotionPreference=mode;window.dispatchEvent(new Event('sz-motion-preference'));}
 function set(value){if(!['system','on','off'].includes(value))return;mode=value;try{localStorage.setItem(key,mode);}catch(_){}sync();}
 // Web Animations is preferred. Older WebViews get the same route through CSS,
 // including cancellation and a completion promise, rather than disappearing.
 function animate(node,frames,options){
  if(node.animate)try{const a=node.animate(frames,options);if(a.finished&&typeof a.finished.then==='function')return a;a.cancel();}catch(_){}
  const name='sz-route-'+(++serial),sheet=document.createElement('style'),old=node.style.animation;
  sheet.textContent='@keyframes '+name+'{'+frames.map((f,i)=>((f.offset??i/(frames.length-1))*100)+'%{'+Object.entries(f).filter(([k])=>k==='opacity'||k==='transform').map(([k,v])=>k+':'+v).join(';')+'}').join('')+'}';document.head.append(sheet);
  let done=false,resolve,timer;const finished=new Promise(r=>resolve=r),finish=()=>{if(done)return;done=true;clearTimeout(timer);node.removeEventListener('animationend',end);resolve();},end=e=>{if(e.animationName===name)finish();};
  node.addEventListener('animationend',end);node.style.setProperty('animation',`${name} ${options.duration}ms ${options.easing||'linear'} ${options.delay||0}ms 1 normal ${options.fill||'none'}`,'important');
  timer=setTimeout(finish,(options.delay||0)+options.duration+120);
  return {finished,cancel(){finish();node.style.animation=old;sheet.remove();}};
 }
 // Duplicate resize events and address-bar height changes must not abort a
 // flight. Width/zoom changes do invalidate its coordinates (e.g. rotation).
 function watchViewport(cancel){let width=innerWidth,scale=window.visualViewport?.scale||1;const check=()=>{const w=innerWidth,s=window.visualViewport?.scale||1,changed=Math.abs(w-width)>1||Math.abs(s-scale)>.01;width=w;scale=s;if(changed)cancel();};window.addEventListener('resize',check,{passive:true});window.visualViewport?.addEventListener('resize',check,{passive:true});}
 window.SZMotion={enabled,animate,watchViewport,set,get mode(){return mode;},get reduced(){return reduced.matches;}};
 if(reduced.addEventListener)reduced.addEventListener('change',sync);else reduced.addListener?.(sync);sync();
 function mount(){
  const parent=document.querySelector('.menu-preferences');if(!parent)return;
  const section=document.createElement('div');section.className='sz-motion-setting';section.dataset.noI18n='';section.innerHTML='<label for="sz-motion-select"><span></span><select id="sz-motion-select" aria-describedby="sz-motion-status"><option value="system"></option><option value="on"></option><option value="off"></option></select></label><p id="sz-motion-status" role="status"></p>';parent.after(section);
  const select=section.querySelector('select'),status=section.querySelector('p');select.addEventListener('change',()=>set(select.value));
  function text(){const en=root.lang==='en';section.querySelector('label span').textContent=en?'Card motion':'牌张动画';['Follow system','On','Off'].forEach((v,i)=>select.options[i].textContent=en?v:['跟随系统','开启','关闭'][i]);select.value=mode;status.textContent=mode==='system'&&reduced.matches?(en?'System reduced motion. Select On for card motion.':'系统减少动态效果。选「开启」显示动画。'):enabled()?(en?'Play, draw and swap motion.':'显示出牌、摸牌与换牌走向。'):(en?'Cards move straight to their final positions.':'牌张直接落位。');}
  let language=root.lang;window.addEventListener('sz-motion-preference',text);new MutationObserver(()=>{if(language!==root.lang){language=root.lang;text();}}).observe(root,{attributes:true,attributeFilter:['lang']});text();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();
