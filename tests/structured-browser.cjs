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
   const action=async()=>JSON.parse(await page.locator('.obs-semantic').textContent());
   const values=()=>page.locator('.obs-zones .obs-bit,.obs-phases .obs-bit').evaluateAll(ns=>ns.map(n=>Number(n.textContent)));
   const fixtures=require('../arena/structured-examples.json'),A=require('../sdk/actions.js');
   for(let i=0;i<3;i++){
    await choose(i);
    const fixture=fixtures[i],sequence=A.tokens(fixture.action),g=A.build(fixture.observation);
    g.validate(fixture.action);
    assert.equal(await page.locator(`[data-example="${i}"]`).getAttribute('aria-selected'),'true');
    assert.deepEqual(await values(),Array.from(A.state(fixture.observation)).slice(0,318));
    assert.deepEqual(await action(),fixture.action,'preset action is immediately visible');
    assert.deepEqual(JSON.parse(await page.locator('.obs-action-vector').textContent()),[...sequence,...Array(A.LENGTH-sequence.length).fill(A.PAD)]);
    assert.equal(await page.locator('.obs-board button[data-card],[data-prefix-control],[data-token]').count(),0,'examples do not require action building');
    for(const [zone,key] of [[0,'hand'],[1,'wounds'],[2,'enemy_wounds'],[3,'discard']]){
     assert.deepEqual(await page.locator(`.obs-board .obs-playing-card[data-board-zone="${zone}"]`).evaluateAll(ns=>ns.map(n=>Number(n.dataset.card))),fixture.observation[key]);
    }
    assert.deepEqual((await page.locator('.obs-board .is-source[data-card]').evaluateAll(ns=>ns.map(n=>Number(n.dataset.card)))).sort((a,b)=>a-b),fixture.action.cards||[fixture.action.source]);
    assert.deepEqual(await page.locator('.obs-board .is-target[data-card]').evaluateAll(ns=>ns.map(n=>Number(n.dataset.card))),fixture.action.target?[fixture.action.target.card]:[]);
    const layout=await page.evaluate(()=>{
     const rect=s=>document.querySelector(s).getBoundingClientRect();
     return {observationBottom:rect('.obs-observation').bottom,actionTop:rect('.obs-actions').top,
      tabs:rect('.obs-example-tabs').width,container:rect('#arena-observation').width,
      widths:[...document.querySelectorAll('.obs-example-tab')].map(n=>n.getBoundingClientRect().width)};
    });
    assert(layout.actionTop>=layout.observationBottom,'Action Space follows the entire Observation Space');
    assert(Math.abs(layout.tabs-layout.container)<1,'tabs span full width');
    assert(Math.max(...layout.widths)-Math.min(...layout.widths)<1,'tabs are equal width');
    await page.locator('.obs-meta>summary').click();
    const encoded=await page.locator('.obs-encoded').evaluateAll(ns=>ns.map(n=>Number(n.firstChild.textContent)));
    assert.deepEqual(encoded,Array.from(A.state(fixture.observation)).slice(318).map(n=>Number(n.toFixed(6))));
    await page.locator('.obs-meta>summary').click();
    if(!await page.locator('.obs-mask-details').evaluate(n=>n.open))await page.locator('.obs-mask-details>summary').click();
    for(let step=0;step<=sequence.length;step++){
     await page.selectOption('#obs-mask-step',String(step));
     const displayed=await page.locator('[data-mask-token]').evaluateAll(ns=>Object.fromEntries(ns.map(n=>[n.dataset.maskToken,Number(n.querySelector('b').textContent)])));
     const expected=Array.from(g.next(sequence.slice(0,step)).mask);
     assert.deepEqual(Array.from({length:A.VOCAB},(_,id)=>displayed[id]),expected);
     assert.deepEqual(await action(),fixture.action,'mask inspection does not alter the example');
    }
    await page.locator('.obs-mask-details>summary').click();
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`overflow ${lang} ${width} example ${i}`);
   }
   await page.locator('[data-example="2"]').focus();await page.keyboard.press('ArrowRight');
   assert.equal(await page.locator('[data-example="0"]').getAttribute('aria-selected'),'true');
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
  assert.deepEqual(errors,[]);report.ui={languages:['zh-CN','en'],widths:[390,1440],examples:3,presetActions:true,stackedSpaces:true};
  fs.writeFileSync(process.env.REPORT_PATH||'/private/tmp/structured-browser.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
