/* MIT. Presentation of public levels/results only; no game or RNG writes. */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else root.SZBloom=api;})(typeof window==='undefined'?globalThis:window,function(root){
'use strict';
const owner=n=>n===0?'own':'rival',other=n=>1-n,rank=n=>n<11?String(n):['J','Q','K','A'][n-11],pos=n=>5+(n-2)*88.5/13,clone=x=>JSON.parse(JSON.stringify(x));
function project(results,snapshot,first=0){
 const levels=[2,2],epochs=[0,0],failures=[[],[]],losses=[0,0];let playing=first;
 const entries=[{game:0,levels:[2,2],epochs:[0,0],failures:[[],[]],losses:[0,0],playing:first,won:false,winner:null,result:null,kind:'start'}];
 for(const r of results){
  const before=[...levels],w=r.winner,l=other(w),challenger=Number.isInteger(r.ace_challenger)?r.ace_challenger:null;
  levels[w]=r.to;let kind='win';
  if(challenger!==null&&challenger!==w){failures[challenger].push({game:r.game,who:challenger});losses[challenger]++;kind='break';}
  if(r.a_reset){const q=r.a_reset.who;levels[q]=2;epochs[q]++;failures[q]=[];losses[q]=0;kind='reset';}
  if(Array.isArray(r.aLosses))for(let q=0;q<2;q++)losses[q]=r.aLosses[q];
  if(r.match_won)kind='bloom';else if(kind==='win'){
   if(before[w]<14&&levels[w]===14)kind='ace';
   else if(before[w]===14&&r.level_owner!==w)kind='return';
   else if(before[w]<before[l]&&levels[w]>levels[l])kind='pass';
   else if(levels[w]===levels[l])kind='tie';
   else if(entries.length===1)kind='first';
  }
  playing=r.match_won?null:w;
  entries.push({game:r.game,levels:[...levels],epochs:[...epochs],failures:clone(failures),losses:[...losses],playing,won:!!r.match_won,winner:w,result:clone(r),before,kind});
 }
 const current=clone(entries.at(-1));
 if(snapshot){current.levels=snapshot.players.map(p=>p.level);current.losses=snapshot.aLosses||current.losses;if(!['game_over','match_over'].includes(snapshot.phase))current.playing=Number.isInteger(snapshot.levelOwner)?snapshot.levelOwner:playing;}
 for(let q=0;q<2;q++)while(current.failures[q].length<Math.min(2,current.losses[q]))current.failures[q].push({game:null,who:q,legacy:true});
 return {entries,current};
}
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const en=()=>root.GKLocale?.language==='en',tr=(a,b)=>en()?b:a,who=n=>n===0?tr('你','You'):tr('对手','Rival'),assets=()=>root.SZBloomAssets;
function flower(n,faded=false){return `<svg class="${faded?'fc-faded-flower':'fc-player-flower'} ${n===1&&!faded?'fc-gold-flower':''}" viewBox="0 0 64 72" aria-hidden="true">${assets().flower}</svg>`;}
const pass='<svg class="fc-vine-pass" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="8.5"/><path d="M6 10L8.6 12.6L14 7"/></svg>';
function axis(model,item=model.current){
 const name=q=>model.replay?['A','B'][q]:who(q);
 const entries=model.entries.filter(e=>e.game<=item.game),groups=new Map(),marks=[];
 for(const e of entries.slice(1)){const q=e.winner;if(e.won||e.epochs[q]!==item.epochs[q])continue;groups.set(q+':'+e.levels[q],e);}
 const slot=(q,level)=>level===14?pos(14)+(pos(15)-pos(14))*Math.min(2,item.losses[q])/3:pos(level);
 const visible=(q,level)=>!(item.won&&item.winner===q&&level===14)&&(level!==14||item.losses[q]===0||item.playing===q);
 for(let q=0;q<2;q++){
  if(visible(q,item.levels[q])&&!groups.has(q+':'+item.levels[q]))groups.set(q+':'+item.levels[q],{game:0,winner:q,levels:item.levels});
 }
 for(const e of groups.values()){
  const q=e.winner,level=e.levels[q];if(!visible(q,level))continue;
  const current=level===item.levels[q],active=current&&item.playing===q;
  marks.push(`<span class="fc-win-stamp ${q===1?'fc-win-top':'fc-win-bottom'} ${current?'is-current':''} ${active?'is-playing':''}" data-win-owner="${owner(q)}" style="left:${slot(q,level)}%" ${active?'aria-current="step"':''} role="img" aria-label="${name(q)} ${rank(level)}${active?tr('，正在打','; playing'):''}">${flower(q)}</span>`);
 }
 for(let q=0;q<2;q++)item.failures[q].slice(-2).forEach((f,i)=>marks.push(`<span class="fc-ace-attempt fc-attempt-${owner(q)}" style="left:${pos(14)+(pos(15)-pos(14))*i/3}%" role="img" aria-label="${name(q)} ${f.game===null?tr('旧存档中的闯A失手','Ace setback from an older save'):tr('闯A失手，第'+f.game+'局','Ace setback, game '+f.game)}">${flower(q,true)}</span>`));
 const reached=[...new Set([2,...entries.slice(1).filter(e=>e.epochs[e.winner]===item.epochs[e.winner]).map(e=>e.levels[e.winner])])].filter(n=>n!==14).sort((a,b)=>a-b);
 return `<div class="fc-shared-vine" data-playing-owner="${item.playing===null?'none':owner(item.playing)}" role="group" aria-label="${tr('对手金花在上，你的红花在下','Gold rival flowers above; your red flowers below')}"><svg class="fc-vine-drawing" viewBox="0 0 640 148" preserveAspectRatio="none" aria-hidden="true"><path class="fc-vine-stem" d="M32 70C153 66 337 75 474 70C524 68 567 73 598.4 70"/></svg>${marks.join('')}<span class="fc-ace-knot" style="left:${pos(14)}%" aria-hidden="true">${item.won?pass:'<b>A</b>'}</span>${item.won?`<span class="fc-final-flower" style="left:93.5%" data-win-owner="${owner(item.winner)}"><svg class="fc-spine-bloom ${item.winner===1?'fc-gold-flower':''}" viewBox="0 0 64 72" aria-label="${name(item.winner)} ${tr('闯关成功','passed Ace')}">${assets().spine}</svg></span>`:''}<div class="fc-vine-axis" aria-hidden="true">${reached.map(n=>`<span style="left:${pos(n)}%">${rank(n)}</span>`).join('')}</div></div>`;
}
function memory(e,replay=false){const nameOf=q=>replay?['A','B'][q]:who(q);
 if(!e.result)return {title:tr('从2起步，两个人的一程花事。','From 2, a match begins.'),fact:tr('上方对手，下方是你。','Rival above, you below.')};
 const r=e.result,name=nameOf(r.winner),lines={first:tr('第一朵，开在'+name+'这边。','The first flower belongs to '+name.toLowerCase()+'.'),pass:tr('这一局，'+name+'又开到了前面。',name+' takes the lead.'),tie:tr('又开到了一起。','Side by side again.'),ace:tr('花到A，胜负未休。','At Ace. The match still awaits.'),break:tr('花暂时褪了色，还能再来。','A flower fades. Another chance remains.'),return:tr('把这一枝，重新接回来。','The right to play your own Ace returns.'),reset:tr('三次风过，从2再来。','Three setbacks. A fresh start from 2.'),bloom:tr('这一回，开的是'+(r.winner===0?'你的':'对手的')+'花。','This time, '+(r.winner===0?'you bloom.':'your rival blooms.')),win:tr('这一程，又添一朵。','Another flower along the way.')};
 let fact=tr('第'+r.game+'局，'+name+' '+rank(r.from)+' → '+rank(r.to)+'；终局伤势 '+r.damage.join('／')+'。','Game '+r.game+': '+name+' '+rank(r.from)+' → '+rank(r.to)+'. Final wounds '+r.damage.join(' / ')+'.');
 if(r.ace_challenger!==null&&Number.isInteger(r.ace_challenger))fact+=' '+tr(nameOf(r.ace_challenger)+'打自己的A，'+(r.match_won?'闯关成功。':r.a_reset?'三次失手，回到2。':'失手'+e.losses[r.ace_challenger]+'次。'),nameOf(r.ace_challenger)+' played their own Ace: '+(r.match_won?'passed.':r.a_reset?'third loss; reset to 2.':'setback '+e.losses[r.ace_challenger]+'.'));
 return {title:lines[e.kind]||lines.win,fact};
}
let progressContext=null,resultContext=null,animations=[],animationRun=0,observer;
function renderProgress(host,results,snapshot,first=0,replay=false){
 progressContext={host,results,snapshot,first,replay};const model=project(results,snapshot,first);model.replay=replay;host.className='sz-bloom';host.dataset.noI18n='';host.innerHTML='<div class="fc-progress-summary">'+axis(model)+'</div>';host.setAttribute('role','button');host.tabIndex=0;host.setAttribute('aria-label',tr('回望这一程；正在打：','Remember this match; playing: ')+(model.current.playing===null?tr('整场结束','match complete'):(replay?['A','B'][model.current.playing]:who(model.current.playing))+' '+rank(model.current.levels[model.current.playing])));host.onclick=()=>showHistory(model);host.onkeydown=e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();showHistory(model);}};
}
function clearProgress(host){progressContext=null;if(host){host.onclick=null;host.onkeydown=null;for(const a of ['role','tabindex','data-no-i18n'])host.removeAttribute(a);}}
function historyHTML(model){return `<div class="fc-finale-vine fc-progress-summary">${axis(model)}</div><div class="sz-memory" aria-live="polite"><h3></h3><p></p></div><div class="sz-memory-stops" role="group" aria-label="${tr('每局回顾','Games in this match')}">${model.entries.map((e,i)=>`<button type="button" data-memory="${i}" aria-pressed="false">${e.game?tr('第'+e.game+'局','Game '+e.game):tr('开局','Start')}</button>`).join('')}</div>`;}
function bindHistory(host,model){const select=i=>{const e=model.entries[i],m=memory(e,model.replay);host.querySelector('.fc-finale-vine').innerHTML=axis(model,e);host.querySelector('.sz-memory h3').textContent=m.title;host.querySelector('.sz-memory p').textContent=m.fact;host.querySelectorAll('[data-memory]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.memory)===i)));};host.querySelectorAll('[data-memory]').forEach(b=>b.onclick=()=>select(Number(b.dataset.memory)));select(model.entries.length-1);}
function showHistory(model){let dialog=document.getElementById('bloom-history');if(!dialog){dialog=document.createElement('dialog');dialog.id='bloom-history';dialog.className='modal sz-history-dialog sz-bloom';dialog.dataset.noI18n='';document.body.append(dialog);}dialog.innerHTML=`<div class="sz-history-head"><h2>${tr('回望这一程','Remember this match')}</h2><button type="button" aria-label="${tr('关闭回顾','Close recap')}">×</button></div>${historyHTML(model)}`;dialog.querySelector('.sz-history-head button').onclick=()=>dialog.close();bindHistory(dialog,model);dialog.showModal();}
let finale=null;
function stop(){animationRun++;animations.forEach(a=>a.cancel());animations=[];finale?.stop();finale=null;}
const finaleSeed=results=>results.reduce((h,r)=>Math.imul(h^(r.game*977+(Number(r.rounds)||0)*131+r.winner*17+(r.to||0)),16777619)>>>0,2166136261);
function startFinale(host,play){
 finale?.stop();const shell=host.querySelector('.szf');if(!shell||!root.SZFinale){finale=null;return;}
 finale=root.SZFinale.play(shell,{winner:resultContext.winner,cards:root.SZFinale.winningCards(resultContext.snapshot,resultContext.winner),flowerLevel:resultContext.snapshot?.flowerLevel,theme:document.documentElement.dataset.szTheme==='dark'?'dark':'light',seed:resultContext.seed,play,onSettled:()=>{const d=host.closest('dialog'),f=document.activeElement;if(d?.open&&(f===document.body||f?.id==='result-primary'||!d.contains(f)))shell.querySelector('.szf-title')?.focus({preventScroll:true});}});
 const dialog=host.closest('dialog');if(dialog&&play)dialog.scrollTop=0;if(dialog&&!dialog.dataset.szfSkip){dialog.dataset.szfSkip='1';dialog.addEventListener('pointerdown',()=>skipFinale(),{capture:true});}
}
const colorCity=(svg,winner)=>winner===1?svg.replace(/fill="#(D83B74|DEB04A)"/g,(_,c)=>'fill="#'+(c==='D83B74'?'DEB04A':'D83B74')+'"'):svg;
function facts(results,winner){const wins=[0,0];results.forEach(r=>wins[r.winner]++);const rounds=results.reduce((n,r)=>n+(Number(r.rounds)||0),0),b=v=>'<b>'+v+'</b>';return en()?[b(results.length)+' games',b(wins[0])+' : '+b(wins[1])+' you : rival',b(rounds)+' rounds']:['共 '+b(results.length)+' 局','你 '+b(wins[0])+' : '+b(wins[1])+' 对手',b(rounds)+' 轮攻防'];}
function renderResult(host,results,snapshot,first=0,play=true){
 stop();const model=project(results,snapshot,first),winner=model.current.winner;resultContext={host,results,snapshot,first,winner,seed:finaleSeed(results),model};host.hidden=false;host.className='sz-bloom';host.dataset.noI18n='';host.dataset.winner=owner(winner);host.lang=en()?'en':'zh-CN';
 const playerName=winner===0?(root.SZPlayer?.get()||''):'';host.classList.toggle('has-player-name',!!playerName);
 const subject=playerName?escape(playerName)+tr('，你',', you’re'):winner===0?tr('你，','You,'):tr('对手，','Your rival,');
 const moving=play&&!root.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 host.innerHTML=`<div class="szf" data-phase="${moving?'gather':'settled'}" data-winner="${owner(winner)}"><canvas class="szf-canvas" aria-hidden="true"></canvas><header class="szf-head"><h2 class="szf-title" id="bloom-heading" tabindex="-1"><span>${subject}</span><strong>${tr('开花了。','in bloom.')}</strong></h2><p class="szf-facts">${facts(results,winner).map(x=>'<span>'+x+'</span>').join('')}</p></header><div class="szf-sky" aria-hidden="true"></div><div class="szf-city"><div class="fc-bloom-stage" data-phase="full" role="img" aria-label="${tr('三角梅落满深圳天际线','Bougainvillea settles over the Shenzhen skyline')}">${colorCity(assets().city,winner)}</div></div><div class="szf-vine fc-progress-summary">${axis(model)}</div><p class="szf-more"><button type="button" data-history>${tr('回望这一程','Remember this match')}</button><button type="button" data-bloom-replay>${tr('重看开花','Replay the bloom')}</button></p></div>`;
 host.querySelector('[data-history]').onclick=()=>showHistory(model);host.querySelector('[data-bloom-replay]').onclick=()=>startFinale(host,true);
 startFinale(host,play);
}
function hideResult(host){stop();resultContext=null;if(host){host.hidden=true;host.replaceChildren();}}
function skipFinale(){if(finale&&!finale.settled){finale.skip();return true;}return false;}
let resizeTimer=0;if(root.addEventListener)root.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>finale?.relayout(),150);});
let lastLanguage=root.GKLocale?.language;
function refreshLocale(){const next=root.GKLocale?.language;if(next===lastLanguage)return;lastLanguage=next;if(progressContext){const c=progressContext;renderProgress(c.host,c.results,c.snapshot,c.first,c.replay);}if(resultContext){const c=resultContext;renderResult(c.host,c.results,c.snapshot,c.first,false);}}
if(root.document){root.addEventListener('sz-player-namechange',()=>{if(resultContext){const c=resultContext;renderResult(c.host,c.results,c.snapshot,c.first,false);}});observer=new MutationObserver(refreshLocale);observer.observe(document.documentElement,{attributes:true,attributeFilter:['lang']});matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',()=>{stop();if(resultContext)renderResult(resultContext.host,resultContext.results,resultContext.snapshot,resultContext.first,false);});}
return {project,rank,pos,memory,colorCity,axis,renderProgress,clearProgress,renderResult,hideResult,skipFinale,finaleController:()=>finale,stop};
});
