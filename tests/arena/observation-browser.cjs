// PLAYWRIGHT_MODULE=/path/to/playwright PLAYTEST_URL=http://localhost:8000/ node tests/arena/observation-browser.cjs
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const sample=require('../../arena/observation-example.json'),o=sample.observation;
const base=process.env.PLAYTEST_URL||'http://127.0.0.1:59157/';
(async()=>{const browser=await chromium.launch({headless:true,channel:'chrome'});const errors=[];
try{
for(const [width,height] of [[1440,1000],[1280,800],[1280,720],[1280,600],[768,1024],[390,844],[320,568],[844,390]])for(const lang of ['en','zh-CN'])for(const theme of ['light','dark']){
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
 assert.equal(await p.locator('.obs-mask').count(),0);
 assert.deepEqual((await p.locator('.obs-group-count').allTextContents()).map(Number),[9,9,18,36,1,1]);
 assert((await p.locator('.obs-action-groups .obs-bit').count())<=14);
 assert.deepEqual(await p.locator('.obs-mask-padding .obs-bit').evaluateAll(ns=>ns.map(n=>[Number(n.dataset.index),Number(n.textContent)])),[[74,0],[75,0],[511,0]]);
 assert((await p.locator('.obs-mask-padding').innerText()).includes('438'));
 const previews=await p.locator('[data-group]').evaluateAll(ns=>ns.map(n=>({key:n.dataset.group,indices:[...n.querySelectorAll('.obs-bit')].map(b=>Number(b.dataset.index))})));
 for(const {key,indices} of previews)for(const i of indices){
   const a=o.legal_actions[i],actual=a.type!=='swap'?a.type:['deck','blind'].includes(a.target.zone)?a.target.zone:a.target.who===o.player?'own':'rival';
   assert.equal(actual,key,'sample bits must belong to the displayed group');
 }
 // Every grouped index maps to 1; padding covers the remaining 0s. No omitted legal indices.
 assert.deepEqual(await p.locator('.obs-mask-range code').allTextContents(),['action_mask[0–73] = 1','action_mask[74–511] = 0']);
 const mappings=await p.locator('[data-group]').evaluateAll(ns=>ns.map(n=>({key:n.dataset.group,text:n.querySelector('.obs-mask-indices code').textContent})));
 const mask=new Array(512).fill(0);
 for(const {key,text} of mappings){
  const indices=text.slice(1,-1).split(', ').flatMap(range=>{const [first,last=first]=range.split('–').map(Number);return Array.from({length:last-first+1},(_,i)=>first+i);});
  const expected=o.legal_actions.flatMap((a,i)=>(a.type!=='swap'?a.type:['deck','blind'].includes(a.target.zone)?a.target.zone:a.target.who===o.player?'own':'rival')===key?[i]:[]);
  assert.deepEqual(indices,expected,'complete exact mask mapping for '+key);
  for(const i of indices){assert.equal(mask[i],0,'each legal slot belongs to one group');mask[i]=1;}
 }
 assert.deepEqual(mask,Array.from({length:512},(_,i)=>+(i<o.legal_actions.length)));
 assert.equal(await p.locator('#obs-candidate option').count(),74);
 await p.locator('.obs-meta summary').click();
 assert.equal(await p.locator('.obs-meta-table tbody tr').count(),18);
 for(const group of ['deck','blind','rival','own','skip_swap','stop_swaps']){
   await p.locator(`[data-group="${group}"] .obs-group-button`).click();
   assert.equal(await p.locator(`[data-group="${group}"] .obs-group-button`).getAttribute('aria-pressed'),'true');
 }
 // Each displayed sample is a real control, not a shortcut to the group's first action.
 const examples=await p.locator('.obs-mask-slot[data-action]').evaluateAll(ns=>ns.map(n=>n.dataset.action));
 for(const index of examples){
   const button=p.locator(`.obs-mask-slot[data-action="${index}"]`);await button.click();
   assert.equal(await p.locator('#obs-candidate').inputValue(),index);
   assert.equal(await p.locator('.obs-board-inspection').getAttribute('data-action-index'),index);
   assert.equal(await p.locator('.obs-action-groups .is-inspected').getAttribute('data-index'),index);
   assert.equal(await p.locator(`.obs-mask-slot[data-action="${index}"]`).evaluate(n=>document.activeElement===n),true);
 }
 // Keyboard activation selects the actual numbered candidate as well.
 const lastExample=p.locator('[data-group="rival"] .obs-mask-slot').last();
 const keyboardIndex=await lastExample.getAttribute('data-action');await lastExample.focus();await lastExample.press('Enter');
 assert.equal(await p.locator('#obs-candidate').inputValue(),keyboardIndex);
 assert.equal(await p.locator('.obs-board-inspection strong').textContent(),(await p.locator('.obs-action-detail>strong').textContent()).replace(/^\[\d+\] /,''));
 // Round-trip between scene and tensor labels.
 await p.locator('.obs-zone[data-zone="2"] [data-zone-link]').click();
 assert.equal(await p.locator('.obs-board-zone.is-zone-linked').count(),1);
 assert.equal(await p.locator('.obs-zone.is-zone-linked').count(),1);
 await p.locator('.obs-board-zone[data-board-zone="2"] [data-zone-link]').click();
 assert.equal(await p.locator('.obs-zone.is-zone-linked').count(),0);
 await p.locator('.obs-action-encoding summary').click();
 await p.locator('.obs-action-rules summary').click();
 for(const i of (width===1440&&lang==='en'&&theme==='light'?Array.from({length:74},(_,i)=>i):[1,2,4,42,72,73])){
  await p.locator('#obs-candidate').selectOption(String(i));
  assert.equal(await p.locator('.obs-action-groups .is-inspected').getAttribute('data-index'),String(i));
  assert.equal(await p.locator('.obs-board-inspection').getAttribute('data-action-index'),String(i));
  assert.equal(await p.locator('.obs-selected-mask').textContent(),`action_mask[${i}] = 1`);
  assert.deepEqual(await p.locator('.obs-mask-range code').allTextContents(),['action_mask[0–73] = 1','action_mask[74–511] = 0'],'inspection must not change mask values');
  assert.equal(await p.locator('.obs-board-inspection strong').textContent(),(await p.locator('.obs-action-detail>strong').textContent()).replace(/^\[\d+\] /,''));
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
 // On desktop, the board follows document scroll at every window height and stops at the explorer's end.
 if(width>1100){
  for(const selector of ['.obs-phase','.obs-actions','.obs-action-controls']){
    await p.locator(selector).evaluate(n=>n.scrollIntoView({block:'start',behavior:'instant'}));
    const rect=await p.locator('.obs-board').evaluate(n=>({top:n.getBoundingClientRect().top,bottom:n.getBoundingClientRect().bottom,position:getComputedStyle(n).position}));
    assert.equal(rect.position,'sticky');assert(Math.abs(rect.top-16)<1,`sticky top ${width}×${height} ${selector}: ${rect.top}`);
    assert(rect.bottom<=height-15,`board fits ${width}×${height}`);
  }
  await p.locator('.obs-layout').evaluate(n=>scrollTo({top:n.getBoundingClientRect().bottom+scrollY,behavior:'instant'}));
  const end=await p.locator('.obs-board').evaluate(n=>({bottom:n.getBoundingClientRect().bottom,parentBottom:n.parentElement.getBoundingClientRect().bottom}));
  assert(end.bottom<=end.parentBottom+1,'sticky board must not escape its section');assert(end.bottom<=1,'board leaves with the section');
 }else assert.equal(await p.locator('.obs-board').evaluate(n=>getComputedStyle(n).position),'static');
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`page overflow ${width} ${lang} ${theme}`);
 const overflowing=await p.locator('.obs-layout *').evaluateAll(nodes=>nodes.filter(n=>n.clientWidth>0&&n.scrollWidth>n.clientWidth+2&&!['TABLE','TBODY','THEAD','TR','SELECT'].includes(n.tagName)).map(n=>({cls:String(n.className),w:n.clientWidth,scroll:n.scrollWidth})));
 assert.deepEqual(overflowing,[],`element overflow ${width} ${lang} ${theme}`);
 // Language switches preserve inspected candidate and expanded disclosures.
 await p.locator('[data-site-language]').first().click();
 await p.waitForFunction(l=>document.documentElement.lang!==l,lang);
 for(const cls of ['obs-meta','obs-action-encoding','obs-action-rules'])assert.equal(await p.locator('.'+cls).evaluate(n=>n.open),true);
 assert.equal(await p.locator('#obs-candidate').inputValue(),'73');
 assert((await p.locator('.obs-phase').innerText()).includes(lang==='en'?'换牌':'Swap'));
 if((width===1440||width===390)&&theme==='light'){
  await p.locator('.obs-meta summary').click();await p.locator('.obs-action-encoding summary').click();await p.locator('.obs-action-rules summary').click();await p.locator('#obs-candidate').selectOption('2');
  await p.locator('.obs-board').screenshot({path:`/tmp/action-board-${width}-${lang}.png`});
  await p.locator('.obs-actions').screenshot({path:`/tmp/action-panel-${width}-${lang}.png`});
  if(width===1440){await p.locator('.obs-actions').evaluate(n=>n.scrollIntoView({block:'start',behavior:'instant'}));await p.screenshot({path:`/tmp/action-follow-${lang}.png`});}
 }
 await p.close();
}
// Failed data loading leaves readable static contract, without a partially painted board.
const p=await browser.newPage();await p.route('**/observation-example.json*',route=>route.abort());await p.goto(base+'arena.html?lang=en',{waitUntil:'networkidle'});assert(await p.locator('#arena-observation .rl-spaces').isVisible());await p.close();
assert.deepEqual(errors,[]);console.log('Arena explorer: 32 viewport/language/theme combinations; bounded sticky board across laptop heights; numbered candidate pointer/keyboard controls; six action groups with complete exact mask indices, 74 ones and 438 zeros; all 74 actions, 336 state values and 72 candidate features; board highlights, language switches and load fallback passed.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
