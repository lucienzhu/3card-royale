'use strict';
const $=id=>document.getElementById(id),DATA=PROBABILITY_DATA;
const CATEGORIES=[{id:5,name:'同花顺',color:'#d7a944'},{id:4,name:'炸弹',color:'#b66a53'},{id:3,name:'同花',color:'#527b62'},{id:2,name:'顺子',color:'#72959a'},{id:1,name:'对子',color:'#8c8fa8'},{id:0,name:'高牌',color:'#aeb5ac'}];
let level=2,n=8,ranking='0.3.2';
const dataFor=()=>ranking==='0.3.2'?DATA:DATA.previous_ranking;
const categories=()=>ranking==='0.3.2'?[CATEGORIES[1],CATEGORIES[0],...CATEGORIES.slice(2)]:CATEGORIES;
const sfAvailable=e=>(e.sf_available_count??e.highest_counts[5])/e.denominator;
const rankLabel=r=>({11:'J',12:'Q',13:'K',14:'A'}[r]||String(r));
const pct=p=>p===null?'未计算':(100*p).toFixed(2)+'%';
const combinations=n=>n*(n-1)*(n-2)/6;
const exactMode=l=>dataFor().exact.find(x=>x.wild_level===l);
const exactRow=(l,k)=>exactMode(l).rows.find(x=>x.n===k);
const modeLabel=()=>level===0?'无逢人配 · 普通牌':'♥'+rankLabel(level)+' 逢人配 · '+rankLabel(level)+' 级';
function available(l,k){
 const e=exactRow(l,k),mc=dataFor().monte_carlo.find(x=>x.wild_level===l)?.rows.find(x=>x.n===k);
 return categories().map(c=>({category:c.id,probability:c.id===5?sfAvailable(e):c.id===4?e.trips_available_count/e.denominator:mc?mc.available_counts[c.id]/DATA.samples:null,estimated:c.id<4&&!!mc}));
}
function element(tag,className,text){const e=document.createElement(tag);if(className)e.className=className;if(text!==undefined)e.textContent=text;return e;}
function setN(next){const chartFocused=document.activeElement?.classList.contains('pool-row');n=Number(next);render();if(chartFocused)$('highest-chart').querySelector('[data-n="'+n+'"]').focus({preventScroll:true});}
for(let l=2;l<=14;l++){const o=element('option','',rankLabel(l)+' 级 · ♥'+rankLabel(l));o.value=l;$('level-select').append(o);}
const ordinary=element('option','','无逢人配 · 普通牌对照');ordinary.value=0;$('level-select').append(ordinary);$('level-select').value=2;
$('level-select').addEventListener('change',e=>{level=Number(e.target.value);render();});
$('order-select').addEventListener('change',e=>{ranking=e.target.value;render();});
for(let k=8;k<=13;k++){const b=element('button','',k+' 张');b.type='button';b.dataset.n=k;b.addEventListener('click',()=>setN(k));$('pool-options').append(b);}
for(const c of categories()){const item=element('span','legend-item'),swatch=element('i','swatch');swatch.style.setProperty('--color',c.color);item.append(swatch,element('span','',c.name));$('category-legend').append(item);}
function renderHighest(){
 $('highest-chart').replaceChildren();const rows=exactMode(level).rows;
 for(const row of rows){const b=element('button','pool-row');b.type='button';b.dataset.n=row.n;b.setAttribute('aria-pressed',String(row.n===n));b.setAttribute('aria-label',row.n+' 张，最高牌型：'+categories().map(c=>c.name+' '+pct(row.highest_counts[c.id]/row.denominator)).join('，'));b.addEventListener('click',()=>setN(row.n));
  const label=element('span','pool-label',row.n+' 张');label.append(element('small','',combinations(row.n)+' 种选法'));const stack=element('span','stack');stack.setAttribute('aria-hidden','true');
  for(const c of categories()){const probability=row.highest_counts[c.id]/row.denominator,seg=element('span','segment'+(c.id===5?' gold':'')+(probability<.2?' small-label':''));seg.style.width=100*probability+'%';seg.style.setProperty('--color',c.color);seg.title=c.name+'：'+pct(probability);if(probability>=.12)seg.append(element('span','',pct(probability)));stack.append(seg);}
  b.append(label,stack);$('highest-chart').append(b);
 }
 const row=exactRow(level,n);$('selected-breakdown').replaceChildren();
 for(const c of categories()){const item=element('div',''),label=element('div','type'),s=element('i','swatch');s.style.setProperty('--color',c.color);label.append(s,document.createTextNode(c.name));const value=element('div','percent',pct(row.highest_counts[c.id]/row.denominator));value.dataset.category=c.id;item.append(label,value);$('selected-breakdown').append(item);}
}
function renderAvailable(){
 const values=available(level,n),e=exactRow(level,n);$('availability-chart').replaceChildren();
 for(const c of categories()){const a=values.find(x=>x.category===c.id),best=e.highest_counts[c.id]/e.denominator,item=element('div','availability-item');item.dataset.category=c.id;
  const name=element('div','availability-type',c.name);name.append(element('small','',a.probability===null?'可用率未计算':a.estimated?'可用率估计':'可用率精确'));
  const tracks=element('div','dual-track');for(const [p,klass]of [[a.probability,'fill'],[best,'fill best']]){const track=element('div','track'),fill=element('div',klass);fill.style.width=p===null?'0%':100*p+'%';if(p===null)track.style.background='repeating-linear-gradient(45deg,#e2e6db,#e2e6db 3px,#f4f1e8 3px,#f4f1e8 6px)';track.append(fill);tracks.append(track);}
  const value=element('div','availability-value',(a.estimated?'≈':'')+pct(a.probability));value.dataset.available=a.probability===null?'unknown':a.probability;value.append(element('small','',pct(best)));item.append(name,tracks,value);$('availability-chart').append(item);
 }
 $('availability-method').textContent=n+' 张 · '+modeLabel();
 $('availability-note').textContent=level===0||level===2?'上方为可以出该型，下方为最高是该型。估计中的“≈100%”表示接近或舍入，不能一律当成理论必然。':'本级数的同花顺与炸弹可用率为精确值。其余四项尚未计算；切回 2 级或无逢人配即可查看对应估计。下方金色条仍为本级数的精确最高型概率。';
}
const NS='http://www.w3.org/2000/svg';
function svgEl(tag,attrs,text){const e=document.createElementNS(NS,tag);for(const [k,v]of Object.entries(attrs||{}))e.setAttribute(k,v);if(text!==undefined)e.textContent=text;return e;}
function renderTrend(){
 const svg=$('trend-svg'),width=Math.max(240,svg.parentElement.clientWidth),height=250,left=39,right=13,top=17,bottom=31,w=width-left-right,h=height-top-bottom;
 svg.setAttribute('viewBox',`0 0 ${width} ${height}`);svg.setAttribute('height',height);svg.replaceChildren();svg.append(svgEl('title',{},'同花顺概率随可用牌从八张增加到十三张的变化'));
 const x=k=>left+(k-8)/5*w,y=p=>top+(1-p)*h;
 for(const p of [0,.25,.5,.75,1]){svg.append(svgEl('line',{x1:left,y1:y(p),x2:width-right,y2:y(p),class:'grid'}),svgEl('text',{x:left-8,y:y(p)+4,'text-anchor':'end'},100*p+'%'));}
 for(let k=8;k<=13;k++)svg.append(svgEl('text',{x:x(k),y:height-7,'text-anchor':'middle'},k+' 张'));
 svg.append(svgEl('line',{x1:x(n),x2:x(n),y1:top,y2:top+h,stroke:'#acbba0','stroke-dasharray':'3 4'}));
 const base=exactMode(0).rows.map(r=>sfAvailable(r)),current=exactMode(level).rows.map(r=>sfAvailable(r));
 const series=[{label:'无逢人配',color:'#899185',values:base}];
 if(level!==0)series.push({label:'随机牌池 · ♥'+rankLabel(level),color:'#184838',values:current});
 if(level===2)series.push({label:'已持有 ♥2 · 条件概率',color:'#b18b30',values:DATA.wild_present_straight_flush.map(r=>r.numerator/r.denominator)});
 $('trend-legend').replaceChildren();
 for(const s of series){svg.append(svgEl('polyline',{points:s.values.map((p,i)=>x(i+8)+','+y(p)).join(' '),class:'series',stroke:s.color}));s.values.forEach((p,i)=>{const dot=svgEl('circle',{cx:x(i+8),cy:y(p),r:i+8===n?4.5:3,fill:i+8===n?s.color:'#f4f1e8',stroke:s.color,class:'dot'});dot.append(svgEl('title',{},s.label+'，'+(i+8)+' 张：'+pct(p)));svg.append(dot);});const legend=element('span',''),line=element('i','');line.style.setProperty('--color',s.color);legend.append(line,document.createTextNode(s.label));$('trend-legend').append(legend);}
 $('conditional-title').textContent=level===2?n+' 张，而且已持有 ♥2':level===0?'普通牌对照':'本级数的随机持有概率';
 if(level===2){const c=DATA.wild_present_straight_flush.find(r=>r.n===n);$('conditional-value').textContent=pct(c.numerator/c.denominator);$('conditional-note').textContent='此时能出同花顺的概率。条件是已经拿到逢人配；不要把它当作随机牌池的无条件概率。';}
 else if(level===0){$('conditional-value').textContent=pct(base[n-8]);$('conditional-note').textContent=n+' 张全部按普通牌时，能出同花顺的概率。♥级牌不使用逢人配能力。';}
 else{$('conditional-value').textContent=pct(n/52);$('conditional-note').textContent='从完整 52 张牌随机取 '+n+' 张时，持有 ♥'+rankLabel(level)+' 的概率。已持有时的同花顺条件率只计算了 2 级，此处不显示其他级数的条件曲线。';}
 $('wild-presence').textContent=level===0?'同花顺允许 A23 / QKA，不允许 KA2。':'随机持有逢人配：'+n+'/52 = '+pct(n/52)+'。';
}
function renderTables(){
 $('table-mode').textContent=ranking+' · '+modeLabel();const high=$('highest-table').tBodies[0],avail=$('available-table').tBodies[0];high.replaceChildren();avail.replaceChildren();for(const [id,labels]of [['highest-table',['可用牌','组合数',...categories().map(c=>c.name)]],['available-table',['可用牌',...categories().map(c=>c.name)]]]){const head=$(id).tHead.rows[0];head.replaceChildren();for(const label of labels){const th=element('th','',label);th.scope='col';head.append(th);}}
 for(const row of exactMode(level).rows){const tr=element('tr',row.n===n?'selected':'');tr.dataset.n=row.n;tr.append(element('th','',row.n+' 张'),element('td','',combinations(row.n)));tr.firstChild.scope='row';for(const c of categories()){const td=element('td','',pct(row.highest_counts[c.id]/row.denominator));td.dataset.category=c.id;tr.append(td);}high.append(tr);
  const ar=element('tr',row.n===n?'selected':'');ar.dataset.n=row.n;ar.append(element('th','',row.n+' 张'));ar.firstChild.scope='row';for(const a of available(level,row.n)){const td=element('td','',(a.estimated?'≈':'')+(a.probability===null?'—':pct(a.probability)));td.dataset.category=a.category;ar.append(td);}avail.append(ar);
 }
 $('table-help').textContent='每组三张按最高声明评分。最高型各行合计 100%，四舍五入可能差 0.01%；可用率各列重叠，不能相加。≈ 为 200 万组抽样估计，— 为未计算。';
}
function render(){
 const e=exactRow(level,n),top=categories()[0],p=e.highest_counts[top.id]/e.denominator,base=exactRow(0,n).highest_counts[top.id]/e.denominator;
 $('hero-label').textContent=n+' 张 · 最高为'+top.name;$('hero-value').textContent=pct(p);$('hero-detail').textContent=level===0?'普通牌 · '+combinations(n)+' 种三张选法':'较普通牌提升 '+((p-base)*100).toFixed(2)+' 个百分点';
 $('category-legend').replaceChildren();for(const c of categories()){const item=element('span','legend-item'),swatch=element('i','swatch');swatch.style.setProperty('--color',c.color);item.append(swatch,element('span','',c.name));$('category-legend').append(item);}
 $('controls-note').textContent=ranking+' · '+(ranking==='0.3.2'?'炸弹 > 同花顺 > 同花 > 顺子 > 对子 > 高牌':'同花顺 > 炸弹 > 同花 > 顺子 > 对子 > 高牌')+' · '+modeLabel()+' · 52 张无放回随机牌池 · '+n+' 选 3 = '+combinations(n)+' 种组合 · 只看一次出牌。';
 document.querySelectorAll('#pool-options button').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.n)===n)));
 renderHighest();renderAvailable();renderTrend();renderTables();
 window.gkProbabilityState={level,n,ranking};
}
if(location.protocol==='file:')$('simulator-link').href='../2026-10-13-gk-v032/index.html?version=0.3.2';
let resizeTimer;window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(renderTrend,80);});
render();
