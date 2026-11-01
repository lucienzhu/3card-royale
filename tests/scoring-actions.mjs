import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {sdk,actions,features,scoring} from '../policies/dependencies.mjs';
import {loadPolicy} from '../policies/runtime.mjs';
import {validateManifest} from '../policies/contract.mjs';

const root=new URL('../',import.meta.url);
const fixtures=JSON.parse(await fs.readFile(new URL('tests/fixtures/actions-v2.json',root)));
const routes=new Set(), sizes=new Set();
for(const {observation:o} of fixtures){
  const before=JSON.stringify(o), semantic=actions.observation(o);
  const legacy=features.encode(o), encoded=scoring.encode(semantic);
  assert.deepEqual(encoded.state,legacy.state);
  assert.deepEqual(encoded.candidates,legacy.candidates);
  assert.equal(encoded.count,o.legal_actions.length);
  const scores=encoded.actions.map((a,i)=>i);
  assert.deepEqual(scoring.choose(semantic,scores),encoded.actions.at(-1));
  const reversed={...semantic,legal_actions:[...semantic.legal_actions].reverse()};
  assert.deepEqual(scoring.choose(reversed,[...scores].reverse()),scoring.choose(semantic,scores));
  // Every scoring row resolves through the same canonical grammar, including bombs/swaps.
  for(const a of encoded.actions){
    actions.build(o).validate(a);
    if(a.type==='swap')routes.add(a.target.zone);
    if(a.type==='play')sizes.add(a.cards.length);
  }
  assert.throws(()=>scoring.choose(semantic,scores.slice(1)));
  assert.throws(()=>scoring.choose(semantic,scores.map(()=>NaN)));
  assert.equal(JSON.stringify(o),before);
}
assert.deepEqual([...routes].sort(),['blind','deck','own_hand','own_wounds','rival_wounds']);
assert.deepEqual([...sizes].sort(),[3,4,5]);

// Reuse identical frozen weights, only adapt the output to actions-v2.
// No new checkpoint or leaderboard submission is created by this test.
const url=new URL('policies/entries/nn-256-v1/manifest.json',root);
const oldManifest=JSON.parse(await fs.readFile(url));
const manifest={...oldManifest,id:'test-scoring-v2',api:'royale-policy-v2',actions:'actions-v2',features:'scoring-v2'};
validateManifest(manifest);
for(const update of [{features:'gym-v1'},{actions:undefined},{features:'unknown'},
  {api:'royale-policy-v1',actions:undefined}])assert.throws(()=>validateManifest({...manifest,...update}));
const temp=await fs.mkdtemp(path.join(os.tmpdir(),'royale-scoring-'));
const plugins=[];
let decisions=0;
try{
  await fs.copyFile(new URL(oldManifest.artifact.file,url),path.join(temp,'policy.onnx'));
  await fs.writeFile(path.join(temp,'manifest.json'),JSON.stringify(manifest));
  plugins.push(await loadPolicy(url));
  plugins.push(await loadPolicy(pathToFileURL(path.join(temp,'manifest.json'))));
  plugins.push(await loadPolicy(new URL('policies/entries/nn-structured-v2/manifest.json',root)));
  const phases=new Set();
  for(let seed=1;seed<=4;seed++){
    const game=new sdk.Game(seed,seed%2);
    for(let step=0;step<4096;step++){
      if(['game_over','match_over'].includes(game.g.phase))break;
      if(game.actor===null){game.step(game.legalActions()[0]);continue;}
      const o=game.observation(game.actor),before=game.save();phases.add(o.phase);
      const [old,whole,ar]=await Promise.all(plugins.map(p=>p.act(o)));
      assert.equal(whole,old,'Whole-action profile must preserve frozen NN choices');
      assert(o.legal_actions[ar],'Autoregressive profile must still return a legal move');
      assert.deepEqual(game.save(),before);
      game.step(o.legal_actions[whole]);decisions++;
    }
    assert(['game_over','match_over'].includes(game.g.phase));
  }
  assert.deepEqual([...phases].sort(),['attack','defend','refresh']);
}finally{
  for(const p of plugins)await p.dispose();
  await fs.rm(temp,{recursive:true,force:true});
}
console.log(`Scoring actions: 3/4/5 plays, all swaps, permutation/feature parity; ${decisions} ONNX decisions unchanged under actions-v2.`);
