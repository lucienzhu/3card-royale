// PLAYWRIGHT_MODULE=/path/to/playwright PLAYTEST_URL=http://localhost:8000/ node tests/arena/observation-browser.cjs
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const sample=require('../../arena/observation-example.json'),o=sample.observation;
const base=process.env.PLAYTEST_URL||'http://127.0.0.1:59157/';
(async()=>{const browser=await chromium.launch({headless:true,channel:'chrome'});const errors=[];
try{
for(const [width,height] of [[1440,1000],[1280,800],[768,1024],[390,844],[320,568],[844,390]])for(const lang of ['en','zh-CN'])for(const theme of ['light','dark']){
 const p=await browser.newPage({viewport:{width,height}});p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(theme=>localStorage.setItem('sz_visual_theme_v1',theme),theme);
 await p.goto(base+'arena.html?lang='+lang,{waitUntil:'networkidle'});
 await p.locator('.obs-layout').waitFor();
 assert.equal(await p.locator('.obs-zone').count(),6);
 const actual=await p.locator('.obs-zones .obs-card-grid .obs-bit, .obs-phases .obs-bit').allTextContents();
 assert.deepEqual(actual.map(Number),sample.state.slice(0,318));
 const groups=[o.hand,o.wounds,o.enemy_wounds,o.discard,[],[]];
 for(let zone=0;zone<6;zone++)assert.deepEqual(await p.locator(`.obs-board .obs-playing-card[data-board-zone="${zone}"]`).evaluateAll(ns=>ns.map(n=>Number(n.dataset.card))),groups[zone]);
 assert.equal(await p.locator('.obs-hidden .obs-back').count(),o.enemy_hand_count);
 assert.equal(await p.locator('.obs-mask .is-set').count(),sample.candidateCount);
 assert.equal(await p.locator('.obs-mask .obs-bit').count(),512);
 assert.equal(await p.locator('#obs-candidate option').count(),74);
 await p.locator('.obs-meta summary').click();
 assert.equal(await p.locator('.obs-meta-table tbody tr').count(),18);
 for(const group of ['deck','blind','rival','own','skip_swap','stop_swaps']){
   await p.locator(`[data-group="${group}"]`).click();
   assert.equal(await p.locator(`[data-group="${group}"]`).getAttribute('aria-pressed'),'true');
 }
 // Round-trip between scene and tensor labels.
 await p.locator('.obs-zone[data-zone="2"] [data-zone-link]').click();
 assert.equal(await p.locator('.obs-board-zone.is-zone-linked').count(),1);
 assert.equal(await p.locator('.obs-zone.is-zone-linked').count(),1);
 await p.locator('.obs-board-zone[data-board-zone="2"] [data-zone-link]').click();
 assert.equal(await p.locator('.obs-zone.is-zone-linked').count(),0);
 await p.locator('.obs-action-encoding summary').click();
 await p.locator('.obs-action-counting summary').click();
 await p.locator('.obs-action-rules summary').click();
 for(const i of (width===1440&&lang==='en'&&theme==='light'?Array.from({length:74},(_,i)=>i):[1,2,4,42,72,73])){
  await p.locator('#obs-candidate').selectOption(String(i));
  assert.equal(await p.locator('.obs-mask .is-inspected').getAttribute('data-index'),String(i));
  const f=sample.candidates[i],a=o.legal_actions[i];
  assert.deepEqual((await p.locator('.obs-action-features .obs-bit').allTextContents()).map(Number),f.slice(0,57));
  (await p.locator('.obs-extra-table tr td:last-child').allTextContents()).map(Number).forEach((v,k)=>assert(Math.abs(v-f[57+k])<=0.000001));
  if(a.type==='swap'){
    assert.equal(await p.locator('.obs-board .is-source').getAttribute('data-card'),String(o[a.source.zone][a.source.index]));
    const z=a.target,target=p.locator('.obs-board .is-target');assert.equal(await target.count(),1);
    if(['blind','deck'].includes(z.zone))assert.equal(await target.getAttribute('data-target'),z.zone);
    else assert.equal(await target.getAttribute('data-card'),String(z.who===o.player?o[z.zone][z.index]:o.enemy_wounds[z.index]));
  }else{assert.equal(await p.locator('.obs-board .is-source,.obs-board .is-target').count(),0);}
 }
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`page overflow ${width} ${lang} ${theme}`);
 const overflowing=await p.locator('.obs-layout *').evaluateAll(nodes=>nodes.filter(n=>n.clientWidth>0&&n.scrollWidth>n.clientWidth+2&&!['TABLE','TBODY','THEAD','TR','SELECT'].includes(n.tagName)).map(n=>({cls:String(n.className),w:n.clientWidth,scroll:n.scrollWidth})));
 assert.deepEqual(overflowing,[],`element overflow ${width} ${lang} ${theme}`);
 // Language switches preserve inspected candidate and expanded disclosures.
 await p.locator('[data-site-language]').first().click();
 await p.waitForFunction(l=>document.documentElement.lang!==l,lang);
 for(const cls of ['obs-meta','obs-action-encoding','obs-action-counting','obs-action-rules'])assert.equal(await p.locator('.'+cls).evaluate(n=>n.open),true);
 assert.equal(await p.locator('#obs-candidate').inputValue(),'73');
 assert((await p.locator('.obs-phase').innerText()).includes(lang==='en'?'换牌':'Swap'));
 if((width===1440||width===390)&&theme==='light'){
  await p.locator('.obs-meta summary').click();await p.locator('.obs-action-encoding summary').click();await p.locator('.obs-action-rules summary').click();await p.locator('.obs-action-counting summary').click();await p.locator('#obs-candidate').selectOption('2');
  await p.locator('.obs-board').screenshot({path:`/tmp/action-board-${width}-${lang}.png`});
  await p.locator('.obs-actions').screenshot({path:`/tmp/action-panel-${width}-${lang}.png`});
 }
 await p.close();
}
// Failed data loading leaves readable static contract, without a partially painted board.
const p=await browser.newPage();await p.route('**/observation-example.json*',route=>route.abort());await p.goto(base+'arena.html?lang=en',{waitUntil:'networkidle'});assert(await p.locator('#arena-observation .rl-spaces').isVisible());await p.close();
assert.deepEqual(errors,[]);console.log('Arena explorer: 24 viewport/language/theme combinations; all 74 actions, 336 state values and 72 candidate features; board highlights, language switches and load fallback passed.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
