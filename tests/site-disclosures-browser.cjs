// PLAYWRIGHT_MODULE=/path/to/playwright PLAYTEST_URL=http://localhost:8000/ node tests/site-disclosures-browser.cjs
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const base=process.env.PLAYTEST_URL||'http://127.0.0.1:59167/';
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome'}),errors=[];
 try{
  for(const lang of ['zh-CN','en'])for(const width of [1440,390]){
   const page=await browser.newPage({viewport:{width,height:900}});page.on('pageerror',e=>errors.push(e.message));
   await page.goto(base+'rules.html?lang='+lang,{waitUntil:'networkidle'});
   const chapters=page.locator('.site-rule-chapter details');assert.equal(await chapters.count(),8);assert.equal(await page.locator('.site-rule-chapter details[open]').count(),0);
   // Chapter copy remains verbatim, including all paragraphs and rows from the canonical source.
   assert(await page.evaluate(()=>{const doc=document.createElement('div');doc.innerHTML=SZStandardRules[document.documentElement.lang.startsWith('en')?'en':'zh'];const norm=s=>s.replace(/\s/g,'');return [...doc.querySelectorAll('p')].filter(p=>!p.querySelector('a')&&!p.closest('.rules-at-a-glance')).every(p=>norm(document.querySelector('#rules-body').textContent).includes(norm(p.textContent)));}));
   const first=chapters.first();await first.locator('summary').focus();await first.locator('summary').press('Enter');assert(await first.evaluate(n=>n.open));
   await page.locator('[data-site-language]').first().click();assert(await first.evaluate(n=>n.open));
   await page.evaluate(()=>location.hash='s5');await page.waitForFunction(()=>document.querySelector('#s5').closest('details').open);
   const before=await chapters.evaluateAll(ns=>ns.map(n=>n.open));await page.evaluate(()=>dispatchEvent(new Event('beforeprint')));assert.equal(await page.locator('.site-rule-chapter details[open]').count(),8);
   await page.evaluate(()=>dispatchEvent(new Event('afterprint')));assert.deepEqual(await chapters.evaluateAll(ns=>ns.map(n=>n.open)),before);
   await page.goto(base+'arena.html?lang='+lang,{waitUntil:'networkidle'});assert.equal(await page.locator('#encoding').evaluate(n=>n.open),false);
   await page.locator('a[href="#spaces"]').first().click();await page.locator('.obs-layout').waitFor();assert(await page.locator('#encoding').evaluate(n=>n.open));
   await page.goto(base+'arena.html?lang='+lang+'#results',{waitUntil:'networkidle'});assert(await page.locator('#experiments').evaluate(n=>n.open));
   await page.goto(base+'probability.html?lang='+lang,{waitUntil:'networkidle'});
   const disclosures=page.locator('main>.section>.site-disclosure');assert.equal(await disclosures.count(),3);
   for(let i=0;i<3;i++)await disclosures.nth(i).locator(':scope>summary').click();
   await page.waitForFunction(()=>{const svg=document.querySelector('#trend-svg');return Math.abs(svg.viewBox.baseVal.width-Math.max(240,svg.parentElement.clientWidth))<1;});
   assert((await page.locator('#highest-table tbody tr').count())>=6);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   await page.close();
   console.log('PASS disclosures',lang,width,': keyboard, canonical rules, language, hash, print restoration, charts');
  }
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
