import {catalog} from '../policies/catalog.mjs';
import {registryAuthors} from '../policies/authors.mjs';
let data,entries,authors,error;
const en=()=>document.documentElement.lang==='en',t=(zh,english)=>en()?english:zh;
function cell(row,text,tag='td'){const node=document.createElement(tag);node.textContent=text;row.append(node);const column=row.children.length;const labels={3:t('基准 Elo','Reference Elo'),4:t('胜率','Win rate'),5:t('对局','Games'),6:t('p95 上界','Max p95')};if(labels[column])node.dataset.label=labels[column];return node;}
function paint(){
  if(error){document.getElementById('arena-summary').textContent=t('暂时无法加载天梯，请刷新重试。','Unable to load the ladder. Please retry.');return;}
  if(!data||!entries)return;
  const body=document.getElementById('arena-rows');body.replaceChildren();
  const ranked=data.leaderboard.map(r=>({...r,entry:entries.find(e=>e.manifest.id===r.id)})).filter(r=>r.entry);
  for(const entry of entries)if(!ranked.some(r=>r.id===entry.manifest.id))ranked.push({id:entry.manifest.id,entry});
  ranked.forEach((r,index)=>{
    const m=r.entry.manifest,recorded=data.policies.find(p=>p.id===m.id),current=recorded&&JSON.stringify(recorded)===JSON.stringify(m)&&(r.reference||r.games>0);
    const row=document.createElement('tr');cell(row,current?String(index+1):'—');
    const name=cell(row,'');const strong=document.createElement('strong');strong.textContent=m.name;name.append(strong);
    const small=document.createElement('small');small.textContent=`${m.type==='onnx'?'NN':'JS'} · `;
    const author=document.createElement('a'),handle=authors.get(m.id);if(!handle)throw Error('Missing policy author');
    author.className='arena-author';author.href=`https://github.com/${handle}`;author.textContent=`@${handle}`;small.append(author);name.append(small);
    cell(row,current?String(r.elo):'—');cell(row,current&&r.games?(100*r.wins/r.games).toFixed(1)+'%':'—');cell(row,current&&r.games>0?String(r.games):'—');cell(row,current&&Number.isFinite(r.latencyP95Ms)?r.latencyP95Ms.toFixed(1)+' ms':'—');
    if(current&&r.reference){const label=document.createElement('small');label.textContent=t('固定基准','Fixed reference');name.append(label);}
    if(!current||r.provisional){const label=document.createElement('small');label.textContent=current?t('暂定','Provisional'):t('待评估','Unrated');name.append(label);}
    const action=cell(row,'');const a=document.createElement('a');a.className='arena-play';a.href=`index.html?lang=${en()?'en':'zh-CN'}&policy=${encodeURIComponent(m.id)}`;a.textContent=t('挑战 ↗','Play ↗');a.setAttribute('aria-label',t('挑战 ','Play ')+m.name);action.append(a);body.append(row);
  });
  const games=ranked.filter(r=>!r.reference).reduce((n,r)=>n+(r.games||0),0);
  document.getElementById('arena-summary').textContent=t(`${entries.length} 个策略 · ${games.toLocaleString()} 评分局`,`${entries.length} policies · ${games.toLocaleString()} rated games`);
  document.getElementById('arena-runtime').textContent=`${data.protocol.opponents.length} × ${data.protocol.gamesPerOpponent} ${t('局 / 策略','games / policy')} · ${data.createdAt.slice(0,10)}. `+t('延迟为 CI 各组 p95 的最大值，不代表手机表现。','Latency is the highest opponent-batch p95 on CI, not a mobile benchmark.');
}
async function readJSON(path){const response=await fetch(new URL(path,import.meta.url),{cache:'no-cache'});if(!response.ok)throw Error('Arena data unavailable');return response.json();}
try{[entries,data,authors]=await Promise.all([catalog(),readJSON('./results/leaderboard.json'),readJSON('../policies/registry.json').then(registryAuthors)]);paint();}catch(e){error=e;paint();}
let language=document.documentElement.lang;new MutationObserver(()=>{if(language!==document.documentElement.lang){language=document.documentElement.lang;paint();}}).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});

// Keep links into the former RL page usable, including collapsed results.
function revealResearchAnchor(){
  let id;try{id=decodeURIComponent(location.hash.slice(1));}catch{return;}
  const target=document.getElementById(id),details=target?.closest('details');
  if(details){details.open=true;requestAnimationFrame(()=>target.scrollIntoView());}
}
addEventListener('hashchange',revealResearchAnchor);revealResearchAnchor();
