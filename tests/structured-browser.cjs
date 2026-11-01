/* Optional real-browser check: PLAYWRIGHT_MODULE=/path/to/playwright node this-file. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 const base=process.env.TEST_URL||'http://127.0.0.1:59184',errors=[];
 try {
  const page=await browser.newPage();page.on('pageerror',e=>errors.push(e.message));
  // Browser-only fixture: reuse frozen weights without registering a duplicate policy.
  const nnRoot=require('node:path').resolve(__dirname,'../policies/entries/nn-256-v1');
  const manifest=JSON.parse(fs.readFileSync(`${nnRoot}/manifest.json`));
  await page.route('**/__scoring-profile/manifest.json',route=>route.fulfill({
   contentType:'application/json',body:JSON.stringify({...manifest,id:'test-scoring-v2',
    api:'royale-policy-v2',actions:'actions-v2',features:'scoring-v2'})
  }));
  await page.route('**/__scoring-profile/policy.onnx',route=>route.fulfill({
   contentType:'application/octet-stream',body:fs.readFileSync(`${nnRoot}/policy.onnx`)
  }));
  for(const lang of ['zh-CN','en'])for(const width of [390,1440]){
   await page.setViewportSize({width,height:1000});
   await page.goto(`${base}/arena.html?lang=${lang}#spaces`);
   await page.waitForSelector('.obs-example-tab');
   assert.equal(await page.locator('.obs-example-tab').count(),3);
   const choose=async i=>page.locator(`[data-example="${i}"]`).click();
   const pick=async ids=>{for(const id of ids)await page.locator(`.obs-board button[data-card="${id}"]`).click();};
   const reset=()=>page.locator('[data-prefix-control="reset"]').click();
   const action=async()=>JSON.parse(await page.locator('.obs-semantic').textContent());
   const values=()=>page.locator('.obs-zones .obs-bit,.obs-phases .obs-bit').evaluateAll(ns=>ns.map(n=>Number(n.textContent)));
   const fixtures=require('../arena/structured-examples.json'),A=require('../sdk/actions.js');
   for(let i=0;i<3;i++){
    await choose(i);
    assert.equal(await page.locator(`[data-example="${i}"]`).getAttribute('aria-selected'),'true');
    assert.deepEqual(await values(),Array.from(A.state(fixtures[i].observation)).slice(0,318));
    for(const [zone,key] of [[0,'hand'],[1,'wounds'],[2,'enemy_wounds'],[3,'discard']]){
     assert.deepEqual(await page.locator(`.obs-board .obs-playing-card[data-board-zone="${zone}"]`).evaluateAll(ns=>ns.map(n=>Number(n.dataset.card))),fixtures[i].observation[key]);
    }
   }
   await choose(0);const initial=await values();
   await pick([31,5]);assert.equal(await page.locator('.obs-selection-result').getAttribute('data-validity'),'incomplete');
   await pick([18]);assert.equal(await page.locator('.obs-selection-result').getAttribute('data-validity'),'valid');
   assert.deepEqual(await action(),{type:'play',cards:[5,18,31]});
   assert.equal(await page.locator('.obs-action-vector').textContent(),'[52,5,18,31,65,65]');
   await pick([44]);assert.deepEqual(await action(),{type:'play',cards:[5,18,31,44]});
   assert.equal(await page.locator('.obs-selection-result').getAttribute('data-validity'),'valid');
   await pick([13]);assert.deepEqual(await action(),{type:'play',cards:[5,13,18,31,44]});
   assert.equal(await page.locator('.obs-selection-result').getAttribute('data-validity'),'valid');
   assert.equal(await page.locator('.obs-action-vector').textContent(),'[54,5,13,18,31,44]');
   assert.equal(await page.locator('.obs-board button[data-card="1"]').isDisabled(),true,'max 5 cards');
   await page.locator('.obs-mask-details>summary').click();
   await page.selectOption('#obs-mask-step','5');
   assert.equal(await page.locator('[data-mask-token="44"] b').textContent(),'1');
   await page.selectOption('#obs-mask-step','6');
   assert.equal(await page.locator('.obs-token.is-legal').count(),0,'completed action has no next token');
   await reset();await pick([1,5,9,11]);
   assert.equal(await page.locator('.obs-selection-result').getAttribute('data-validity'),'invalid');
   assert.deepEqual(await action(),{type:'play',cards:[1,5,9,11]});
   assert.equal(await page.locator('.obs-action-vector').textContent(),'[53,1,5,9,11,65]');
   assert.equal(await page.locator('[data-mask-token="1"] b').textContent(),'0','invalid hand rejected at first card');
   await pick([13]);assert.equal(await page.locator('.obs-selection-result').getAttribute('data-validity'),'invalid');
   await reset();await pick([31,18,5]);
   assert.equal(await page.locator('.obs-action-vector').textContent(),'[52,5,18,31,65,65]','permutations have one encoding');
   await page.locator('[data-prefix-control="undo"]').click();
   assert.equal(await page.locator('.obs-selection-result').getAttribute('data-validity'),'incomplete');
   assert.deepEqual(await values(),initial,'preview never changes observation');
   await choose(1);await pick(fixtures[1].observation.hand.slice(0,3));
   assert.equal(await page.locator('.obs-selection-result').getAttribute('data-validity'),'valid');
   await pick(fixtures[1].observation.hand.slice(3,4));
   assert.equal(await page.locator('.obs-selection-result').getAttribute('data-validity'),'invalid');
   for(const op of [55,56,57]){
    await choose(2);await page.locator(`[data-token="${op}"]`).click();
    let steps=0;
    while((await page.locator('.obs-token.is-legal').count())>0){
     assert(++steps<=6);const choice=page.locator('.obs-token.is-legal').first(),id=Number(await choice.getAttribute('data-token'));
     const card=page.locator(`.obs-board button[data-card="${id}"]:enabled`).first();
     if(id<52&&await card.count())await card.click();else await choice.click();
    }
    assert(['swap','skip_swap','stop_swaps'].includes((await action()).type));
    await page.locator('[data-prefix-control="undo"]').click();assert(await page.locator('.obs-token.is-legal').count()>0);
   }
   await page.locator('[data-example="2"]').focus();await page.keyboard.press('ArrowRight');
   assert.equal(await page.locator('[data-example="0"]').getAttribute('aria-selected'),'true');
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`overflow ${lang} ${width}`);
   await pick([31,18,5]);
   await page.locator('.obs-actions').scrollIntoViewIfNeeded();
   await page.screenshot({path:`/private/tmp/structured-${lang}-${width}.png`});
  }
  const report=await page.evaluate(async()=>{
   const {sdk,core}=await import('/policies/dependencies.mjs');
   const {createPolicy}=await import('/policies/entries/code-table-v1/policy.mjs');
   const hard=createPolicy({core});
   const worker=new Worker('/app/policy-worker.js');let serial=0;
   const rpc=o=>new Promise((resolve,reject)=>{
    const id=++serial,t=setTimeout(()=>reject(Error('Policy timeout')),30000);
    worker.onmessage=({data})=>{if(data.id===id){clearTimeout(t);data.error?reject(Error(data.error)):resolve(data);}};
    worker.postMessage({id,observation:o});
   });
   const ready=await rpc(null),latency=[],inference=[];let decisions=0;
   for(let i=0;i<8;i++){
    const g=new sdk.Game(92000000+Math.floor(i/2),Math.floor(i/2)%2),seat=i%2;
    for(let n=0;!['game_over','match_over'].includes(g.g.phase);n++){
     if(n>=4096)throw Error('Incomplete game');
     if(g.actor===null){g.step(g.legalActions()[0]);continue;}
     const o=g.observation(g.actor);let index;
     if(g.actor===seat){const t=performance.now(),r=await rpc(o);latency.push(performance.now()-t);inference.push(r.inferenceMs);index=r.index;}
     else index=hard.act(o);
     if(!o.legal_actions[index])throw Error('Illegal browser action');
     g.step(o.legal_actions[index]);decisions++;
    }
   }
   worker.terminate();
   // Also exercise the registry v2 ONNX path used by Arena, not just the built-in AI.
   const {PolicyClient}=await import('/policies/client.mjs');
   const client=new PolicyClient({makeWorker:()=>new Worker('/policies/worker.mjs',{type:'module'})});
   await client.load('nn-structured-v2');
   const g=new sdk.Game(44,0),o=g.observation(0),result=await client.act(o);client.cancel();
   if(!o.legal_actions[result.index])throw Error('Arena browser action invalid');
   const {loadPolicy}=await import('/policies/runtime.mjs');
   const legacy=await loadPolicy(new URL('/policies/entries/nn-256-v1/manifest.json',location.href));
   const scoring=await loadPolicy(new URL('/__scoring-profile/manifest.json',location.href));
   const fixtures=await (await fetch('/tests/fixtures/actions-v2.json')).json();
   let scoringParity=0;
   try{
    for(const {observation} of fixtures){
     const before=JSON.stringify(observation);
     const a=await legacy.act(observation),b=await scoring.act(observation);
     if(a!==b)throw Error('Browser scorer changed the frozen NN move');
     if(JSON.stringify(observation)!==before)throw Error('Browser scorer mutated observation');
     scoringParity++;
    }
   }finally{await legacy.dispose();await scoring.dispose();}
   const p95=a=>a.sort((x,y)=>x-y)[Math.floor(a.length*.95)];
   return {browser:navigator.userAgent,model:ready.version,games:8,decisions,nnDecisions:latency.length,workerRoundTripP95Ms:p95(latency),inferenceP95Ms:p95(inference),arenaPlugin:true,scoringParity};
  });
  assert.deepEqual(errors,[]);report.ui={languages:['zh-CN','en'],widths:[390,1440],examples:3,playLengths:[3,4,5]};
  fs.writeFileSync(process.env.REPORT_PATH||'/private/tmp/structured-browser.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
