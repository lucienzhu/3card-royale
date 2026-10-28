import '../app/card-face.js';
import '../app/mark.js';
// The same saved observation used by the blog. Values are checked against sdk/features.js.
const host=document.getElementById('arena-observation');
const en=()=>document.documentElement.lang==='en';
const t=(zh,english)=>en()?english:zh;
const ranks=['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
const suits=['♠','♥','♣','♦'];
const zones=[['你的手牌','Your hand'],['你的伤牌','Your wounds'],['对手伤牌','Rival wounds'],['弃牌','Discards'],['你的已出牌','Your played cards'],['对手已出牌','Rival played cards']];
const phases=[['进攻','Attack'],['防守','Defend'],['换牌','Swap'],['已结算','Resolved'],['小局结束','Game over'],['整场结束','Match over']];
const meta=[
  ['对手等级 · 席位 0','Rival level · seat 0','levels[0]',14],
  ['你的等级 · 席位 1','Your level · seat 1','levels[1]',14],
  ['花牌点数','Flower rank','flower_level',14],
  ['你的伤牌数','Your wound count','wounds.length',10,10],
  ['对手伤牌数','Rival wound count','enemy_wounds.length',10,10],
  ['对手手牌数','Rival hand count','enemy_hand_count',8],
  ['牌堆牌数','Deck count','deck_count',52],
  ['弃牌数','Discard count','discard.length',52],
  ['对手冲 A 失败数','Rival Ace losses','a_losses[0]',3],
  ['你的冲 A 失败数','Your Ace losses','a_losses[1]',3],
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
let sample,selected=0,activeZone=null,sourceFilter=null;
const cardName=id=>ranks[id%13]+suits[Math.floor(id/13)];
const selectedAction=()=>sample.observation.legal_actions[selected];
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
  const levels=el('div','obs-board-levels');levels.append(flower(true),el('span','',t(`对手 ${ranks[o.levels[0]-2]}`,`Rival ${ranks[o.levels[0]-2]}`)),el('span','obs-level-line'),flower(),el('span','',t(`你 ${ranks[o.levels[1]-2]}`,`You ${ranks[o.levels[1]-2]}`)));aside.append(levels);
  const rival=el('div','obs-player-label');rival.append(flower(true),el('strong','',t('对手','Rival')),el('span','',t(`${o.enemy_wounds.length} 伤`,`${o.enemy_wounds.length} wounds`)));aside.append(rival);
  const hidden=el('button','obs-hidden');hidden.type='button';hidden.dataset.target='blind';hidden.setAttribute('aria-label',t(`盲换对手 ${o.enemy_hand_count} 张暗牌`,`Swap with the rival’s ${o.enemy_hand_count} hidden cards`));
  for(let i=0;i<o.enemy_hand_count;i++)hidden.append(back());aside.append(hidden,boardZone(2,o.enemy_wounds));
  const center=el('div','obs-board-center');center.append(boardZone(5,o.active[0]?.cards||[]));
  const deck=el('button','obs-deck');deck.type='button';deck.dataset.target='deck';deck.setAttribute('aria-label',t('换牌堆','Swap with deck'));deck.append(el('span','',t('牌堆','Deck')),back(),el('strong','',String(o.deck_count)));center.append(deck,boardZone(4,o.active[1]?.cards||[]));aside.append(center,boardZone(3,o.discard));
  const status=el('div','obs-board-status');status.append(el('strong','',t('你换牌','Your swap')),el('span','',t(`还可换 ${o.pending.remaining} 次`,` ${o.pending.remaining} chances left`)));aside.append(status);
  const own=el('div','obs-player-label');own.append(flower(),el('strong','',t('你','You')),el('span','',t(`${o.wounds.length} 伤`,`${o.wounds.length} wounds`)),el('b','obs-wild-label',t('花牌 ','Wild ')+ranks[o.flower_level-2]+'♥'));aside.append(own,boardZone(1,o.wounds),boardZone(0,o.hand));
  const key=el('p','obs-board-key');key.append(el('span','obs-source-key',t('来源','Source')),el('span','obs-target-key',t('目标','Target')),el('span','',t('动作预览','Action preview')));aside.append(key);
  const hint=el('p','obs-board-hint',t('点自己的牌，查看关联动作；再点牌堆或对手牌预览。','Pick your card to see matching actions; then pick a deck or rival target.'));aside.append(hint);
  return aside;
}
function targetName(a){
  const o=sample.observation,z=a.target;
  if(z.zone==='deck')return t('牌堆','Deck');
  if(z.zone==='blind')return t('对手暗牌（随机）','Rival hand (random)');
  return (z.who===o.player?t('你的','Your '):t('对手','Rival '))+(z.zone==='hand'?t('手牌 ','hand '):t('伤牌 ','wound '))+cardName(z.who===o.player?o[z.zone][z.index]:o.enemy_wounds[z.index]);
}
function actionName(a){
  if(a.type==='skip_swap')return t('跳过本次，保留下一次','Skip this chance; keep the next');
  if(a.type==='stop_swaps')return t('结束换牌，放弃剩余机会','End swaps; forgo remaining chances');
  const c=sample.observation[a.source.zone][a.source.index];
  return (a.source.zone==='hand'?t('手牌 ','Hand '):t('伤牌 ','Wound '))+cardName(c)+' → '+targetName(a);
}
function actionGroup(a){if(a.type!=='swap')return a.type;if(a.target.zone==='deck'||a.target.zone==='blind')return a.target.zone;return a.target.who===sample.player?'own':'rival';}
const actionGroups=[['deck','换牌堆','Deck'],['blind','盲换对手','Blind rival'],['rival','换对手伤牌','Rival wounds'],['own','手牌 ⇄ 伤牌','Hand ⇄ wounds'],['skip_swap','跳过本次','Skip one'],['stop_swaps','结束换牌','End swaps']];
function groupIndices(key){return sample.observation.legal_actions.flatMap((a,i)=>actionGroup(a)===key?[i]:[]);}
const matchesSource=(a,source)=>a.type==='swap'&&a.source.zone===source.zone&&a.source.index===source.index;
function sourceLabel(zone,index){
  const id=sample.observation[zone][index],b=el('button','obs-source-label',cardName(id));
  b.type='button';b.dataset.sourceZone=zone;b.dataset.sourceIndex=index;
  b.classList.toggle('is-red',Math.floor(id/13)===1||Math.floor(id/13)===3);
  b.setAttribute('aria-label',(zone==='hand'?t('手牌 ','Hand '):t('伤牌 ','Wound '))+cardName(id));return b;
}
function groupExplanation(key){
  const o=sample.observation,h=o.hand.length,w=o.wounds.length,n=h+w;
  return {
    deck:t(`${n} 张来源牌 × 牌堆`,`${n} source cards × deck`),
    blind:t(`${n} 张来源牌 × 随机暗牌`,`${n} source cards × random rival card`),
    rival:t(`${n} 张来源牌 × ${o.enemy_wounds.length} 张伤牌`,`${n} source cards × ${o.enemy_wounds.length} rival wounds`),
    own:t(`${h} 手牌 × ${w} 伤牌 × 2 个方向`,`${h} hand × ${w} wounds × 2 directions`),
    skip_swap:t('用掉本次，保留下次','Use this chance; keep the next'),
    stop_swaps:t('放弃剩余换牌机会','Forgo all remaining chances')
  }[key];
}
function maskSlot(value,index){
  const slot=el(value?'button':'span','obs-mask-slot');
  if(value){slot.type='button';slot.dataset.action=index;slot.dataset.maskValue=1;slot.setAttribute('aria-label',t('候选','Candidate')+` [${index}]: `+actionName(sample.observation.legal_actions[index]));slot.setAttribute('aria-pressed',String(index===selected));}
  slot.append(bit(value,index,'action_mask'),el('small','',`[${index}]`));return slot;
}
function actionMatrix(key,zone){
  const o=sample.observation,targets=key==='rival'?o.enemy_wounds:o[zone==='hand'?'wounds':'hand'];
  const table=el('table','obs-action-matrix');
  table.append(el('caption','',key==='rival'?(zone==='hand'?t('手牌 → 对手伤牌','Hand → rival wounds'):t('伤牌 → 对手伤牌','Wounds → rival wounds')):(zone==='hand'?t('手牌 → 自己伤牌','Hand → own wounds'):t('伤牌 → 自己手牌','Wounds → own hand'))));
  const head=el('thead'),row=el('tr');row.append(el('th','obs-axis',t('来源↓ / 目标→','From↓ / To→')));
  targets.forEach(id=>{const cell=el('th','obs-target-label',cardName(id));cell.scope='col';cell.classList.toggle('is-red',[1,3].includes(Math.floor(id/13)));row.append(cell);});head.append(row);table.append(head);
  const body=el('tbody');o[zone].forEach((id,sourceIndex)=>{
    const row=el('tr'),label=el('th');label.scope='row';label.append(sourceLabel(zone,sourceIndex));row.append(label);
    targets.forEach((_,targetIndex)=>{
      const index=o.legal_actions.findIndex(a=>actionGroup(a)===key&&matchesSource(a,{zone,index:sourceIndex})&&a.target.index===targetIndex);
      const cell=el('td');cell.append(maskSlot(1,index));row.append(cell);
    });body.append(row);
  });table.append(body);return table;
}
function renderGroupValues(key){
  const values=el('div','obs-group-values');
  if(key==='rival'||key==='own'){
    for(const zone of ['hand','wounds'])values.append(actionMatrix(key,zone));
  }else if(key==='deck'||key==='blind'){
    for(const zone of ['hand','wounds']){
      values.append(el('p','obs-rack-title',zone==='hand'?t('手牌','Hand'):t('伤牌','Wounds')));
      const rack=el('div','obs-source-slots');
      groupIndices(key).filter(i=>sample.observation.legal_actions[i].source.zone===zone).forEach(i=>{
        const cell=el('div'),a=sample.observation.legal_actions[i];cell.append(sourceLabel(zone,a.source.index),maskSlot(1,i));rack.append(cell);
      });values.append(rack);
    }
  }else values.append(maskSlot(1,groupIndices(key)[0]));
  return values;
}
function updateMaskValues(){
  const actions=sample.observation.legal_actions,filter=host.querySelector('.obs-card-filter');
  const description=filter.querySelector('[role="status"]');
  const label=sourceFilter?(sourceFilter.zone==='hand'?t('手牌 ','Hand '):t('伤牌 ','Wound '))+cardName(sample.observation[sourceFilter.zone][sourceFilter.index]):'';
  description.textContent=sourceFilter?t(`选牌关联 · ${label} · 1 对应 / 0 不对应（仍合法）`,`Card match · ${label} · 1 matches / 0 other (still legal)`):t('action_mask · 1 合法 / 0 空槽。点自己的牌查看关联。','action_mask · 1 legal / 0 padding. Pick your card to see matches.');
  filter.querySelector('button').hidden=!sourceFilter;filter.classList.toggle('is-filtering',!!sourceFilter);
  host.querySelectorAll('.obs-action-group').forEach(group=>{
    const indices=groupIndices(group.dataset.group),active=group.dataset.group===actionGroup(selectedAction());
    group.classList.toggle('is-active',active);group.querySelector('.obs-group-button').setAttribute('aria-pressed',String(active));
    group.querySelector('.obs-group-mode').textContent=sourceFilter?t(`选牌关联 · ${label}`,`Card match · ${label}`):'action_mask';
    group.querySelector('.obs-group-count').textContent=sourceFilter?`${indices.filter(i=>matchesSource(actions[i],sourceFilter)).length} / ${indices.length}`:String(indices.length);
    group.querySelectorAll('.obs-mask-slot').forEach(slot=>{
      const index=Number(slot.dataset.action),value=sourceFilter?Number(matchesSource(actions[index],sourceFilter)):1,b=slot.querySelector('.obs-bit');
      b.textContent=value;b.classList.toggle('is-set',!!value);b.classList.toggle('is-inspected',index===selected);
      b.title=sourceFilter?`card_match[${index}] = ${value}; action_mask[${index}] = 1`:`action_mask[${index}] = 1`;
      slot.dataset.displayValue=value;slot.setAttribute('aria-pressed',String(index===selected));
      slot.setAttribute('aria-label',`[${index}] ${actionName(actions[index])} · action_mask = 1`+(sourceFilter?` · ${t('选牌关联','card match')} = ${value}`:''));
    });
  });
  host.querySelectorAll('[data-source-zone]').forEach(n=>n.setAttribute('aria-pressed',String(!!sourceFilter&&n.dataset.sourceZone===sourceFilter.zone&&Number(n.dataset.sourceIndex)===sourceFilter.index)));
}

function renderActions(){
  const actions=el('section','obs-actions');actions.append(heading(t('合法动作','Legal actions'),'512 · action_mask'));
  const count=el('p','obs-action-count');count.append(el('strong','',String(sample.candidateCount)),document.createTextNode(t(' 个合法候选 / 512 个槽位',' legal candidates / 512 slots')));actions.append(count);
  actions.append(el('p','obs-note',t('6 手牌 + 3 伤牌。每格对应一个动作，编号与左侧牌面联动。','6 hand cards + 3 wounds. Each cell is an action linked to the board.')));
  const overview=el('div','obs-mask-overview');
  for(const [value,first,last,zh,en] of [[1,0,sample.candidateCount-1,'可选候选','Legal candidates'],[0,sample.candidateCount,511,'空槽 · 不参与选择','Padding · excluded']]){
    const range=el('div','obs-mask-range');range.dataset.maskValue=value;
    range.append(el('code','',`action_mask[${first}–${last}] = ${value}`),el('span','',t(zh,en)));overview.append(range);
  }
  actions.append(overview);
  const filter=el('div','obs-card-filter'),description=el('p');description.setAttribute('role','status');description.setAttribute('aria-live','polite');
  const reset=el('button','',t('显示合法 mask','Show legal mask'));reset.type='button';reset.dataset.clearSource='';filter.append(description,reset);actions.append(filter);
  const groups=el('div','obs-action-groups');
  actionGroups.forEach(([key,zh,en])=>{
    const indices=groupIndices(key),group=el('div','obs-action-group'),b=el('button','obs-group-button');group.dataset.group=key;b.type='button';b.dataset.action=indices[0];
    const title=el('span','obs-group-title');title.append(el('strong','',t(zh,en)),el('span','obs-group-count',String(indices.length)));
    b.append(title,el('span','obs-group-explanation',groupExplanation(key)),el('span','obs-group-mode'));group.append(b,renderGroupValues(key));groups.append(group);
  });actions.append(groups);
  const padding=el('div','obs-mask-padding'),paddingText=el('div');
  paddingText.append(el('strong','',t(`其余 ${512-sample.candidateCount} 个空槽`,`${512-sample.candidateCount} padding slots`)),el('p','obs-note',t('这些位置没有对应动作，不参与选择。','No actions occupy these slots; exclude them from selection.')));
  const zeros=el('div','obs-mask-sample');zeros.setAttribute('aria-hidden','true');zeros.append(maskSlot(0,sample.candidateCount),maskSlot(0,sample.candidateCount+1),el('span','obs-mask-ellipsis','…'),maskSlot(0,511));
  padding.append(paddingText,zeros);actions.append(padding,el('p','obs-mask-key',t('索引从 0 开始，每个索引对应一个完整动作，不是一张牌；下次决策会重新生成。','Indices start at 0. Each identifies a complete action, not a card; they are rebuilt at the next decision.')));
  const controls=el('div','obs-action-controls'),label=el('label','',t('查看候选','Inspect candidate')),select=el('select','sz-select-control');select.id='obs-candidate';label.htmlFor=select.id;
  sample.observation.legal_actions.forEach((a,i)=>{const option=el('option','',`[${i}] ${actionName(a)}`);option.value=i;select.append(option);});select.value=selected;
  controls.append(label,select);actions.append(controls,el('div','obs-action-detail'));
  const details=el('details','obs-action-encoding');details.append(el('summary','',t('展开这个候选的 72 维编码','Expand this candidate’s 72 features')),el('div','obs-action-features'));actions.append(details);
  const rules=el('details','obs-action-rules');rules.append(el('summary','',t('其他阶段有哪些动作？','What is legal in other phases?')));
  const list=el('dl');
  for(const [zh,en,zhText,enText] of [
    ['进攻 / 防守','Attack / defend','从手牌与公开伤牌选合法组合；通常 3 张，4 / 5 张须成炸。防守不要求压过进攻。','Choose a legal combination from your hand and wounds: normally 3 cards; 4 / 5 must form a bomb. A defense need not beat the attack.'],
    ['换牌','Swap','用一张手牌或伤牌，换牌堆、对手暗牌或伤牌，或自己的另一牌区；每次也可跳过。','Exchange a hand or wound card with the deck, a rival hand or wound card, or your other rack. Each chance may be skipped.'],
    ['结算 / 小局结束','Resolved / game over','继续攻防 / 下一局。整场结束没有候选。','Advance / next game. A finished match has no candidates.']
  ]){list.append(el('dt','',t(zh,en)),el('dd','',t(zhText,enText)));}rules.append(list);actions.append(rules);return actions;
}
const extraFeatures=[
 ['手牌来源','Hand source'],['伤牌来源','Wound source'],['来源索引 / 11；跳过标志','Source index / 11; skip flag'],
 ['目标：牌堆','Target: deck'],['目标：盲换','Target: blind'],['目标：自己','Target: own'],['目标：对手','Target: rival'],
 ['目标点数 / 14','Target rank / 14'],['目标花色 / 3','Target suit / 3'],['目标牌 ID / 51','Target card ID / 51'],
 ['分数 / 7','Score / 7'],['牌型 / 7','Hand kind / 7'],['主点数 / 14','Top rank / 14'],['出牌数 / 5','Play size / 5'],['自己的 A 局','Own Ace challenge']
];
function updateAction(){
  const a=selectedAction(),o=sample.observation,detail=host.querySelector('.obs-action-detail');if(!detail)return;
  host.querySelector('#obs-candidate').value=selected;
  updateMaskValues();
  const inspection=host.querySelector('.obs-board-inspection');inspection.dataset.actionIndex=selected;
  inspection.replaceChildren(el('span','',t('候选','Candidate')+` [${selected}]`),el('strong','',actionName(a)));
  host.querySelectorAll('.is-source,.is-target').forEach(n=>n.classList.remove('is-source','is-target'));
  detail.replaceChildren(el('code','obs-selected-mask',`action_mask[${selected}] = 1`),el('strong','',`[${selected}] ${actionName(a)}`));
  const highlight=(zone,id,cls)=>{host.querySelectorAll(`.obs-playing-card[data-board-zone="${zone}"][data-card="${id}"],.obs-zone[data-zone="${zone}"] .obs-bit[data-index="${zone*52+id}"]`).forEach(n=>n.classList.add(cls));};
  if(a.type==='swap'){
    const id=o[a.source.zone][a.source.index],zone=a.source.zone==='hand'?0:1;
    highlight(zone,id,'is-source');const route=el('div','obs-action-route');route.append(card(id),el('span','','→'));
    const z=a.target;
    if(z.zone==='deck'||z.zone==='blind'){host.querySelector(`[data-target="${z.zone}"]`).classList.add('is-target');route.append(back());}
    else{const own=z.who===o.player,c=own?o[z.zone][z.index]:o.enemy_wounds[z.index];highlight(own?(z.zone==='hand'?0:1):2,c,'is-target');route.append(card(c));}
    detail.append(route,el('p','obs-note',z.zone==='blind'?t('换回的暗牌由规则随机抽取，候选不指定也看不到那张牌。','The rules choose a random rival card; the candidate neither selects nor reveals it.'):z.zone==='deck'?t('从牌堆补一张，模型不知道会抽到什么。','Draw a replacement from the deck; the model cannot see which card comes next.'):t('绿色框是来源，粉色框是目标。','Green outlines the source; pink outlines the target.')));
  }else detail.append(el('p','obs-note',a.type==='skip_swap'?t('本次不换，剩余机会从 2 变为 1。','Do not swap now; chances decrease from 2 to 1.'):t('不再换牌，直接结束这次换牌阶段。','Forgo both remaining chances and end this swap phase.')));
  const features=host.querySelector('.obs-action-features'),f=sample.candidates[selected];features.replaceChildren();
  features.append(heading(t('出牌 / 换出牌','Played / outgoing cards'),'[0–51] · 52'));
  features.append(cardGrid(f.slice(0,52),0,t('出牌或换出的来源牌','Played cards or the outgoing source card')));
  features.append(heading(t('动作类型','Action type'),'[52–56] · 5'));
  const types=el('div','obs-candidate-types');[['出牌','Play'],['换牌','Swap'],['结束 / 跳过','End / skip'],['继续','Advance'],['下一局','Next game']].forEach((names,i)=>{const n=el('div');n.append(el('span','',t(...names)),bit(f[52+i],52+i,t(...names)));types.append(n);});features.append(types);
  features.append(el('p','obs-note',t('跳过与结束共用类型位 [54]；[59] = 1 区分跳过。','Skip and end share type bit [54]; [59] = 1 distinguishes skip.')));
  const table=el('table','obs-extra-table');const cap=el('caption','',t('其余 15 维 · 不适用的字段为 0','Remaining 15 features · unused fields are 0'));table.append(cap);
  extraFeatures.forEach((names,i)=>{const row=el('tr');row.append(el('td','obs-code',`[${57+i}]`),el('th','',t(...names)),el('td','',number(f[57+i])));table.append(row);});features.append(table);
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
  const note=el('p','obs-note',t('真实换牌局面 · 第 1 局，第 4 轮 · 你是席位 1','Saved swap example · game 1, round 4 · you are seat 1'));
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
  view.append(renderActions());
  const layout=el('div','obs-layout');layout.append(renderBoard(),view);host.replaceChildren(layout);openDetails.forEach(cls=>{const node=host.querySelector('details.'+cls);if(node)node.open=true;});updateAction();updateZone();

}
if(host){
  function inspect(index){
    selected=index;
    if(sourceFilter)sourceFilter=selectedAction().type==='swap'?{...selectedAction().source}:null;
    updateAction();
  }
  function revealActions(){
    const actions=host.querySelector('.obs-actions'),rect=actions.getBoundingClientRect();
    if(rect.top>=innerHeight||rect.bottom<=0)actions.scrollIntoView({block:'start',behavior:'instant'});
  }
  host.addEventListener('click',event=>{
    const action=event.target.closest('[data-action]'),zone=event.target.closest('[data-zone-link]'),source=event.target.closest('[data-source-zone]'),target=event.target.closest('button[data-target],button[data-rival-wound]');
    if(event.target.closest('[data-clear-source]')){sourceFilter=null;updateAction();}
    if(source){
      const next={zone:source.dataset.sourceZone,index:Number(source.dataset.sourceIndex)};
      if(sourceFilter?.zone===next.zone&&sourceFilter.index===next.index)sourceFilter=null;
      else{
        sourceFilter=next;const choices=sample.observation.legal_actions;
        const sameGroup=choices.findIndex(a=>matchesSource(a,next)&&actionGroup(a)===actionGroup(selectedAction()));
        selected=sameGroup>=0?sameGroup:choices.findIndex(a=>matchesSource(a,next));
      }
      updateAction();if(source.closest('.obs-board'))revealActions();
    }
    if(target){
      const current=sourceFilter||(selectedAction().source?{...selectedAction().source}:{zone:'hand',index:0});
      const index=sample.observation.legal_actions.findIndex(a=>matchesSource(a,current)&&(target.dataset.target?a.target.zone===target.dataset.target:a.target.who!==sample.player&&a.target.zone==='wounds'&&a.target.index===Number(target.dataset.rivalWound)));
      if(index>=0){sourceFilter=current;inspect(index);revealActions();}
    }
    if(action){
      const matching=sourceFilter&&action.classList.contains('obs-group-button')?groupIndices(action.closest('[data-group]').dataset.group).find(i=>matchesSource(sample.observation.legal_actions[i],sourceFilter)):undefined;
      inspect(matching??Number(action.dataset.action));
    }
    if(zone){const next=Number(zone.dataset.zoneLink);activeZone=activeZone===next?null:next;updateZone();}
  });
  host.addEventListener('change',event=>{if(event.target.id==='obs-candidate')inspect(Number(event.target.value));});
  try{
    const response=await fetch(new URL('./observation-example.json?v=2',import.meta.url));
    if(!response.ok)throw Error('Observation example unavailable');sample=await response.json();paint();
    let language=document.documentElement.lang;
    new MutationObserver(()=>{if(language!==document.documentElement.lang){language=document.documentElement.lang;paint();}}).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
  }catch{/* The static observation/action summary remains readable offline. */}
}
