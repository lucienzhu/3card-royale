/* Progressive disclosure: deep links and printing still reveal the full content. */
(()=>{'use strict';
 function reveal(){
  let id;try{id=decodeURIComponent(location.hash.slice(1));}catch{return;}
  if(!id)return;
  const target=document.getElementById(id);if(!target)return;
  let changed=false;
  for(let node=target;node;node=node.parentElement)if(node.matches('details')&&!node.open){node.open=true;changed=true;}
  for(const details of document.querySelectorAll('details[data-reveal-hash]'))if(details.dataset.revealHash===id&&!details.open){details.open=true;changed=true;}
  if(changed)requestAnimationFrame(()=>target.scrollIntoView({block:'start'}));
 }
 for(const event of ['hashchange','load','site-content-ready'])addEventListener(event,reveal);
 document.addEventListener('click',e=>{const link=e.target.closest('a[href]');if(!link)return;const url=new URL(link.href,location.href);if(url.origin===location.origin&&url.pathname===location.pathname&&url.hash===location.hash)reveal();});
 let printState;
 addEventListener('beforeprint',()=>{if(printState)return;printState=[...document.querySelectorAll('main details')].map(d=>[d,d.open]);printState.forEach(([d])=>d.open=true);});
 addEventListener('afterprint',()=>{printState?.forEach(([d,open])=>d.open=open);printState=null;});
 reveal();
})();
