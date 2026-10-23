'use strict';
// Cross-surface contracts: a changed palette/mark/rule source must not leave a stale consumer.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),root=path.resolve(__dirname,'..');
module.exports=function(){
 const read=p=>fs.readFileSync(path.join(root,p),'utf8'),ctx={window:{}};
 vm.runInNewContext(read('app/theme-tokens.js'),ctx);const t=ctx.window.SZThemeTokens;
 const css=read('app/tokens.css'),site=read('site.css'),share=require('../app/share-card.js').palettes;
 const block=(text,start)=>{const i=text.indexOf(start);assert(i>=0,start);return Object.fromEntries([...text.slice(i,text.indexOf('}',i)).matchAll(/--([\w-]+):\s*(#[\dA-Fa-f]{6})\b/g)].map(m=>[m[1],m[2].toUpperCase()]));};
 const light=block(css,':root,[data-sz-theme=light]'),dark={...light,...block(css,'[data-sz-theme=dark]{')};
 const siteLight=block(site,'html:root,html[data-sz-theme=light]'),siteDark={...siteLight,...block(site,'html[data-sz-theme=dark]{')};
 const names={paper:'paper',panel:'panel',table:'table',ink:'ink',muted:'muted',line:'line',red:'red',redText:'red-text',redTint:'red-tint',redDeep:'red-deep',gold:'gold',goldText:'gold-text',goldTint:'gold-tint',green:'leaf',greenText:'leaf-text',greenTint:'leaf-tint'};
 for(const [theme,component,website] of [['light',light,siteLight],['dark',dark,siteDark]])for(const [key,variable]of Object.entries(names)){
  assert.equal(component[variable],t[theme][key],theme+' component '+key);
  if(key in share[theme])assert.equal(share[theme][key],t[theme][key],theme+' PNG '+key);
  if(variable in website)assert.equal(website[variable],t[theme][key],theme+' website '+key);
 }
 for(const [key,variable]of Object.entries({face:'card-face',ink:'card-ink',red:'card-red',edge:'card-edge',selected:'selected'}))assert.equal(light[variable],t.card[key],key);
 for(const [key,variable]of Object.entries({red:'red',gold:'gold-center',goldBase:'gold-base',goldEdge:'gold-edge'}))assert.equal(light[variable],t.brand[key],key);
 const art={window:{}};vm.runInNewContext(read('app/bloom-assets.js'),art);assert.deepEqual({...art.window.SZBloomAssets.cardStyle},{...t.card,goldCenter:t.brand.gold},'PNG card colors must match table tokens');
 const brand=read('brand-mark.svg');for(const color of Object.values(t.brand))assert(brand.includes(color),'Brand missing '+color);
 assert(!/linearGradient|radialGradient|metal/i.test(brand),'Primary mark must be the current flat card');
 const copy=JSON.parse(read('brand.html').match(/window.SC_COPY=(\{.*?\});/s)[1]);assert(copy.downloadSubcss.every(x=>x.includes('v3')),'VI label is stale');
 const rules=JSON.parse(read('app/standard-rules.js').replace(/^window.SZStandardRules=/,'').replace(/;\s*$/,''));
 const plain=s=>s.replace(/^\d+\.\s+/gm,'').replace(/<[^>]*>/g,'').replace(/\[([^\]]+)\]\([^)]*\)/g,'$1').replace(/&(?:amp|nbsp|lt|gt|quot);/g,'').replace(/[^\p{L}\p{N}]/gu,'');
 for(const [lang,file]of [['en','docs/RULES.md'],['zh','docs/RULES.zh-CN.md']])assert(plain(rules[lang])===plain(read(file)),'Browser rules differ from '+file);
 // Inline scripts are also executable code; an old sample had duplicate const declarations.
 for(const name of fs.readdirSync(root).filter(n=>n.endsWith('.html')&&!n.startsWith('__')))for(const [i,m]of [...read(name).matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)].entries()){
  if(/\bsrc=|application\/(?:ld\+)?json/.test(m[1]))continue;
  new vm.Script(m[2],{filename:name+':inline-'+i});
 }
 console.log('OK: design palettes, current VI labels, canonical logo, embedded rules and inline scripts.');
};
if(require.main===module)module.exports();
