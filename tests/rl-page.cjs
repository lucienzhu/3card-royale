'use strict';
// Public experimental claims must agree with the saved reports and deployment artifact.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=read('rl.html'),training=JSON.parse(read('docs/experiments/nn-policy-v1/training.json'));
const evaluations=JSON.parse(read('docs/experiments/nn-policy-v1/evaluation.json'));
const manifest=JSON.parse(read('models/nn-policy/manifest.json'));
const difficulty=JSON.parse(read('docs/experiments/difficulty-v1/evaluation.json'));
const copy=JSON.parse(html.match(/window.SC_COPY=(\{[\s\S]*?\});<\/script>/)[1]);
const rows=[...html.matchAll(/<tr data-model="([^"]+)"([^>]*)>([\s\S]*?)<\/tr>/g)];
assert.equal(rows.length,training.models.length+2);
for(const [_,id,attrs,row] of rows){
 if(id==='easy'){
  const ev=difficulty.results.find(r=>r.policy==='easy'&&r.opponent==='code');
  assert(row.includes((ev.win_rate*100).toFixed(1)+'%'),'Easy win rate');
  assert(row.includes(`${ev.wins} / ${ev.games.toLocaleString('en-US')}`),'Easy wins/games');
  assert(row.includes('class="rl-size">—'),'Easy has no ONNX');
  for(const label of copy.easy)assert(label.includes(String(difficulty.attention_budget)));
  continue;
 }
 if(id==='random'){
  const ev=JSON.parse(read('docs/experiments/nn-policy-v1/random-baseline.json'));
  assert(row.includes((ev.win_rate*100).toFixed(1)+'%'),'random win rate');
  assert(row.includes(`${ev.wins} / ${ev.games.toLocaleString('en-US')}`),'random wins/games');
  assert(row.includes('class="rl-size">—'),'random has no ONNX');
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
 assert(row.includes((ev.win_rate*100).toFixed(1)+'%'),id+' win rate');
 assert(row.includes(`${ev.wins} / ${ev.games.toLocaleString('en-US')}`),id+' wins/games');
 assert(row.includes((model.bytes/1e6).toFixed(2)+' <small>MB</small>'),id+' size');
 const hidden=model.hidden||[model.width,model.width/2];
 assert(row.includes(`${hidden[0]} <span aria-hidden="true">→</span> ${hidden[1]}`),id+' architecture');
 assert.equal(attrs.includes('rl-selected'),manifest.file===`policy-mlp-${id}-v1.onnx`,id+' deployed flag');
}
assert(html.includes('models/nn-policy/'+manifest.file));
assert(html.includes(manifest.version));
assert(html.includes(manifest.hidden.join(' <span>→</span> ')));
assert(html.includes((manifest.bytes/1e6).toFixed(2)+' MB'));
for(const m of html.matchAll(/data-sc="([^"]+)"/g)){
 if(['skip','name','tag','learn','identity','play','menu'].includes(m[1]))continue;
 assert(copy[m[1]]?.length===2,'Missing translation: '+m[1]);
}
assert(copy.tryPath[0].includes('设置')&&copy.tryPath[1].includes('Settings'));
assert(copy.method[0].includes('模仿学习')&&copy.method[1].includes('imitation learning'));
console.log('RL page: five models, Easy and Random match saved results, deployed artifact and bilingual setup instructions.');

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
const hardRows=[...html.matchAll(/<tr data-hard-policy="([^"]+)"[^>]*>([\s\S]*?)<\/tr>/g)];
assert.equal(hardRows.length,3);
for(const [_,id,row] of hardRows){
 const ev=restored.results.find(r=>id==='sdk-code' ? r.policy==='table-code'&&r.opponent===id : r.policy===id&&r.opponent==='table-code');
 assert(ev,'Missing restored Hard evaluation: '+id);
 const wins=id==='sdk-code'?ev.games-ev.wins:ev.wins;
 assert(row.includes((100*wins/ev.games).toFixed(1)+'%'));
 assert(row.includes(`${wins} / ${ev.games.toLocaleString('en-US')}`));
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
// Godlike has privileged information and a separate protocol; do not mix its
// result into the frozen SDK / NN rows above. Check every displayed timing.
const godlike=JSON.parse(read('docs/experiments/godlike-v1/evaluation.json'));
const godlikeSection=html.match(/<section[^>]*id="godlike"[\s\S]*?<\/section>/)[0];
assert(godlikeSection.includes((godlike.win_rate*100).toFixed(1)+'%'));
assert(godlikeSection.includes(`${godlike.wins} / ${godlike.games.toLocaleString('en-US')}`));
assert.equal(godlike.records.length,godlike.games);
assert.equal(godlike.records.filter(r=>r.won).length,godlike.wins);
for(const kind of ['attack','defend','refresh'])for(const lang of copy.godlikeLatency)
 assert(lang.includes(godlike.latency_ms[kind].p95.toFixed(1)+' ms'));
assert(copy.godlikeProtocol[0].includes('额外手牌信息')&&copy.godlikeProtocol[1].includes('extra hand information'));
console.log('Godlike page: privileged-info result and Node p95 match all 1,000 recorded games.');
