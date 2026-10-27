// PLAYWRIGHT_MODULE=/path/to/playwright node tests/arena/leaderboard-browser.cjs
const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.PLAYTEST_URL||'http://127.0.0.1:59157/';
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome',...(process.env.BROWSER_PROXY?{proxy:{server:process.env.BROWSER_PROXY}}:{})});
 try{
 for(const [width,height,lang] of [[1440,1000,'en'],[390,844,'zh-CN'],[320,568,'en']]){
  const ctx=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'});
  await ctx.addInitScript(()=>localStorage.setItem('sz-onboarding-v1',JSON.stringify({seen:true,enabled:false})));
  const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'arena.html?lang='+lang,{waitUntil:'networkidle'});
  await page.waitForSelector('#arena-rows .arena-author');
  const authors=await page.locator('.arena-author').evaluateAll(nodes=>nodes.map(n=>({text:n.textContent,href:n.href})));
  const registry=await (await page.request.get(base+'policies/registry.json')).json();
  const expected=registry.policies.map(p=>({text:'@'+p.github,href:'https://github.com/'+p.github}));
  assert.equal(authors.length,expected.length);for(const a of authors)assert(expected.some(e=>e.text===a.text&&e.href===a.href));
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'no horizontal overflow');
  await page.locator('#arena-rows').scrollIntoViewIfNeeded();await page.screenshot({path:`/tmp/arena-authors-${width}.png`});
  if(width===1440){
   await page.locator('.arena-play[href*="policy=nn-512-v1"]').click();
   await page.waitForFunction(()=>window.SZArenaPolicy?.selected==='nn-512-v1');
   await page.locator('#open-settings').click();await page.waitForSelector('#settings-modal[open]');
   await page.waitForFunction(()=>document.querySelector('#arena-policy-select')?.value==='nn-512-v1');
   assert.equal(await page.locator('#arena-policy-select').inputValue(),'nn-512-v1');
   const result=await page.evaluate(async()=>{
    const {sdk,code}=await import('./policies/dependencies.mjs');
    const phases=new Set();let decisions=0;
    for(let seed=1;seed<=4;seed++){
     const game=new sdk.Game(seed,seed%2);let steps=0;
     while(!['game_over','match_over'].includes(game.g.phase)){
      if(++steps>4096)throw Error('Game did not finish');
      if(game.actor===null){game.step(game.legalActions()[0]);continue;}
      if(game.actor===1){
       phases.add(game.g.phase);const d=await SZArenaPolicy.decide(game.g);
       if(d.version!=='nn-512-v1'||d.fallback)throw Error('Unexpected fallback');
       game.step(d.action);decisions++;
      }else game.step(code.chooseAction(game.observation(0)));
     }
    }
    return {phases:[...phases].sort(),decisions,diagnostics:SZArenaPolicy.diagnostics};
   });
   assert.deepEqual(result.phases,['attack','defend','refresh']);assert(result.decisions>0);assert.equal(result.diagnostics.loaded,'nn-512-v1');assert.equal(result.diagnostics.error,'');
   console.log('NN512 browser Worker: four complete games, attack/defense/swap, no fallback.',result.decisions);
  }
  assert.deepEqual(errors,[]);await ctx.close();
 }
 console.log('Leaderboard: GitHub handles and links, EN/ZH, 320/390/1440px, NN512 challenge route passed.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
