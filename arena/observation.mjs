import '../app/card-face.js';
import '../app/mark.js';
import '../sdk/actions.js';
const A=globalThis.RoyaleActions;
// The same saved observation used by the blog. Values are checked against sdk/features.js.
const host=document.getElementById('arena-observation');
const en=()=>document.documentElement.lang==='en';
const t=(zh,english)=>en()?english:zh;
const ranks=['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
const suits=['♠','♥','♣','♦'];
const zones=[['你的手牌','Your hand'],['你的伤牌','Your wounds'],['对手伤牌','Rival wounds'],['弃牌','Discards'],['你的已出牌','Your played cards'],['对手已出牌','Rival played cards']];
const phases=[['进攻','Attack'],['防守','Defend'],['换牌','Swap'],['已结算','Resolved'],['小局结束','Game over'],['整场结束','Match over']];
const meta=[
  ['席位 0 等级','Seat 0 level','levels[0]',14],
  ['席位 1 等级','Seat 1 level','levels[1]',14],
  ['花牌点数','Flower rank','flower_level',14],
  ['你的伤牌数','Your wound count','wounds.length',10,10],
  ['对手伤牌数','Rival wound count','enemy_wounds.length',10,10],
  ['对手手牌数','Rival hand count','enemy_hand_count',8],
  ['牌堆牌数','Deck count','deck_count',52],
  ['弃牌数','Discard count','discard.length',52],
  ['席位 0 冲 A 失败','Seat 0 Ace losses','a_losses[0]',3],
  ['席位 1 冲 A 失败','Seat 1 Ace losses','a_losses[1]',3],
  ['本轮你先攻','You go first this round','first === player','bool'],
  ['你是进攻方','You are the attacker','attacker === player','bool'],
  ['本轮攻防序号','Play index in round','battle_index'],
  ['剩余换牌机会','Swap chances left','pending.remaining',7],
  ['轮到你行动','Your turn to act','actor === player','bool'],
  ['当前轮数','Round number','round',1024,1024],
  ['当前小局数','Game number','game',1024,1024],
  ['整场任务','Full-match task',"episode === 'match'",'bool']
];
const number=value=>String(Number(value.toFixed(6)));
function el(tag,cls,text){const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node;}
function bit(value,index,label){const node=el('span','obs-bit'+(value?' is-set':''),String(value));node.dataset.index=index;node.title=`${label} · [${index}] = ${value}`;return node;}
function heading(title,detail){const h=el('div','obs-heading');h.append(el('h3','',title),el('span','obs-code',detail));return h;}
function legend(on,off){const p=el('p','obs-legend');p.append(el('span','obs-legend-on','1 · '+on),el('span','','0 · '+off));return p;}
let sample,examples,exampleIndex=0,prefix=[],activeZone=null;
const cardName=id=>ranks[id%13]+suits[Math.floor(id/13)];
const grammar=()=>A.build(sample.observation);
function card(id,zone){
  const interactive=zone===0||zone===1||zone===2;
  const node=el(interactive?'button':'span','sc-card obs-playing-card');node.dataset.card=id;
  if(zone!==undefined)node.dataset.boardZone=zone;
  if(interactive){
    node.type='button';
    if(zone<2){node.dataset.sourceZone=zone===0?'hand':'wounds';node.dataset.sourceIndex=sample.observation[node.dataset.sourceZone].indexOf(id);}
    else node.dataset.rivalWound=sample.observation.enemy_wounds.indexOf(id);
  }else node.setAttribute('role','img');
  node.setAttribute('aria-label',cardName(id));
  const suit=Math.floor(id/13),rank=ranks[id%13];node.classList.toggle('red',suit===1||suit===3);
  if(id===13+sample.observation.flower_level-2)node.classList.add('wild');
  node.append(el('b',rank==='10'?'ten':'',rank));
  for(const cls of ['obs-small-suit','sc-center']){const shape=el('span',cls);shape.innerHTML=window.SZSuit.svg(suit);node.append(shape);}
  return node;
}
function flower(rival=false){const n=el('span','obs-flower'+(rival?' rival':''));n.innerHTML=window.SZFlowerMark;n.setAttribute('aria-hidden','true');return n;}
function back(){const n=el('span','obs-back');n.setAttribute('aria-hidden','true');n.append(flower());return n;}
function boardZone(zone,ids){
  const section=el('section','obs-board-zone');section.dataset.boardZone=zone;
  const label=el('button','obs-zone-link',`${zone+1} · ${t(...zones[zone])}`);label.type='button';label.dataset.zoneLink=zone;label.setAttribute('aria-pressed',String(activeZone===zone));
  section.append(label);const row=el('div','obs-card-row');
  ids.forEach(id=>row.append(card(id,zone)));
  if(!ids.length)row.append(el('span','obs-empty','—'));
  section.append(row);return section;
}
function renderBoard(){
  const o=sample.observation,aside=el('aside','obs-board');aside.setAttribute('aria-label',t('与编码对应的当前局面','Current position matching the encoding'));
  const header=el('div','obs-board-title');header.append(el('strong','',t('当前局面','Current position')),el('span','',t(`第 ${o.game} 局 · 第 ${o.round} 轮`,`Game ${o.game} · Round ${o.round}`)));aside.append(header);
  const inspection=el('div','obs-board-inspection');inspection.setAttribute('role','status');inspection.setAttribute('aria-live','polite');aside.append(inspection);
  const levels=el('div','obs-board-levels');levels.append(flower(true),el('span','',t(`对手 ${ranks[o.levels[1-o.player]-2]}`,`Rival ${ranks[o.levels[1-o.player]-2]}`)),el('span','obs-level-line'),flower(),el('span','',t(`你 ${ranks[o.levels[o.player]-2]}`,`You ${ranks[o.levels[o.player]-2]}`)));aside.append(levels);
  const rival=el('div','obs-player-label');rival.append(flower(true),el('strong','',t('对手','Rival')),el('span','',t(`${o.enemy_wounds.length} 伤`,`${o.enemy_wounds.length} wounds`)));aside.append(rival);
  const hidden=el('button','obs-hidden');hidden.type='button';hidden.dataset.target='blind';hidden.setAttribute('aria-label',t(`盲换对手 ${o.enemy_hand_count} 张暗牌`,`Swap with the rival’s ${o.enemy_hand_count} hidden cards`));
  for(let i=0;i<o.enemy_hand_count;i++)hidden.append(back());aside.append(hidden,boardZone(2,o.enemy_wounds));
  const center=el('div','obs-board-center');center.append(boardZone(5,o.active[1-o.player]?.cards||[]));
  const deck=el('button','obs-deck');deck.type='button';deck.dataset.target='deck';deck.setAttribute('aria-label',t('换牌堆','Swap with deck'));deck.append(el('span','',t('牌堆','Deck')),back(),el('strong','',String(o.deck_count)));center.append(deck,boardZone(4,o.active[o.player]?.cards||[]));aside.append(center,boardZone(3,o.discard));
  const status=el('div','obs-board-status');status.append(el('strong','',t(...phases[['attack','defend','refresh','resolved','game_over','match_over'].indexOf(o.phase)])),el('span','',o.pending?t(`还可换 ${o.pending.remaining} 次`,`${o.pending.remaining} chances left`):t('选 3 / 4 / 5 张','Choose 3 / 4 / 5')));aside.append(status);
  const own=el('div','obs-player-label');own.append(flower(),el('strong','',t('你','You')),el('span','',t(`${o.wounds.length} 伤`,`${o.wounds.length} wounds`)),el('b','obs-wild-label',t('花牌 ','Wild ')+ranks[o.flower_level-2]+'♥'));aside.append(own,boardZone(1,o.wounds),boardZone(0,o.hand));
  const key=el('p','obs-board-key');key.append(el('span','obs-source-key',t('来源','Source')),el('span','obs-target-key',t('目标','Target')),el('span','',t('动作预览','Action preview')));aside.append(key);
  const hint=el('p','obs-board-hint',t('先选操作，再点亮起的牌。这里只预览，不推进游戏。','Choose an operation, then a lit card. Preview only; the game does not advance.'));aside.append(hint);
  return aside;
}
const tokenNames=['PLAY_3','PLAY_4','PLAY_5','SWAP','SKIP','STOP','ADVANCE','NEXT_GAME','DECK','BLIND','OWN_HAND','OWN_WOUNDS','RIVAL_WOUNDS'];
const tokenLabel=id=>id<52?cardName(id):tokenNames[id-52];
function addToken(id){if(grammar().next(prefix).mask[id]){prefix.push(id);updateAction();}}
function tokenButton(id,mask){
 const button=el('button','obs-token'+(mask[id]?' is-legal':''));button.type='button';button.dataset.token=id;
 button.disabled=!mask[id];button.setAttribute('aria-label',`${tokenLabel(id)} [${id}] = ${mask[id]}`);
 button.append(el('span','',tokenLabel(id)),el('b','',String(mask[id])),el('small','',`[${id}]`));return button;
}
function renderActions(){
 const section=el('section','obs-actions');section.append(heading(t('固定动作 · 分步构造','Fixed actions · build a move'),'65 · action_mask'));
 const select=el('select','sz-select-control');select.id='obs-example';select.setAttribute('aria-label',t('示例局面','Example position'));
 examples.forEach((x,i)=>{const option=el('option','',t(...x.name));option.value=i;select.append(option);});select.value=exampleIndex;section.append(select);
 const trail=el('div','obs-prefix');trail.setAttribute('role','status');trail.setAttribute('aria-live','polite');section.append(trail);
 const controls=el('div','obs-prefix-controls');for(const [id,zh,en] of [['undo','撤回一步','Undo'],['reset','重选','Reset']]){const b=el('button','',t(zh,en));b.type='button';b.dataset.prefixControl=id;controls.append(b);}section.append(controls);
 section.append(el('p','obs-step-help'),el('div','obs-token-groups'),el('pre','obs-semantic'));
 section.append(el('p','obs-note',t('0–51 永远对应同一张牌。1 = 此前缀下可选，0 = 当前不可选；不是候选编号。3 张任意合法组合，4 / 5 张须成炸，按牌 ID 递增选择。','0–51 always identify the same cards. 1 = allowed after this prefix; 0 = unavailable. These are not candidate indices. Pick 3 cards, or a legal 4/5-card bomb, in ascending card-ID order.')));
 return section;
}
function updateAction(){
 const {mask,complete}=grammar().next(prefix),section=host.querySelector('.obs-actions');
 section.querySelector('.obs-prefix').textContent=prefix.length?prefix.map(id=>`${tokenLabel(id)} [${id}]`).join(' → '):t('从操作开始','Start with an operation');
 section.querySelectorAll('[data-prefix-control]').forEach(b=>b.disabled=!prefix.length);
 section.querySelector('.obs-step-help').textContent=complete?t('动作完整。此时才提交；下一 token 的 mask 全为 0。','Move complete. Submit only now; the next-token mask is all zeros.'):t(`下一步：${mask.reduce((a,b)=>a+b,0)} 个可选 token`,`Next: ${mask.reduce((a,b)=>a+b,0)} allowed tokens`);
 const groups=el('div');
 for(const [title,first,last] of [[t('操作','Operation'),52,59],[t('实体牌 · 固定 ID','Physical cards · fixed IDs'),0,51],[t('换牌目标','Swap destination'),60,64]]){
  const group=el('div','obs-token-group');group.append(el('h4','',title));const grid=el('div','obs-token-grid'+(first===0?' obs-card-tokens':''));
  for(let id=first;id<=last;id++)grid.append(tokenButton(id,mask));group.append(grid);groups.append(group);
 }
 section.querySelector('.obs-token-groups').replaceChildren(...groups.children);
 section.querySelector('.obs-semantic').textContent=complete?JSON.stringify(grammar().resolve(prefix).action,null,2):t('完成选择后显示结构化动作。','The complete structured action appears here.');
 host.querySelector('.obs-board-inspection').textContent=section.querySelector('.obs-prefix').textContent;
 const swapping=prefix[0]===A.T.SWAP,targetCard=swapping?prefix[3]:undefined;
 const sourceCards=swapping?prefix.slice(1,2):prefix.slice(1);
 host.querySelectorAll('button[data-card]').forEach(n=>{const id=Number(n.dataset.card);n.disabled=!mask[id];n.classList.toggle('is-source',sourceCards.includes(id));n.classList.toggle('is-target',id===targetCard);n.classList.toggle('is-available',!!mask[id]);n.setAttribute('aria-pressed',String(sourceCards.includes(id)||id===targetCard));});
 host.querySelectorAll('button[data-target]').forEach(n=>{const id=n.dataset.target==='deck'?60:61;n.disabled=!mask[id];n.classList.toggle('is-available',!!mask[id]);n.classList.toggle('is-target',prefix.includes(id));});
 host.querySelectorAll('.obs-bit').forEach(n=>{const index=Number(n.dataset.index),present=index<312&&sample.state[index]===1;n.classList.toggle('is-source',present&&sourceCards.includes(index%52));n.classList.toggle('is-target',present&&index%52===targetCard);});
}
function updateZone(){host.querySelectorAll('[data-board-zone],.obs-zone[data-zone]').forEach(n=>n.classList.toggle('is-zone-linked',activeZone!==null&&Number(n.dataset.boardZone??n.dataset.zone)===activeZone));host.querySelectorAll('[data-zone-link]').forEach(n=>n.setAttribute('aria-pressed',String(Number(n.dataset.zoneLink)===activeZone)));}
function cardGrid(values,offset,label){
  const grid=el('div','obs-card-grid');grid.setAttribute('role','img');
  const present=[];values.forEach((n,c)=>{if(n)present.push(cardName(c));});grid.setAttribute('aria-label',label+': '+(present.join(', ')||t('空','empty')));
  grid.append(el('span','obs-rank',''));ranks.forEach(rank=>grid.append(el('span','obs-rank',rank)));
  suits.forEach((suit,s)=>{grid.append(el('span','obs-suit'+(s===1||s===3?' is-red':''),suit));ranks.forEach((rank,r)=>{const i=s*13+r;grid.append(bit(values[i],offset+i,suit+rank));});});return grid;
}

function paint(){
  if(!sample||!host)return;
  const openDetails=[...host.querySelectorAll('details[open]')].map(n=>n.className);
  const view=el('div','obs-view');
  const top=el('div','obs-intro');
  top.append(el('h3','obs-total','336'),el('div','',t('当前可见状态','Current visible state')),
    el('code','','6 × 52 + 6 + 18'));
  const note=el('p','obs-note',t(...sample.name));
  view.append(top,note,renderActions(),heading(t('六个牌区','Six card zones'),'312 · multi-hot'));
  const cards=el('div','obs-zones');
  zones.forEach((names,zone)=>{
    const group=el('section','obs-zone');group.dataset.zone=zone;
    const count=sample.state.slice(zone*52,(zone+1)*52).reduce((sum,n)=>sum+n,0);
    const h=heading('',`${count} / 52`),link=el('button','obs-zone-link',`${zone+1} · ${t(...names)}`);link.type='button';link.dataset.zoneLink=zone;h.querySelector('h3').append(link);group.append(h);
    const grid=cardGrid(sample.state.slice(zone*52,(zone+1)*52),zone*52,t(...names));
    group.append(grid);cards.append(group);
  });
  view.append(cards,legend(t('有牌','present'),t('无牌','absent')));
  const phase=el('section','obs-phase');
  phase.append(heading(t('当前阶段','Current phase'),'6 · one-hot'));
  const phasesGrid=el('div','obs-phases');
  phases.forEach((names,i)=>{
    const index=312+i,entry=el('div','obs-phase-entry');
    entry.append(el('span','obs-phase-label',t(...names)),bit(sample.state[index],index,t(...names)),el('small','obs-code',`[${index}]`));phasesGrid.append(entry);
  });phase.append(phasesGrid);view.append(phase);
  const details=el('details','obs-meta');details.open=openDetails.includes('obs-meta');
  const summary=el('summary','');summary.append(el('span','',t('其余 18 项状态','Other 18 state features')),el('span','obs-meta-hint',t('原值 → 入模值','Raw → encoded')));details.append(summary);
  const table=el('table','obs-meta-table');
  table.append(el('caption','obs-note',t('序号从 0 起；入模值最多显示 6 位小数。','Zero-based indices; encoded values rounded to 6 decimals.')));
  const thead=el('thead'),tr=el('tr');
  ['#',t('状态','Feature'),t('原值','Raw'),t('入模值','Encoded')].forEach(title=>{const th=el('th','',title);th.scope='col';tr.append(th);});thead.append(tr);table.append(thead);
  const body=el('tbody');
  meta.forEach(([zh,english,key,div,cap],i)=>{
    const row=el('tr');row.dataset.index=318+i;
    const label=el('th','',t(zh,english));label.scope='row';label.append(el('code','',key));
    const encoded=el('td','obs-encoded',number(sample.state[318+i]));
    encoded.append(el('small','',div==='bool'?t('是 1 / 否 0','yes 1 / no 0'):div?(cap?`min(n, ${cap}) / ${div}`:`n / ${div}`):t('原值','unchanged')));
    row.append(el('td','obs-index',String(318+i)),label,el('td','',String(sample.rawMeta[i])),encoded);body.append(row);
  });table.append(body);details.append(table);view.append(details);
  view.append(el('p','obs-note',t('不含对手暗牌、牌堆顺序或历史序列。','No rival hand, deck order or history sequence.')));

  const layout=el('div','obs-layout');layout.append(renderBoard(),view);host.replaceChildren(layout);openDetails.forEach(cls=>{const node=host.querySelector('details.'+cls);if(node)node.open=true;});updateAction();updateZone();

}
function useExample(i){
 exampleIndex=i;prefix=[];sample=examples[i];const o=sample.observation;sample.state=Array.from(A.state(o));
 sample.rawMeta=[...o.levels,o.flower_level,o.wounds.length,o.enemy_wounds.length,o.enemy_hand_count,o.deck_count,o.discard.length,...o.a_losses,+(o.first===o.player),+(o.attacker===o.player),o.battle_index,o.pending?.remaining||0,+(o.actor===o.player),o.round,o.game,0];paint();
}
if(host){
 host.addEventListener('click',event=>{
  const token=event.target.closest('[data-token]'),control=event.target.closest('[data-prefix-control]'),card=event.target.closest('button[data-card]'),target=event.target.closest('button[data-target]'),zone=event.target.closest('[data-zone-link]');
  if(token)addToken(Number(token.dataset.token));
  if(card)addToken(Number(card.dataset.card));
  if(target)addToken(target.dataset.target==='deck'?60:61);
  if(control){if(control.dataset.prefixControl==='undo')prefix.pop();else prefix=[];updateAction();}
  if(zone){const next=Number(zone.dataset.zoneLink);activeZone=activeZone===next?null:next;updateZone();}
 });
 host.addEventListener('change',event=>{if(event.target.id==='obs-example')useExample(Number(event.target.value));});
 try{
  const response=await fetch(new URL('./structured-examples.json',import.meta.url));if(!response.ok)throw Error('Examples unavailable');examples=await response.json();useExample(0);
  let language=document.documentElement.lang;new MutationObserver(()=>{if(language!==document.documentElement.lang){language=document.documentElement.lang;paint();}}).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
 }catch{/* Keep the static contract readable if examples cannot load. */}
}
