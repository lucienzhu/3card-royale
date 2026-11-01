/* Optional real-browser check: PLAYWRIGHT_MODULE=/path/to/playwright node this-file. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 const base=process.env.TEST_URL||'http://127.0.0.1:59184',errors=[];
 try {
  const page=await browser.newPage();page.on('pageerror',e=>errors.push(e.message));
  for(const lang of ['zh-CN','en'])for(const width of [390,1440]){
   await page.setViewportSize({width,height:1000});
   await page.goto(`${base}/arena.html?lang=${lang}#spaces`);
   await page.waitForSelector('#obs-example');
   assert.equal(await page.locator('#obs-example option').count(),3);
   for(const [i,op] of [[0,52],[0,53],[0,54],[1,52],[2,55]]){
    await page.selectOption('#obs-example',String(i));
    await page.locator(`[data-token="${op}"]`).click();
    // Each button reads the same conditional mask as the board.
    let steps=0;
    while((await page.locator('.obs-token.is-legal').count())>0){
     assert(++steps<=6);
     const choice=page.locator('.obs-token.is-legal').first();
     const id=Number(await choice.getAttribute('data-token'));
     const card=page.locator(`.obs-board button[data-card="${id}"]:enabled`).first();
     if(id<52&&await card.count())await card.click();else await choice.click();
    }
    const action=JSON.parse(await page.locator('.obs-semantic').textContent());
    assert(['play','swap','skip_swap','stop_swaps'].includes(action.type));
    await page.locator('[data-prefix-control="undo"]').click();
    assert(await page.locator('.obs-token.is-legal').count()>0);
   }
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`overflow ${lang} ${width}`);
   await page.selectOption('#obs-example','0');
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
   const p95=a=>a.sort((x,y)=>x-y)[Math.floor(a.length*.95)];
   return {browser:navigator.userAgent,model:ready.version,games:8,decisions,nnDecisions:latency.length,workerRoundTripP95Ms:p95(latency),inferenceP95Ms:p95(inference),arenaPlugin:true};
  });
  assert.deepEqual(errors,[]);report.ui={languages:['zh-CN','en'],widths:[390,1440],examples:3,playLengths:[3,4,5]};
  fs.writeFileSync(process.env.REPORT_PATH||'/private/tmp/structured-browser.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
