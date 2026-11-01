import '../app/card-face.js';
import '../app/mark.js';
import '../sdk/actions.js';
const A=globalThis.RoyaleActions;
// Each tab renders its board, state and actions from the same observation.
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
let sample,examples,exampleIndex=0,maskStep=0,activeZone=null;
const isPlay=()=>['attack','defend'].includes(sample.observation.phase);
const cardName=id=>ranks[id%13]+suits[Math.floor(id/13)];
const grammar=()=>A.build(sample.observation);
function card(id,zone){
  const node=el('span','sc-card obs-playing-card');node.dataset.card=id;
  if(zone!==undefined)node.dataset.boardZone=zone;
  node.setAttribute('role','img');
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
  const hidden=el('div','obs-hidden');hidden.dataset.target='blind';hidden.setAttribute('aria-label',t(`对手 ${o.enemy_hand_count} 张暗牌`,`${o.enemy_hand_count} hidden rival cards`));
  for(let i=0;i<o.enemy_hand_count;i++)hidden.append(back());aside.append(hidden,boardZone(2,o.enemy_wounds));
  const center=el('div','obs-board-center');center.append(boardZone(5,o.active[1-o.player]?.cards||[]));
  const deck=el('div','obs-deck');deck.dataset.target='deck';deck.setAttribute('aria-label',t('牌堆','Deck'));deck.append(el('span','',t('牌堆','Deck')),back(),el('strong','',String(o.deck_count)));center.append(deck,boardZone(4,o.active[o.player]?.cards||[]));aside.append(center,boardZone(3,o.discard));
  const status=el('div','obs-board-status');status.append(el('strong','',t(...phases[['attack','defend','refresh','resolved','game_over','match_over'].indexOf(o.phase)])),el('span','',o.pending?t(`还可换 ${o.pending.remaining} 次`,`${o.pending.remaining} chances left`):t('3 / 4 / 5 张出牌','Play 3 / 4 / 5 cards')));aside.append(status);
  const own=el('div','obs-player-label');own.append(flower(),el('strong','',t('你','You')),el('span','',t(`${o.wounds.length} 伤`,`${o.wounds.length} wounds`)),el('b','obs-wild-label',t('花牌 ','Wild ')+ranks[o.flower_level-2]+'♥'));aside.append(own,boardZone(1,o.wounds),boardZone(0,o.hand));
  const key=el('p','obs-board-key');key.append(el('span','obs-source-key',isPlay()?t('示例出牌','Example play'):t('来源','Source')));if(!isPlay())key.append(el('span','obs-target-key',t('目标','Target')));aside.append(key);
  return aside;
}
const tokenNames=['PLAY_3','PLAY_4','PLAY_5','SWAP','SKIP','STOP','ADVANCE','NEXT_GAME','DECK','BLIND','OWN_HAND','OWN_WOUNDS','RIVAL_WOUNDS'];
const tokenLabel=id=>id<52?cardName(id):tokenNames[id-52];
function tokenCell(id,mask){
 const cell=el('div','obs-token'+(mask[id]?' is-legal':''));cell.dataset.maskToken=id;
 cell.setAttribute('aria-label',`${tokenLabel(id)} [${id}] = ${mask[id]}`);
 cell.append(el('span','',tokenLabel(id)),el('b','',String(mask[id])),el('small','',`[${id}]`));return cell;
}
function renderExamples(){
 const tabs=el('div','obs-example-tabs');tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label',t('示例局面','Example position'));
 const labels=[['进攻','Attack'],['防守','Defense'],['换牌','Swap']];
 examples.forEach((x,i)=>{
  const b=el('button','obs-example-tab',t(...labels[i]));b.type='button';b.id=`obs-tab-${i}`;b.dataset.example=i;
  b.setAttribute('role','tab');b.setAttribute('aria-selected',String(i===exampleIndex));b.setAttribute('aria-controls','obs-example-panel');b.tabIndex=i===exampleIndex?0:-1;tabs.append(b);
 });return tabs;
}
function actionTitle(){
 const a=sample.action;
 return a.type==='play'?a.cards.map(cardName).join(' · '):`${cardName(a.source)} ⇄ ${cardName(a.target.card)}`;
}
function renderActions(){
 const section=el('section','obs-actions');section.setAttribute('aria-labelledby','obs-action-title');
 const h=heading(t('动作空间','Action Space'),'actions-v2');h.querySelector('h3').id='obs-action-title';section.append(h);
 const layout=el('div','obs-action-layout'),example=el('div','obs-action-example');
 example.append(el('p','obs-example-label',t('示例动作 · 合法','Example action · valid')));
 const row=el('div','obs-card-row');
 if(isPlay())sample.action.cards.forEach(id=>row.append(card(id)));
 else row.append(card(sample.action.source),el('span','obs-swap-arrow','⇄'),card(sample.action.target.card));
 example.append(row,el('p','obs-note',t(...sample.actionLabel)));
 layout.append(example,el('div','obs-representation'));section.append(layout);
 const maskPanel=el('details','obs-mask-details');
 maskPanel.append(el('summary','',t('逐步 mask · 65','Step-by-step mask · 65')));
 const label=el('label','obs-mask-label',t('检查哪一步','Inspect step'));
 const select=el('select','sz-select-control');select.id='obs-mask-step';label.htmlFor=select.id;maskPanel.append(label,select);
 maskPanel.append(el('div','obs-prefix'),el('p','obs-step-help'),el('div','obs-token-groups'));
 maskPanel.append(el('p','obs-note',t('1 = 可选；0 = 不可选。牌 ID 固定。','1 = allowed; 0 = unavailable. Card IDs stay fixed.')));
 section.append(maskPanel);return section;
}
function representation(sequence,action){
 const box=host.querySelector('.obs-representation');box.replaceChildren();
 box.append(el('h4','',t('动作编码','Action encoding')));
 const padded=[...sequence,...Array(A.LENGTH-sequence.length).fill(A.PAD)],row=el('div','obs-encoded-tokens');
 padded.forEach((id,i)=>{
  const cell=el('div','obs-encoded-token'+(id===A.PAD?' is-pad':''));cell.dataset.position=i;
  cell.append(el('small','',id===A.PAD?'PAD':tokenLabel(id)),el('b','',String(id)));row.append(cell);
 });box.append(row,el('code','obs-action-vector',JSON.stringify(padded)));
 box.append(el('p','obs-note',isPlay()?t('出牌按 ID 升序 · 65 = 补位','Plays sorted by card ID · 65 = padding'):t('操作 → 来源 → 目标区 → 目标牌 · 65 = 补位','Operation → source → destination → target card · 65 = padding')));
 const json=JSON.stringify(action,null,2).replace(/\[\s+([\d,\s]+)\s+\]/g,(_,values)=>'['+values.trim().split(/,\s*/).join(', ')+']');
 box.append(el('pre','obs-semantic',json));
}
function drawMask(mask){
 const groups=host.querySelector('.obs-token-groups');groups.replaceChildren();if(!mask)return;
 for(const [title,first,last] of [[t('操作','Operation'),52,59],[t('实体牌 · 固定 ID','Physical cards · fixed IDs'),0,51],[t('换牌目标','Swap destination'),60,64]]){
  const group=el('div','obs-token-group');group.append(el('h4','',title));const grid=el('div','obs-token-grid'+(first===0?' obs-card-tokens':''));
  for(let id=first;id<=last;id++)grid.append(tokenCell(id,mask));group.append(grid);groups.append(group);
 }
}
function updateAction(){
 const section=host.querySelector('.obs-actions'),g=grammar(),action=sample.action,sequence=A.tokens(action);
 g.validate(action);
 representation(sequence,action);
 const select=section.querySelector('#obs-mask-step');select.replaceChildren();
 for(let i=0;i<=sequence.length;i++){
  const opt=el('option','',i===sequence.length?t('完成后 · 无下一 token','After completion · no next token'):t(`${i+1}. ${tokenLabel(sequence[i])} [${sequence[i]}]`,`Step ${i+1}: ${tokenLabel(sequence[i])} [${sequence[i]}]`));opt.value=i;select.append(opt);
 }
 select.value=maskStep;
 const inspected=sequence.slice(0,maskStep),{mask,complete}=g.next(inspected);
 section.querySelector('.obs-prefix').textContent=inspected.length?inspected.map(id=>`${tokenLabel(id)} [${id}]`).join(' → '):t('前缀：空','Prefix: empty');
 section.querySelector('.obs-step-help').textContent=complete?t('动作完整；下一 token 的 mask 全为 0。','Move complete: the next-token mask is all zeros.'):`action_mask[${sequence[maskStep]}] = ${mask[sequence[maskStep]]}`;
 drawMask(mask);
 host.querySelector('.obs-board-inspection').textContent=t('示例：','Example: ')+actionTitle();
 const sourceCards=isPlay()?action.cards:[action.source],targetCard=action.target?.card;
 host.querySelectorAll('.obs-board [data-card]').forEach(n=>{
  n.classList.toggle('is-source',sourceCards.includes(Number(n.dataset.card)));
  n.classList.toggle('is-target',Number(n.dataset.card)===targetCard);
 });
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
  const observation=el('section','obs-observation');observation.setAttribute('aria-labelledby','obs-observation-title');
  const h=heading(t('观察空间','Observation Space'),'336 · state');h.querySelector('h3').id='obs-observation-title';observation.append(h);
  const view=el('div','obs-view');
  const top=el('div','obs-intro');
  top.append(el('h3','obs-total','336'),el('div','',t('当前可见状态','Current visible state')),
    el('code','','6 × 52 + 6 + 18'));
  const note=el('p','obs-note',t(...sample.name));
  view.append(top,note,heading(t('六个牌区','Six card zones'),'312 · multi-hot'));
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

  observation.append(view);
  const spaces=el('div','obs-spaces');spaces.append(observation,renderActions());
  const layout=el('div','obs-layout');layout.append(renderBoard(),spaces);
  const panel=el('div','obs-example-panel');panel.id='obs-example-panel';panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby',`obs-tab-${exampleIndex}`);panel.append(layout);
  host.replaceChildren(renderExamples(),panel);openDetails.forEach(cls=>{const node=host.querySelector('details.'+cls);if(node)node.open=true;});updateAction();updateZone();

}
function useExample(i){
 exampleIndex=i;activeZone=null;sample=examples[i];maskStep=A.tokens(sample.action).length-1;const o=sample.observation;sample.state=Array.from(A.state(o));
 sample.rawMeta=[...o.levels,o.flower_level,o.wounds.length,o.enemy_wounds.length,o.enemy_hand_count,o.deck_count,o.discard.length,...o.a_losses,+(o.first===o.player),+(o.attacker===o.player),o.battle_index,o.pending?.remaining||0,+(o.actor===o.player),o.round,o.game,0];paint();
}
if(host){
 host.addEventListener('click',event=>{
  const zone=event.target.closest('[data-zone-link]');
  const tab=event.target.closest('[data-example]');if(tab){useExample(Number(tab.dataset.example));host.querySelector(`#obs-tab-${exampleIndex}`).focus({preventScroll:true});}
  if(zone){const next=Number(zone.dataset.zoneLink);activeZone=activeZone===next?null:next;updateZone();}
 });
 host.addEventListener('change',event=>{if(event.target.id==='obs-mask-step'){maskStep=Number(event.target.value);updateAction();}});
 host.addEventListener('keydown',event=>{
  if(!event.target.matches('[data-example]'))return;
  const keys={ArrowRight:(exampleIndex+1)%examples.length,ArrowLeft:(exampleIndex+examples.length-1)%examples.length,Home:0,End:examples.length-1};
  if(keys[event.key]!==undefined){event.preventDefault();useExample(keys[event.key]);host.querySelector(`#obs-tab-${exampleIndex}`).focus({preventScroll:true});}
 });
 try{
  const response=await fetch(new URL('./structured-examples.json',import.meta.url));if(!response.ok)throw Error('Examples unavailable');examples=await response.json();useExample(0);
  let language=document.documentElement.lang;new MutationObserver(()=>{if(language!==document.documentElement.lang){language=document.documentElement.lang;paint();}}).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
 }catch{/* Keep the static contract readable if examples cannot load. */}
}
