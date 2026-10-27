/* PLAYWRIGHT_MODULE=/path/to/playwright node tests/settings-browser.cjs */
'use strict';
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
const base=process.env.PLAYTEST_URL||'http://127.0.0.1:59157/';
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome',...(process.env.BROWSER_PROXY?{proxy:{server:process.env.BROWSER_PROXY}}:{})}),errors=[];
 try{
 for(const [width,height,lang,theme] of [[1440,1000,'en','light'],[768,1024,'zh-CN','dark'],[390,844,'zh-CN','light'],[320,568,'en','dark'],[844,390,'en','light']]){
  const ctx=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'});await ctx.addInitScript(()=>{if(!localStorage.getItem('sz-onboarding-v1'))localStorage.setItem('sz-onboarding-v1',JSON.stringify({seen:true,enabled:false}));});
  const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'?lang='+lang,{waitUntil:'networkidle'});
  await page.evaluate(()=>gkUseGame(new GK.Game(19,{version:'1.0.0',first:0})));await page.locator('#open-settings').click();await page.waitForSelector('#settings-modal[open]');
  await page.locator('#settings-research > summary').focus();await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.id),'settings-language');await page.keyboard.press('Shift+Tab');assert.equal(await page.evaluate(()=>document.activeElement.parentElement.id),'settings-research');
  const saved=await page.evaluate(()=>JSON.stringify(gkGame.save()));
  assert.equal(await page.locator('#settings-modal [role=tab]').count(),0);
  assert.equal(await page.locator('#settings-modal > .modal-body > section:not([hidden])').count(),3);
  for(const id of ['settings-preferences','settings-match','settings-records']){await page.locator('#'+id).scrollIntoViewIfNeeded();assert.equal(await page.locator('#settings-modal .modal-body').evaluate(n=>n.scrollWidth>n.clientWidth),false);}
  await page.locator('[data-sz-theme-select]').selectOption(theme);await page.locator('#policy-select').selectOption('code');await page.locator('#sz-motion-select').selectOption('off');await page.locator('#onboarding-enabled').check();await page.locator('[data-sz-egg-toggle]').check();
  assert.equal(await page.evaluate(()=>JSON.stringify(gkGame.save())),saved,'preferences do not alter the game or deal');
  assert.equal(await page.locator('#onboarding-enabled').evaluate(n=>getComputedStyle(n).width),await page.locator('[data-sz-egg-toggle]').evaluate(n=>getComputedStyle(n).width));
  await page.locator('[data-sz-egg-toggle]').uncheck();
  await page.locator('#settings-language').click();assert.equal(await page.locator('#settings-preferences-heading').innerText(),lang==='en'?'偏好':'Preferences');await page.locator('#settings-language').click();
  await page.locator('#settings-records').scrollIntoViewIfNeeded();const headY=await page.locator('#settings-modal .modal-head').evaluate(n=>n.getBoundingClientRect().y);await page.locator('#settings-preferences').scrollIntoViewIfNeeded();assert.equal(await page.locator('#settings-modal .modal-head').evaluate(n=>n.getBoundingClientRect().y),headY);
  await page.screenshot({path:`/tmp/settings-${width}-checked-top.png`});await page.locator('#settings-records').scrollIntoViewIfNeeded();await page.screenshot({path:`/tmp/settings-${width}-checked-records.png`});
  const downloadPromise=page.waitForEvent('download');await page.locator('#export-match').click();const download=await downloadPromise;const data=JSON.parse(fs.readFileSync(await download.path(),'utf8'));assert.equal(data.seed,19);assert.equal(data.save.version,'1.0.0');
  await page.locator('[data-tab="replay"]').click();await page.waitForSelector('#replay-modal[open]');await page.locator('#close-replay').click();await page.waitForSelector('#replay-modal[open]',{state:'hidden'});assert.equal(await page.evaluate(()=>JSON.stringify(gkGame.save())),saved,'replay restores the live game');
  await page.locator('#open-settings').click();await page.locator('#settings-seeds > summary').click();await page.locator('#seed-mode').selectOption('fixed');await page.locator('#seed-input').fill('4294967296');await page.locator('#new-match').click();assert.equal(await page.locator('#settings-modal[open]').count(),1,'invalid fixed seed does not start');assert.equal(await page.evaluate(()=>gkGame.seed),19);
  await page.locator('#seed-input').fill('42');await page.locator('#first-input').selectOption('0');await page.locator('#new-match').click();await page.waitForSelector('#settings-modal[open]',{state:'hidden'});assert.equal(await page.evaluate(()=>gkGame.seed),42);assert.equal(await page.evaluate(()=>gkGame.currentActor()),0);
  await page.reload({waitUntil:'networkidle'});await page.locator('#open-settings').click();assert.equal(await page.locator('#policy-select').inputValue(),'code');assert.equal(await page.locator('#sz-motion-select').inputValue(),'off');assert.equal(await page.locator('[data-sz-theme-select]').inputValue(),theme);assert.equal(await page.locator('#onboarding-enabled').isChecked(),true);assert.equal(await page.locator('#seed-input').inputValue(),'42');assert.equal(await page.locator('#settings-seeds').evaluate(n=>n.open),true);
  await page.locator('#onboarding-reopen').click();await page.waitForSelector('#onboarding-modal[open]');assert.equal(await page.locator('.intro-rack button').count(),8);await page.locator('#close-onboarding').click();await page.waitForSelector('#onboarding-modal[open]',{state:'hidden'});
  await ctx.close();
 }
 assert.deepEqual(errors,[]);console.log('Settings: single-page layout, stable header, EN/ZH, light/dark, 320–1440px, preference persistence, save preservation, seed validation/new match, export, replay and practice passed.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
