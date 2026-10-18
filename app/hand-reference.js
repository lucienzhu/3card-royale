/* Read-only hand rank reference; all scores come from the active shared engine. */
(()=>{'use strict';
 const host=document.getElementById('hr-reference'),button=document.getElementById('hr-toggle'),panel=document.getElementById('hr-panel'),versionSelect=document.getElementById('version-select');
 const battle=document.querySelector('.battle'),topline=document.querySelector('.topline');
 const wide=matchMedia('(min-width:1100px) and (min-height:700px)');
 const examples=[[0,16,33],[5,31,49],[4,18,32],[14,18,22],[5,18,31],[4,5,6],[5,18,31,44]];
 const english=['High card','Pair','Straight','Flush','Three of a kind','Straight flush','Four of a kind','Five of a kind'];
 let open=false,lastLanguage="";
 const t=(zh,en)=>window.GKLocale?.language==='en'?en:zh;
 const example=k=>'<span class="hr-example" role="img" aria-label="'+examples[k].map(GK.label).join(' ')+'">'+examples[k].map(id=>{const suit=GK.SUITS[GK.suit(id)];return '<span class="hr-card '+(suit==='♥'||suit==='♦'?'is-red':'')+'" aria-hidden="true"><b>'+GK.rankLabel(GK.rank(id))+'</b><i>'+suit+'</i></span>';}).join('')+'</span>';
 function mount(){(wide.matches?battle:topline).append(host);host.classList.toggle('hr-side',wide.matches);paint();}
 function paint(){
  lastLanguage=window.GKLocale?.language||"zh-CN";
  const version=versionSelect.value,ids=[0,1,2,3,4,5];if(GK.allowsFour(version))ids.push(6);if(GK.allowsFive(version)){ids.push(7);const lv=window.gkGame.flowerLevel,r=lv===7?14:7;examples[7]=[r-2,r+11,r+24,r+37,lv+11];}
  ids.sort((a,b)=>GK.points(b,version)-GK.points(a,version));
  host.dataset.open=String(open);button.setAttribute('aria-expanded',String(open));
  button.setAttribute('aria-label',t('查看牌型大小和分数','View hand ranks and points'));
  button.innerHTML='<span>'+t(wide.matches?'牌型 · 分数':'牌型',wide.matches?'Hand ranks':'Ranks')+'</span><i aria-hidden="true">'+(open?'−':'+')+'</i>';
  panel.hidden=!open;panel.setAttribute('aria-label',t('牌型大小与分数','Hand ranks and points'));
  panel.innerHTML='<table><caption>'+t('牌型由大到小','Hands, strongest first')+'</caption><thead><tr><th scope="col">'+t('大 → 小','Strong → weak')+'</th><th scope="col">'+t('分','Pts')+'</th></tr></thead><tbody>'+ids.map(k=>'<tr data-hr-kind="'+k+'"><th scope="row">'+t(k===4?'三炸':GK.NAMES[k],english[k])+(k>=6?'<small>'+t(k===7?'5张 · 含花牌':'4张',k===7?'5 cards · wildcard':'4 cards')+'</small>':'')+example(k)+'</th><td>'+GK.points(k,version)+'</td></tr>').join('')+'</tbody></table><p class="hr-note">'+(GK.allowsFive(version)?t('五炸含本局花牌；其余按原牌面判型','Five of a kind uses the shared flower; other examples use printed faces'):t('示例按原牌面判型','Natural hands shown'))+'</p>';
 }
 function close(focus=false){if(!open)return;open=false;paint();if(focus)button.focus({preventScroll:true});}
 button.addEventListener('click',()=>{open=!open;paint();});
 document.addEventListener('click',e=>{if(!wide.matches&&!e.composedPath().includes(host))close();});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&open&&!document.querySelector('dialog[open]')){e.preventDefault();close(true);}});
 versionSelect.addEventListener('change',()=>queueMicrotask(paint));
 new MutationObserver(()=>{if((window.GKLocale?.language||"zh-CN")!==lastLanguage)paint();}).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
 wide.addEventListener('change',mount);mount();
})();
