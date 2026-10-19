/* Fixed practice games only. The live game, its RNG, selection and save are never touched. */
(()=>{'use strict';
 const host=document.getElementById('rg-guide'),dialog=document.getElementById('rule-page'),scroller=dialog.querySelector('.modal-body');
 const textPanel=document.getElementById('rg-text'),switches=document.getElementById('rg-switch'),progress=document.getElementById('rg-progress'),navigation=document.getElementById('rg-navigation');
 const standard=document.createElement('article');standard.className='standard-rules';standard.hidden=true;textPanel.before(standard);
 let step=0,view='visual',zone='own-hand',whole=false,attackPhase=0,attackExample=false,rolesSwapped=false,defenseReady=false,defended=false,refilled=false,ranksOpen=false,swapMode='round',swapGame=null,swapSource=null,swapResult=null,lastLanguage='',lastVersion='',cameraRegion=null,cameraPose=null;
 const mobileQuery=matchMedia('(max-width:700px), (max-height:500px) and (max-width:1000px)');
 const t=(zh,en)=>window.GKLocale?.language==='en'?en:zh,version=()=>document.getElementById('version-select').value;
 const cases=()=>window.SZFocusCases[version()],points=n=>t(n+'分',n+' '+(n===1?'pt':'pts'));
 const id=label=>Array.from({length:52},(_,i)=>i).find(i=>window.GK.label(i)===label);
 function face(label,back=false,extra='',index=0){const el=window.card(back?null:id(label),{back,level:2,backLabel:t('对手手牌，牌面保密','Rival hand card, hidden')});if(!back&&window.GKLocale?.language==='en')el.setAttribute('aria-label',label+(window.GK.wild(id(label),2)?' · Wild':''));for(const name of extra.split(' ').filter(Boolean))el.classList.add(name);el.style.setProperty('--deal-delay',Math.max(0,index)*55+'ms');return el.outerHTML;}
 function woundBar(n){const el=document.createElement('div');el.className='damage fg-damage';window.damageBar(el,n);el.querySelector('small').textContent=t(' / 5 伤',' / 5 wounds');el.setAttribute('aria-label',t(n+'伤，共5格',n+' wounds out of 5'));return el.outerHTML;}
 const zoneInfo=()=>({
  'own-hand':[t('你的手牌，只有你能看','Your hand is private'),t('从这里选牌进攻或防守。一轮结束，手牌补到8张。','Choose cards here to attack or defend. Refill your hand to 8 at round end.')],
  'rival-hand':[t('对手手牌，牌面保密','The rival’s hand is hidden'),t('这里只显示牌背和张数。换牌时，盲换其中随机一张。','Only backs and counts are shown. A blind swap takes one random card.')],
  'own-wounds':[t('你的伤牌区，开局为空','Your wound area starts empty'),t('受1伤，就从牌库摸1张公开放在这里。伤牌也能出，用后原位补，不回血。','Each wound draws one face-up card here. You may play wounds; replace them afterward. Damage stays.')],
  'rival-wounds':[t('对手伤牌区，双方都能看','The rival’s wounds are public'),t('开局0伤。受伤后牌放这里，达到5伤就输小局。','Start at 0 wounds. Wound cards go here; 5 wounds loses the game.')],
  attack:[t('进攻区，先出牌的一方','Attack: the player who leads'),t('进攻方先出牌，防守方再出牌比较。进攻赢，造成伤害。','Attack plays first, then defense responds. An attack win deals wounds.')],
  defense:[t('防守区，后出牌的一方','Defense: the player who responds'),t('看过进攻牌后再出牌。防守赢，得到交换机会。','Respond after seeing the attack. A defense win earns swap opportunities.')],
  piles:[t('牌库与弃牌堆，共用','Shared deck and discard'),t('摸牌从牌库来，出过或换掉的牌进弃牌堆。弃牌堆不能直接交换。','Draw from the deck. Played or replaced cards go to discard; discard is not a swap target.')],
 });
 function resetSwap(){swapGame=window.GK.Game.restore(window.SZSwapCases[version()][swapMode]);swapSource=null;swapResult=null;}
 const value=(who,zone,index)=>zone==='hand'?swapGame.players[who].hand[index]:swapGame.players[who].table[index].card;
 const zoneName=(who,zone)=>t((who?'对手':'你的')+(zone==='hand'?'手牌':'伤牌'),(who?'Rival’s':'Your')+(zone==='hand'?' hand':' wound'));
 const options=()=>swapSource?swapGame.refreshOptions().filter(o=>o.source.zone===swapSource.zone&&o.source.index===swapSource.index):[];
 const optionIndex=o=>swapGame.refreshOptions().findIndex(x=>JSON.stringify(x)===JSON.stringify(o));
 const badge=()=>'<span class="fg-swap-badge" aria-hidden="true">⇄</span>';
 function swapCard(who,z,i){
  const card=value(who,z,i),target=options().find(o=>o.exchange==='card'&&o.who===who&&o.zone===z&&o.index===i),source=who===0&&(!swapSource||swapSource.zone===z),selected=who===0&&swapSource?.zone===z&&swapSource.index===i,active=!swapResult&&(target||source);
  const changed=swapResult&&(who===0&&z===swapResult.source.zone&&i===swapResult.source.index||swapResult.option.exchange==='card'&&who===swapResult.option.who&&z===swapResult.option.zone&&i===swapResult.option.index);
  const attrs=active?(target?'data-fg-target="'+optionIndex(target)+'"':'data-fg-source="'+z+':'+i+'"'):'';
  return `<${active?'button':'div'} ${active?'type="button"':''} class="fg-card-hit ${target?'is-target':''} ${selected?'is-source':''} ${changed?'is-changed':''}" ${attrs} ${active&&!target?'aria-pressed="'+!!selected+'"':''} aria-label="${zoneName(who,z)} ${window.GK.label(card)}${active?t(target?'，点击交换':'，点击交出',target?'; swap for this':'; choose to give'):''}">${face(window.GK.label(card))}${target?badge():''}</${active?'button':'div'}>`;
 }
 function swapCopy(){
  const r=swapResult,d=r.option.exchange==='deck'?t('弃牌堆','discard'):r.option.exchange==='opponent'?t('对手手牌（随机一张）','rival hand (one random card)'):zoneName(r.option.who,r.option.zone);
  return [t(r.given+' → '+d+'；你拿回 '+r.received,r.given+' → '+d+'; you receive '+r.received),t(r.received+'补回'+(r.source.zone==='table'?'你的伤牌区，公开。':'你的手牌，保密。')+'张数、伤势不变。',r.received+' replaces your '+(r.source.zone==='table'?'public wound.':'private hand card.')+' Card counts and wounds stay unchanged.')];
 }
 function state(){
  const c=cases();if(step===0||step===1)return c.start;
  if(step===2)return (attackExample?c.wounded:c)[attackPhase?'attack':'start'];
  if(step===3)return rolesSwapped?c.swap:c.attack;
  if(step===4)return defended?c.defend:c.defensePending;
  if(step===5){if(!swapGame)resetSwap();return {hand:swapGame.players.map(p=>p.hand.map(window.GK.label)),wounds:swapGame.players.map(p=>p.table.map(x=>window.GK.label(x.card))),damage:swapGame.injuries(),stock:swapGame.stock.length,discard:swapGame.discard.length};}
  return refilled?c.refill:c.exchange;
 }
 function focusKeys(){
  if(step===0)return [zone];if(step===1)return ['own-hand','wild'];
  if(step===2)return attackPhase===0?['own-hand',...(attackExample?['own-wounds']:[]),'action']:attackPhase===1?['attack','defense','action']:['rival-wounds','piles',...(attackExample?['own-wounds']:[]),'action'];
  if(step===3)return ['attack','defense','action'];if(step===4)return defended?['attack','defense','action']:defenseReady?['own-hand','defense','wild','action']:['attack','action'];
  if(step===5){if(!swapSource)return ['own-hand','own-wounds','action'];if(swapResult)return ['own-'+(swapResult.source.zone==='hand'?'hand':'wounds'),swapResult.option.exchange==='deck'?'piles':(swapResult.option.who===0?'own-':'rival-')+(swapResult.option.zone==='hand'?'hand':'wounds'),'action'];return ['own-hand','own-wounds','rival-hand','rival-wounds','piles','action'];}
  return ['own-hand','rival-hand','piles','action'];
 }
 function coach(){
  if(step===0)return [...zoneInfo()[zone],t('开始一轮','Start round'),'next'];
  if(step===1)return [t('每人8张手牌，0张伤牌','8 hand cards each, no wounds'),t('你的牌面朝上，对手只有牌背。♥2是共用花牌，可当任意牌。','Your cards are face up, the rival’s hidden. ♥2 is the shared wild card.'),t('试试进攻','Try attacking'),'next'];
  if(step===2){if(!attackPhase)return [t('已选3张 · 同花顺4分','3 selected · Straight flush 4 pts'),t(attackExample?'另例：手牌7♣8♣加公开伤牌6♣，一起出。':'本例已选好6♣7♣8♣。点「进攻」，看牌进入中央。',attackExample?'Another example: play hand 7♣8♣ with public wound 6♣.':'6♣7♣8♣ are selected for this example. Attack to move them into the center.'),t('进攻','Attack'),'attack'];
   if(attackPhase===1)return [t('4分 − 1分 = 3伤','4 pts − 1 pt = 3 wounds'),t('你同花顺4分，对手对子1分。进攻赢的差值变成伤害。','Your straight flush scores 4, their pair 1. An attack win deals the difference as wounds.'),t('看伤牌区','See wounds'),'wounds'];
   return [t('3伤，就是3张公开伤牌','3 wounds means 3 face-up wound cards'),t(attackExample?'6♣伤牌用后补回K♦，仍是1伤；对手再摸3张，1伤变4伤。':'从牌库摸3张放到对手伤牌区，0伤变3伤。手牌不会补在这里。',attackExample?'Replace played wound 6♣ with K♦: still 1 wound. The rival draws 3 more, going from 1 to 4.':'Draw 3 face-up cards into the rival’s wound area: 0 to 3 wounds. These are not hand cards.'),t('交换攻防','Swap roles'),'next'];}
  if(step===3)return rolesSwapped?[t('现在对手进攻，你防守','Now the rival attacks; you defend'),t('手牌没有互换，也没有补牌。双方各进攻一次，才算一轮。','Hands stay with their owners. No refill yet: each player attacks once per round.'),t('继续防守','Defend next'),'next']:[t('你已经进攻过一次','You have attacked once'),t('点和牌桌一样的「交换攻防」，看中央角色变化。','Use the same “Swap roles” action as the real table. Watch the center labels.'),t('交换攻防','Swap roles'),'roles'];
  if(step===4&&!defenseReady)return [t('对手先出牌，轮到你防守','The rival attacks. You defend next.'),t('对手用J♠Q♠K♠进攻：同花顺4分。看清对手的牌，再从你的手牌出牌防守。','The rival plays J♠ Q♠ K♠: a straight flush worth 4 points. Check their attack, then choose your defense.'),t('看我的牌','See my hand'),'prepare-defense'];
  if(step===4)return defended?[t('5分 − 4分 = 1次换牌','5 pts − 4 pts = 1 swap'),t('你用♥2当第三张4，组成三炸5分。防守赢的是机会，伤势不变。','♥2 acts as the third 4, making three of a kind for 5 points. Defense earns swaps; damage stays.'),t('用这次机会','Use your swap'),'next']:[t('轮到你防守：出这3张','Your turn: defend with these 3 cards'),t('本例已选4♠4♥和♥2，花牌当第三张4，三炸5分。点「防守」，与对手的4分比较。','4♠ 4♥ and ♥2 are selected. The wild makes three 4s, worth 5 points. Press Defend to compare with the rival’s 4.'),t('防守','Defend'),'defend'];
  if(step===5){if(swapResult)return [...swapCopy(),t('再试一种','Try another'),'swap-reset'];if(swapSource)return [t('交出 '+window.GK.label(value(0,swapSource.zone,swapSource.index))+'，再点 ⇄ 目标','Give '+window.GK.label(value(0,swapSource.zone,swapSource.index))+'. Select a ⇄ target.'),t('对手手牌盲换，伤牌可指定；自己的另一牌区也能换。牌库是弃旧摸新。','Blind-swap a rival hand card, choose a public wound, swap your other zone, or discard and draw from the deck.'),t('重选','Choose again'),'swap-reset'];return [t('先点你的一张手牌或伤牌','Choose one of your hand cards or wounds'),t('再点亮起的⇄。每次1机会，张数不变，不回血；弃牌堆不能换。','Then select a highlighted ⇄. One opportunity, same counts, no healing. Discard is not a target.'),'',''];}
  return refilled?[t('双方手牌都到8张了','Both hands are back to 8'),t('原2张保留，各补6张。伤牌不计入8张，下一轮对手先攻。','Keep the original 2, draw 6 each. Wounds are separate. The rival attacks first next round.'),t('再看一次','Replay refill'),'refill-replay']:[t('轮末，各把手牌补到8张','Round over: refill each hand to 8'),t('本轮双方各剩2张，保留它们，再各从牌库补6张。伤牌留在原处。','Both have 2 hand cards left. Keep them and draw 6 each. Wounds stay in place.'),t('补到8张','Refill to 8'),'refill'];
 }
 function battle(){
  const first={who:0,name:t('同花顺','Straight flush'),score:4,cards:['♣6','♣7','♣8']},pair={who:1,name:t('对子','Pair'),score:1,cards:['♠5','♥5','♦9']},second={who:1,name:t('同花顺','Straight flush'),score:4,cards:['♠J','♠Q','♠K']},triple={who:0,name:t('三炸','Three-kind'),score:5,cards:['♠4','♥4','♥2']};
  if(step===2&&attackPhase||step===3&&!rolesSwapped)return [first,pair];
  if(step===4)return [second,defended?triple:{who:0,cards:[]}];
  if(step===5||step===6&&!refilled)return [second,triple];
  return [{who:step>=3?1:0,cards:[]},{who:step>=3?0:1,cards:[]}];
 }
 function slot(key,body,classes='',label=''){
  const active=focusKeys().includes(key),tag=step===0&&key!=='action'?'button':'div',click=step===0&&key!=='action'?'type="button" data-fg-zone="'+key+'" aria-pressed="'+active+'"':'';
  return `<${tag} ${click} class="fg-slot ${classes} ${active?'is-focus':step===4&&defenseReady&&key==='attack'?'is-reference':'is-context'}" data-fg-slot="${key}" ${label?'aria-label="'+label+'"':''}>${body}</${tag}>`;
 }
 function hand(who,s){
  const z=(who?'rival':'own')+'-hand',selected=step===2&&!attackPhase?(attackExample?['♣7','♣8']:['♣6','♣7','♣8']):step===4&&defenseReady&&!defended?['♠4','♥4','♥2']:[];
  let body;if(step===5&&who===0)body=s.hand[0].map((_,i)=>swapCard(0,'hand',i)).join('');else body=s.hand[who].map((c,i)=>face(c,who===1,(who===0&&selected.includes(c)?'selected fg-chosen ':'')+(step===6&&refilled&&i>=2?'fg-added':''),i-2)).join('');
  const blind=step===5&&who===1?options().find(o=>o.exchange==='opponent'):null,canBlind=!!blind;
  const row=`<span class="fg-zone-title">${t(who?'对手手牌':'你的手牌',who?'Rival hand':'Your hand')}<small>${step===6&&refilled?t('保留2 · 新补6','Kept 2 · Drew 6'):step===5&&who?t('盲换随机1张','Blind swap 1 at random'):t(who?'保密':'只有你能看',who?'Hidden':'Private')}</small></span><span class="fg-hand-cards">${body}</span>`;
  return slot(z,canBlind?`<button type="button" class="fg-blind is-target" data-fg-target="${optionIndex(blind)}" aria-label="${t('对手手牌，盲换随机一张','Rival hand: blind swap one random card')}">${row}${badge()}</button>`:row,'fg-hand',t((who?'对手':'你的')+s.hand[who].length+'张手牌',s.hand[who].length+' '+(who?'rival':'your')+' hand cards'));
 }
 function wounds(who,s){const z=(who?'rival':'own')+'-wounds',selected=step===2&&!attackPhase&&attackExample&&who===0;
  const body=step===5?s.wounds[who].map((_,i)=>swapCard(who,'table',i)).join(''):s.wounds[who].map(c=>face(c,false,selected?'selected fg-chosen':step===2&&attackPhase===2&&!(attackExample?cases().wounded.start:cases().start).wounds[who].includes(c)?'fg-received':'')).join('');
  return slot(z,`<span class="fg-zone-title">${t(who?'对手伤牌区':'你的伤牌区',who?'Rival wounds':'Your wounds')}<small>${s.wounds[who].length?t('公开','Face up'):t('空 · 0伤','Empty · 0 wounds')}</small></span><span class="fg-wound-cards">${body||'<span class="fg-empty" aria-hidden="true">—</span>'}</span>`,'fg-wounds',t((who?'对手':'你的')+'伤牌区，'+s.wounds[who].length+'伤',(who?'Rival':'Your')+' wounds: '+s.wounds[who].length));}
 function pile(s){const deck=step===5?options().find(o=>o.exchange==='deck'):null;return slot('piles',`<span class="fg-pile-group"><span><small>${t('牌库','Deck')}</small><${deck?'button':'span'} ${deck?'type="button" data-fg-target="'+optionIndex(deck)+'"':''} class="fg-pile fg-stock ${deck?'is-target':''}" ${deck?'aria-label="'+t('牌库，弃旧摸新','Deck: discard and draw')+'"':''}><b>${s.stock}</b><i aria-hidden="true">${window.SZFlowerMark}</i>${deck?badge():''}</${deck?'button':'span'}></span><span class="fg-discard"><small>${t('弃牌','Discard')}</small><span class="fg-pile"><b>${s.discard}</b></span></span></span>`,'fg-piles',t('牌库和弃牌堆','Deck and discard'));}
 function board(){const s=state(),b=battle(),c=coach(),wild=focusKeys().includes('wild');
  const combat=(v,key)=>slot(key,`<span class="fg-zone-title">${t(key==='attack'?'进攻':'防守',key==='attack'?'Attack':'Defend')} · ${t(v.who?'对手':'你',v.who?'Rival':'You')}<small>${v.name?v.name+' '+points(v.score):t('等待出牌','Waiting')}</small></span><span class="fg-combat-cards">${v.cards.map(x=>face(x)).join('')||'<span class="fg-empty">—</span>'}</span>`,'fg-combat');
  return `<div class="fg-board ${whole?'show-whole':''}" data-step="${step}" data-phase="${step===2?attackPhase:step===3?+rolesSwapped:step===4?(defended?2:defenseReady?1:0):step===5?(swapResult?'done':swapSource?'target':'source'):+refilled}" data-example="${step===2&&attackExample||step===5&&swapMode==='wounded'?'wounded':'round'}" aria-label="${t('同一张教学牌桌','One consistent practice table')}">
   <div class="fg-topline"><b>${t('对局','Play')}</b><span class="fg-wild ${wild?'is-focus':''}">${t('花牌','Wild')} ♥2</span><small>${step===2&&attackExample||step===5&&swapMode==='wounded'?t('已有伤牌 · 另例','Separate wounded example'):t('第1局 · 第','Game 1 · Round ')+(step===6&&refilled?'2':'1')+t('轮','')}</small></div>
   <section class="fg-player fg-rival"><header><span><b>${t('对手','Rival')}</b><small>${s.hand[1].length} ${t('张','cards')}</small></span>${woundBar(s.damage[1])}</header>${hand(1,s)}${wounds(1,s)}</section>
   <section class="fg-center"><div class="fg-battle">${combat(b[0],'attack')}${pile(s)}${combat(b[1],'defense')}</div>${slot('action',`<span class="fg-coach-copy"><strong>${c[0]}</strong><span>${c[1]}</span></span>${c[2]?'<button type="button" data-fg-action="'+c[3]+'">'+c[2]+'</button>':''}`,'fg-coach')}</section>
   <section class="fg-player fg-own">${wounds(0,s)}${hand(0,s)}<header><span><b>${t('你','You')}</b><small>${s.hand[0].length} ${t('张','cards')}</small></span>${woundBar(s.damage[0])}</header></section>
  </div>`;
 }
 function titles(){return [
  [t('先认牌桌，点哪里就讲哪里','Explore the table, one area at a time'),t('点牌区，周围淡下去；位置与实际牌桌一致。','Select an area to focus it. The table keeps the same layout throughout.')],
  [t('开局：8张手牌，0张伤牌','Start with 8 hand cards, no wounds'),t('看下方你的手牌，和上方对手的牌背。','Your hand is below; the rival’s card backs are above.')],
  [t('你进攻：手牌 → 中央 → 伤牌区','Your attack: hand → center → wounds'),t('同一张桌，跟着高亮看牌去了哪里。','Follow the highlighted areas to see where the cards go.')],
  [t('交换攻防，牌区不换位置','Swap roles, keep the table in place'),t('只换谁先进攻。余牌保留，现在还不补牌。','Only the attacker changes. Keep unused cards; no refill yet.')],
  [t('对手先进攻，你再出牌防守','The rival attacks, then you defend'),t('♥2当第三张4；比较5分与4分。','♥2 stands for a third 4. Compare 5 points against 4.')],
  [t('换牌：先选自己的牌，再点目标','Swap: choose your card, then a target'),t('直接在原牌区操作，换回的牌补在交出的位置。','Swap in the actual zones. The received card replaces the one you give.')],
  [t('轮末：手牌补到8张','Round end: refill your hand to 8'),t('保留余牌，只补缺的数量。伤牌不计入8张。','Keep unused cards and draw only what is missing. Wounds are separate.')],
 ];}
 function toolbar(){return `<div class="fg-toolbar"><span>${step===2&&attackExample||step===5&&swapMode==='wounded'?t('另例','Example'):t('教学牌桌','Practice table')}</span><div>${step===2&&attackPhase>0||step===3&&rolesSwapped||step===4&&(defenseReady||defended)?'<button type="button" data-fg-replay>'+t('再看一次','Replay')+'</button>':''}${step===2?'<button type="button" data-fg-example aria-pressed="'+attackExample+'">'+t(attackExample?'回本轮':'另例：伤牌也能出',attackExample?'This round':'Example: play a wound')+'</button>':''}${step===5?'<button type="button" data-fg-swap-mode aria-pressed="'+(swapMode==='wounded')+'">'+t(swapMode==='wounded'?'回本轮':'另例：你有伤牌时',swapMode==='wounded'?'This round':'Example: your wounds')+'</button>':''}<button type="button" data-fg-whole aria-pressed="${whole}">${t(whole?'聚焦讲解':'看全桌',whole?'Focus':'Full table')}</button></div><small class="fg-focus-caption">${coach()[0]}</small></div>`;}
 function hasAction(){return step===2&&attackPhase<2||step===3&&!rolesSwapped||step===4&&!defended||step===6&&!refilled;}
 function reset(){whole=false;cameraRegion=null;attackPhase=0;attackExample=false;rolesSwapped=false;defenseReady=false;defended=false;refilled=false;ranksOpen=false;swapMode='round';swapGame=null;swapSource=null;swapResult=null;}
 function paint(){
  const isStandard=document.getElementById('version-select').value==='1.0.0';
  if(isStandard)standard.innerHTML=window.SZStandardRules[window.GKLocale?.language==='en'?'en':'zh'];
  const available=isStandard||document.getElementById('version-select').value==='0.3.8';
  switches.parentElement.hidden=!available;
  switches.querySelector('[data-rg-view="visual"]').hidden=!available;
  if(!available)view='text';
  const visual=view==='visual'&&available;host.hidden=!visual;textPanel.hidden=visual||isStandard;standard.hidden=visual||!isStandard;
  dialog.classList.toggle('fg-mobile',visual&&mobileQuery.matches);
  switches.setAttribute('aria-label',t('规则展示方式','Rules view'));
  document.getElementById('rules-heading').textContent=visual?t('跟着牌桌学一轮','Learn a round on the table'):isStandard?t('标准规则 1.0','Standard Rules 1.0'):t('完整文字规则','Full written rules');
  switches.querySelector('[data-rg-view="visual"]').textContent=t('图解','Guide');
  switches.querySelector('[data-rg-view="text"]').textContent=t('文字','Text');
  for(const b of switches.querySelectorAll('button'))b.setAttribute('aria-pressed',String(b.dataset.rgView===(visual?'visual':'text')));
  progress.hidden=!visual;navigation.hidden=!visual;
  if(!visual){if(!isStandard)textPanel.querySelector('details.full-rules').open=true;return;}
  const list=titles().map(([title,caption])=>({title,caption})),s=list[step];
  progress.setAttribute('aria-label',t('图解步骤','Guide steps'));
  progress.innerHTML=list.map((x,i)=>`<button type="button" data-rg-step="${i}" aria-label="${i===0?t('牌区','Zones'):i}. ${x.title}" ${i===step?'aria-current="step"':''}>${i===0?t('牌区','Zones'):i}</button>`).join('');
  navigation.innerHTML=`<button type="button" data-rg-prev ${step===0?'disabled':''}>${t('上一步','Back')}</button><span>${step===0?t('牌区','Zones'):step+' / '+(list.length-1)}</span><button type="button" data-rg-next>${hasAction()?coach()[2]:step===6?t('回到牌桌','Back to game'):step===0?t('开始一轮','Start round'):t('下一步','Next')} <i aria-hidden="true">→</i></button>`;
  const ranks=[...(isStandard?[[t('五炸','Five-bomb'),7]]:[]),[t('四炸','Four-kind'),6],[t('三炸','Three-kind'),5],[t('同花顺','Straight flush'),4],[t('同花','Flush'),3],[t('顺子','Straight'),2],[t('对子','Pair'),1],[t('高牌','High card'),0]];
  const exampleScores=step===2?[4,1]:step===4?[5,4]:[];
  const reference=step!==2&&step!==4?'':`<div class="rg-reference-action"><button type="button" data-rg-ranks aria-expanded="${ranksOpen}" aria-controls="rg-rank-panel">${t('牌型与分数','Ranks & points')}<i aria-hidden="true">${ranksOpen?'−':'+'}</i></button></div><section class="rg-rank-panel" id="rg-rank-panel" aria-label="${t('牌型与分数','Hand ranks and points')}" ${ranksOpen?'':'hidden'}><table class="rg-score-table"><thead><tr><th scope="col">${t('牌型','Hand type')}</th><th scope="col">${t('分数','Points')}</th></tr></thead><tbody>${ranks.map(([name,n])=>`<tr${exampleScores.includes(n)?' class="is-example"':''}><th scope="row">${name}</th><td>${points(n)}</td></tr>`).join('')}</tbody></table><p>${t('同牌型比点数：进攻胜造成1伤，防守胜得1次机会；完全同点无事发生。','Same hand type: compare ranks. Attack rank win deals 1 wound; defense rank win earns 1 swap. Exact ties do nothing.')}${isStandard?t(' 三张、四炸和五炸可互相接；五炸是四张同数加花牌，7分。',' Three-card hands, four-bombs and five-bombs may answer each other. Five-bomb: four natural cards of one rank plus the flower, 7 points.'):t(' 三张和四炸可互相接。',' Three cards and four of a kind may answer each other.')}</p></section>`;
  host.innerHTML=`<article class="rg-stage" aria-live="polite"><div class="rg-step-heading"><h3>${s.title}</h3><p>${s.caption}</p></div>${toolbar()}<div class="rg-figure">${board()}</div><nav class="fg-camera-nav" aria-label="${t('牌桌位置','Table position')}">${[['rival',t('对手','Rival')],['center',t('中央','Center')],['own',t('你','You')]].map(([key,label])=>`<button type="button" data-fg-camera="${key}"><i aria-hidden="true"></i>${label}<small></small></button>`).join('')}</nav>${reference}</article>`;
  layoutMobile();
 }
 function layoutMobile(){
  const enabled=view==='visual'&&!host.hidden&&mobileQuery.matches;
  dialog.classList.toggle('fg-mobile',enabled);
  const board=host.querySelector('.fg-board'),stage=host.querySelector('.rg-stage'),coachNode=host.querySelector('.fg-coach');if(!board||!coachNode)return;
  if(enabled){stage.append(coachNode);const reference=host.querySelector('.rg-reference-action');if(reference)navigation.querySelector('span').replaceChildren(reference);const panel=host.querySelector('.rg-rank-panel');if(panel)host.querySelector('.rg-figure').append(panel);}
  else{board.querySelector('.fg-center').append(coachNode);const reference=navigation.querySelector('.rg-reference-action');if(reference){stage.append(reference);navigation.querySelector('span').textContent=step?step+' / 6':t('牌区','Zones');}const panel=host.querySelector('.rg-rank-panel');if(panel)stage.append(panel);board.style.removeProperty('transform');board.inert=false;board.getAnimations().forEach(a=>a.cancel());for(const b of board.querySelectorAll('button'))b.removeAttribute('tabindex');cameraPose=null;}
 }
 function mobileFrame(board){
  const viewport=host.querySelector('.rg-figure'),panel=host.querySelector('.rg-rank-panel'),nav=host.querySelector('.fg-camera-nav');
  const key=focusKeys().find(k=>k!=='action'&&k!=='wild')||'own-hand';
  const automatic=step===2?(attackPhase===0?'own':attackPhase===1?'center':'rival'):step===3?'center':step===4?(!defenseReady||defended?'center':'own'):step===5&&swapSource&&!swapResult?'rival':key.startsWith('rival')?'rival':key.startsWith('own')?'own':'center';
  const region=cameraRegion||automatic,target=board.querySelector(region==='center'?'.fg-center':'.fg-'+region),height=viewport.clientHeight,width=viewport.clientWidth,bh=board.offsetHeight,bw=board.offsetWidth;
  if(!height||!bh)return;
  const scale=whole?Math.min(1,(height-12)/bh,(width-12)/bw):1;
  const top=target.offsetTop,th=target.offsetHeight,y=whole?(height-bh*scale)/2:bh<=height?(height-bh)/2:Math.max(height-bh-6,Math.min(6,(height-th)/2-top));
  const pose=`translate(${(width-bw*scale)/2}px, ${y}px) scale(${scale})`;
  // A new lesson reuses the last camera pose, then glides to its next area.
  board.getAnimations().forEach(a=>a.cancel());board.style.transform=pose;
  const previousPose=cameraPose;cameraPose=pose;viewport.dataset.region=whole?'whole':region;scroller.scrollTop=0;
  board.inert=!!ranksOpen;nav.inert=!!ranksOpen;if(panel)panel.hidden=!ranksOpen;
  for(const b of nav.querySelectorAll('button')){const k=b.dataset.fgCamera,area=board.querySelector(k==='center'?'.fg-center':'.fg-'+k),hasTarget=!!area.querySelector('[data-fg-target]');b.setAttribute('aria-pressed',String(!whole&&region===k));b.classList.toggle('has-target',hasTarget);b.querySelector('small').textContent=hasTarget?'⇄':'';}
  // Hidden parts of the cropped table must not pull keyboard focus out of view.
  for(const b of board.querySelectorAll('button')){const r=b.getBoundingClientRect(),v=viewport.getBoundingClientRect();b.tabIndex=whole||r.top>=v.top&&r.bottom<=v.bottom?0:-1;}
  if(previousPose&&previousPose!==pose&&!matchMedia('(prefers-reduced-motion: reduce)').matches)board.animate([{transform:previousPose},{transform:pose}],{duration:360,easing:'cubic-bezier(.2,.7,.2,1)'});
 }
 function frame(){
  if(view!=='visual'||!dialog.open)return;const board=host.querySelector('.fg-board'),bar=host.querySelector('.fg-toolbar');if(!board)return;
  layoutMobile();if(dialog.classList.contains('fg-mobile')){mobileFrame(board);return;}
  const area=scroller.getBoundingClientRect(),top=(bar?.getBoundingClientRect().height||0)+8,available=area.height-top,keys=focusKeys().filter(k=>k!=='action'&&k!=='wild'),primary=keys.includes('own-hand')?'own-hand':keys[0],target=board.querySelector('[data-fg-slot="'+primary+'"]')||board;
  const r=target.getBoundingClientRect(),c=board.querySelector('.fg-coach').getBoundingClientRect(),b=board.getBoundingClientRect(),spanTop=Math.min(r.top,c.top),spanBottom=Math.max(r.bottom,c.bottom);
  const y=whole||b.height<=available?b.top:spanBottom-spanTop<=available?spanTop:r.top;
  scroller.scrollTop+=y-area.top-top;
 }
 function renderFocus(focus){const y=scroller.scrollTop;paint();scroller.scrollTop=y;frame();const requested=dialog.querySelector(focus);(dialog.classList.contains('fg-mobile')&&(!requested||requested.tabIndex===-1||!requested.getClientRects().length)?navigation.querySelector('[data-rg-next]'):requested)?.focus({preventScroll:true});}
 function go(next){if(next>6){document.getElementById('close-rules').click();return;}step=Math.max(0,next);reset();paint();scroller.scrollTop=0;frame();navigation.querySelector('[data-rg-next]').focus({preventScroll:true});}
 function action(key){
  cameraRegion=null;ranksOpen=false;
  if(key==='next'){go(step+1);return;}
  if(key==='attack')attackPhase=1;else if(key==='wounds')attackPhase=2;else if(key==='roles')rolesSwapped=true;else if(key==='prepare-defense')defenseReady=true;else if(key==='defend'&&defenseReady)defended=true;else if(key==='refill')refilled=true;else if(key==='refill-replay')refilled=false;else if(key==='swap-reset')resetSwap();
  renderFocus('[data-fg-action]');
 }
 function navigate(e){const b=e.target.closest('button');if(!b)return;
  if(b.dataset.fgAction){action(b.dataset.fgAction);return;}
  if(b.dataset.fgCamera){cameraRegion=b.dataset.fgCamera;whole=false;if(step===0)zone=cameraRegion==='center'?'piles':cameraRegion+'-hand';renderFocus('[data-fg-camera="'+cameraRegion+'"]');return;}
  if(b.hasAttribute('data-fg-whole')){whole=!whole;renderFocus('[data-fg-whole]');return;}
  if(b.hasAttribute('data-fg-example')){cameraRegion=null;whole=false;ranksOpen=false;attackExample=!attackExample;attackPhase=0;renderFocus('[data-fg-example]');return;}
  if(b.hasAttribute('data-fg-swap-mode')){cameraRegion=null;whole=false;ranksOpen=false;swapMode=swapMode==='round'?'wounded':'round';resetSwap();renderFocus('[data-fg-swap-mode]');return;}
  if(b.hasAttribute('data-fg-replay')){cameraRegion=null;whole=false;ranksOpen=false;attackPhase=0;rolesSwapped=false;defenseReady=false;defended=false;renderFocus('[data-fg-action]');return;}
  if(b.dataset.fgZone){zone=b.dataset.fgZone;cameraRegion=null;whole=false;renderFocus('[data-fg-zone="'+zone+'"]');return;}
  if(b.dataset.fgSource){const [z,i]=b.dataset.fgSource.split(':');swapSource={zone:z,index:Number(i)};cameraRegion=null;whole=false;renderFocus(mobileQuery.matches?'[data-fg-camera="rival"]':'[data-fg-target]');return;}
  if(b.dataset.fgTarget!==undefined){const option=swapGame.refreshOptions()[Number(b.dataset.fgTarget)];if(!option||option.source.zone!==swapSource?.zone||option.source.index!==swapSource?.index)return;const source={...swapSource},given=window.GK.label(value(0,source.zone,source.index));swapGame.refresh(option);swapResult={source,option,given,received:window.GK.label(value(0,source.zone,source.index))};cameraRegion='own';renderFocus('[data-fg-action]');return;}
  if(b.hasAttribute('data-rg-ranks')){ranksOpen=!ranksOpen;b.setAttribute('aria-expanded',String(ranksOpen));b.querySelector('i').textContent=ranksOpen?'−':'+';host.querySelector('#rg-rank-panel').hidden=!ranksOpen;if(mobileQuery.matches)frame();return;}
  if(b.dataset.rgStep!==undefined){go(Number(b.dataset.rgStep));return;}
  if(b.hasAttribute('data-rg-prev')){go(step-1);return;}
  if(b.hasAttribute('data-rg-next')){if(hasAction())action(coach()[3]);else go(step+1);}
 }
 switches.addEventListener('click',e=>{const b=e.target.closest('[data-rg-view]');if(b){view=b.dataset.rgView;paint();scroller.scrollTop=0;frame();}});
 dialog.addEventListener('cancel',e=>{if(ranksOpen){e.preventDefault();e.stopImmediatePropagation();ranksOpen=false;renderFocus('[data-rg-ranks]');}},true);
 for(const element of [host,progress,navigation])element.addEventListener('click',navigate);
 function sync(){const language=window.GKLocale?.language||'zh-CN',v=version();if(language!==lastLanguage||v!==lastVersion){if(v!==lastVersion){view=v==='0.3.8'||v==='1.0.0'?'visual':'text';step=0;reset();}lastLanguage=language;lastVersion=v;paint();}}
 new MutationObserver(sync).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
 new MutationObserver(()=>{if(dialog.open){sync();frame();}}).observe(dialog,{attributes:true,attributeFilter:['open']});
 document.getElementById('version-select').addEventListener('change',()=>queueMicrotask(sync));window.addEventListener('resize',()=>queueMicrotask(frame));window.visualViewport?.addEventListener('resize',()=>queueMicrotask(frame));sync();
})();
