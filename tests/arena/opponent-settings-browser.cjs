/* PLAYWRIGHT_MODULE=/path/to/playwright PLAYTEST_URL=http://localhost:PORT/ node tests/arena/opponent-settings-browser.cjs */
'use strict';
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),assert=require('node:assert/strict');
const board=require('../../arena/results/leaderboard.json');
const base=process.env.PLAYTEST_URL||'http://127.0.0.1:59167/';
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome'}),errors=[];
 async function open({width=390,height=844,lang='zh-CN',theme='light',data=board,offline=false}={}){
  const ctx=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'});
  await ctx.addInitScript(()=>localStorage.setItem('sz-onboarding-v1',JSON.stringify({seen:true,enabled:false})));
  await ctx.route('**/arena/results/leaderboard.json',route=>offline?route.abort():route.fulfill({json:data}));
  const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'?lang='+lang,{waitUntil:'networkidle'});
  await page.evaluate(()=>gkUseGame(new GK.Game(19,{version:'1.0.0',first:0})));
  await page.locator('#open-settings').click();await page.locator('[data-sz-theme-select]').selectOption(theme);
  return {ctx,page};
 }
 try{
  for(const [width,height,lang,theme] of [[1440,1000,'zh-CN','light'],[1440,1000,'en','dark'],[390,844,'zh-CN','light'],[320,780,'en','dark']]){
   const {ctx,page:p}=await open({width,height,lang,theme});
   const saved=await p.evaluate(()=>JSON.stringify(gkGame.save()));
   assert.equal(await p.locator('#arena-policy-field').isVisible(),false);
   await p.locator('#policy-select').selectOption('arena');await p.locator('#arena-policy-field').waitFor({state:'visible'});
   await p.waitForFunction(()=>document.querySelector('#arena-policy-select').options.length>=6);
   for(const row of board.leaderboard){const option=p.locator('#arena-policy-select option[value="'+row.id+'"]');assert.ok((await option.textContent()).includes('Elo '+row.elo));}
   await p.locator('#arena-policy-select').selectOption('nn-512-v1');
   const rating=board.leaderboard.find(r=>r.id==='nn-512-v1');assert.equal(await p.locator('#arena-policy-elo').innerText(),'Elo '+rating.elo);
   assert.equal(await p.locator('#arena-policy-status').innerText(),lang==='en'?'Provisional · 60 games':'暂定 · 60 局');
   await p.locator('#policy-select').selectOption('code');assert.equal(await p.locator('#arena-policy-field').isVisible(),false);
   await p.locator('#policy-select').selectOption('arena');assert.equal(await p.locator('#arena-policy-select').inputValue(),'nn-512-v1');
   await p.locator('#policy-select').focus();await p.keyboard.press('Tab');assert.equal(await p.evaluate(()=>document.activeElement.id),'arena-policy-select');await p.keyboard.press('Tab');assert.equal(await p.evaluate(()=>document.activeElement.id),'arena-link');
   assert.equal(await p.locator('#settings-modal .modal-body').evaluate(n=>n.scrollWidth>n.clientWidth),false);
   assert.equal(await p.evaluate(()=>JSON.stringify(gkGame.save())),saved);
   await p.locator('#settings-preferences-heading').click();await p.locator('#settings-preferences').scrollIntoViewIfNeeded();
   await p.screenshot({path:`/tmp/arena-elo-${width}-${lang}-${theme}.png`});
   await p.locator('#settings-language').click();assert.equal(await p.locator('#arena-policy-status').innerText(),lang==='en'?'暂定 · 60 局':'Provisional · 60 games');
   await p.reload({waitUntil:'networkidle'});await p.locator('#open-settings').click();assert.equal(await p.locator('#arena-policy-field').isVisible(),true);assert.equal(await p.locator('#arena-policy-select').inputValue(),'nn-512-v1');
   await p.goto(base+'design-system.html?lang='+lang+'&theme='+theme,{waitUntil:'networkidle'});await p.locator('#ds-arena-policy').selectOption('1440');assert.equal(await p.locator('#ds-arena-elo').innerText(),'Elo 1440');await p.locator('#ds-opponent').selectOption('code');assert.equal(await p.locator('#ds-arena-field').isVisible(),false);
   assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   console.log(`${width}px ${lang} ${theme}: live ratings, nested layout, keyboard, language, persistence and gallery passed`);await ctx.close();
  }
  for(const variant of ['stale','missing','invalid','offline']){
   const data=structuredClone(board);
   if(variant==='stale')data.policies.find(p=>p.id==='code-table-v1').artifact.sha256='outdated';
   if(variant==='invalid')data.leaderboard=null;
   if(variant==='missing')data.leaderboard=data.leaderboard.filter(r=>r.id!=='code-table-v1');
   const {ctx,page:p}=await open({data,offline:variant==='offline'});
   await p.locator('#policy-select').selectOption('arena');
   await p.waitForFunction(()=>document.querySelector('#arena-policy-select').options.length>=6);
   await p.locator('#arena-policy-select').selectOption('code-table-v1');
   assert.equal(await p.locator('#arena-policy-elo').innerText(),['offline','invalid'].includes(variant)?'Elo 暂不可用':'待评估');
   const result=await p.evaluate(async()=>{const decision=await SZArenaPolicy.decide(gkGame);return {kind:decision.kind,error:SZArenaPolicy.diagnostics.error};});
   assert.deepEqual(result,{kind:'arena',error:''});console.log(`${variant} ratings: no stale score; policy still plays`);await ctx.close();
  }
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
