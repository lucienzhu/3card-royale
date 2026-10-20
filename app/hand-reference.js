/* Read-only hand rank reference; all scores come from the active shared engine. */
(()=>{'use strict';
 const host=document.getElementById('hr-reference'),button=document.getElementById('hr-toggle'),panel=document.getElementById('hr-panel'),versionSelect=document.getElementById('version-select');
 const battle=document.querySelector('.battle'),topline=document.querySelector('.topline');
 const examples=[[0,16,33],[5,31,49],[4,18,32],[14,18,22],[5,18,31],[4,5,6],[5,18,31,44]];
 const english=['High card','Pair','Straight','Flush','Three of a kind','Straight flush','Four of a kind','Five of a kind'];
 let open=false,lastLanguage="";
 const t=(zh,en)=>window.GKLocale?.language==='en'?en:zh;
 const example=k=>{const ids=examples[k],lv=window.gkGame?.flowerLevel;return '<span class="hr-example" role="img" aria-label="'+ids.map(GK.label).join(' ')+'">'+ids.map((id,i)=>{const el=window.card(id,{level:k===7&&i===ids.length-1?lv:0});el.setAttribute('aria-hidden','true');el.removeAttribute('aria-label');return el.outerHTML;}).join('')+'</span>';};
 function mount(){(document.querySelector('.app-header .tabs')||topline).append(host);host.classList.remove('hr-side');paint();}
 function paint(){
  lastLanguage=window.GKLocale?.language||"zh-CN";
  const version=versionSelect.value,ids=[0,1,2,3,4,5];if(GK.allowsFour(version))ids.push(6);if(GK.allowsFive(version)){ids.push(7);const lv=window.gkGame.flowerLevel,r=lv===7?14:7;examples[7]=[r-2,r+11,r+24,r+37,lv+11];}
  ids.sort((a,b)=>GK.points(b,version)-GK.points(a,version));
  open=window.SZDrawer?window.SZDrawer.active==='ranks':open;host.dataset.open=String(open);button.setAttribute('aria-expanded',String(open));
  button.setAttribute('aria-label',t('查看牌型大小和分数','View hand ranks and points'));
  button.innerHTML='<span>'+t('牌型','Ranks')+'</span><i aria-hidden="true">'+(open?'−':'+')+'</i>';
  panel.hidden=window.SZDrawer?false:!open;panel.setAttribute('aria-label',t('牌型大小与分数','Hand ranks and points'));
  panel.innerHTML='<table><caption>'+t('牌型由大到小','Hands, strongest first')+'</caption><thead><tr><th scope="col">'+t('大 → 小','Strong → weak')+'</th><th scope="col">'+t('分','Pts')+'</th></tr></thead><tbody>'+ids.map(k=>'<tr data-hr-kind="'+k+'"><th scope="row">'+t(k===4?'三炸':GK.NAMES[k],english[k])+(k>=6?'<small>'+t(k===7?'5张 · 含花牌':'4张',k===7?'5 cards · wildcard':'4 cards')+'</small>':'')+example(k)+'</th><td>'+GK.points(k,version)+'</td></tr>').join('')+'</tbody></table><p class="hr-note">'+(GK.allowsFive(version)?t('五炸含本局花牌；其余按原牌面判型','Five of a kind uses the shared flower; other examples use printed faces'):t('示例按原牌面判型','Natural hands shown'))+'</p>';
 }
 window.SZHandReference={paint};
 versionSelect.addEventListener('change',()=>queueMicrotask(paint));
 new MutationObserver(()=>{if((window.GKLocale?.language||"zh-CN")!==lastLanguage)paint();}).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
 mount();
})();
