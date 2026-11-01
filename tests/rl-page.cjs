'use strict';
// Public experimental claims must agree with the saved reports and deployment artifact.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=read('arena.html'),training=JSON.parse(read('docs/experiments/nn-policy-v1/training.json'));
const evaluations=JSON.parse(read('docs/experiments/nn-policy-v1/evaluation.json'));
const difficulty=JSON.parse(read('docs/experiments/difficulty-v1/evaluation.json'));
const profile=JSON.parse(read('docs/experiments/nn-policy-v1/browser-profile.json'));
const comparison=JSON.parse(read('models/structured-policy/evaluation.json'));
const allCopy=JSON.parse(html.match(/window.SC_COPY=(\{[\s\S]*?\});<\/script>/)[1]);
const copy={...allCopy,...Object.fromEntries(Object.entries(allCopy).filter(([key])=>key.startsWith('rl-')).map(([key,value])=>[key.slice(3),value]))};
const rows=[...html.matchAll(/<tr data-model="([^"]+)"([^>]*)>([\s\S]*?)<\/tr>/g)];
assert.equal(rows.length,training.models.length+5);
assert.equal((html.match(/class="rl-benchmark"/g)||[]).length,1);
assert(!html.includes('details id="experiments"'));
assert(!Object.values(allCopy).flat().some(text=>/legacy|earlier evaluations|NN v[12]|历史实验/i.test(text)));
const rowFor=id=>{const row=rows.find(r=>r[1]===id);assert(row,'Missing policy '+id);return row[3];};
function result(id,opponent,wins,games){
 const cell=rowFor(id).match(new RegExp(`<td data-opponent="${opponent}">([\\s\\S]*?)</td>`))?.[1];
 assert(cell,'Missing result cell '+id+'/'+opponent);
 assert(cell.includes((100*wins/games).toFixed(1)+'%'),id+'/'+opponent+' win rate');
 assert(cell.includes(`${wins} / ${games.toLocaleString('en-US')}`),id+'/'+opponent+' wins/games');
}
for(const [_,id,attrs,row] of rows){
 if(['sdk-code','autoregressive','godlike'].includes(id))continue;
 if(id==='easy'){
  const ev=difficulty.results.find(r=>r.policy==='easy'&&r.opponent==='code');
  result(id,'sdk',ev.wins,ev.games);
  assert(row.includes('class="rl-size"><span class="rl-metric-label">ONNX</span>—'),'Easy has no ONNX');
  for(const label of copy.easy)assert(label.includes(String(difficulty.attention_budget)));
  continue;
 }
 if(id==='random'){
  const ev=JSON.parse(read('docs/experiments/nn-policy-v1/random-baseline.json'));
  result(id,'sdk',ev.wins,ev.games);
  assert(row.includes('class="rl-size"><span class="rl-metric-label">ONNX</span>—'),'random has no ONNX');
  assert.equal(ev.episodes.length,ev.games);
  assert.equal(ev.episodes.filter(e=>!e.truncated&&e.reward>0).length,ev.wins);
  assert.equal(ev.episodes.filter(e=>e.truncated).length,ev.truncated);
  assert.equal(ev.completed+ev.truncated,ev.games);
  assert.equal(ev.win_rate,ev.wins/ev.completed);
  assert.equal(ev.invalid_actions,0);
  continue;
 }
 const model=training.models.find(m=>String(m.id||m.width)===id);
 assert(model,'Unknown model '+id);
 const ev=evaluations.find(e=>e.model===`mlp-${id}.onnx`);
 assert(ev,'Missing evaluation '+id);
 result(id,'sdk',ev.wins,ev.games);
 assert(row.includes((model.bytes/1e6).toFixed(2)+' <small>MB</small>'),id+' size');
 const hidden=model.hidden||[model.width,model.width/2];
 assert(row.includes(`${hidden[0]} <span aria-hidden="true">→</span> ${hidden[1]}`),id+' architecture');
 const latency=id==='256'?comparison.leaderboard.find(r=>r.id==='nn-256-v1').latencyP95Ms:profile.results.find(r=>r.id===id&&r.candidates===220).p95_ms;
 assert(row.includes(latency.toFixed(2)+' ms'),id+' recorded p95');
}
const current=JSON.parse(read('models/structured-policy/training.json'));
assert(html.includes('models/structured-policy/policy.onnx'));
assert(html.includes('index.html?policy=nn-256-v1'));
assert(html.includes('index.html?policy=nn-structured-v2'));
assert(html.includes(current.parameters.toLocaleString('en-US')));
assert(html.includes((current.bytes/1e6).toFixed(2)+' MB'));
assert(html.includes('Epoch '+current.best_epoch));
for(const [a,b] of [['nn-structured-v2','code-table-v1'],['nn-256-v1','code-table-v1'],['nn-structured-v2','nn-256-v1']]){
 const games=comparison.records.filter(r=>[r.left,r.right].includes(a)&&[r.left,r.right].includes(b));
 assert.equal(games.length,1000);assert(games.every(r=>r.status==='complete'));
 const wins=games.filter(r=>r.winner===a).length;
 if(b==='code-table-v1')result(a==='nn-256-v1'?'256':'autoregressive','code',wins,games.length);
 else for(const text of allCopy.benchmarkHeadToHead)assert(text.includes(`${(wins/10).toFixed(1)}% · ${wins} / 1,000`));
}
assert(rowFor('autoregressive').includes((current.bytes/1e6).toFixed(2)+' <small>MB</small>'));
assert(rowFor('autoregressive').includes(comparison.leaderboard.find(r=>r.id==='nn-structured-v2').latencyP95Ms.toFixed(2)+' ms'));
for(const m of html.matchAll(/data-sc="([^"]+)"/g)){
 if(['skip','name','tag','learn','identity','play','menu'].includes(m[1]))continue;
 assert(copy[m[1]]?.length===2,'Missing translation: '+m[1]);
}
assert(copy.method[0].includes('模仿学习')&&copy.method[1].toLowerCase().includes('imitation learning'));
assert.equal(Object.values(allCopy).flat().some(text=>/Legacy baseline|NN v1|NN v2/.test(text)),false);
console.log('RL page: one bilingual benchmark; both modeling approaches, model sizes and latency scopes match saved reports.');

