'use strict';
// Every public result must resolve to the retained artifact and its measured cohort.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const json=p=>JSON.parse(read(p)),html=read('arena.html');
const benchmark=json('docs/experiments/complete-baseline/summary.json');
const comparison=json('docs/experiments/neural-baselines/summary.json');
const training=json('docs/experiments/nn-policy-v1/training.json');
const current=json('models/structured-policy/training.json');
const copy=JSON.parse(html.match(/window.SC_COPY=(\{[\s\S]*?\});<\/script>/)[1]);
const rows=[...html.matchAll(/<tr data-model="([^"]+)"([^>]*)>([\s\S]*?)<\/tr>/g)];
const subjects={random:'random-v1',easy:'easy-v2','sdk-code':'sdk-code-v1',
 '64':'nn-64','128':'nn-128','256':'nn-256-v1','256x512':'nn-256x512',
 '512':'nn-512-v1',autoregressive:'nn-structured-v2',godlike:'godlike'};
assert.equal(rows.length,10);assert.equal(new Set(rows.map(r=>r[1])).size,10);
assert.equal((html.match(/class="rl-benchmark"/g)||[]).length,1);
assert(!html.includes('details id="experiments"'));
assert(!Object.values(copy).flat().some(t=>/legacy|earlier evaluations|NN v[12]|历史实验/i.test(t)));
let measuredCells=0;
for(const [_,key,attrs,row] of rows){
 const id=subjects[key];assert(id,'Unknown table policy '+key);
 const cells=[...row.matchAll(/<td([^>]*)>([\s\S]*?)<\/td>/g)];
 assert.equal(cells.length,4);
 const artifact=benchmark.policies.find(p=>p.manifest.id===id)?.manifest;
 if(artifact?.type==='onnx'){
  assert(cells[0][2].includes((artifact.artifact.bytes/1e6).toFixed(2)+' <small>MB</small>'),id+' artifact size');
  const model=key==='autoregressive'?current:training.models.find(m=>String(m.id||m.width)===key);
  assert(model,id+' training metrics');
  const hidden=model.hidden||[model.width,model.width/2];
  assert(row.includes(`${hidden[0]} <span aria-hidden="true">→</span> ${hidden[1]}`),id+' architecture');
 }else assert(cells[0][2].includes('data-sc="benchmarkNA"'),id+' no ONNX');
 const timing=benchmark.models.find(m=>m.id===id);
 assert(cells[1][2].includes(timing.maxDecisionP95Ms.toFixed(2)+' ms'),id+' complete-decision p95');
 for(const [i,opponent] of benchmark.opponents.entries()){
  const cell=cells[i+2][2];
  if(id===opponent){assert(cell.includes('data-sc="benchmarkSelf"'));continue;}
  const pair=benchmark.matches.find(m=>m.subject===id&&m.opponent===opponent);
  assert(pair,id+'/'+opponent+' missing report');
  const result=pair.results.find(r=>r.id===id);
  assert(cell.includes((100*result.winRate).toFixed(1)+'%'),id+'/'+opponent+' rate');
  assert(cell.includes(`${result.wins.toLocaleString('en-US')} / ${result.games.toLocaleString('en-US')}`),id+'/'+opponent+' count');
  assert(cell.includes('docs/experiments/complete-baseline/'+pair.file),id+'/'+opponent+' source');
  measuredCells++;
 }
 if(id==='godlike')assert(attrs.includes('data-godlike-policy="godlike"'));
}
assert.equal(measuredCells,19);
assert(copy.benchmarkCount.every(t=>t.includes(benchmark.totalGames.toLocaleString('en-US'))));
assert(copy.benchmarkProtocol.every(t=>t.includes('500')&&t.includes('19,000')));
assert(copy.latencyWorker.every(t=>t.includes('Apple M1 / Node 22')));
assert(copy['rl-godlikeNote'][0].includes('非同等信息')&&copy['rl-godlikeNote'][1].includes('extra information'));
assert(html.includes('docs/experiments/complete-baseline/README.md'));
assert(html.includes('models/structured-policy/policy.onnx'));
assert(html.includes('index.html?policy=nn-256-v1'));
assert(html.includes('index.html?policy=nn-structured-v2'));
assert(html.includes(current.parameters.toLocaleString('en-US')));
assert(html.includes((current.bytes/1e6).toFixed(2)+' MB'));
assert(html.includes('Epoch '+current.best_epoch));

const evaluation=html.match(/<section[^>]*id="structured-results">([\s\S]*?)<\/section>/)[1];
assert.equal((evaluation.match(/<table\b/g)||[]).length,1,'One public evaluation table');
assert(!html.includes('rl-matchup')&&!html.includes('data-matchup'));
const methods=evaluation.match(/<details([^>]*id="benchmark-method"[^>]*)>([\s\S]*?)<\/details>/);
assert(methods&&!/\bopen\b/.test(methods[1]),'Methods are collapsed by default');
assert(methods[2].includes('docs/experiments/neural-baselines/README.md'),'Additional opponents remain linked in methods');
assert(copy.matchupsData.every(t=>t.includes(comparison.totalGames.toLocaleString('en-US'))));
for(const m of html.matchAll(/data-sc="([^"]+)"/g)){
 if(['skip','name','tag','learn','identity','play','menu'].includes(m[1]))continue;
 assert(copy[m[1]]?.length===2,'Missing translation: '+m[1]);
}
assert(copy['rl-method'][0].includes('模仿学习')&&copy['rl-method'][1].toLowerCase().includes('imitation learning'));
console.log('RL page: all 19 measured cells, 10 latencies, artifacts and bilingual copy agree with retained reports; one evaluation table, additional reports in methods.');
