'use strict';
// brand-mark.svg is the source for the header, dark-mode download and embedded PNG artwork.
const fs=require('node:fs'),path=require('node:path'),root=path.resolve(__dirname,'..');
function sync(check=false){
 const read=p=>fs.readFileSync(path.join(root,p),'utf8'),mark=read('brand-mark.svg').trim();
 const stale=[];
 const update=(p,next)=>{if(read(p)===next)return;if(check)stale.push(p);else fs.writeFileSync(path.join(root,p),next);};
 const raw=read('app/bloom-assets.js'),match=raw.match(/window\.SZBloomAssets=(\{[\s\S]*\});/);
 if(!match)throw new Error('Missing bloom asset bundle');
 const assets=JSON.parse(match[1]);assets.brand=mark;
 update('app/bloom-assets.js',raw.replace(match[0],'window.SZBloomAssets='+JSON.stringify(assets)+';'));
 const html=read('index.html'),header=/<svg class="brand-symbol"[\s\S]*?<\/svg>/;
 if(!header.test(html))throw new Error('Missing header brand');
 update('index.html',html.replace(header,mark.replace('<svg ','<svg class="brand-symbol" aria-hidden="true" ')));
 update('assets/brand-mark-dark.svg',read('brand-mark.svg'));
 if(stale.length)throw new Error('Brand copies are stale: '+stale.join(', ')+'. Run node scripts/sync-brand.cjs.');
}
module.exports=sync;
if(require.main===module)sync(process.argv.includes('--check'));
