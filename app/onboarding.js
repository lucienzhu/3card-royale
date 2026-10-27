/* An isolated two-play lesson, followed by contextual hints in the first real game. */
(()=>{'use strict';
 const key='sz-onboarding-v1';
 function preferences(stores){
  let value={seen:false,enabled:true,hints:{},hintGame:null};
  for(const get of stores)try{const saved=JSON.parse(get().getItem(key));if(saved&&typeof saved==='object'){value={...value,...saved,seen:saved.seen===true,enabled:saved.enabled!==false,hints:saved.hints&&typeof saved.hints==='object'?saved.hints:{}};break;}}catch(_){}
  function save(){for(const get of stores)try{get().setItem(key,JSON.stringify(value));}catch(_){} }
  return {get enabled(){return value.enabled;},get shouldShow(){return value.enabled&&!value.seen;},seen(){value.seen=true;save();},enable(enabled){value.enabled=!!enabled;save();},
   begin(game){if(!value.hintGame){value.hintGame=game;save();}},get hintGame(){return value.hintGame;},hasHint(id){return !!value.hints[id];},ack(id){value.hints[id]=true;save();}};
 }
 const identity=g=>`${g.version}:${g.seed}:${g.game}`;
 function nextHint(prefs,g){
  if(!prefs.enabled||prefs.hintGame!==identity(g)||g.currentActor()!==0)return null;
  if(g.phase==='refresh'&&!prefs.hasHint('swap'))return 'swap';
  if(!['attack','defend'].includes(g.phase))return null;
  if(g.players[0].table.some(x=>x.up&&x.card!==null)&&!prefs.hasHint('wounds'))return 'wounds';
  if(g.players[0].hand.some(c=>c===13+(g.flowerLevel??g.players[0].level)-2)&&!prefs.hasHint('flower'))return 'flower';
  if(g.round>1&&!prefs.hasHint('refill'))return 'refill';
  return null;
 }
 function lesson(GK){
  const id=(rank,suit)=>suit*13+rank-2;
  const aces=[id(14,0),id(14,1),id(14,2)],flush=[id(4,3),id(8,3),id(12,3)];
  const attackReply=[id(5,2),id(8,2),id(11,2)],defenseAttack=[id(6,1),id(7,1),id(8,1)];
  let stage='attack',hand=[...aces,...flush,id(6,0),id(9,2)],chosen=[],played=[];
  return {get stage(){return stage;},get hand(){return hand;},get chosen(){return chosen;},get played(){return played;},get rival(){return stage==='attack'?[]:stage==='attack-result'?attackReply:defenseAttack;},
   get target(){return stage==='attack'?aces:flush;},get damage(){return stage==='done'?[1,2]:stage==='attack-result'||stage==='defend'?[0,2]:[0,0];},
   select(ids){if(['attack','defend'].includes(stage))chosen=[...new Set(ids)].filter(c=>hand.includes(c)).slice(0,3);},
   get valid(){return chosen.length===3&&chosen.every(c=>(stage==='attack'?aces:flush).includes(c));},
   submit(){if(!this.valid||!['attack','defend'].includes(stage))return false;
    const own=GK.evaluate(chosen,2,'1.0.0'),rival=GK.evaluate(stage==='attack'?attackReply:defenseAttack,2,'1.0.0');
    // Guard the teaching fixture against drift in real hand scores.
    if(stage==='attack'?own.score-rival.score!==2:rival.score-own.score!==1)throw Error('Tutorial score mismatch');
    played=chosen.slice();hand=hand.filter(c=>!chosen.includes(c));chosen=[];stage=stage==='attack'?'attack-result':'done';return true;
   },next(){if(stage==='attack-result'){stage='defend';played=[];}}
  };
 }
 if(typeof module==='object'&&module.exports){module.exports={preferences,key,lesson,nextHint,identity};return;}
 const prefs=preferences([()=>localStorage,()=>sessionStorage]);
 let pending=prefs.shouldShow,update=()=>{};
 window.SZOnboarding={get pending(){return pending;},update:state=>update(state)};
 function mount(){
  const en=()=>document.documentElement.lang==='en',t=(zh,english)=>en()?english:zh;
  const setting=document.createElement('section');setting.className='sz-onboarding-setting';setting.dataset.noI18n='';
  setting.innerHTML='<div><label for="onboarding-enabled"><span></span></label><p id="onboarding-setting-note"></p></div><input id="onboarding-enabled" type="checkbox" role="switch" aria-describedby="onboarding-setting-note"><button id="onboarding-reopen" type="button"></button>';
  document.querySelector('.menu-preferences').append(setting);
  const toggle=setting.querySelector('input'),reopen=setting.querySelector('button');toggle.checked=prefs.enabled;
  const dialog=document.createElement('dialog');dialog.id='onboarding-modal';dialog.className='modal';dialog.hidden=true;dialog.dataset.noI18n='';dialog.setAttribute('aria-labelledby','onboarding-heading');
  dialog.innerHTML='<div class="modal-head"><h2 id="onboarding-heading"></h2></div><div class="modal-body"><div class="onboarding-picture"></div></div><div class="onboarding-footer"><p id="intro-feedback" role="status" aria-live="polite"></p><button type="button" class="primary" id="onboarding-start"></button></div>';
  document.body.append(dialog);
  const picture=dialog.querySelector('.onboarding-picture'),start=dialog.querySelector('#onboarding-start'),feedback=dialog.querySelector('#intro-feedback');
  let practice=lesson(GK),timer=null,flights=[],warning=false;
  const flower=color=>'<svg class="player-flower player-flower-'+color+'" viewBox="0 0 64 72" aria-hidden="true">'+window.SZBloomAssets.flower+'</svg>';
  function damage(who){
   const count=practice.damage[who],name=who===0?t('你','You'):t('对手','Rival');
   const marks=Array.from({length:5},(_,i)=>'<svg class="wound-bract '+(i<count?'filled':'')+'" viewBox="22 11 20 26" aria-hidden="true">'+window.SZBloomAssets.bract+'<circle class="bract-core" cx="32" cy="30.6" r="2.4"/></svg>').join('');
   return `<span class="intro-damage" role="img" aria-label="${name} · ${t(count+' / 5 伤',count+' / 5 damage')}">${marks}</span><span class="intro-damage-count" aria-hidden="true">${count} / 5</span>`;
  }
  function card(id,interactive=false){
   const chosen=practice.chosen.includes(id),rank=GK.rankLabel(GK.rank(id)),suit=GK.suit(id);
   return `<${interactive?'button type="button"':'span'} class="intro-card ${SZSuit.isRed(suit)?'intro-red ':''}${chosen?'intro-selected':''}" data-card="${id}" ${interactive?`aria-pressed="${chosen}" aria-label="${rank} ${['♠','♥','♣','♦'][suit]}"`:''}><b>${rank}</b><span>${SZSuit.svg(suit)}</span><i>${SZSuit.svg(suit)}</i>${chosen?'<em>✓</em>':''}</${interactive?'button':'span'}>`;
  }
  function stop(){clearTimeout(timer);timer=null;flights.forEach(a=>a.cancel());flights=[];}
  function text(){
   setting.querySelector('label span').textContent=t('新手引导','Quick start');
   setting.querySelector('p').textContent=t('练习与首局提示','Practice and first-game hints');reopen.textContent=t('再练一次','Practice again');
   const stage=practice.stage,defending=stage==='defend',done=stage==='done',resolving=stage==='attack-result';
   dialog.dataset.lessonStage=stage;
   const title=done?t('先到 5 伤，就输掉本局','Reach 5 damage and lose the game'):defending?t('该你防守','Your defense'):resolving?t('你打出了 2 伤','You dealt 2 damage'):t('8 张牌，先选 3 张进攻','8 cards. Pick 3 to attack');
   const hint=done?t('现在开始正式对局。','You’re ready to play.'):defending?t('选出 ♦4、♦8、♦Q，组成同花。','Pick 4♦, 8♦ and Q♦ for a flush.'):resolving?t('5 − 3 = 2。接下来，对手进攻。','5 − 3 = 2. Now they attack.'):t('试试三个 A。点选，也可以划过牌面。','Try the three Aces. Tap or slide across them.');
   picture.innerHTML=`<div class="intro-step">${t('练习','Practice')} · ${defending||done?'2':'1'} / 2</div><h3>${title}</h3><p class="intro-instruction">${hint}</p>
    <section class="intro-opponent"><div class="intro-player">${flower('gold')}<strong>${t('对手','Rival')}</strong>${damage(1)}</div><div class="intro-trio intro-rival-cards">${practice.rival.length?practice.rival.map(c=>card(c)).join(''):`<span class="intro-wait">${t('等你进攻','Waiting for your attack')}</span>`}</div><small>${stage==='attack'?'':resolving?t('同花 · 3 分','Flush · 3 pts'):t('同花顺 · 4 分','Straight flush · 4 pts')}</small></section>
    <div class="intro-result" role="status">${resolving?t('三炸 5 分 → 同花 3 分','Three of a kind 5 → Flush 3'):done?t('4 − 3 = 你受 1 伤','4 − 3 = 1 damage for you'):defending?t('同花 3 分，能挡住大部分伤害','A flush scores 3 and blocks most damage'):t('三个 A = 三炸 · 5 分','Three Aces = Three of a kind · 5 pts')}</div>
    <section class="intro-self"><div class="intro-player">${flower('red')}<strong>${t('你','You')}</strong>${damage(0)}</div>
    <div class="intro-trio intro-played">${practice.played.map(c=>card(c)).join('')}</div><div class="intro-rack">${practice.hand.map(c=>card(c,!done&&!resolving)).join('')}</div></section>`;
   start.disabled=!done&&(resolving||!practice.valid);start.textContent=done?t('开始正式对局','Start playing'):resolving?t('对手准备进攻…','Rival is getting ready…'):defending?t('防守','Defend'):t('进攻','Attack');
   feedback.textContent=warning?t(defending?'选三张方块试试':'选三个 A 试试',defending?'Try the three diamonds':'Try the three Aces'):(done?t('双方各攻守一次，再补到 8 张。','After both attack, refill to 8.'):t('已选 '+practice.chosen.length+' / 3',practice.chosen.length+' / 3 selected'));
   picture.querySelectorAll('button[data-card]').forEach(b=>b.addEventListener('click',()=>{const id=Number(b.dataset.card),ids=practice.chosen.includes(id)?practice.chosen.filter(c=>c!==id):[...practice.chosen,id];practice.select(ids);warning=practice.chosen.length===3&&!practice.valid;text();picture.querySelector(`button[data-card="${id}"]`)?.focus({preventScroll:true});}));
  }
  window.SZTableInteraction.swipe({container:picture,cards:()=>[...picture.querySelectorAll('.intro-rack button[data-card]')],selected:()=>practice.chosen.map(String),apply:ids=>{practice.select(ids.map(Number));warning=practice.chosen.length===3&&!practice.valid;text();},enabled:()=>window.SZDrawer.active==='onboarding'&&['attack','defend'].includes(practice.stage)});
  function next(){practice.next();warning=false;text();}
  start.addEventListener('click',async()=>{
   if(practice.stage==='done'){prefs.begin(identity(window.gkGame));await window.SZDrawer.close();document.querySelector('#own-hand button:not(:disabled)')?.focus({preventScroll:true});return;}
   const before=new Map([...picture.querySelectorAll('.intro-selected')].map(n=>[n.dataset.card,n.getBoundingClientRect()]));
   if(!practice.submit())return;text();
   if(window.SZMotion?.enabled?.()??!matchMedia('(prefers-reduced-motion: reduce)').matches){for(const n of picture.querySelectorAll('.intro-played [data-card]')){const a=before.get(n.dataset.card),b=n.getBoundingClientRect();if(a&&n.animate)flights.push(n.animate([{transform:`translate(${a.left-b.left}px,${a.top-b.top}px)`},{transform:'translate(0,0)'}],{duration:420,easing:'cubic-bezier(.2,.8,.2,1)'}));}}
   if(practice.stage==='attack-result')timer=setTimeout(()=>{if(window.SZDrawer.active==='onboarding')next();},1600);
  });
  window.SZDrawer.register('onboarding',dialog,reopen,['新手练习','Quick start']);
  window.addEventListener('sz-drawer-open',e=>{if(e.detail.name==='onboarding'){stop();practice=lesson(GK);warning=false;prefs.seen();pending=false;text();}});
  dialog.addEventListener('close',()=>{stop();pending=false;prefs.begin(identity(window.gkGame));});

  const bubble=document.createElement('aside');bubble.className='sz-first-game-hint';bubble.hidden=true;bubble.dataset.noI18n='';bubble.innerHTML='<p role="status"></p><button type="button"></button>';document.body.append(bubble);
  let currentHint=null,lastState=null,anchor=null;
  function position(){if(bubble.hidden||!anchor)return;const r=anchor.getBoundingClientRect(),w=Math.min(310,innerWidth-24);bubble.style.width=w+'px';bubble.style.left=Math.max(12,Math.min(innerWidth-w-12,r.left+(r.width-w)/2))+'px';bubble.style.top=Math.max(12,r.top-bubble.offsetHeight-10)+'px';}
  update=state=>{
   lastState=state;const {game,mode,busy}=state;
   const id=mode==='play'&&!busy&&!document.hidden&&!window.SZDrawer?.active&&!window.SZDrawer?.closing&&!document.querySelector('dialog[open]')?nextHint(prefs,game):null;
   currentHint=id;bubble.hidden=!id;if(!id)return;
   const messages={wounds:['这些伤牌也能和手牌一起出；打出后会补回，不回血。','Play these face-up wounds with your hand. They refill; damage stays.'],swap: GK.handExchange(game.version)?['防守赢了，可以换牌。先选自己的牌，再选目标；每次也可跳过。','Defense won. Select your card, then a target to swap. Each chance can be skipped.']:['防守赢了，可以换牌。选一张牌，确认换新；每次也可跳过。','Defense won. Pick a card and confirm a swap, or skip each chance.'],flower:['金色的花牌可以代替任意牌。','The gold flower card can stand in for any card.'],refill:['双方各攻守一次后，手牌自动补到 8 张。','After both attack, your hand refills to 8 automatically.']};
   bubble.querySelector('p').textContent=messages[id][en()?1:0];bubble.querySelector('button').textContent=t('知道了','Got it');bubble.dataset.hint=id;
   anchor=document.getElementById(id==='wounds'?'own-table':id==='flower'?'own-level':'action-panel');position();
  };
  bubble.querySelector('button').addEventListener('click',()=>{if(currentHint)prefs.ack(currentHint);bubble.hidden=true;});
  // Taking the hinted action is also an acknowledgement; avoid repeated prompts.
  document.addEventListener('click',e=>{if(currentHint&&((currentHint==='wounds'&&e.target.closest('#own-table button'))||(currentHint==='swap'&&e.target.closest('#own-hand button,#own-table button,#skip-refresh,#submit-refresh')))){prefs.ack(currentHint);bubble.hidden=true;}},true);
  toggle.addEventListener('change',()=>{prefs.enable(toggle.checked);if(lastState)update(lastState);});
  window.addEventListener('resize',position);document.addEventListener('scroll',position,true);
  window.addEventListener('sz-drawer-open',()=>{bubble.hidden=true;});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){bubble.hidden=true;clearTimeout(timer);}else if(window.SZDrawer.active==='onboarding'&&practice.stage==='attack-result')timer=setTimeout(next,800);});
  let language=document.documentElement.lang;new MutationObserver(()=>{if(language!==document.documentElement.lang){language=document.documentElement.lang;text();if(lastState)update(lastState);}}).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});text();
  if(pending)window.SZDrawer.open('onboarding');
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();
