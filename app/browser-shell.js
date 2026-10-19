/* Keep the board inside the visible browser window, including keyboard and app bars. */
(()=>{'use strict';const root=document.documentElement;let frame=0,lastHeight=0,lastTop=0;
 function fit(){frame=0;const vv=window.visualViewport;const height=Math.round(vv?Math.min(window.innerHeight,vv.height):window.innerHeight),top=Math.round(vv?.offsetTop||0);if(height>0&&height!==lastHeight){lastHeight=height;root.style.setProperty('--app-height',height+'px');}root.style.setProperty('--app-bottom',Math.max(0,window.innerHeight-height-top)+'px');if(top!==lastTop){lastTop=top;root.style.setProperty('--app-top',top+'px');}}
 const schedule=()=>{if(!frame)frame=requestAnimationFrame(fit);};
 window.addEventListener('resize',schedule,{passive:true});window.addEventListener('orientationchange',schedule,{passive:true});window.addEventListener('pageshow',schedule);window.visualViewport?.addEventListener('resize',schedule,{passive:true});window.visualViewport?.addEventListener('scroll',schedule,{passive:true});fit();
 // Native dialogs are used where available. Older WebViews retain a modal fallback.
 if(typeof HTMLDialogElement==='undefined'||typeof HTMLDialogElement.prototype.showModal!=='function'){
  const proto=Object.getPrototypeOf(document.createElement('dialog')),previous=new WeakMap();
  proto.showModal=function(){if(this.localName!=='dialog')return;previous.set(this,document.activeElement);this.hidden=false;this.setAttribute('open','');this.classList.add('qb-dialog-fallback');this.setAttribute('aria-modal','true');this.setAttribute('role','dialog');(this.querySelector('[autofocus],button,input,select')||this).focus();};
  proto.close=function(){if(this.localName!=='dialog')return;this.removeAttribute('open');this.classList.remove('qb-dialog-fallback');this.dispatchEvent(new Event('close'));previous.get(this)?.focus?.();};
  if(!('open' in proto))Object.defineProperty(proto,'open',{get(){return this.hasAttribute('open');}});
  document.addEventListener('keydown',e=>{const dialogs=[...document.querySelectorAll('dialog[open].qb-dialog-fallback')],d=dialogs[dialogs.length-1];if(!d)return;if(e.key==='Escape'){const event=new Event('cancel',{cancelable:true});if(d.dispatchEvent(event))d.close();e.preventDefault();}if(e.key==='Tab'){const a=[...d.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),[tabindex="0"]')].filter(n=>n.getClientRects().length);if(!a.length)return;const first=a[0],last=a[a.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
 }
})();
