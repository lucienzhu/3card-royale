/* Run against a local preview: PLAYWRIGHT_MODULE=/path/to/playwright node tests/playtest-browser.cjs */
'use strict';
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),assert=require('node:assert/strict');
const base=process.env.PLAYTEST_URL||'http://127.0.0.1:59157/';
async function swipe(page,selector,count=3,cancel=false,vertical=false){
 const boxes=await page.locator(selector).evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};}));
 const point=i=>({x:boxes[i].x+Math.min(boxes[i].w,(boxes[i+1]?.x??boxes[i].x+boxes[i].w)-boxes[i].x)/2,y:boxes[i].y+boxes[i].h*.65});
 const a=point(0),b=vertical?{x:a.x,y:a.y-60}:point(count-1),cdp=await page.context().newCDPSession(page);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[a]});
 for(let i=1;i<=12;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:a.x+(b.x-a.x)*i/12,y:a.y+(b.y-a.y)*i/12}]});
 await cdp.send('Input.dispatchTouchEvent',{type:cancel?'touchCancel':'touchEnd',touchPoints:[]});await cdp.detach();
}
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome'}),errors=[];
 try{
 const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'?lang=zh-CN',{waitUntil:'networkidle'});await page.waitForSelector('#onboarding-modal[open]');await page.waitForTimeout(300);
 const saved=await page.evaluate(()=>JSON.stringify(gkGame.save()));
 assert.equal(await page.locator('.intro-rack button').count(),8);assert(!(await page.locator('#onboarding-modal').innerText()).includes('伤牌'));
 await swipe(page,'.intro-rack button');assert.equal(await page.locator('.intro-selected').count(),3);assert((await page.locator('.intro-selected').first().evaluate(n=>new DOMMatrix(getComputedStyle(n).transform).m42))<0);
 await page.locator('#onboarding-start').click();await page.waitForSelector('[data-lesson-stage="defend"]');assert.equal(await page.locator('.intro-rack button').count(),5);
 await swipe(page,'.intro-rack button');assert.equal(await page.locator('.intro-selected').count(),3);await page.locator('#onboarding-start').click();await page.waitForSelector('[data-lesson-stage="done"]');
 assert((await page.locator('.intro-result').innerText()).includes('1 伤'));assert.equal(await page.evaluate(()=>JSON.stringify(gkGame.save())),saved);
 await page.locator('#onboarding-start').click();await page.waitForSelector('#onboarding-modal[open]',{state:'hidden'});
 await page.reload({waitUntil:'networkidle'});assert.equal(await page.locator('#onboarding-modal[open]').count(),0,'no repeat tutorial');
 // Put the real renderer on a deterministic human turn. The policy itself is unchanged.
 await page.evaluate(()=>{window.gkUseGame(new GK.Game(19,{version:'1.0.0',first:0}));});
 await swipe(page,'#own-hand button',3,true);assert.equal(await page.locator('#own-hand .selected').count(),0,'cancel rolls back');
 await swipe(page,'#own-hand button',3,false,true);assert.equal(await page.locator('#own-hand .selected').count(),0,'vertical scroll is not selection');
 await swipe(page,'#own-hand button');assert.equal(await page.locator('#own-hand .selected').count(),3,'three cards lifted');
 await page.locator('#clear-selection').click();await page.locator('#own-hand button').first().tap({position:{x:8,y:30}});assert.equal(await page.locator('#own-hand .selected').count(),1,'tap works after gesture');
 // A non-choice resolution advances once, but not inside settings or a replay.
 await page.evaluate(()=>{const g=new GK.Game(19,{version:'1.0.0',first:0});while(g.phase!=='resolved')g.aiStep();window.gkUseGame(g);});
 const round=await page.evaluate(()=>({event:gkGame.events.length,battle:gkGame.battleIndex,round:gkGame.round}));
 assert.equal(await page.locator('#continue-game').count(),0);await page.evaluate(()=>SZDrawer.open('settings'));await page.waitForTimeout(1500);
 assert.equal(await page.evaluate(()=>gkGame.events.length),round.event,'settings pauses progression');
 await page.evaluate(()=>SZDrawer.close());await page.waitForFunction(()=>gkGame.phase!=='resolved');
 assert.equal(await page.evaluate(()=>gkGame.battleIndex),1);
 // A refresh opportunity remains interactive indefinitely; context hint can be dismissed/disabled.
 await page.evaluate(()=>{const g=new GK.Game(9,{version:'1.0.0',first:0});for(let n=0;n<1000;n++){if(g.phase==='refresh'&&g.currentActor()===0)break;g.aiStep();}window.gkUseGame(g);localStorage.setItem('sz-onboarding-v1',JSON.stringify({seen:true,enabled:true,hintGame:`${g.version}:${g.seed}:${g.game}`}));localStorage.setItem('gk033_compact_play_1.0.0',JSON.stringify(g.save()));});
 await page.reload({waitUntil:'networkidle'});await page.evaluate(()=>SZTablePanels.resume());await page.waitForSelector('.sz-first-game-hint[data-hint="swap"]:not([hidden])');
 await page.screenshot({path:'/tmp/guided-swap-hint.png'});const state=await page.evaluate(()=>JSON.stringify(gkGame.save()));await page.waitForTimeout(1600);assert.equal(await page.evaluate(()=>JSON.stringify(gkGame.save())),state,'no automatic swap/skip');
 await page.evaluate(()=>SZDrawer.open('settings'));await page.locator('#qb-tab-preferences').click();await page.locator('#onboarding-enabled').uncheck();await page.evaluate(()=>SZDrawer.close());assert.equal(await page.locator('.sz-first-game-hint:not([hidden])').count(),0);
 // Face-up wound cards can be swipe selected, using the same authoritative selection.
 await page.evaluate(()=>{const g=new GK.Game(33,{version:'1.0.0',first:0});for(let n=0;n<1000;n++){if(['attack','defend'].includes(g.phase)&&g.currentActor()===0&&g.players[0].table.length>=2)break;g.aiStep();}window.gkUseGame(g);});
 await swipe(page,'#own-table button',2);assert.equal(await page.locator('#own-table .selected').count(),2);
 await ctx.close();
 for(const [width,height,lang,theme] of [[320,568,'zh-CN','light'],[390,844,'en','dark'],[1440,900,'en','light'],[844,390,'zh-CN','dark']]){
  const c=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'}),p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));
  await p.goto(base+`?lang=${lang}`,{waitUntil:'networkidle'});await p.evaluate(theme=>document.documentElement.dataset.szTheme=theme,theme);await p.waitForSelector('#onboarding-modal[open]');
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.equal(await p.locator('#onboarding-modal').evaluate(n=>n.scrollWidth>n.clientWidth),false);
  for(const id of [12,25,38])await p.locator(`.intro-rack [data-card="${id}"]`).click();await p.locator('#onboarding-start').click();await p.waitForSelector('[data-lesson-stage="defend"]');
  for(const id of [41,45,49])await p.locator(`.intro-rack [data-card="${id}"]`).click();await p.locator('#onboarding-start').click();
  assert((await p.locator('#onboarding-modal').innerText()).includes(lang==='en'?'1 damage':'1 伤'));
  await p.screenshot({path:`/tmp/guided-flow-${width}-${lang}.png`});await c.close();
 }
 assert.deepEqual(errors,[]);console.log('Browser: tutorial attack/defense, repeat visit, touch swipe/cancel/scroll/tap, wound selection, auto transition/pause, optional swaps, hints/opt-out, EN/ZH light/dark and 320–1440px passed.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