const easy=require('../sdk/easy-policy.js');
assert.equal(difficulty.attention_budget,easy.budget);
assert.equal(difficulty.easy_version,easy.version);
for(const r of difficulty.results){
 assert.equal(r.completed,r.games);assert.equal(r.truncated,0);assert.equal(r.invalid_actions,0);
 assert.equal(r.episodes.filter(e=>e.reward>0).length,r.wins);
 if(r.policy==='easy')for(const lang of copy.difficultyNote)assert(lang.includes((r.win_rate*100).toFixed(1)+'%'));
}
console.log('Difficulty page: Easy head-to-head figures match the saved paired evaluation.');

const restored=JSON.parse(read('docs/experiments/difficulty-v1/table-code-evaluation.json'));
for(const id of ['easy','sdk-code','nn']){
 const ev=restored.results.find(r=>id==='sdk-code' ? r.policy==='table-code'&&r.opponent===id : r.policy===id&&r.opponent==='table-code');
 assert(ev,'Missing restored Hard evaluation: '+id);
 const wins=id==='sdk-code'?ev.games-ev.wins:ev.wins;
 if(id==='nn')for(const text of allCopy.cohortC){assert(text.includes((100*wins/ev.games).toFixed(1)+'%'));assert(text.includes(`${wins} / ${ev.games.toLocaleString('en-US')}`));}
 else result(id,'code',wins,ev.games);
}
for(const ev of restored.results){
 assert.equal(ev.games,1000);assert.equal(ev.completed,ev.games);
 assert.equal(ev.truncated,0);assert.equal(ev.invalid_actions,0);
 assert.equal(ev.episodes.length,ev.games);
 assert.equal(ev.episodes.filter(e=>e.reward>0).length,ev.wins);
 assert.equal(ev.win_rate,ev.wins/ev.games);
}
const oldControl=difficulty.results.find(r=>r.policy==='nn'&&r.opponent==='code');
const newControl=restored.results.find(r=>r.policy==='nn'&&r.opponent==='sdk-code');
assert.deepEqual(newControl.episodes.map(e=>[e.seed,e.seat,e.first,e.reward]),oldControl.episodes.map(e=>[e.seed,e.seat,e.first,e.reward]));
console.log('Restored Hard: page agrees with all 4,000 saved games; 1,000 control outcomes reproduce the frozen SDK baseline.');
// The Godlike row uses its own report, not the regular-information benchmark.
const godlike=JSON.parse(read('docs/experiments/godlike-v1/evaluation.json'));
const godlikeRow=html.match(/<tr[^>]*data-godlike-policy="godlike"[\s\S]*?<\/tr>/)[0];
assert(godlikeRow.includes((godlike.win_rate*100).toFixed(1)+'%'));
assert(godlikeRow.includes(`${godlike.wins} / ${godlike.games.toLocaleString('en-US')}`));
assert.equal(godlike.records.length,godlike.games);
assert.equal(godlike.records.filter(r=>r.won).length,godlike.wins);
assert(copy.godlikeNote[0].includes('非同等信息')&&copy.godlikeNote[1].includes('extra information'));
console.log('Godlike table: privileged-information result matches all 1,000 recorded games.');
