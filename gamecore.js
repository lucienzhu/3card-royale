/* GK Standard 1.0.0: five of a kind = 7. Legacy variants preserved.
 * 0.3.8: winner's new level sets a shared flower card for the next game. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.GK = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const VERSION = '1.0.0', SUITS = ['♠', '♥', '♣', '♦'];
  const VERSIONS = ['0.3','0.3.1a','0.3.1b','0.3.2','0.3.3','0.3.4','0.3.5','0.3.6','0.3.7','0.3.8','1.0.0'];
  const allowsFive = version => version==='1.0.0';
  const sharedFlower = version => version==='0.3.8'||allowsFive(version);
  const allowsFour = version => version==='0.3.4'||version==='0.3.5'||version==='0.3.6'||version==='0.3.7'||sharedFlower(version);
  const winnerStarts = version => version==='0.3.5'||version==='0.3.6'||version==='0.3.7'||sharedFlower(version);
  const handExchange = version => version==='0.3.6'||version==='0.3.7'||sharedFlower(version);
  const woundExchange = version => version==='0.3.7'||sharedFlower(version);
  const flowerLevel = (state,who) => sharedFlower(state.version)?state.flowerLevel:state.players[who].level;
  const comparesRanks = version => version==='0.3.1b'||version==='0.3.2'||version==='0.3.3'||allowsFour(version);
  const points = (kind,version) => (version==='0.3.2'||version==='0.3.3'||allowsFour(version))?(kind===4?5:kind===5?4:kind):kind;
  const isRefresh = version => version==='0.3.3'||allowsFour(version);
  const deathThreshold = version => isRefresh(version)?5:6;
  const cmp = (a,b) => { for(let i=0;i<Math.max(a.length,b.length);i++){const d=(a[i]||0)-(b[i]||0);if(d)return d;}return 0; };
  const NAMES = ['高牌', '对子', '顺子', '同花', '炸弹', '同花顺', '四炸', '五炸'];
  const clone = v => JSON.parse(JSON.stringify(v));
  const rank = c => c % 13 + 2, suit = c => Math.floor(c / 13);
  const rankLabel = n => ({11:'J',12:'Q',13:'K',14:'A'}[n] || String(n));
  const label = c => SUITS[suit(c)] + rankLabel(rank(c));
  const wild = (c, level) => suit(c) === 1 && rank(c) === level;
  const assert = (ok, message) => { if (!ok) throw new Error(message); };
  class RNG {
    constructor(seed) { this.state = Number(seed) >>> 0 || 0x6d2b79f5; }
    next() { let x=this.state; x^=x<<13; x^=x>>>17; x^=x<<5; this.state=x>>>0; return this.state/4294967296; }
    shuffle(cards) { for(let i=cards.length-1;i>0;i--){const j=Math.floor(this.next()*(i+1));[cards[i],cards[j]]=[cards[j],cards[i]];} }
  }
  function plainScore(cards) {
    const rs=cards.map(rank).sort((a,b)=>a-b), distinct=new Set(rs).size;
    const flush=cards.every(c=>suit(c)===suit(cards[0]));
    const straight=distinct===3 && (rs[2]-rs[0]===2 || rs.join(',')==='2,3,14');
    if(flush && straight) return 5;
    if(distinct===1) return 4;
    if(flush) return 3;
    if(straight) return 2;
    return distinct===2?1:0;
  }
  const scoreCache=new Map();
  function rankKey(cards, score=plainScore(cards)) {
    const rs=cards.map(rank).sort((a,b)=>b-a);
    if(score===5||score===2)return [rs.join(',')==='14,3,2'?3:rs[0]];
    if(score===4)return [rs[0]];
    if(score===1){const pair=rs.find(r=>rs.filter(x=>x===r).length===2);return [pair,rs.find(r=>r!==pair)];}
    return rs;
  }
  function strengthLabel(e) {
    const kind=e.kind??e.score;
    if(kind===1)return rankLabel(e.rankKey[0])+' 对 / '+rankLabel(e.rankKey[1])+' 单张';
    if([2,4,5,6,7].includes(kind))return rankLabel(e.rankKey[0])+(kind===7?' 五炸':kind===6?' 四炸':kind===4?' 炸弹':' 高顺');
    return e.rankKey.map(rankLabel).join(' / ');
  }
  function outcome(attack,defend,version=VERSION) {
    const delta=attack.score-defend.score;
    if(delta)return {delta,effectiveDelta:delta,reason:'type'};
    if(version==='0.3.1a')return {delta:0,effectiveDelta:1,reason:'tie_attack'};
    if(comparesRanks(version)){
      const r=cmp(attack.rankKey,defend.rankKey);
      return {delta:0,effectiveDelta:Math.sign(r),reason:r>0?'rank_attack':r<0?'rank_defend':'exact_tie'};
    }
    return {delta:0,effectiveDelta:0,reason:'tie'};
  }
  function evaluate(cards, level, version=VERSION) {
    assert((cards.length===3||allowsFour(version)&&cards.length===4||allowsFive(version)&&cards.length===5)&&new Set(cards).size===cards.length&&cards.every(c=>Number.isInteger(c)&&c>=0&&c<52),'选择不同的实体牌：三张花样、四炸，标准版也可出五炸。');
    const ids=[...cards].sort((a,b)=>a-b), key=ids.join(',')+':'+level+':'+version;
    if(scoreCache.has(key)) return scoreCache.get(key);
    const wc=ids.find(c=>wild(c,level));
    if(ids.length===5){
      const others=ids.filter(c=>c!==wc),target=rank(others[0]);
      assert(wc!==undefined&&others.length===4&&others.every(c=>rank(c)===target),'五炸必须是四张自然同点牌加本局花牌。');
      const value={score:7,kind:7,name:NAMES[7],rankKey:[target],wild:{physical:wc,as:target-2}};
      scoreCache.set(key,value);return value;
    }
    if(ids.length===4){
      const others=wc===undefined?ids:ids.filter(c=>c!==wc),target=rank(others[0]);
      assert(others.every(c=>rank(c)===target),'四张出牌必须组成同点四炸。');
      const virtual=wc===undefined?null:Array.from({length:52},(_,i)=>i).find(c=>rank(c)===target&&!others.includes(c));
      const value={score:6,kind:6,name:NAMES[6],rankKey:[target],wild:wc===undefined?null:{physical:wc,as:virtual}};
      scoreCache.set(key,value);return value;
    }
    let kind=plainScore(ids),score=points(kind,version),rk=rankKey(ids,kind),declaration=null;
    if(wc!==undefined){
      const others=ids.filter(c=>c!==wc);
      let virtual=wc;
      for(let c=0;c<52;c++) if(!others.includes(c)) {
        const hand=[...others,c],type=plainScore(hand),value=points(type,version),candidate=rankKey(hand,type);
        if(value>score||(comparesRanks(version)&&value===score&&cmp(candidate,rk)>0)){score=value;kind=type;rk=candidate;virtual=c;}
      }
      declaration={physical:wc,as:virtual};
    }
    const value={score,kind,name:NAMES[kind],rankKey:rk,wild:declaration};
    scoreCache.set(key,value); return value;
  }
  function combinations(cards) {
    const out=[];
    for(let i=0;i<cards.length-2;i++)for(let j=i+1;j<cards.length-1;j++)for(let k=j+1;k<cards.length;k++)out.push([cards[i],cards[j],cards[k]]);
    return out;
  }
  function fourBombs(cards,level) {
    const wc=cards.find(c=>wild(c,level)),groups=new Map(),out=[];
    for(const c of cards){const r=rank(c);if(!groups.has(r))groups.set(r,[]);groups.get(r).push(c);}
    for(const group of groups.values()){
      if(group.length===4)out.push([...group]);
      if(group.length>=3&&wc!==undefined&&!group.includes(wc))for(const three of combinations(group))out.push([...three,wc]);
    }
    return out;
  }
  function fiveBombs(cards,level){
    const wc=cards.find(c=>wild(c,level));if(wc===undefined)return [];
    const groups=new Map();for(const c of [...cards].sort((a,b)=>a-b)){if(c===wc)continue;const r=rank(c);if(!groups.has(r))groups.set(r,[]);groups.get(r).push(c);}
    return [...groups.values()].filter(g=>g.length===4).map(g=>[...g,wc].sort((a,b)=>a-b));
  }
  function legalPlays(cards,level,version){return [...combinations(cards),...(allowsFour(version)?fourBombs(cards,level):[]),...(allowsFive(version)?fiveBombs(cards,level):[])];}
  function bestScore(cards, level, version=VERSION) {
    let best=0; for(const c of combinations(cards)){best=Math.max(best,evaluate(c,level,version).score);if(best===5)break;}return best;
  }
  function bestStrength(cards,level,version){let best=[-1,0,0,0];for(const c of legalPlays(cards,level,version)){const e=evaluate(c,level,version),key=[e.score,...e.rankKey];while(key.length<4)key.push(0);if(cmp(key,best)>0)best=key;}return best;}
  const POLICY = '按执行版本结算牌型分和同分；0.3.2 炸弹 5、同花顺 4，其他分数沿用。0.3.1b / 0.3.2 进攻及保留组合会在同牌型内比较点数，防守按实际伤害与翻牌机会估值。进攻优先最高牌型；防守优先少受伤，再争取翻牌机会；同效优先保留下一次组合、利用明牌保存手牌。翻面优先解锁自己，或封锁数量更多的对方明牌，逢人配优先封锁。启发式，不是最优策略。';
  const REFRESH_POLICY = POLICY+' 0.3.3：伤牌全亮，五伤败北；防守按分差换牌，同牌型胜换一张，完全同点进攻换一张。换牌优先拆对方公开逢人配、对子或同花以上组合，否则刷新自己不影响当前最强组合的低牌；只读公开信息，不猜看隐藏手牌或牌库。每次重新估值，可重复位置。';
  const FOUR_POLICY = REFRESH_POLICY+' 0.3.4：三张组合之外枚举合法四炸，四炸6分；进攻仍优先最高分，防守仍优先少受伤、争取机会，再保留下一次组合。启发式不模拟对手未知手牌，也未针对多花一张的代价进行多步搜索。';
  const EXCHANGE_POLICY = '0.3.6：小局胜者下局先攻，轮间交换。防守按分差获得手牌交换机会，同型点数胜一次、完全同点无效果；以A开局输三次，该玩家回到2级，对手保留等级。选自己一张，盲换对手一张，或弃掉再抽一张；伤区不参与。AI只读己方手牌和公开牌，保留可用最强组合、保留己方逢人配，避免送出对方逢人配，等效时优先盲换；不看对手暗牌或牌库。启发式，不代表最优。';
  const WOUND_POLICY = '0.3.7：继承0.3.6。防守交换可交出自己的手牌或公开伤牌，交换对手盲手牌、对手公开伤牌、自己的另一牌区，或弃旧摸新。每次1机会、张数与伤势不变，伤区所得牌公开。AI只看己方牌、公开伤牌和对手手牌数量；优先有明确组合收益的公开交换，否则刷新不影响最强组合的己方牌，不读取隐藏身份或牌库。';
  const FLOWER_POLICY = '0.3.8：继承0.3.7，首局双方共用♥2作为花牌。此后小局赢家升级后的等级决定下一小局的共同花牌；局内不随攻防胜负或换牌改变。花牌即逢人配、会子、百搭牌。AI仍只读自己的手牌和公开信息，以共同花牌评估双方组合，不读对手手牌或牌库。';
  const flowerView = view => sharedFlower(view.version)?{...view,level:view.flowerLevel,enemyLevel:view.flowerLevel}:view;
  const WINNER_POLICY = FOUR_POLICY+' 0.3.5：小局胜者下一小局先攻；局内仍每轮交换先攻，首局随机或按设置。';
  // These policies receive only a visible view; no stock, enemy hand or hidden wound identities.
  function choosePlay(view) {
    view=flowerView(view);
    const available=[...view.hand,...view.table.filter(x=>x.up&&x.card!==null).map(x=>x.card)];
    const candidates=legalPlays(available,view.level,view.version||VERSION).map(cards=>{
      const version=view.version||VERSION,e=evaluate(cards,view.level,version), tableUses=cards.filter(c=>view.table.some(x=>x.up&&x.card===c)).length;
      const resolved=view.role==='defend'?outcome(view.attackMove||{score:view.attackScore,rankKey:[]},e,version):null;
      const incoming=resolved?Math.max(0,resolved.effectiveDelta):0;
      const n=resolved?Math.max(0,-resolved.effectiveDelta):0;
      const opportunity=isRefresh(version)?n:Math.max(Math.min(n,view.table.filter(x=>!x.up&&!x.pending).length),Math.min(n,view.enemyTable.filter(x=>x.up||x.pending).length));
      return {cards,e,tableUses,key:view.role==='attack'?(comparesRanks(version)?[e.score,...e.rankKey]:[e.score]):[-incoming,opportunity,resolved.effectiveDelta<0?1:0]};
    });
    let leading=null;
    for(const c of candidates)if(!leading||cmp(c.key,leading)>0)leading=c.key;
    let best=null;
    for(const c of candidates.filter(x=>cmp(x.key,leading)===0)){
      const remaining=available.filter(id=>!c.cards.includes(id));
      const future=comparesRanks(view.version)?bestStrength(remaining,view.level,view.version):[bestScore(remaining,view.level,view.version)];
      const key=[...c.key,...future,c.tableUses,-c.cards.filter(id=>wild(id,view.level)).length];
      if(!best||cmp(key,best.key)>0)best={cards:c.cards,key};
    }
    assert(best,'没有足够的可用牌。'); return best.cards;
  }
  function chooseFlip(view) {
    const own=view.table.map((x,i)=>({...x,index:i})).filter(x=>!x.up&&!x.pending);
    const other=view.enemyTable.map((x,i)=>({...x,index:i})).filter(x=>x.up);
    const open=Math.min(view.flipAmount,own.length), lock=Math.min(view.flipAmount,other.length);
    if(open&&open>=lock)return {action:'open',indices:own.slice(0,open).map(x=>x.index)};
    if(lock){other.sort((a,b)=>Number(wild(b.card,view.enemyLevel))-Number(wild(a.card,view.enemyLevel))||rank(b.card)-rank(a.card)||a.index-b.index);return {action:'lock',indices:other.slice(0,lock).map(x=>x.index)};}
    return null;
  }
  // Refresh policy only sees its own hand, public wounds and enemy hand count.
  function chooseRefresh(view) {
    view=flowerView(view);
    const options=view.refreshOptions||[],own=[...view.hand,...view.table.filter(x=>x.up&&!x.pending).map(x=>x.card)];
    assert(options.length,'没有合法换牌目标。');
    if(woundExchange(view.version)){
      const at=t=>t.who===view.actor?(t.zone==='hand'?view.hand[t.index]:view.table[t.index].card):view.enemyTable[t.index].card;
      const unknown=[],known=[];
      for(const option of options){
        const c=at({...option.source,who:view.actor}),keep=own.filter(x=>x!==c);
        if(option.exchange==='card'){
          if(option.who===view.actor)continue; // Moving a card between own zones does not improve this heuristic's pool.
          const take=at(option),newPool=[...keep,take],key=[...bestStrength(newPool,view.level,view.version),Number(wild(take,view.level))-Number(wild(c,view.level)),Number(wild(take,view.enemyLevel))-Number(wild(c,view.enemyLevel)),rank(take)-rank(c)];
          known.push({option,key});
        }else unknown.push({option,key:[...bestStrength(keep,view.level,view.version),Number(!wild(c,view.level)),Number(!wild(c,view.enemyLevel)),14-rank(c),option.exchange==='opponent'?1:0]});
      }
      known.sort((a,b)=>cmp(b.key,a.key));
      if(known.length&&cmp(known[0].key,[...bestStrength(own,view.level,view.version),0,0,0])>0)return known[0].option;
      unknown.sort((a,b)=>cmp(b.key,a.key));return unknown[0]?.option||known[0]?.option||options[0];
    }
    if(handExchange(view.version)){let best=null;for(const option of options){const c=view.hand[option.index],keep=own.filter(x=>x!==c),key=[...bestStrength(keep,view.level,view.version),Number(!wild(c,view.level)),Number(!wild(c,view.enemyLevel)),14-rank(c),option.exchange==='opponent'?1:0];if(!best||cmp(key,best.key)>0)best={option,key};}return best.option;}
    const enemy=options.filter(x=>x.who!==view.actor&&x.zone==='table');
    const wc=enemy.find(x=>wild(view.enemyTable[x.index].card,view.enemyLevel));
    if(wc)return wc;
    const publicCards=view.enemyTable.filter(x=>x.up&&!x.pending).map(x=>x.card),counts=new Map();
    for(const c of publicCards)counts.set(rank(c),(counts.get(rank(c))||0)+1);
    const threatening=enemy.filter(x=>counts.get(rank(view.enemyTable[x.index].card))>=2);
    if(threatening.length){threatening.sort((a,b)=>rank(view.enemyTable[b.index].card)-rank(view.enemyTable[a.index].card));return threatening[0];}
    if(publicCards.length>=3&&bestStrength(publicCards,view.enemyLevel,view.version)[0]>=3){
      enemy.sort((a,b)=>rank(view.enemyTable[b.index].card)-rank(view.enemyTable[a.index].card));return enemy[0];
    }
    let best=null;
    for(const option of options.filter(x=>x.who===view.actor)){
      const c=option.zone==='hand'?view.hand[option.index]:view.table[option.index].card;
      const keep=own.filter(x=>x!==c),key=[...bestStrength(keep,view.level,view.version),Number(!wild(c,view.level)),14-rank(c),option.zone==='hand'?1:0];
      if(!best||cmp(key,best.key)>0)best={option,key};
    }
    return best?best.option:options[0];
  }
  class Game {
    constructor(seed=20261013, options={}) {
      this.version=options.version||VERSION;assert(VERSIONS.includes(this.version),'未知规则版本。');this.seed=Number(seed)>>>0; this.rng=new RNG(this.seed);
      if(handExchange(this.version))this.aLosses=[0,0];
      const names=options.names||['你','对手'];
      this.players=[{name:names[0],level:2,hand:[],table:[]},{name:names[1],level:2,hand:[],table:[]}];
      this.events=[];this.record=options.record!==false;this.results=[];this.stats={};this.stock=[];this.discard=[];
      this.game=0;this.round=0;this.roundsSeen=0;this.active=[null,null];this.lastCombat=null;this.lastRefill=null;
      const first=options.first===0||options.first===1?options.first:(this.rng.next()<0.5?0:1);
      this.firstWasChosen=options.first===0||options.first===1;
      if(allowsFour(this.version))this.roundCardsPlayed=[0,0];
      if(isRefresh(this.version)){this.pendingRefresh=null;this.roundRefreshes=[0,0];}
      this.startGame(first);
    }
    static restore(data) {
      assert(VERSIONS.includes(data.version),'存档版本不匹配。');
      const g=Object.create(Game.prototype);Object.assign(g,clone(data));
      if(sharedFlower(g.version)&&!Number.isInteger(g.levelOwner))g.levelOwner=g.first^((g.round-1)&1);
      g.rng=new RNG(data.rng.state);g.rng.state=data.rng.state;if(handExchange(g.version)&&!g.aLosses)g.aLosses=[0,0];g.check();
      if(sharedFlower(g.version)&&g.phase==='match_over'&&(g.levelOwner!==g.results.at(-1)?.winner||g.flowerLevel!==14)){const r=g.results.at(-1);if(r){r.match_won=false;r.level_owner=g.levelOwner;r.ace_challenger=g.flowerLevel===14?g.levelOwner:null;g.phase='game_over';g.nextFirst=r.winner;const e=g.events.at(-1);if(e?.kind==='end'&&e.game===g.game){e.result=clone(r);e.note='修正闯关判定：本局打的不是赢家自己的A，只赢小局，下一局由赢家打自己的A。';e.state.phase='game_over';e.state.levelOwner=g.levelOwner;}if(g.lastEvent?.kind==='end'){g.lastEvent.result=clone(r);g.lastEvent.note='赢下小局，下一局打自己的A；整场尚未结束。';}}}
      return g;
    }
    save() { const data={};for(const key of Object.keys(this))data[key]=clone(this[key]);return data; }
    bump(key,n=1){this.stats[key]=(this.stats[key]||0)+n;}
    injuries(){return this.players.map(p=>p.table.length);}
    check() {
      if(sharedFlower(this.version)){assert(this.levelOwner===0||this.levelOwner===1,'打级方无效。');}if(sharedFlower(this.version))assert(Number.isInteger(this.flowerLevel)&&this.flowerLevel>=2&&this.flowerLevel<=14,'共同花牌等级无效。');
      const ids=[...this.stock,...this.discard];
      for(const p of this.players){ids.push(...p.hand,...p.table.filter(x=>x.card!==null).map(x=>x.card));assert(p.hand.length<=8,'手牌超过八张。');}
      for(const move of this.active)if(move)ids.push(...move.cards);
      assert(ids.length===52&&new Set(ids).size===52&&ids.every(c=>Number.isInteger(c)&&c>=0&&c<52),'52 张实体牌未守恒。');
      for(let who=0;who<2;who++)for(let i=0;i<this.players[who].table.length;i++){
        const x=this.players[who].table[i];
        if(x.card===null)assert(this.active[who]&&this.active[who].origins.some(o=>o.zone==='table'&&o.index===i),'伤牌空位没有对应的出牌。');
      }
      if(isRefresh(this.version)){
        assert(this.players.every(p=>p.table.every(x=>x.card===null||x.up)),'全亮试验出现扣牌。');
        if(this.phase==='refresh')assert(this.pendingRefresh&&this.pendingRefresh.remaining>0,'换牌阶段没有有效机会。');
      }
      return true;
    }
    snapshot() {
      return clone({players:this.players,stock:this.stock,discard:this.discard,active:this.active,lastCombat:this.lastCombat,lastRefill:this.lastRefill,first:this.first,attacker:this.attacker,phase:this.phase,pendingFlip:this.pendingFlip,roundUses:this.roundUses,...(isRefresh(this.version)?{pendingRefresh:this.pendingRefresh,roundRefreshes:this.roundRefreshes}:{}),...(allowsFour(this.version)?{roundCardsPlayed:this.roundCardsPlayed}:{}),...(handExchange(this.version)?{aLosses:this.aLosses}:{}),...(sharedFlower(this.version)?{version:this.version,flowerLevel:this.flowerLevel,levelOwner:this.levelOwner,gameSeed:this.gameSeed??null}:{})});
    }
    emit(kind,title,note,extra={}) {
      this.check();this.bump('snapshots');
      const event={index:this.events.length,game:this.game,round:this.round,kind,title,note,...clone(extra)};
      this.lastEvent=event;
      if(this.record)this.events.push({...event,state:this.snapshot()});
    }
    draw() {
      if(!this.stock.length){assert(this.discard.length,'公共牌堆与弃牌均为空。');this.stock=this.discard;this.discard=[];this.rng.shuffle(this.stock);this.bump('reshuffles');}
      return this.stock.pop();
    }
    startGame(first) {
      if(sharedFlower(this.version)){this.flowerLevel=this.players[first].level;this.levelOwner=first;this.gameSeed=this.rng.state;}
      this.game++;this.round=1;this.roundsSeen++;this.first=first;this.attacker=first;this.battleIndex=0;
      this.stock=Array.from({length:52},(_,i)=>i);this.rng.shuffle(this.stock);this.discard=[];this.active=[null,null];
      this.lastCombat=null;this.pendingFlip=null;this.lastRefill=null;this.roundUses=[0,0];this.phase='attack';
      if(isRefresh(this.version)){this.pendingRefresh=null;this.roundRefreshes=[0,0];}
      if(allowsFour(this.version))this.roundCardsPlayed=[0,0];
      for(const p of this.players){p.hand=[];p.table=[];}
      for(let i=0;i<8;i++)for(const who of [first,1-first])this.players[who].hand.push(this.draw());
      this.emit('deal',`第 ${this.game} 局 · 发牌`,`${this.players[first].name}先攻，各八张手牌，伤牌区为空。${this.game===1?(this.firstWasChosen?'首局先攻按试玩设置指定。':'首局先攻由模拟猜拳决定。'):(winnerStarts(this.version)?'上一局胜者先攻。':'上一局败者先攻。')}${sharedFlower(this.version)?'本局双方共用花牌 ♥'+rankLabel(this.flowerLevel)+'，局内保持。':''}`);
    }
    currentActor(){return this.phase==='attack'?this.attacker:this.phase==='defend'?1-this.attacker:this.phase==='flip'?this.pendingFlip.actor:this.phase==='refresh'?this.pendingRefresh.actor:null;}
    available(who){const p=this.players[who];return [...p.hand,...p.table.filter(x=>x.up&&x.card!==null).map(x=>x.card)];}
    view(who) {
      const p=this.players[who],q=this.players[1-who];
      const visible=table=>table.map(x=>({up:x.up,pending:x.card===null,card:x.up?x.card:null}));
      return {version:this.version,hand:[...p.hand],table:visible(p.table),enemyTable:visible(q.table),level:p.level,enemyLevel:q.level,...(sharedFlower(this.version)?{flowerLevel:this.flowerLevel}:{}),
        role:this.phase==='defend'?'defend':'attack',attackScore:this.active[this.attacker]?.score??null,
        attackMove:this.active[this.attacker]?clone(this.active[this.attacker]):null,
        flipAmount:this.pendingFlip?.amount??0,injuries:this.injuries(),...(isRefresh(this.version)?{actor:who,enemyHandCount:q.hand.length,refreshRemaining:this.pendingRefresh?.remaining??0,refreshOptions:this.phase==='refresh'&&this.pendingRefresh.actor===who?this.refreshOptions():[]}:{})};
    }
    play(who,cards) {
      assert((this.phase==='attack'||this.phase==='defend')&&who===this.currentActor(),'现在不是该玩家出牌。');
      assert((cards.length===3||allowsFour(this.version)&&cards.length===4||allowsFive(this.version)&&cards.length===5)&&new Set(cards).size===cards.length&&cards.every(c=>this.available(who).includes(c)),'只能使用自己的合法三张、四炸或标准版五炸；手牌与伤牌可混用。');
      cards=[...cards];
      const p=this.players[who],e=evaluate(cards,flowerLevel(this,who),this.version),origins=[];
      if(allowsFour(this.version)){
        this.roundCardsPlayed[who]+=cards.length;
        if(cards.length===5)this.bump('five_bombs');
        if(cards.length===4){this.bump('four_bombs');this.bump(this.phase==='attack'?'four_attack':'four_defend');this.bump(new Set(cards.map(rank)).size===1?'four_natural':'four_wild_assisted');}
      }
      for(const c of cards){
        const h=p.hand.indexOf(c);
        if(h!==-1){p.hand.splice(h,1);origins.push({zone:'hand'});}
        else{const i=p.table.findIndex(x=>x.up&&x.card===c);origins.push({zone:'table',index:i});p.table[i]={card:null,up:false};this.roundUses[who]++;this.bump('table_cards_used');}
      }
      this.active[who]={cards:[...cards],origins,level:flowerLevel(this,who),score:e.score,name:e.name,rankKey:e.rankKey,wild:e.wild,...((this.version==='0.3.2'||isRefresh(this.version))?{kind:e.kind}:{})};
      const attacking=this.phase==='attack';this.phase=attacking?'defend':'resolving';
      this.emit(attacking?'attack':'defend',`${p.name}${attacking?'进攻':'防守'} · ${e.name} ${e.score} 分`,
        `使用 ${origins.filter(o=>o.zone==='hand').length} 张手牌、${origins.filter(o=>o.zone==='table').length} 张明牌。`+(e.wild?`逢人配 ${label(e.wild.physical)} 按 ${label(e.wild.as)} 计分。`:''),{actor:who});
      if(!attacking)this.prepareResolution();
    }
    prepareResolution() {
      const before=this.injuries(),moves=clone(this.active),attacker=this.attacker,defender=1-attacker;
      const resolved=outcome(moves[attacker],moves[defender],this.version),{delta,effectiveDelta,reason}=resolved;
      this.lastCombat={attacker,moves,...resolved,before,after:before,action:null};
      for(const m of this.active)this.discard.push(...m.cards);
      const positions=this.active.map(m=>m.origins.filter(o=>o.zone==='table').map(o=>o.index).sort((a,b)=>a-b));
      this.active=[null,null];const replacements=[];
      for(const who of [attacker,defender])for(const index of positions[who]){
        const card=this.draw();this.players[who].table[index]={card,up:true};replacements.push({who,index,card});this.bump('table_replacements');
      }
      assert(this.injuries().every((n,i)=>n===before[i]),'补位改变了伤势。');
      this.lastCombat.replacements=replacements;
      this.emit('replace',`用牌弃置 · 补回 ${replacements.length} 张明牌`,isRefresh(this.version)?'先补进攻者，再补防守者；新牌不改变本次牌型，可以被接下来的换牌机会选中。':'先补进攻者，再补防守者；新牌不改变本次牌型，可以被接下来的翻面效果操作。');
      this.bump('battles');this.bump(delta>0?'positive':delta===0?'equal':'negative');
      if(reason==='rank_attack'||reason==='rank_defend'||reason==='exact_tie')this.bump(reason);
      const explanation=reason==='tie_attack'?'同分进攻胜 · 1 伤':reason==='rank_attack'?'同牌型进攻点数胜 · 1 伤':reason==='rank_defend'?'同牌型防守点数胜 · 1 次机会':reason==='exact_tie'?'点数也相同 · 进攻方 1 次机会':`Δ = ${delta>0?'+':''}${delta}`;
      if(effectiveDelta>0){
        this.bump('damage_battles');if(delta===0)this.bump('tie_damage');
        for(let i=0;i<effectiveDelta;i++)this.players[defender].table.push({card:this.draw(),up:isRefresh(this.version)});
        this.lastCombat.action='damage';this.lastCombat.after=this.injuries();this.lastCombat.amount=effectiveDelta;
        this.emit('damage',`${explanation} · ${this.players[defender].name}受伤`,`${this.players[defender].name}新增 ${effectiveDelta} 张${isRefresh(this.version)?'明牌':'扣牌'}，伤势 ${before[defender]} → ${this.players[defender].table.length}。`);
        this.finishCombat();
      }else if(handExchange(this.version)&&effectiveDelta===0){
        this.lastCombat.action='none';this.bump('no_effect');this.emit('no_effect','完全同点 · 无事发生','双方伤势不变，没有交换机会。');this.finishCombat();
      }else if(isRefresh(this.version)){
        const amount=effectiveDelta===0?1:-effectiveDelta;
        this.pendingRefresh={actor:effectiveDelta===0?attacker:defender,total:amount,remaining:amount};this.phase='refresh';
        this.lastCombat.action='refresh';this.lastCombat.amount=amount;this.lastCombat.refreshes=[];this.lastCombat.actor=this.pendingRefresh.actor;
        this.bump('refresh_battles');this.bump('refresh_granted',amount);
        if(allowsFour(this.version)&&!this.refreshOptions().length){
          this.pendingRefresh=null;this.phase='resolving';this.lastCombat.action='none';this.bump('no_effect');this.bump('refresh_unusable',amount);
          this.emit('no_effect',woundExchange(this.version)?'没有可交出的牌':handExchange(this.version)?'没有可交换的手牌':'没有可换的牌',handExchange(this.version)?(woundExchange(this.version)?'自己没有手牌或伤牌，剩余交换机会自动结束。':'自己没有手牌，剩余交换机会自动结束，不额外摸牌。'):'双方手牌和伤牌区都为空，本次机会自动结束，不额外摸牌。');this.finishCombat();return;
        }
        this.emit('choice',`${explanation} · ${this.players[this.pendingRefresh.actor].name}选择换牌`,handExchange(this.version)?(woundExchange(this.version)?`获得 ${amount} 次交换机会；先选自己手牌或伤牌，再选对手盲手牌、公开伤牌、自己的另一牌区或牌库。伤势不变。`:`获得 ${amount} 次手牌交换机会；指定自己一张，盲换对手一张，或弃旧摸新。伤势不变。`):`获得 ${amount} 次换牌；逐次任选四个区域，补回原位，伤势不变。对方手牌不查看、随机抽换。`);
      }else{
        this.pendingFlip={actor:effectiveDelta===0?attacker:defender,amount:effectiveDelta===0?1:-effectiveDelta};this.phase='flip';
        if(this.flipOptions().every(o=>!o.indices.length)){
          this.lastCombat.action='none';this.pendingFlip=null;this.bump('no_effect');
          this.emit('no_effect',`${explanation} · 没有可翻的牌`,'双方伤势不变，没有可执行的翻面目标。');this.finishCombat();
        }else{
          this.emit('choice',`${explanation} · ${this.players[this.pendingFlip.actor].name}选择机会`,`翻开自己的扣牌，或扣回对方明牌，最多 ${this.pendingFlip.amount} 张；不能拆分，伤势不变。`);
        }
      }
    }
    refreshOptions() {
      if(!this.pendingRefresh||this.phase!=='refresh')return [];
      const actor=this.pendingRefresh.actor,out=[];
      if(woundExchange(this.version)){
        const p=this.players[actor],q=this.players[1-actor],sources=[...p.hand.map((_,index)=>({zone:'hand',index})),...p.table.flatMap((x,index)=>x.card===null?[]:[{zone:'table',index}])];
        for(const source of sources){
          out.push({source,exchange:'deck'});
          if(q.hand.length)out.push({source,exchange:'opponent',who:1-actor,zone:'hand',blind:true});
          q.table.forEach((x,index)=>{if(x.card!==null)out.push({source,exchange:'card',who:1-actor,zone:'table',index});});
          const zone=source.zone==='hand'?'table':'hand';
          p[zone].forEach((x,index)=>{if(zone==='hand'||x.card!==null)out.push({source,exchange:'card',who:actor,zone,index});});
        }
        return out;
      }
      if(handExchange(this.version)){this.players[actor].hand.forEach((_,index)=>{out.push({who:actor,zone:'hand',index,exchange:'deck'});if(this.players[1-actor].hand.length)out.push({who:1-actor,zone:'hand',index,exchange:'opponent',blind:true});});return out;}
      for(const who of [actor,1-actor]){
        const p=this.players[who];
        if(who===actor)p.hand.forEach((_,index)=>out.push({who,zone:'hand',index}));
        else if(p.hand.length)out.push({who,zone:'hand',blind:true});
        p.table.forEach((x,index)=>{if(x.card!==null)out.push({who,zone:'table',index});});
      }
      return out;
    }
    skipRefresh() {
      assert(isRefresh(this.version)&&this.phase==='refresh'&&this.pendingRefresh?.remaining>0,'当前没有换牌机会。');
      const actor=this.pendingRefresh.actor,left=--this.pendingRefresh.remaining;
      if(this.lastCombat)this.lastCombat.skipped=(this.lastCombat.skipped||0)+1;
      this.bump('refresh_skipped');
      if(!left){this.pendingRefresh=null;this.phase='resolved';}
      this.emit('refresh_skip',this.players[actor].name+'跳过这次换牌',`牌和伤势不变，剩余 ${left} 次机会。`,{actor,remaining:left});
      if(!left)this.finishCombat();
      this.check();
    }
    refresh(target) {
      if(woundExchange(this.version))return this.exchangeWound(target);
      if(handExchange(this.version))return this.exchangeHand(target);
      assert(isRefresh(this.version)&&this.phase==='refresh','当前没有换牌机会。');
      assert(target&&this.refreshOptions().some(o=>o.who===target.who&&o.zone===target.zone&&o.index===target.index&&!!o.blind===!!target.blind),'请选择自己的牌、公开伤牌，或盲换对方手牌。');
      const actor=this.pendingRefresh.actor,who=target.who,p=this.players[who],before=this.injuries(),hands=this.players.map(p=>p.hand.length);
      const index=target.blind?Math.floor(this.rng.next()*p.hand.length):target.index;
      const old=target.zone==='hand'?p.hand[index]:p.table[index].card;
      this.discard.push(old);const next=this.draw();
      if(target.zone==='hand')p.hand[index]=next;else p.table[index]={card:next,up:true};
      this.pendingRefresh.remaining--;this.roundRefreshes[who]++;this.bump('refresh_total');this.bump('refresh_'+(who===actor?'own':'enemy')+'_'+target.zone);
      const item={who,zone:target.zone,index,blind:!!target.blind,...(target.zone==='table'?{from:old,to:next}:{})};this.lastCombat.refreshes.push(item);this.lastCombat.after=this.injuries();
      assert(this.injuries().every((n,i)=>n===before[i])&&this.players.every((p,i)=>p.hand.length===hands[i]),'换牌改变了伤势或手牌张数。');
      const left=this.pendingRefresh.remaining;
      if(!left){this.pendingRefresh=null;this.phase='resolved';}
      this.emit('refresh',`${this.players[actor].name}${target.blind?'盲换':'换'}${who===actor?'自己':'对方'}的${target.zone==='hand'?'手牌':'伤牌'}`,`${target.zone==='table'?label(old)+' → '+label(next)+'。':'新牌仅持有者可见。'}伤势不变，剩余 ${left} 次机会。`,{actor,target:item,remaining:left});
      if(!left)this.finishCombat();
    }
    exchangeWound(target) {
      assert(this.phase==='refresh'&&this.pendingRefresh,'当前没有换牌机会。');
      const valid=target&&this.refreshOptions().find(o=>o.exchange===target.exchange&&o.source.zone===target.source?.zone&&o.source.index===target.source?.index&&o.who===target.who&&o.zone===target.zone&&o.index===target.index);
      assert(valid,'先选自己的手牌或伤牌，再选合法交换目标。');
      const actor=this.pendingRefresh.actor,before=this.injuries(),hands=this.players.map(p=>p.hand.length),source={who:actor,...valid.source};
      const get=t=>t.zone==='hand'?this.players[t.who].hand[t.index]:this.players[t.who].table[t.index].card;
      const put=(t,c)=>{if(t.zone==='hand')this.players[t.who].hand[t.index]=c;else this.players[t.who].table[t.index]={card:c,up:true};};
      const old=get(source);let destination=null;
      if(valid.exchange==='deck'){
        this.discard.push(old);put(source,this.draw());this.roundRefreshes[actor]++;this.bump('counterplay_redraws');
      }else{
        destination=valid.exchange==='opponent'?{who:1-actor,zone:'hand',index:Math.floor(this.rng.next()*this.players[1-actor].hand.length)}:{who:valid.who,zone:valid.zone,index:valid.index};
        const incoming=get(destination);put(source,incoming);put(destination,old);
        this.bump(valid.exchange==='opponent'?'counterplay_blind_swaps':destination.who===actor?'counterplay_own_swaps':'counterplay_public_swaps');
      }
      this.bump('counterplay_from_'+source.zone);this.bump('refresh_total');this.pendingRefresh.remaining--;
      // Do not log a random enemy-hand index or either private identity.
      const item={source:{zone:source.zone,index:source.index},exchange:valid.exchange,...(destination?{who:destination.who,zone:destination.zone,...(valid.exchange==='card'?{index:destination.index}:{blind:true})}:{})};
      this.lastCombat.refreshes.push(item);this.lastCombat.after=this.injuries();
      assert(this.injuries().every((n,i)=>n===before[i])&&this.players.every((p,i)=>p.hand.length===hands[i]),'换牌改变了伤势或手牌张数。');
      const left=this.pendingRefresh.remaining;if(!left||!this.refreshOptions().length){if(left)this.bump('refresh_unusable',left);this.pendingRefresh=null;this.phase='resolved';}
      this.emit('refresh',this.players[actor].name+'完成交换',`手牌张数与伤势不变，伤牌保持公开；剩余 ${this.pendingRefresh?.remaining||0} 次机会。`,{actor,target:item,remaining:this.pendingRefresh?.remaining||0});
      if(!this.pendingRefresh)this.finishCombat();
    }
    exchangeHand(target) {
      assert(this.phase==='refresh'&&this.pendingRefresh,'当前没有换牌机会。');
      assert(target&&this.refreshOptions().some(o=>o.index===target.index&&o.exchange===target.exchange),'先选自己一张手牌，再选盲换对手或弃旧摸新。');
      const actor=this.pendingRefresh.actor,p=this.players[actor],q=this.players[1-actor],before=this.injuries(),hands=this.players.map(x=>x.hand.length),old=p.hand[target.index];
      if(target.exchange==='opponent'){
        const enemyIndex=Math.floor(this.rng.next()*q.hand.length);
        p.hand[target.index]=q.hand[enemyIndex];q.hand[enemyIndex]=old;this.bump('hand_swaps');
      }else{
        this.discard.push(old);p.hand[target.index]=this.draw();this.roundRefreshes[actor]++;this.bump('hand_redraws');
      }
      this.pendingRefresh.remaining--;this.bump('refresh_total');
      const item={who:target.exchange==='opponent'?1-actor:actor,zone:'hand',index:target.index,exchange:target.exchange,blind:target.exchange==='opponent'};
      this.lastCombat.refreshes.push(item);this.lastCombat.after=this.injuries();
      assert(this.injuries().every((n,i)=>n===before[i])&&this.players.every((x,i)=>x.hand.length===hands[i]),'换牌改变了伤势或手牌张数。');
      const left=this.pendingRefresh.remaining;
      if(!left||!this.refreshOptions().length){if(left)this.bump('refresh_unusable',left);this.pendingRefresh=null;this.phase='resolved';}
      this.emit('refresh',this.players[actor].name+(target.exchange==='opponent'?'与对手盲换手牌':'弃旧摸新'),`双方手牌张数与伤势不变，剩余 ${this.pendingRefresh?.remaining||0} 次机会。`,{actor,target:item,remaining:this.pendingRefresh?.remaining||0});
      if(!this.pendingRefresh)this.finishCombat();
    }
    flipOptions() {
      if(!this.pendingFlip)return [];
      const {actor,amount}=this.pendingFlip;
      return [{action:'open',who:actor,indices:this.players[actor].table.map((x,i)=>!x.up?i:null).filter(i=>i!==null)},
              {action:'lock',who:1-actor,indices:this.players[1-actor].table.map((x,i)=>x.up?i:null).filter(i=>i!==null)}]
        .map(o=>({...o,count:Math.min(amount,o.indices.length)}));
    }
    flip(action,indices) {
      assert(this.phase==='flip','当前没有待处理的翻面选择。');
      const option=this.flipOptions().find(o=>o.action===action);
      assert(option&&option.count>0&&indices.length===option.count&&new Set(indices).size===indices.length&&indices.every(i=>option.indices.includes(i)),'请选足本次可操作的牌，且不能混合两种效果。');
      const actor=this.pendingFlip.actor,before=this.injuries();
      for(const i of indices)this.players[option.who].table[i].up=action==='open';
      this.lastCombat.action=action;this.lastCombat.amount=indices.length;this.lastCombat.actor=actor;this.lastCombat.targets=[...indices];this.lastCombat.targetWho=option.who;
      this.lastCombat.after=this.injuries();this.pendingFlip=null;this.bump(action==='open'?'opens':'locks');
      assert(this.injuries().every((n,i)=>n===before[i]),'翻面改变了伤势。');
      this.emit('flip',`${this.players[actor].name}${action==='open'?'翻开自己的':'扣回对方的'} ${indices.length} 张牌`,'仅改变出牌机会，双方伤势总数都不变。');this.finishCombat();
    }
    finishCombat() {
      const loser=this.players.findIndex(p=>p.table.length>=deathThreshold(this.version));
      if(loser!==-1){
        const winner=1-loser,p=this.players[winner],old=p.level,gain=this.players[loser].table.length-p.table.length;
        const ownAce=sharedFlower(this.version)?this.flowerLevel===14?this.levelOwner:null:null;
        const matchWon=old===14&&(!sharedFlower(this.version)||ownAce===winner);
        p.level=Math.min(14,old+gain);this.nextFirst=winnerStarts(this.version)?winner:loser;this.phase=matchWon?'match_over':'game_over';
        let reset=null;
        if(handExchange(this.version)&&this.players[loser].level===14&&(sharedFlower(this.version)?ownAce===loser:old!==14)){
          this.aLosses[loser]++;this.bump('a_failed_attempts');
          if(this.aLosses[loser]===3){this.players[loser].level=2;this.aLosses[loser]=0;reset={who:loser,from:14,to:2,failures:3};this.bump('a_resets');}
        }
        if(handExchange(this.version)&&old<14&&p.level===14)this.aLosses[winner]=0;
        const result={game:this.game,rounds:this.round,winner,damage:this.injuries(),gain,from:old,to:p.level,match_won:matchWon,...(sharedFlower(this.version)?{level_owner:this.levelOwner,ace_challenger:ownAce}:{}),...(handExchange(this.version)?{aLosses:[...this.aLosses],a_reset:reset}:{})};
        this.results.push(result);this.emit('end',`第 ${this.game} 局 · ${p.name}获胜`,`总伤势差 ${gain}，级数 ${rankLabel(old)} → ${rankLabel(p.level)}。${matchWon?'打自己的 A 并获胜，闯关成功，整场结束。':(winnerStarts(this.version)?'下一局胜者先攻。':'下一局败者先攻。')}${reset?this.players[loser].name+'冲A三次未果，回到2级；'+this.players[winner].name+'保留当前等级。':''}`,{result});
      }else{this.phase='resolved';this.check();}
    }
    advance() {
      assert(this.phase==='resolved','请先完成本次攻防。');
      if(this.battleIndex===0){
        this.battleIndex=1;this.attacker=1-this.first;this.phase='attack';this.lastCombat=null;
        this.emit('swap','交换攻防',allowsFour(this.version)?'中途不补手牌；使用剩余手牌和明牌，出三张或同点四炸。':'中途不补手牌；使用剩余手牌和当前明牌各出三张。');
      }else{
        const before=this.players.map(p=>p.hand.length),next=1-this.first,drawn=[0,0];
        for(const who of [next,1-next])while(this.players[who].hand.length<8){this.players[who].hand.push(this.draw());drawn[who]++;}
        const played=allowsFour(this.version)?this.roundCardsPlayed:[6,6];
        assert(before.every((n,i)=>n===8-played[i]+this.roundUses[i]),'余牌预算不一致。');
        assert(drawn.every((n,i)=>n+this.roundUses[i]===played[i]),'补手牌与伤牌补位不等于实际出牌张数。');
        this.lastRefill={round:this.round,before,drawn,tableUses:[...this.roundUses],...(isRefresh(this.version)?{refreshDraws:[...this.roundRefreshes]}:{}),...(allowsFour(this.version)?{cardsPlayed:[...played]}:{})};
        this.emit('refill','轮末保留余牌 · 补到八张',`你保留 ${before[0]} 张补 ${drawn[0]} 张；对手保留 ${before[1]} 张补 ${drawn[1]} 张。${allowsFour(this.version)?'补位与补手牌分别合计 '+played.join(' / ')+' 张，与实际出牌数一致。':'桌面补位与手牌补充各合计六张，'}受伤抽牌另算。${isRefresh(this.version)?'本轮换牌另抽 '+this.roundRefreshes.join(' / ')+' 张。':''}`);
        this.first=next;this.attacker=next;this.battleIndex=0;this.round++;this.roundsSeen++;this.roundUses=[0,0];this.lastCombat=null;this.phase='attack';if(isRefresh(this.version))this.roundRefreshes=[0,0];
        if(allowsFour(this.version))this.roundCardsPlayed=[0,0];
        this.emit('round',`第 ${this.round} 轮 · ${this.players[next].name}先攻`,'双方手牌恢复到八张，伤牌原样保留。');
      }
    }
    nextGame(){assert(this.phase==='game_over','当前不能开始下一局。');this.startGame(this.nextFirst);}
    aiStep(){const who=this.currentActor();if(this.phase==='attack'||this.phase==='defend')this.play(who,choosePlay(this.view(who)));else if(this.phase==='refresh')this.refresh(chooseRefresh(this.view(who)));else if(this.phase==='flip'){const move=chooseFlip(this.view(who));assert(move,'没有合法翻面选择。');this.flip(move.action,move.indices);}else if(this.phase==='resolved')this.advance();else if(this.phase==='game_over')this.nextGame();else return false;return true;}
  }
  function simulate(seed=20261013, options={}) {
    const g=new Game(seed,{version:options.version,record:options.record!==false,names:['A','B']}),limit=options.games||2,maxRounds=options.maxRounds||120,maxGames=options.maxGames||40;
    let stopped=null;
    while(g.phase!=='match_over'){
      if(g.phase==='game_over'&&!options.fullMatch&&g.results.length>=limit)break;
      if(g.phase==='game_over'&&g.results.length>=maxGames){stopped='game_limit';break;}
      if(g.round>maxRounds){stopped='round_limit';break;}
      g.aiStep();
    }
    return {version:g.version,seed:g.seed,policy:sharedFlower(g.version)?FLOWER_POLICY:woundExchange(g.version)?WOUND_POLICY:handExchange(g.version)?EXCHANGE_POLICY:winnerStarts(g.version)?WINNER_POLICY:allowsFour(g.version)?FOUR_POLICY:isRefresh(g.version)?REFRESH_POLICY:POLICY,results:g.results,totalRounds:g.roundsSeen,stats:g.stats,stopped,matchComplete:g.phase==='match_over',events:g.events,finalState:g.snapshot()};
  }
  return {VERSION,VERSIONS,SUITS,NAMES,POLICY,REFRESH_POLICY,FOUR_POLICY,WINNER_POLICY,EXCHANGE_POLICY,WOUND_POLICY,FLOWER_POLICY,RNG,Game,rank,suit,rankLabel,label,wild,plainScore,points,comparesRanks,isRefresh,allowsFive,allowsFour,winnerStarts,handExchange,woundExchange,sharedFlower,flowerLevel,deathThreshold,rankKey,strengthLabel,outcome,evaluate,combinations,fourBombs,fiveBombs,legalPlays,bestScore,bestStrength,choosePlay,chooseFlip,chooseRefresh,simulate};
});
