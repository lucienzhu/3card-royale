/* Display-only guide. Fixed teaching cards never enter the player's game or saves. */
(()=>{'use strict';
 const host=document.getElementById('rg-guide'),dialog=document.getElementById('rule-page');
 const textPanel=document.getElementById('rg-text'),switches=document.getElementById('rg-switch');
 const progress=document.getElementById('rg-progress'),navigation=document.getElementById('rg-navigation'),scroller=dialog.querySelector('.modal-body');
 const standard=document.createElement('article');standard.className='standard-rules';standard.hidden=true;textPanel.before(standard);
 let step=0,view='visual',exchange='rival',sourceZone='hand',zone='hand',lastLanguage='',lastVersion='';
 const data=window.SZRuleCases;
 const t=(zh,en)=>window.GKLocale?.language==='en'?en:zh;
 const card=(label,extra='')=>{const suit=(label.match(/[♠♥♣♦]/)||[''])[0],rank=label.replace(/[♠♥♣♦]/g,'');return `<span class="rg-card ${suit==='♥'||suit==='♦'?'red':''} ${extra}" aria-label="${rank}${suit}"><b>${rank}</b><i>${suit}</i>${extra.includes('wound')?'<small>'+t('伤','W')+'</small>':''}${extra.includes('wild')?'<small>✦</small>':''}</span>`;};
 const cards=(labels,extras=[])=>`<div class="rg-cards">${labels.map((c,i)=>card(c,extras[i]||'')).join('')}</div>`;
 const stack=n=>`<div class="rg-stack" aria-label="${n} ${t('张手牌','hand cards')}"><i></i><i></i><b>${n}</b></div>`;
 const damage=n=>`<span class="rg-damage" aria-label="${n}/5 ${t('伤','wounds')}">${Array.from({length:5},(_,i)=>`<i class="${i<n?'filled':''}"></i>`).join('')}<b>${n}/5</b></span>`;
 const duel=(a,b)=>`<div class="rg-duel"><div><div class="rg-side-label">${a.label}<b>${a.name} ${a.score}</b></div>${cards(a.cards,a.extras)}</div><span class="rg-versus" aria-hidden="true">×</span><div><div class="rg-side-label">${b.label}<b>${b.name} ${b.score}</b></div>${cards(b.cards,b.extras)}</div></div>`;
 const result=(main,sub='')=>`<div class="rg-result"><strong>${main}</strong>${sub?`<span>${sub}</span>`:''}</div>`;
 const metric=(who,from,to)=>`<span>${who}<b>${from} <i>→</i> ${to}</b></span>`;
 const counts=(a,b)=>`<div class="rg-counts">${metric(t('你的手牌','Your hand'),a[0],a[1])}${metric(t('对手手牌','Rival hand'),b[0],b[1])}</div>`;
 const hiddenCard=()=>'<span class="rg-card rg-back" aria-label="'+t('未知牌','Unknown card')+'"><b>?</b><i>✦</i></span>';
 function exchangeCase(){
  const wound=sourceZone==='table',give=wound?'K♦':'9♠',other=wound?'9♠':'K♦';
  const own=t(wound?'你的伤牌':'你的手牌',wound?'Your wound':'Your hand');
  const destinations=[['blind',t('对手盲手牌','Rival’s blind hand')],['rival',t('对手伤牌','Rival’s wound')],['own',t(wound?'自己的手牌':'自己的伤牌',wound?'Your hand':'Your wound')],['deck',t('牌库','Draw pile')]];
  const label=destinations.find(x=>x[0]===exchange)[1];
  let main,detail;
  if(exchange==='blind'){
   main=t('交出'+give+'，随机换回1张','Give '+give+'; receive 1 random card');
   detail=t(wound?'换回的牌放回你的伤牌区，立即公开。':'换回的牌进你的手牌，保持保密。',wound?'The received card becomes your face-up wound.':'The received card goes into your private hand.');
  }else if(exchange==='deck'){
   main=t('弃掉'+give+'，再摸1张','Discard '+give+', then draw 1');
   detail=t(wound?'新牌补回你的伤牌区，立即公开。':'新牌补回你的手牌，保持保密。',wound?'The new card replaces your wound, face up.':'The new card replaces your hand card, privately.');
  }else if(exchange==='own'){
   main=t('手牌9♠与伤牌K♦互换','Hand 9♠ ⇄ wound K♦');
   detail=t('换入手牌的保密，换入伤牌区的公开。','Cards entering the hand are private; wounds are public.');
  }else{
   main=t('你拿10♦，对手伤牌换成'+give,'You receive 10♦; their wound becomes '+give);
   detail=t(wound?'10♦放回你的伤牌区，双方伤牌保持公开。':'10♦进你的手牌，对手的伤牌公开。',wound?'10♦ becomes your wound. Both wounds stay face up.':'10♦ enters your private hand; their wound stays face up.');
  }
  return `<div class="rg-swap-picker">
   <div class="rg-swap-row"><span>${t('交出','Give')}</span><div class="rg-swap-source" role="group" aria-label="${t('选择自己的牌区','Your source zone')}">${[['hand',t('自己的手牌','Your hand')],['table',t('自己的伤牌','Your wound')]].map(([key,name])=>`<button type="button" data-rg-source="${key}" aria-pressed="${sourceZone===key}">${name}</button>`).join('')}</div></div>
   <div class="rg-swap-row"><span>${t('换到','For')}</span><div class="rg-swap-target" role="group" aria-label="${t('全部交换目标','All swap destinations')}">${destinations.map(([key,name])=>`<button type="button" data-rg-exchange="${key}" aria-pressed="${exchange===key}">${name}</button>`).join('')}</div></div>
  </div><div class="rg-exchange rg-all-swaps" data-source="${sourceZone}" data-target="${exchange}"><div><small>${own}</small>${card(give,wound?'wound':'')}</div><strong aria-hidden="true">${exchange==='deck'?'→':'⇄'}</strong><div><small>${label}</small>${exchange==='rival'?card('10♦','wound'):exchange==='own'?card(other,wound?'':'wound'):hiddenCard()}</div></div>
  ${result(main,detail)}<p class="rg-swap-invariants">${t('每次1机会 · 张数不变 · 不回血','1 opportunity each · Same counts · No healing')}</p>`;
 }
 const zoneCopy=()=>({
  hand:{title:t('手牌：只有自己能看','Hand: private to its owner'),body:t('可与自己的伤牌一起选来出牌；一轮结束时，手牌补到8张。','Private to you. Play these with your wounds; refill to 8 at round end.')},
  wound:{title:t('伤牌：双方公开，都算伤势','Wounds: public, and count as damage'),body:t('自己的伤牌也能出，用后原位补一张，仍算伤。达到5伤就输小局。','Face up. Play your wounds, then replace them; damage stays. At 5 wounds, you lose.')},
  battle:{title:t('攻防区：比较这次出的牌','Combat: compare the played cards'),body:t('进攻和防守各出3张；四炸可出4张。在这里比较牌型与分数。','Play 3 cards, or a 4-card bomb. Compare hand types and scores here.')},
  piles:{title:t('共用牌库与弃牌堆','Shared draw and discard piles'),body:t('补牌从牌库摸；出过或换掉的牌进弃牌堆。牌库空了，就重洗弃牌。','Draw here. Played or replaced cards go to discard; reshuffle it when the deck is empty.')},
 });
 function zoneMap(){
  const back=()=>'<span class="rg-zone-card rg-zone-back"><i>✦</i></span>';
  const mini=(label,wound=false)=>card(label,wound?'wound rg-zone-card':'rg-zone-card');
  const fan=hidden=>`<span class="rg-zone-fan" aria-hidden="true">${hidden?[1,2,3].map(back).join(''):['9♠','Q♥','A♠'].map(c=>mini(c)).join('')}</span>`;
  const button=(key,spot,label,body,extra='')=>`<button type="button" class="rg-zone ${extra}" data-rg-zone="${key}" data-rg-spot="${spot}" aria-pressed="${zone===key}" aria-controls="rg-zone-detail"><span class="rg-zone-label">${label}</span>${body}</button>`;
  const info=zoneCopy()[zone];
  return `<div class="rg-zone-map" role="group" aria-label="${t('牌桌与各牌区示意，点击查看用途','Table diagram. Select a zone to learn its purpose')}">
   ${button('hand','rival-hand',t('对手手牌 · 保密','Rival hand · Private'),fan(true),'rg-zone-line')}
   ${button('wound','rival-wound',t('对手伤牌 · 公开','Rival wounds · Public'),'<span aria-hidden="true">'+mini('J♦',true)+'</span>','rg-zone-line')}
   <div class="rg-zone-center">
    ${button('battle','attack',t('进攻区','Attack'),'<span class="rg-zone-cards" aria-hidden="true">'+['6♣','7♣','8♣'].map(c=>mini(c)).join('')+'</span>')}
    ${button('piles','piles',t('牌库／弃牌','Draw / Discard'),'<span class="rg-zone-piles" aria-hidden="true"><span>'+back()+'</span><span>'+mini('3♦')+'</span></span>')}
    ${button('battle','defense',t('防守区','Defense'),'<span class="rg-zone-cards" aria-hidden="true">'+['5♠','5♥','9♦'].map(c=>mini(c)).join('')+'</span>')}
   </div>
   ${button('wound','your-wound',t('你的伤牌 · 公开','Your wounds · Public'),'<span aria-hidden="true">'+mini('K♦',true)+'</span>','rg-zone-line')}
   ${button('hand','your-hand',t('你的手牌 · 保密','Your hand · Private'),fan(false),'rg-zone-line')}
  </div><div class="rg-zone-detail" id="rg-zone-detail" data-zone="${zone}"><strong>${info.title}</strong><p>${info.body}</p></div><p class="rg-zone-note">${t('示意图含伤牌；正式开局双方各8张手牌、0伤。','Wounds shown as examples. Start: 8 hand cards, 0 wounds each.')}</p>`;
 }
 const steps=()=>[
  {title:t('先认牌区，再开始','Know the table first'),caption:t('点击任一牌区，看它的用途。','Select any zone to learn what it does.'),body:zoneMap},
  {title:t('先看这一轮的起点','Start of this round'),caption:t('例子从双方各有1伤开始。花牌都是♥2。','Both players already have 1 wound. The shared flower is ♥2.'),body:()=>`<div class="rg-route"><b>${t('你进攻','You attack')}</b><i>→</i><b>${t('对手进攻','Rival attacks')}</b><i>→</i><b>${t('补手牌','Refill')}</b></div><div class="rg-start-row"><strong>${t('对手','Rival')}</strong><div>${stack(8)}<small>${t('手牌保密','Private hand')}</small></div><div>${cards(['J♦'])}${damage(1)}</div></div><div class="rg-start-row"><strong>${t('你','You')}</strong><div>${stack(8)}<small>${t('8张手牌','8 hand cards')}</small></div><div>${cards(['6♣'],['wound'])}${damage(1)}</div></div>${result(t('各进攻一次，才算一轮','A round = one attack each'))}`},
  {title:t('你进攻：伤牌也能出','Your attack: use a wound'),caption:t('手里的7、8，搭上公开伤牌6。','Combine your hand’s 7 and 8 with your face-up wound 6.'),body:()=>duel({label:t('你 · 进攻','You · Attack'),name:t('同花顺','Straight flush'),score:4,cards:['6♣','7♣','8♣'],extras:['wound']},{label:t('对手 · 防守','Rival · Defend'),name:t('对子','Pair'),score:1,cards:['5♠','5♥','9♦']})+result(t('4 − 1 = 对手 +3伤','4 − 1 = rival +3 wounds'),t('对手的伤势：1 → 4','Rival wounds: 1 → 4'))+`<div class="rg-replace">${card('6♣','wound')}<span>${t('弃掉后原位补','Discard, replace')}<b>→</b></span>${card('K♦','wound')}<strong>${t('仍是1伤','Still 1 wound')}</strong></div>`+counts([8,6],[8,5])},
  {title:t('交换攻防，先不补手牌','Swap roles. No refill yet.'),caption:t('现在由对手进攻，你用剩下的牌来防守。','The rival attacks next. Defend with the cards you have left.'),body:()=>`<div class="rg-role-swap"><div><b>${t('你','You')}</b>${stack(6)}<strong>${t('防守','Defend')}</strong></div><span aria-hidden="true">⇄</span><div><b>${t('对手','Rival')}</b>${stack(5)}<strong>${t('进攻','Attack')}</strong></div></div>${result(t('这时不摸牌','Do not draw yet'),t('公开伤牌也仍可参与出牌','Your face-up wounds are still playable'))}<div class="rg-wound-pair"><span>${t('你','You')}${damage(1)}</span><span>${t('对手','Rival')}${damage(4)}</span></div>`},
  {title:t('你守住了，赢1次机会','Defend to earn 1 swap'),caption:t('♥2是共用花牌，这里当作第三张4。','♥2 is the shared flower. Here it becomes a third 4.'),body:()=>duel({label:t('对手 · 进攻','Rival · Attack'),name:t('同花顺','Straight flush'),score:4,cards:['J♠','Q♠','K♠']},{label:t('你 · 防守','You · Defend'),name:t('三炸','Three of a kind'),score:5,cards:['4♠','4♥','2♥'],extras:['','','wild']})+`<div class="rg-wild-note">♥2 <span>→</span> ${data.defense.wild?window.GK.label(data.defense.wild.as):'♣4'} · ${t('花牌可代任意牌','Flower = wildcard')}</div>`+result(t('5 − 4 = 1次交换','5 − 4 = 1 swap'),t('防守赢的是机会，伤势不变','Defense earns opportunity. Wounds stay unchanged.'))+counts([6,3],[5,2])},
  {title:t('1次机会，任选一种交换','1 swap. Choose any route.'),caption:t('先选自己的手牌或伤牌，再选交换目标。','Choose your hand card or wound, then pick its destination.'),body:exchangeCase},
  {title:t('一轮结束，各补到8张','Round over. Refill to 8.'),caption:t('保留剩余手牌，只补缺的数量。','Keep your unused cards. Draw only the missing cards.'),body:()=>`<div class="rg-refill"><div><strong>${t('你','You')}</strong>${stack(3)}<b>+5</b>${stack(8)}</div><div><strong>${t('对手','Rival')}</strong>${stack(2)}<b>+6</b>${stack(8)}</div></div><div class="rg-wound-pair"><span>${t('你','You')}${damage(1)}</span><span>${t('对手','Rival')}${damage(4)}</span></div>${result(t('下一轮，对手先攻','Next round, the rival attacks first'),t('伤牌保留，不回血。达到5伤就输小局。','Wounds remain. No healing. 5 wounds loses the game.'))}<div class="rg-finish">2 <span>→</span> A <span>+</span> ${t('再赢一局','win again')} <b>⚑</b></div>`},
 ];
 function paint(){
  const isStandard=document.getElementById('version-select').value==='1.0.0';standard.hidden=!isStandard;
  if(isStandard){standard.innerHTML=window.SZStandardRules[window.GKLocale?.language==='en'?'en':'zh'];switches.parentElement.hidden=true;host.hidden=true;textPanel.hidden=true;progress.hidden=true;navigation.hidden=true;document.getElementById('rules-heading').textContent=t('标准规则 1.0','Standard Rules 1.0');return;}
  const available=document.getElementById('version-select').value==='0.3.8';
  switches.parentElement.hidden=!available;
  switches.querySelector('[data-rg-view="visual"]').hidden=!available;
  if(!available)view='text';
  const visual=view==='visual'&&available;host.hidden=!visual;textPanel.hidden=visual;
  switches.setAttribute('aria-label',t('规则展示方式','Rules view'));
  document.getElementById('rules-heading').textContent=visual?t('看图学一轮','One round, illustrated'):t('完整文字规则','Full written rules');
  switches.querySelector('[data-rg-view="visual"]').textContent=t('图解','Guide');
  switches.querySelector('[data-rg-view="text"]').textContent=t('文字','Text');
  for(const b of switches.querySelectorAll('button'))b.setAttribute('aria-pressed',String(b.dataset.rgView===(visual?'visual':'text')));
  progress.hidden=!visual;navigation.hidden=!visual;
  if(!visual){textPanel.querySelector('details.full-rules').open=true;return;}
  const list=steps(),s=list[step];
  progress.setAttribute('aria-label',t('图解步骤','Guide steps'));
  progress.innerHTML=list.map((x,i)=>`<button type="button" data-rg-step="${i}" aria-label="${i===0?t('牌区','Zones'):i}. ${x.title}" ${i===step?'aria-current="step"':''}>${i===0?t('牌区','Zones'):i}</button>`).join('');
  navigation.innerHTML=`<button type="button" data-rg-prev ${step===0?'disabled':''}>${t('上一步','Back')}</button><span>${step===0?t('牌区','Zones'):step+' / '+(list.length-1)}</span><button type="button" data-rg-next>${step===list.length-1?t('回到牌桌','Back to game'):step===0?t('开始一轮','Start round'):t('下一步','Next')} <i aria-hidden="true">→</i></button>`;
  host.innerHTML=`<article class="rg-stage" aria-live="polite"><div class="rg-step-heading"><h3>${s.title}</h3><p>${s.caption}</p></div><div class="rg-figure">${s.body()}</div></article><details class="rg-reference" ${step===0?'hidden':''}><summary>${t('牌型速查 · 同分怎么办','Hand ranks · ties')}</summary><div class="rg-ranks">${[[t('四炸','Four-kind'),6],[t('三炸','Three-kind'),5],[t('同花顺','Straight flush'),4],[t('同花','Flush'),3],[t('顺子','Straight'),2],[t('对子','Pair'),1],[t('高牌','High card'),0]].map(([name,n])=>`<span>${name}<b>${n}</b></span>`).join('')}</div><p>${t('同牌型比点数：进攻胜造成1伤，防守胜得1次机会；完全同点无事发生。三张和四炸可互相接。','Same hand type: compare ranks. Attack rank win deals 1 wound; defense rank win earns 1 swap. Exact ties do nothing. Three cards and four of a kind may answer each other.')}</p></details>`;
 }
 switches.addEventListener('click',e=>{const b=e.target.closest('[data-rg-view]');if(b){view=b.dataset.rgView;paint();scroller.scrollTop=0;}});
 function navigate(e){
  const b=e.target.closest('button');if(!b)return;
  if(b.dataset.rgStep!==undefined)step=Number(b.dataset.rgStep);
  else if(b.hasAttribute('data-rg-prev'))step=Math.max(0,step-1);
  else if(b.hasAttribute('data-rg-next')){if(step===steps().length-1){document.getElementById('close-rules').click();return;}step++;}
  else if(b.dataset.rgExchange)exchange=b.dataset.rgExchange;
  else if(b.dataset.rgSource)sourceZone=b.dataset.rgSource;
  else if(b.dataset.rgZone)zone=b.dataset.rgZone;
  else return;
  const focus=b.dataset.rgSpot?'[data-rg-spot="'+b.dataset.rgSpot+'"]':b.dataset.rgSource?'[data-rg-source="'+b.dataset.rgSource+'"]':b.hasAttribute('data-rg-next')?'[data-rg-next]':b.hasAttribute('data-rg-prev')?'[data-rg-prev]':b.dataset.rgExchange?'[data-rg-exchange="'+b.dataset.rgExchange+'"]':'[data-rg-step="'+b.dataset.rgStep+'"]';
  paint();if(!b.dataset.rgExchange&&!b.dataset.rgSource&&!b.dataset.rgZone)scroller.scrollTop=0;dialog.querySelector(focus)?.focus({preventScroll:true});
 }
 for(const element of [host,progress,navigation])element.addEventListener('click',navigate);
 function sync(){const language=window.GKLocale?.language||'zh-CN',version=document.getElementById('version-select').value;if(language!==lastLanguage||version!==lastVersion){if(version!==lastVersion){view=version==='0.3.8'?'visual':'text';step=0;}lastLanguage=language;lastVersion=version;paint();}}
 new MutationObserver(sync).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
 new MutationObserver(()=>{if(dialog.open)sync();}).observe(dialog,{attributes:true,attributeFilter:['open']});
 document.getElementById('version-select').addEventListener('change',()=>queueMicrotask(sync));
 sync();
})();
