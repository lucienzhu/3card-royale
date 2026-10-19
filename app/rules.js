/* Display-only guide. Fixed teaching cards never enter the player's game or saves. */
(()=>{'use strict';
 const host=document.getElementById('rg-guide'),dialog=document.getElementById('rule-page');
 const textPanel=document.getElementById('rg-text'),switches=document.getElementById('rg-switch');
 const progress=document.getElementById('rg-progress'),navigation=document.getElementById('rg-navigation'),scroller=dialog.querySelector('.modal-body');
 const standard=document.createElement('article');standard.className='standard-rules';standard.hidden=true;textPanel.before(standard);
 let step=0,view='visual',zone='hand',swapMode='round',swapGame=null,swapSource=null,swapResult=null,ranksOpen=false,rolesSwapped=false,lastLanguage='',lastVersion='';
 const data=window.SZRuleCases;
 const t=(zh,en)=>window.GKLocale?.language==='en'?en:zh;
 const card=(label,extra='')=>{const suit=(label.match(/[♠♥♣♦]/)||[''])[0],rank=label.replace(/[♠♥♣♦]/g,'');return `<span class="rg-card ${suit==='♥'||suit==='♦'?'red':''} ${extra}" aria-label="${rank}${suit}"><b>${rank}</b><i>${suit}</i>${extra.includes('wound')?'<small>'+t('伤','W')+'</small>':''}${extra.includes('wild')?'<small>✦</small>':''}</span>`;};
 const cards=(labels,extras=[])=>`<div class="rg-cards">${labels.map((c,i)=>card(c,extras[i]||'')).join('')}</div>`;
 const stack=n=>`<div class="rg-stack" aria-label="${n} ${t('张手牌','hand cards')}"><i></i><i></i><b>${n}</b></div>`;
 const damage=n=>`<span class="rg-damage" aria-label="${n}/5 ${t('伤','wounds')}">${Array.from({length:5},(_,i)=>`<i class="${i<n?'filled':''}"></i>`).join('')}<b>${n}/5</b></span>`;
 const points=n=>t(n+'分',n+' '+(n===1?'pt':'pts'));
 const duel=(a,b)=>`<div class="rg-duel"><div><div class="rg-side-label">${a.label}<b>${a.name} <span>${points(a.score)}</span></b></div>${cards(a.cards,a.extras)}</div><span class="rg-versus" aria-hidden="true">×</span><div><div class="rg-side-label">${b.label}<b>${b.name} <span>${points(b.score)}</span></b></div>${cards(b.cards,b.extras)}</div></div>`;
 const result=(main,sub='')=>`<div class="rg-result"><strong>${main}</strong>${sub?`<span>${sub}</span>`:''}</div>`;
 const metric=(who,from,to)=>`<span>${who}<b>${from} <i>→</i> ${to}</b></span>`;
 const counts=(a,b)=>`<div class="rg-counts">${metric(t('你的手牌','Your hand'),a[0],a[1])}${metric(t('对手手牌','Rival hand'),b[0],b[1])}</div>`;
 const hiddenCard=()=>'<span class="rg-card rg-back" aria-label="'+t('未知牌','Unknown card')+'"><b>?</b><i>✦</i></span>';
 // Reuse the live table's card and wound renderers on detached teaching elements.
 const tableCard=(label,back=false)=>{const id=back?null:Array.from({length:52},(_,i)=>i).find(i=>window.GK.label(i)===label);const el=window.card(id,{back,level:2,backLabel:t('对手手牌，牌面保密','Rival hand card, hidden')});if(!back&&window.GKLocale?.language==='en')el.setAttribute('aria-label',label+(window.GK.wild(id,2)?' · Wild':''));return el.outerHTML;};
 const tableDamage=n=>{const el=document.createElement('div');el.className='damage rg-demo-damage';window.damageBar(el,n);el.querySelector('small').textContent=t(' / 5 伤',' / 5 wounds');el.setAttribute('aria-label',t(n+'伤，共5格',n+' wounds out of 5'));return el.outerHTML;};
 const tableFaces=labels=>labels.map(c=>tableCard(c)).join('');
 const roleButton=()=>`<button type="button" class="primary" data-rg-role-switch>${t('交换攻防','Swap roles')}</button>`;
 function roleTable(){
  const s=data.states.attack,discard=52-s.stock-s.handCounts.reduce((a,b)=>a+b,0)-s.damage.reduce((a,b)=>a+b,0);
  return `<div class="rg-demo-table" data-stage="${rolesSwapped?'after':'before'}" aria-label="${t('教学牌桌：点交换攻防，查看谁先出牌','Practice table: swap roles to see who plays first')}">
   <div class="rg-demo-topline"><b>${t('对局','Play')}</b><span>${t('花牌','Wild')} ♥2</span><span>${t('第1局 · 第1轮','Game 1 · Round 1')}</span></div>
   <section class="rg-demo-player rg-demo-rival"><header><span><b>${t('对手','Rival')}</b><small>${t('5张','5 cards')}</small></span>${tableDamage(s.damage[1])}</header><div class="rg-demo-hand" data-rg-rival-hand aria-label="${t('对手5张手牌','Rival’s 5 hand cards')}">${s.hand[1].map(()=>tableCard(null,true)).join('')}</div><div class="rg-demo-wounds" data-rg-rival-wounds aria-label="${t('对手3张公开伤牌','Rival’s 3 public wounds')}">${tableFaces(s.wounds[1])}</div></section>
   <section class="rg-demo-battle"><div class="rg-demo-combat">
    <div class="rg-demo-side"><div class="rg-demo-label" data-rg-attack-label></div><div class="rg-demo-faces" data-rg-attack-cards></div></div>
    <div class="rg-demo-piles" role="img" aria-label="${t('牌库33张，弃牌6张','33 in deck, 6 discarded')}"><div><small>${t('牌堆','Deck')}</small><span class="rg-demo-pile rg-demo-stock"><b>${s.stock}</b><i aria-hidden="true">${window.SZFlowerMark}</i></span></div><div><small>${t('弃牌','Discard')}</small><span class="rg-demo-pile"><b>${discard}</b></span></div></div>
    <div class="rg-demo-side"><div class="rg-demo-label" data-rg-defense-label></div><div class="rg-demo-faces" data-rg-defense-cards></div></div>
   </div><div class="rg-demo-actionbar"><div><strong data-rg-role-status></strong><small data-rg-role-action-note></small></div><div class="rg-demo-actions" data-rg-role-actions></div></div></section>
   <section class="rg-demo-player rg-demo-own"><div class="rg-demo-wounds" data-rg-own-wounds aria-label="${t('你的伤牌区为空','Your wound area is empty')}"></div><div class="rg-demo-hand" data-rg-own-hand aria-label="${t('你的5张手牌','Your 5 hand cards')}">${tableFaces(s.hand[0])}</div><header><span><b>${t('你','You')}</b><small>${t('5张','5 cards')}</small></span>${tableDamage(s.damage[0])}</header></section>
  </div><div class="rg-role-guide"><p data-rg-role-note aria-live="polite"></p><button type="button" data-rg-role-replay ${rolesSwapped?'':'hidden'}>${t('再看一次','Replay')}</button></div>`;
 }
 function paintRoleState(){
  const panel=host.querySelector('.rg-demo-table');if(!panel)return;
  panel.dataset.stage=rolesSwapped?'after':'before';
  host.querySelector('[data-rg-attack-label]').innerHTML=rolesSwapped?`<b>${t('进攻 · 对手','Attack · Rival')}</b><small>${t('等待对手出牌','Rival plays next')}</small>`:`<b>${t('进攻 · 你','Attack · You')}</b><small>${t('同花顺 4分','Straight flush 4 pts')}</small>`;
  host.querySelector('[data-rg-defense-label]').innerHTML=rolesSwapped?`<b>${t('防守 · 你','Defend · You')}</b><small>${t('接着由你应对','Then you respond')}</small>`:`<b>${t('防守 · 对手','Defend · Rival')}</b><small>${t('对子 1分','Pair 1 pt')}</small>`;
  host.querySelector('[data-rg-attack-cards]').innerHTML=rolesSwapped?'':tableFaces(['♣6','♣7','♣8']);
  host.querySelector('[data-rg-defense-cards]').innerHTML=rolesSwapped?'':tableFaces(['♠5','♥5','♦9']);
  host.querySelector('[data-rg-role-status]').textContent=rolesSwapped?t('对手进攻中…','Rival is attacking…'):t('结算完成','Resolved');
  host.querySelector('[data-rg-role-action-note]').textContent=rolesSwapped?t('轮到对手先出牌','The rival plays first now'):t('交换进攻与防守','Switch attack and defense');
  host.querySelector('[data-rg-role-actions]').innerHTML=rolesSwapped?'':roleButton();
  host.querySelector('[data-rg-role-note]').textContent=rolesSwapped?t('现在对手先出牌，你来防守。双方仍各5张；完成这次攻防后，才补到8张。','The rival plays first, then you defend. Both still have 5 cards; refill to 8 after this second combat.'):t('你已经进攻过一次。点操作区的「交换攻防」，继续这一轮。','You have attacked once. Click “Swap roles” in the action bar to continue the round.');
  host.querySelector('[data-rg-role-replay]').hidden=!rolesSwapped;
  navigation.querySelector('[data-rg-next]').innerHTML=(rolesSwapped?t('看你如何防守','See how you defend'):t('试试交换攻防','Try swapping roles'))+' <i aria-hidden="true">→</i>';
 }
 const woundTransfer=()=>`<div class="rg-wound-transfer" aria-label="${t('3伤：从牌库摸3张，公开放入对手伤牌区','3 wounds: draw 3 cards from the deck into the rival’s public wound area')}">
  <div class="rg-transfer-source"><span>${t('牌库','Deck')}</span><span class="rg-card rg-back">${window.SZFlowerMark}</span></div>
  <div class="rg-transfer-arrow"><b>${t('摸3张','Draw 3')}</b><i aria-hidden="true">→</i></div>
  <div class="rg-transfer-target"><span>${t('对手伤牌区','Rival’s wound area')}</span>${cards(data.states.attack.wounds[1],Array(3).fill('wound'))}<b>${t('0 → 3伤','0 → 3 wounds')}</b></div>
 </div>`;
 const opening=()=>`<div class="rg-opening">
  <section class="rg-opening-player"><header><strong>${t('对手','Rival')}</strong><small>${t('8张 · 牌面保密','8 cards · Hidden')}</small></header><div class="rg-opening-hand" aria-label="${t('对手的8张手牌，牌面保密','Rival’s 8 hidden hand cards')}">${Array.from({length:8},()=>'<span class="rg-card rg-back" aria-hidden="true">'+window.SZFlowerMark+'</span>').join('')}</div><div class="rg-opening-wounds"><span>${t('伤牌区','Wound area')}</span><b>${t('空 · 0伤','Empty · 0 wounds')}</b></div></section>
  <section class="rg-opening-player"><header><strong>${t('你','You')}</strong><small>${t('8张 · 只有你能看','8 cards · Only you can see')}</small></header><div class="rg-opening-hand">${['6♣','7♣','8♣','4♠','4♥','2♥','9♠','Q♥'].map(c=>card(c,c==='2♥'?'wild':'')).join('')}</div><div class="rg-opening-wounds"><span>${t('伤牌区','Wound area')}</span><b>${t('空 · 0伤','Empty · 0 wounds')}</b></div></section>
 </div><p class="rg-opening-note">${t('本例由你先攻；♥2是双方共用的花牌，可当任意牌。','You attack first in this example. ♥2 is the shared flower and can stand for any card.')}</p>
 <div class="rg-opening-next"><b>${t('你进攻','You attack')}</b><i>→</i><b>${t('对手进攻','Rival attacks')}</b><i>→</i><b>${t('双方补牌','Both refill')}</b></div><p class="rg-opening-result">${t('双方各进攻一次，才补手牌。','Refill only after both players have attacked.')}</p>`;
 // A separate engine instance: teaching never touches the actual game, RNG or save.
 function resetSwap(){swapGame=window.GK.Game.restore(window.SZSwapCases[document.getElementById('version-select').value][swapMode]);swapSource=null;swapResult=null;}
 const swapValue=(who,zone,index)=>zone==='hand'?swapGame.players[who].hand[index]:swapGame.players[who].table[index].card;
 const swapZoneName=(who,zone)=>t((who?'对手':'你的')+(zone==='hand'?'手牌':'伤牌'),(who?'Rival’s':'Your')+(zone==='hand'?' hand':' wound'));
 const swapOptions=()=>swapSource?swapGame.refreshOptions().filter(o=>o.source.zone===swapSource.zone&&o.source.index===swapSource.index):[];
 const swapIndex=o=>swapGame.refreshOptions().findIndex(x=>JSON.stringify(x)===JSON.stringify(o));
 const swapOption=(who,zone,index)=>swapOptions().find(o=>o.exchange==='card'&&o.who===who&&o.zone===zone&&o.index===index);
 const swapIcon=()=>'<span class="rg-swap-badge" aria-hidden="true">⇄</span>';
 function swapFace(who,zone,index){
  const id=swapValue(who,zone,index),target=swapOption(who,zone,index),source=who===0&&(!swapSource||swapSource.zone===zone),selected=who===0&&swapSource?.zone===zone&&swapSource.index===index;
  const changed=swapResult&&(who===0&&zone===swapResult.source.zone&&index===swapResult.source.index||swapResult.option.exchange==='card'&&who===swapResult.option.who&&zone===swapResult.option.zone&&index===swapResult.option.index);
  const active=!swapResult&&(!!target||source),attrs=active?(target?'data-rg-swap-target="'+swapIndex(target)+'"':'data-rg-swap-source="'+zone+':'+index+'"'):'';
  const label=swapZoneName(who,zone)+' '+window.GK.label(id)+(target?t('，点击交换','; swap for this'):active?t('，点击交出','; choose to give'):''),el=tableCard(window.GK.label(id));
  return `<${active?'button':'div'} ${active?'type="button"':''} class="rg-swap-card ${target?'is-target':''} ${selected?'is-source':''} ${changed?'is-changed':''}" ${attrs} ${active?'aria-pressed="'+selected+'"':''} aria-label="${label}">${el}${target?swapIcon():''}</${active?'button':'div'}>`;
 }
 function swapTable(){
  if(!swapGame)resetSwap();
  const g=swapGame,options=swapOptions(),blind=options.find(o=>o.exchange==='opponent'),deck=options.find(o=>o.exchange==='deck'),label=t('对手手牌 · 盲换一张','Rival hand · Swap 1 at random');
  const targetAttrs=o=>o?'data-rg-swap-target="'+swapIndex(o)+'"':'';
  const row=(who,zone)=>g.players[who][zone].map((_,i)=>swapFace(who,zone,i)).join('');
  const status=swapResult?swapResult.main:swapSource?t('交出 '+window.GK.label(swapValue(0,swapSource.zone,swapSource.index))+'，再点 ⇄ 目标','Give '+window.GK.label(swapValue(0,swapSource.zone,swapSource.index))+'. Now select a ⇄ target.'):t('先点下方你的一张牌','First, select one of your cards below');
  const note=swapResult?swapResult.detail:swapSource?t('亮起的虚线区域都能换；弃牌堆不能换。','Swap with any highlighted dashed target. Discard is not a target.'):t('手牌或伤牌都可以交出；一次只换一张。','Give a hand card or wound. One card per opportunity.');
  return `<div class="rg-swap-examples" role="group" aria-label="${t('选择教学局面','Choose teaching example')}">${[['round',t('继续本轮','This round')],['wounded',t('另例：你有伤牌时','Another example: you have wounds')]].map(([key,name])=>`<button type="button" data-rg-swap-mode="${key}" aria-pressed="${swapMode===key}">${name}</button>`).join('')}</div>
  <div class="rg-demo-table rg-swap-table" data-swap-stage="${swapResult?'done':swapSource?'target':'source'}" aria-label="${t('换牌教学牌桌','Practice swapping on the table')}">
   <div class="rg-demo-topline"><b>${t('换牌','Swap')}</b><span>${t('花牌','Wild')} ♥2</span><span>${t('剩余','Left')} ${g.pendingRefresh?.remaining||0} ${t('次','swap')}</span></div>
   <section class="rg-demo-player rg-demo-rival"><header><span><b>${t('对手','Rival')}</b><small>${g.players[1].hand.length}${t('张',' cards')}</small></span>${tableDamage(g.players[1].table.length)}</header>
    <div class="rg-swap-zone"><span class="rg-swap-caption">${label}</span><${blind?'button':'div'} ${blind?'type="button"':''} class="rg-swap-blind ${blind?'is-target':''}" ${targetAttrs(blind)} aria-label="${label}"><span class="rg-demo-hand">${g.players[1].hand.map(()=>tableCard(null,true)).join('')}</span>${blind?swapIcon():''}</${blind?'button':'div'}></div>
    <div class="rg-swap-zone"><span class="rg-swap-caption">${t('对手伤牌 · 可指定一张','Rival wounds · Choose a card')}</span><div class="rg-demo-wounds" data-count="${g.players[1].table.length}" data-rg-swap-rival-wounds>${row(1,'table')}</div></div>
   </section>
   <section class="rg-swap-middle"><div class="rg-swap-piles"><div><small>${t('牌库 · 弃旧摸新','Deck · Discard, draw')}</small><${deck?'button':'div'} ${deck?'type="button"':''} class="rg-demo-pile rg-demo-stock rg-swap-deck ${deck?'is-target':''}" ${targetAttrs(deck)} aria-label="${t('牌库，弃掉交出的牌，再摸一张','Deck: discard your chosen card and draw one')}"><b>${g.stock.length}</b><i aria-hidden="true">${window.SZFlowerMark}</i>${deck?swapIcon():''}</${deck?'button':'div'}></div><div class="rg-swap-discard"><small>${t('弃牌','Discard')}</small><span class="rg-demo-pile"><b>${g.discard.length}</b></span></div></div></section>
   <section class="rg-demo-player rg-demo-own">
    <div class="rg-swap-zone"><span class="rg-swap-caption">${t('你的伤牌 · 公开','Your wounds · Face up')}</span><div class="rg-demo-wounds" data-rg-swap-own-wounds>${row(0,'table')||'<span class="rg-swap-empty">'+t('空，暂时不能换这里','Empty — no card to swap here')+'</span>'}</div></div>
    <div class="rg-swap-zone"><span class="rg-swap-caption">${t('你的手牌 · 只有你能看','Your hand · Private')}</span><div class="rg-demo-hand" data-rg-swap-own-hand>${row(0,'hand')}</div></div>
    <header><span><b>${t('你','You')}</b><small>${g.players[0].hand.length}${t('张',' cards')}</small></span>${tableDamage(g.players[0].table.length)}</header>
   </section>
  </div><div class="rg-swap-feedback" tabindex="-1" role="status"><div><strong>${status}</strong><p>${note}</p></div>${swapSource||swapResult?'<button type="button" data-rg-swap-reset>'+t(swapResult?'再试一种':'重选',swapResult?'Try another':'Choose again')+'</button>':''}</div>
  <p class="rg-swap-invariants">${t('1次机会 · 张数不变 · 不回血','1 opportunity · Same card counts · No healing')}</p>`;
 }
 function applySwap(option){
  const source={...swapSource},given=window.GK.label(swapValue(0,source.zone,source.index)),destination=option.exchange==='deck'?t('弃牌堆','discard'):option.exchange==='opponent'?t('对手手牌（随机一张）','rival hand (one random card)'):swapZoneName(option.who,option.zone);
  swapGame.refresh(option);
  const received=window.GK.label(swapValue(0,source.zone,source.index)),publicSource=source.zone==='table';
  swapResult={source,option,main:t(given+' → '+destination+'；你拿回 '+received,given+' → '+destination+'; you receive '+received),detail:t(received+'放回'+(publicSource?'你的伤牌区，保持公开。':'你的手牌，只有你能看。')+'张数和伤势都不变。',received+' replaces your '+(publicSource?'face-up wound.':'private hand card.')+' Card counts and wounds stay unchanged.')};
 }
 const zoneCopy=()=>({
  hand:{title:t('手牌：只有自己能看','Hand: private to its owner'),body:t('可与自己的伤牌一起选来出牌；一轮结束时，手牌补到8张。','Private to you. Play these with your wounds; refill to 8 at round end.')},
  wound:{title:t('伤牌：双方公开，都算伤势','Wounds: public, and count as damage'),body:t('自己的伤牌也能出，用后原位补一张，仍算伤。达到5伤就输小局。','Face up. Play your wounds, then replace them; damage stays. At 5 wounds, you lose.')},
  battle:{title:t('攻防区：比较这次出的牌','Combat: compare the played cards'),body:document.getElementById('version-select').value==='1.0.0'?t('通常各出3张；四炸4张，五炸5张。在这里比较牌型与分数。','Usually play 3 cards; 4 for a four-bomb, 5 for a five-bomb. Compare hand types and scores here.'):t('进攻和防守各出3张；四炸可出4张。在这里比较牌型与分数。','Play 3 cards, or a 4-card bomb. Compare hand types and scores here.')},
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
  {title:t('开局：各8张，伤牌区留空','Start: 8 cards each, no wounds'),caption:t('上方是对手，下方是你。先看清自己的牌。','Rival above, you below. Your own cards are face up.'),body:opening},
  {title:t('你进攻，对手受伤','You attack. The rival takes wounds.'),caption:t('你从手牌出6♣7♣8♣，对手出三张牌防守。','Play 6♣7♣8♣ from your hand. The rival defends with three cards.'),body:()=>duel({label:t('你 · 进攻','You · Attack'),name:t('同花顺','Straight flush'),score:4,cards:['6♣','7♣','8♣']},{label:t('对手 · 防守','Rival · Defend'),name:t('对子','Pair'),score:1,cards:['5♠','5♥','9♦']})+result(t('4分 − 1分 = 3伤','4 pts − 1 pt = 3 wounds'),t('对手增加3伤：从牌库摸3张，公开放入伤牌区。','The rival takes 3 wounds: draw 3 cards face up into their wound area.'))+woundTransfer()+counts([8,5],[8,5])+`<details class="rg-more"><summary>${t('伤牌以后也能出吗？','Can wounds be played later?')}</summary><p>${t('能。下面另举一例：若你有6♣伤牌，可和手牌一起出；用后原位补一张，伤势不减少。','Yes. In a later situation, a wound such as 6♣ can be played with your hand. Replace it afterward; damage stays unchanged.')}</p><div class="rg-replace">${card('6♣','wound')}<span>${t('用后原位补','Play, replace')}<b>→</b></span>${card('K♦','wound')}<strong>${t('仍是1伤','Still 1 wound')}</strong></div></details>`},
  {title:t('轮到对手进攻了','The rival attacks next'),caption:t('你已进攻一次；一轮双方各攻一次。跟着牌桌点一下，看接下来谁先出牌。','You have attacked once. Each player attacks once per round. Try the table below to see who plays next.'),body:roleTable},
  {title:t('你守住了，赢1次机会','Defend to earn 1 swap'),caption:t('♥2是共用花牌，这里当作第三张4。','♥2 is the shared flower. Here it becomes a third 4.'),body:()=>duel({label:t('对手 · 进攻','Rival · Attack'),name:t('同花顺','Straight flush'),score:4,cards:['J♠','Q♠','K♠']},{label:t('你 · 防守','You · Defend'),name:t('三炸','Three of a kind'),score:5,cards:['4♠','4♥','2♥'],extras:['','','wild']})+`<div class="rg-wild-note">♥2 <span>→</span> ${data.defense.wild?window.GK.label(data.defense.wild.as):'♣4'} · ${t('花牌可代任意牌','Flower = wildcard')}</div>`+result(t('5分 − 4分 = 1次交换','5 pts − 4 pts = 1 swap'),t('防守赢的是机会，伤势不变','Defense earns opportunity. Wounds stay unchanged.'))+counts([5,2],[5,2])},
  {title:t('在牌桌上试一次换牌','Try a swap on the table'),caption:t('先选你的一张牌，再点带 ⇄ 的目标。牌会在原位换好。','Select one of your cards, then a ⇄ target. See both cards change in place.'),body:swapTable},
  {title:t('一轮结束，各补到8张','Round over. Refill to 8.'),caption:t('双方都进攻过了，现在保留余牌、补齐手牌。','Both have attacked. Now keep your unused cards and refill.'),body:()=>`<div class="rg-refill"><div><strong>${t('你','You')}</strong>${stack(2)}<b>+6</b>${stack(8)}</div><div><strong>${t('对手','Rival')}</strong>${stack(2)}<b>+6</b>${stack(8)}</div></div><div class="rg-wound-pair"><span>${t('你','You')}${damage(0)}</span><span>${t('对手','Rival')}${damage(3)}</span></div>${result(t('下一轮，对手先攻','Next round, the rival attacks first'),t('伤牌保留，不回血。达到5伤就输小局。','Wounds remain. No healing. 5 wounds loses the game.'))}`},
 ];
 function paint(){
  const isStandard=document.getElementById('version-select').value==='1.0.0';
  if(isStandard)standard.innerHTML=window.SZStandardRules[window.GKLocale?.language==='en'?'en':'zh'];
  const available=isStandard||document.getElementById('version-select').value==='0.3.8';
  switches.parentElement.hidden=!available;
  switches.querySelector('[data-rg-view="visual"]').hidden=!available;
  if(!available)view='text';
  const visual=view==='visual'&&available;host.hidden=!visual;textPanel.hidden=visual||isStandard;standard.hidden=visual||!isStandard;
  switches.setAttribute('aria-label',t('规则展示方式','Rules view'));
  document.getElementById('rules-heading').textContent=visual?t('看图学一轮','One round, illustrated'):isStandard?t('标准规则 1.0','Standard Rules 1.0'):t('完整文字规则','Full written rules');
  switches.querySelector('[data-rg-view="visual"]').textContent=t('图解','Guide');
  switches.querySelector('[data-rg-view="text"]').textContent=t('文字','Text');
  for(const b of switches.querySelectorAll('button'))b.setAttribute('aria-pressed',String(b.dataset.rgView===(visual?'visual':'text')));
  progress.hidden=!visual;navigation.hidden=!visual;
  if(!visual){if(!isStandard)textPanel.querySelector('details.full-rules').open=true;return;}
  const list=steps(),s=list[step];
  progress.setAttribute('aria-label',t('图解步骤','Guide steps'));
  progress.innerHTML=list.map((x,i)=>`<button type="button" data-rg-step="${i}" aria-label="${i===0?t('牌区','Zones'):i}. ${x.title}" ${i===step?'aria-current="step"':''}>${i===0?t('牌区','Zones'):i}</button>`).join('');
  navigation.innerHTML=`<button type="button" data-rg-prev ${step===0?'disabled':''}>${t('上一步','Back')}</button><span>${step===0?t('牌区','Zones'):step+' / '+(list.length-1)}</span><button type="button" data-rg-next>${step===list.length-1?t('回到牌桌','Back to game'):step===0?t('开始一轮','Start round'):t('下一步','Next')} <i aria-hidden="true">→</i></button>`;
  const ranks=[...(isStandard?[[t('五炸','Five-bomb'),7]]:[]),[t('四炸','Four-kind'),6],[t('三炸','Three-kind'),5],[t('同花顺','Straight flush'),4],[t('同花','Flush'),3],[t('顺子','Straight'),2],[t('对子','Pair'),1],[t('高牌','High card'),0]];
  const exampleScores=step===2?[4,1]:step===4?[5,4]:[];
  const reference=step===0||step===3||step===5?'':`<div class="rg-reference-action"><button type="button" data-rg-ranks aria-expanded="${ranksOpen}" aria-controls="rg-rank-panel">${t('牌型与分数','Ranks & points')}<i aria-hidden="true">${ranksOpen?'−':'+'}</i></button></div><section class="rg-rank-panel" id="rg-rank-panel" aria-label="${t('牌型与分数','Hand ranks and points')}" ${ranksOpen?'':'hidden'}><table class="rg-score-table"><thead><tr><th scope="col">${t('牌型','Hand type')}</th><th scope="col">${t('分数','Points')}</th></tr></thead><tbody>${ranks.map(([name,n])=>`<tr${exampleScores.includes(n)?' class="is-example"':''}><th scope="row">${name}</th><td>${points(n)}</td></tr>`).join('')}</tbody></table><p>${t('同牌型比点数：进攻胜造成1伤，防守胜得1次机会；完全同点无事发生。','Same hand type: compare ranks. Attack rank win deals 1 wound; defense rank win earns 1 swap. Exact ties do nothing.')}${isStandard?t(' 三张、四炸和五炸可互相接；五炸是四张同数加花牌，7分。',' Three-card hands, four-bombs and five-bombs may answer each other. Five-bomb: four natural cards of one rank plus the flower, 7 points.'):t(' 三张和四炸可互相接。',' Three cards and four of a kind may answer each other.')}</p></section>`;
  host.innerHTML=`<article class="rg-stage" aria-live="polite"><div class="rg-step-heading"><h3>${s.title}</h3><p>${s.caption}</p></div>${reference}<div class="rg-figure">${s.body()}</div></article>`;
  if(step===3)paintRoleState();
 }
 switches.addEventListener('click',e=>{const b=e.target.closest('[data-rg-view]');if(b){view=b.dataset.rgView;paint();scroller.scrollTop=0;}});
 function navigate(e){
  const b=e.target.closest('button');if(!b)return;
  if(b.hasAttribute('data-rg-role-switch')||b.hasAttribute('data-rg-role-replay')||step===3&&!rolesSwapped&&b.hasAttribute('data-rg-next')){rolesSwapped=!b.hasAttribute('data-rg-role-replay');paintRoleState();if(rolesSwapped)host.querySelector('[data-rg-role-replay]').focus({preventScroll:true});else host.querySelector('[data-rg-role-switch]').focus({preventScroll:true});return;}
  if(b.hasAttribute('data-rg-swap-mode')||b.hasAttribute('data-rg-swap-reset')||b.hasAttribute('data-rg-swap-source')||b.hasAttribute('data-rg-swap-target')){
   const mode=b.dataset.rgSwapMode,src=b.dataset.rgSwapSource,target=b.dataset.rgSwapTarget;
   if(mode){swapMode=mode;resetSwap();}else if(b.hasAttribute('data-rg-swap-reset'))resetSwap();else if(src){const [zone,index]=src.split(':');swapSource={zone,index:Number(index)};}else if(target!==undefined){const option=swapGame.refreshOptions()[Number(target)];if(!option||option.source.zone!==swapSource?.zone||option.source.index!==swapSource?.index)return;applySwap(option);}
   const scroll=scroller.scrollTop;host.querySelector('.rg-figure').innerHTML=swapTable();scroller.scrollTop=scroll;
   const focus=mode?'[data-rg-swap-mode="'+mode+'"]':src?'[data-rg-swap-target]':'.rg-swap-feedback';host.querySelector(focus)?.focus({preventScroll:true});return;
  }
  if(b.hasAttribute('data-rg-ranks')){ranksOpen=!ranksOpen;b.setAttribute('aria-expanded',String(ranksOpen));b.querySelector('i').textContent=ranksOpen?'−':'+';host.querySelector('#rg-rank-panel').hidden=!ranksOpen;return;}
  if(b.dataset.rgStep!==undefined||b.hasAttribute('data-rg-prev')||b.hasAttribute('data-rg-next')){ranksOpen=false;rolesSwapped=false;swapGame=null;swapSource=null;swapResult=null;swapMode='round';}
  if(b.dataset.rgStep!==undefined)step=Number(b.dataset.rgStep);
  else if(b.hasAttribute('data-rg-prev'))step=Math.max(0,step-1);
  else if(b.hasAttribute('data-rg-next')){if(step===steps().length-1){document.getElementById('close-rules').click();return;}step++;}
  else if(b.dataset.rgZone)zone=b.dataset.rgZone;
  else return;
  const focus=b.dataset.rgSpot?'[data-rg-spot="'+b.dataset.rgSpot+'"]':b.hasAttribute('data-rg-next')?'[data-rg-next]':b.hasAttribute('data-rg-prev')?'[data-rg-prev]':'[data-rg-step="'+b.dataset.rgStep+'"]';
  paint();if(!b.dataset.rgZone)scroller.scrollTop=0;dialog.querySelector(focus)?.focus({preventScroll:true});
 }
 for(const element of [host,progress,navigation])element.addEventListener('click',navigate);
 function sync(){const language=window.GKLocale?.language||'zh-CN',version=document.getElementById('version-select').value;if(language!==lastLanguage||version!==lastVersion){if(version!==lastVersion){swapGame=null;swapSource=null;swapResult=null;swapMode='round';view=version==='0.3.8'||version==='1.0.0'?'visual':'text';step=0;}lastLanguage=language;lastVersion=version;paint();}}
 new MutationObserver(sync).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
 new MutationObserver(()=>{if(dialog.open)sync();}).observe(dialog,{attributes:true,attributeFilter:['open']});
 document.getElementById('version-select').addEventListener('change',()=>queueMicrotask(sync));
 sync();
})();
