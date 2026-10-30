'use strict';
// brand-mark.svg is the source for every public lockup and embedded PNG artwork.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),root=path.resolve(__dirname,'..');
function sync(check=false){
 const read=p=>fs.readFileSync(path.join(root,p),'utf8'),mark=read('brand-mark.svg').trim();
 const stale=[];
 const update=(p,next)=>{if(read(p)===next)return;if(check)stale.push(p);else fs.writeFileSync(path.join(root,p),next);};
 const flower=mark.replace(/^<svg[^>]*><rect[^>]*\/>/,'').replace(/<\/svg>$/,'');
 if(!flower.startsWith('<g')||flower.includes('<rect'))throw new Error('Unexpected canonical flower structure');
 const flowerSvg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">'+flower+'</svg>';
 const runtimeFlower=flowerSvg.replaceAll('#C5416B','var(--sz-logo-petal,#D83B74)').replaceAll('#F2CD5D','var(--sz-logo-center,#F2CD5D)');
 update('app/mark.js','window.SZFlowerMark='+JSON.stringify(runtimeFlower)+';');
 const mono=flower.replaceAll('#C5416B','#000').replaceAll('#F2CD5D','#fff');
 update('brand-mark-solid.svg','<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" color="#2A3331"><defs><mask id="cut"><rect width="64" height="64" fill="#fff"/>'+mono+'</mask></defs><rect x="9" y="3" width="46" height="58" rx="7" fill="currentColor" mask="url(#cut)"/></svg>\n');
 const raw=read('app/bloom-assets.js'),match=raw.match(/window\.SZBloomAssets=(\{[\s\S]*\});/);
 if(!match)throw new Error('Missing bloom asset bundle');
 const assets=JSON.parse(match[1]);assets.brand=mark;
 const ctx={window:{}};for(const file of ['theme-tokens.js','card-face.js','mark.js'])vm.runInNewContext(read('app/'+file),ctx);
 const tokens=ctx.window.SZThemeTokens;assets.cardStyle={...tokens.card,goldCenter:tokens.brand.gold};
 assets.cardSuits=[0,1,2,3].map(i=>ctx.window.SZSuit.svg(i));
 assets.cardFlower=ctx.window.SZFlowerMark.replace(/var\(--sz-logo-petal,[^)]+\)/g,tokens.brand.red).replace(/var\(--sz-logo-center,[^)]+\)/g,tokens.brand.gold);
 update('app/bloom-assets.js',raw.replace(match[0],'window.SZBloomAssets='+JSON.stringify(assets)+';'));
 const html=read('index.html'),header=/<svg class="brand-symbol"[\s\S]*?<\/svg>/;
 if(!header.test(html))throw new Error('Missing header brand');
 update('index.html',html.replace(header,mark.replace('<svg ','<svg class="brand-symbol" aria-hidden="true" ')));
 const lockup=/<svg\b[^>]*aria-label="深圳花牌标志"[^>]*>[\s\S]*?<\/svg>/g;
 const replaceLockup=html=>html.replace(lockup,old=>{const cls=old.match(/ class="[^"]*"/);return mark.replace('<svg ','<svg'+(cls?cls[0]:'')+' ');});
 const nav=read('app/site-header.js'),template=nav.match(/const markup=("(?:[^"\\]|\\.)*");/);
 if(!template)throw new Error('Missing shared navigation template');
 const markup=JSON.parse(template[1]);
 if(!markup.includes('aria-label="深圳花牌标志"'))throw new Error('Missing shared navigation brand');
 update('app/site-header.js',nav.replace(template[0],'const markup='+JSON.stringify(replaceLockup(markup))+';'));
 for(const page of ['brand.html','about.html','probability.html','arena.html','rules.html']){
  const html=read(page);
  if(!html.includes('data-site-header')||!html.includes('app/site-header.js'))throw new Error('Missing shared navigation: '+page);
  // Identity also has a large inline lockup; all navigation logos live in the shared template.
  update(page,replaceLockup(html).replace(/(<span class="site-card-flower"[^>]*>)<svg[\s\S]*?<\/svg>/g,'$1<svg viewBox="8 12 48 48">'+flower+'</svg>'));
 }
 update('assets/brand-mark-dark.svg',read('brand-mark.svg'));
 if(stale.length)throw new Error('Brand copies are stale: '+stale.join(', ')+'. Run node scripts/sync-brand.cjs.');
}
module.exports=sync;
if(require.main===module)sync(process.argv.includes('--check'));
