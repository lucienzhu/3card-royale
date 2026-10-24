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
