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
let sample;
function paint(){
  if(!sample||!host)return;
  const opened=host.querySelector('details')?.open||false;
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
    group.append(heading(t(...names),`${count} / 52`));
    const grid=el('div','obs-card-grid');grid.setAttribute('role','img');
    const present=[];
    sample.state.slice(zone*52,(zone+1)*52).forEach((n,c)=>{if(n)present.push(suits[Math.floor(c/13)]+ranks[c%13]);});
    grid.setAttribute('aria-label',t(...names)+': '+(present.join(', ')||t('空','empty')));
    grid.append(el('span','obs-rank',''));
    ranks.forEach(rank=>grid.append(el('span','obs-rank',rank)));
    suits.forEach((suit,s)=>{
      grid.append(el('span','obs-suit'+(s===1||s===3?' is-red':''),suit));
      ranks.forEach((rank,r)=>{const i=zone*52+s*13+r;grid.append(bit(sample.state[i],i,suit+rank));});
    });
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
  const details=el('details','obs-meta');details.open=opened;
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
  const actions=el('section','obs-actions');
  actions.append(heading(t('合法动作','Legal actions'),'512 · action_mask'));
  const count=el('p','obs-action-count');count.append(el('strong','',String(sample.candidateCount)),document.createTextNode(t(' 个合法候选 / 512 个槽位',' legal candidates / 512 slots')));actions.append(count);
  const mask=el('div','obs-mask');mask.setAttribute('role','img');mask.setAttribute('aria-label',t('动作掩码：前 74 个为 1，其余 438 个为 0。','Action mask: the first 74 values are 1; the remaining 438 are 0.'));
  for(let i=0;i<512;i++)mask.append(bit(+(i<sample.candidateCount),i,'action_mask'));
  actions.append(mask,legend(t('可选','legal'),t('空槽','padding')),
    el('p','obs-note',t('每个候选 72 维。动作是本次候选表的索引，每次决策重新生成。','Each candidate has 72 features. Actions index the current candidate list, rebuilt at each decision.')));
  view.append(actions);host.replaceChildren(view);
}
if(host){
  try{
    const response=await fetch(new URL('./observation-example.json',import.meta.url));
    if(!response.ok)throw Error('Observation example unavailable');sample=await response.json();paint();
    let language=document.documentElement.lang;
    new MutationObserver(()=>{if(language!==document.documentElement.lang){language=document.documentElement.lang;paint();}}).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
  }catch{/* The static observation/action summary remains readable offline. */}
}
