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
function stop(){animationRun++;animations.forEach(a=>a.cancel());animations=[];}
function animateCity(host){
 stop();const run=animationRun,stage=host.querySelector('.fc-bloom-stage'),shell=host.querySelector('.fc-poetic-finish'),mobile=host.clientWidth<=520,pace=mobile?.88:1,finish=()=>{if(run!==animationRun)return;animations.forEach(a=>a.cancel());animations=[];stage.dataset.phase='full';shell.dataset.victoryPhase='settled';shell.querySelector('.fc-victory-title').focus({preventScroll:true});};
 if(matchMedia('(prefers-reduced-motion: reduce)').matches){finish();return;}
 stage.dataset.phase='growing';shell.dataset.victoryPhase='growing';
 const animate=(el,frames,opts)=>{const a=el.animate(frames,{fill:'both',easing:'cubic-bezier(.16,.8,.25,1)',...opts});animations.push(a);return a;};
 stage.querySelectorAll('.fc-bloom-corolla').forEach(f=>animate(f,[{transform:'scale(.04) rotate(-14deg)',opacity:0},{transform:'scale(1.14) rotate(3deg)',opacity:1,offset:.68},{transform:'scale(1) rotate(0deg)',opacity:1}],{delay:Number(f.dataset.bloomDelay)*pace,duration:f.hasAttribute('data-city-seed')?850:640}));
 stage.querySelectorAll('.fc-bloom-stem').forEach(s=>animate(s,[{strokeDashoffset:1,opacity:0},{strokeDashoffset:0,opacity:.72}],{delay:Number(s.dataset.growDelay)*pace,duration:940}));
 const ink=getComputedStyle(host).getPropertyValue('--fc-muted').trim(),color=host.dataset.winner==='rival'?'#DEB04A':'#D83B74';
 for(const [district,delay]of [['futian',0],['nanshan',740],['baoan',1500],['qianhai',2180]]){const el=stage.querySelector(`[data-district="${district}"]`);animate(el,[{color:ink},{color,offset:.42},{color:ink}],{delay:delay*pace,duration:1300});}
 animate(stage.querySelector('.fc-city-bloom-wave'),[{transform:'translateX(0)',opacity:0},{transform:'translateX(20px)',opacity:.16,offset:.12},{transform:'translateX(430px)',opacity:.16,offset:.85},{transform:'translateX(460px)',opacity:0}],{duration:3500*pace,easing:'linear'});
 stage.querySelectorAll('.fc-city-drifter').forEach((f,i)=>{const d=Number(f.dataset.driftDirection);animate(f,[{transform:'translate(0,0) rotate(0deg)',opacity:0},{transform:`translate(${d*12}px,-22px) rotate(35deg)`,opacity:.72,offset:.25},{transform:`translate(${d*32}px,-78px) rotate(${135+i*13}deg)`,opacity:0}],{delay:Number(f.dataset.driftDelay)*pace,duration:mobile?1050:1250});});
 animate(host.querySelector('.fc-victory-wordmark'),[{opacity:0,transform:'translateY(9px)'},{opacity:1,transform:'translateY(0)'}],{delay:120,duration:700});Promise.all(animations.map(a=>a.finished)).then(finish).catch(()=>{});
}
const colorCity=(svg,winner)=>winner===1?svg.replace(/fill="#(D83B74|DEB04A)"/g,(_,c)=>'fill="#'+(c==='D83B74'?'DEB04A':'D83B74')+'"'):svg;
function renderResult(host,results,snapshot,first=0,play=true){
 stop();resultContext={host,results,snapshot,first};const model=project(results,snapshot,first),winner=model.current.winner;host.hidden=false;host.className='sz-bloom';host.dataset.noI18n='';host.dataset.winner=owner(winner);host.lang=en()?'en':'zh-CN';
 host.innerHTML=`<div class="fc-finish fc-poetic-finish" data-victory-phase="settled"><div class="fc-victory-trace fc-progress-summary">${axis(model)}</div><div class="fc-city-victory"><div class="fc-victory-wordmark"><span class="fc-victory-kicker">${winner===0?'YOU WIN':'RIVAL WINS'}</span><h2 class="fc-victory-title" id="bloom-heading" tabindex="-1"><span>${winner===0?tr('你，','You,'):tr('对手，','Your rival,')}</span><strong>${tr('开花了。','in bloom.')}</strong></h2><p class="fc-match-outcome">${tr((winner===0?'你':'对手')+'赢下自己的 A · 闯关成功',winner===0?'You won your own Ace game.':'Your rival won their own Ace game.')}</p></div><div class="fc-story-canvas"><div class="fc-bloom-stage" data-phase="full" role="img" aria-label="${tr('三角梅在深圳地标之间依次绽放','Bougainvillea blooms among Shenzhen landmarks')}">${colorCity(assets().city,winner)}</div></div></div><div class="fc-victory-actions"><button type="button" class="fc-button fc-main" data-history>${tr('回望这一程','Remember this match')} ↗</button><button type="button" class="fc-button" data-bloom-replay>${tr('重看开花','Replay the bloom')}</button></div><section class="sz-match-memory" hidden>${historyHTML(model)}</section></div>`;
 host.querySelector('[data-history]').onclick=e=>{const box=host.querySelector('.sz-match-memory');box.hidden=!box.hidden;e.currentTarget.setAttribute('aria-expanded',String(!box.hidden));};bindHistory(host.querySelector('.sz-match-memory'),model);host.querySelector('[data-bloom-replay]').onclick=()=>animateCity(host);if(play)animateCity(host);
}
function hideResult(host){stop();resultContext=null;if(host){host.hidden=true;host.replaceChildren();}}
let lastLanguage=root.GKLocale?.language;
function refreshLocale(){const next=root.GKLocale?.language;if(next===lastLanguage)return;lastLanguage=next;if(progressContext){const c=progressContext;renderProgress(c.host,c.results,c.snapshot,c.first,c.replay);}if(resultContext){const c=resultContext;renderResult(c.host,c.results,c.snapshot,c.first,false);}}
if(root.document){observer=new MutationObserver(refreshLocale);observer.observe(document.documentElement,{attributes:true,attributeFilter:['lang']});matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',()=>{stop();if(resultContext)renderResult(resultContext.host,resultContext.results,resultContext.snapshot,resultContext.first,false);});}
return {project,rank,pos,memory,colorCity,axis,renderProgress,clearProgress,renderResult,hideResult,stop};
});
