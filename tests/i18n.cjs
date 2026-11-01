'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
const rows=[];vm.runInNewContext(read('app/locales/catalog.js'),{SZI18n:{add:r=>rows.push(...r)}});
const keys=new Set(),slots=s=>[...s.matchAll(/\{\w+\}/g)].map(m=>m[0]).sort();
for(const row of rows){
 assert.equal(row.length,4);assert(!keys.has(row[0]),'Duplicate source: '+row[0]);keys.add(row[0]);
 for(const value of row.slice(1)){assert(value.trim(),'Empty translation: '+row[0]);assert.deepEqual(slots(value),slots(row[0]),'Placeholder mismatch: '+row[0]);}
}
function context(url='',stored=null,browser='en'){
 const ctx={URL,location:{href:'https://example.test/?'+url},navigator:{language:browser},localStorage:{getItem:()=>stored},document:{documentElement:{lang:''},readyState:'loading',addEventListener(){}}};
 ctx.window=ctx;vm.createContext(ctx);vm.runInContext(read('app/i18n.js'),ctx);vm.runInContext(read('app/locales/catalog.js'),ctx);return ctx;
}
for(const [url,stored,browser,want] of [
 ['lang=ja-JP','es','ko-KR','ja'],['','es-MX','ko-KR','es'],['',null,'ko-KR','ko'],['lang=xx',null,'fr','en'],['lang=zh-TW',null,'en','zh-CN']
])assert.equal(context(url,stored,browser).SZI18n.language,want);
const ctx=context(),i18n=ctx.SZI18n;
assert.equal(i18n.pair('进攻','Attack','zh-CN'),'进攻');assert.equal(i18n.pair('进攻','Attack','en'),'Attack');
for(const [lang,attack] of [['ja','攻撃'],['ko','공격'],['es','Ataque']]){
 assert.equal(i18n.translate('Attack',lang),attack);
 assert(!/Straight flush|pts/.test(i18n.translate('Straight flush · 4 pts',lang)));
 assert(!/Flush|pts/.test(i18n.translate('Flush · 3 pts',lang)));
 assert.notEqual(i18n.translate('Game 6 · Round 2',lang),'Game 6 · Round 2');
 assert(!i18n.translate('Game 6 · Round 2',lang).includes('{'));
 assert.equal(i18n.translate('PLAY_3 / actions-v2 / 52,5,18,31,65,65',lang),'PLAY_3 / actions-v2 / 52,5,18,31,65,65');
 const scope=i18n.translate('0.3.2 · Three of a kind > Straight flush > Flush > Straight > Pair > High card · ♥2 Wildcard · 2 level · 52 cards random pool without replacement · 8 choose 3 = 56 combinations · one play only.',lang);
 assert(!/Wildcard|level|replacement|combinations|one play/.test(scope),scope);
}
ctx.SZStandardRules={};vm.runInContext(read('app/locales/rules.js'),ctx);
for(const lang of ['ja','ko','es']){
 const html=ctx.SZStandardRules[lang];assert.equal((html.match(/<h2>\d\./g)||[]).length,8,lang+' needs all eight rule chapters');
 assert(!/<script|undefined|NaN/.test(html));
}
// Exercise production SVG exports, including opaque names that are also UI keys.
for(const file of ['bloom-assets.js','share-assets.js','share-card.js'])vm.runInContext(read('app/'+file),ctx);
const GK=require('../gamecore.js'),g=new GK.Game(19,{version:'1.0.0',first:0});
while(!['game_over','match_over'].includes(g.phase))g.aiStep();
const raw={results:g.results,snapshot:g.snapshot(),events:g.events,first:0,seed:19,version:'1.0.0',match:false},before=JSON.stringify(raw),S=ctx.SZShareCard;
let exportCases=0;
for(const lang of ['ja','ko','es'])for(const theme of ['light','dark'])for(const layout of ['recap','finish','highlight']){
 const d=S.summarize({...raw,lang,theme,layout,playerName:'Attack'}),svg=S.makeSVG(d,ctx.SZBloomAssets);
 assert(svg.includes('Attack'),'A player name must not be translated');
 assert(svg.includes(i18n.translate({recap:'Game recap',finish:'Final hand',highlight:'Best play'}[layout],lang)));
 assert(!/undefined|NaN|\{who\}|\{n\}/.test(svg));
 assert(!/You won game|Three cards\. Make them bloom|Deals? \d+ wounds?/.test(svg));
 exportCases++;
}
const B=require('../app/bloom.js'),F=require('../app/finale.js');
const results=[{game:1,winner:0,from:2,to:14,gain:12,rounds:5,damage:[1,13],match_won:false,ace_challenger:null},{game:2,winner:0,from:14,to:14,gain:2,rounds:4,damage:[3,5],match_won:true,ace_challenger:0,aLosses:[0,0]}];
for(const lang of ['ja','ko','es'])for(const theme of ['light','dark'])for(const playerName of ['', 'Attack']){
 const d=S.summarize({results,snapshot:{players:[{level:14},{level:2}],aLosses:[0,0],phase:'match_over',levelOwner:0},first:0,seed:42,version:'1.0.0',match:true,lang,theme,playerName});
 const svg=S.makeSVG(d,ctx.SZBloomAssets,ctx.SZShareAssets.cityStyle,B,F);
 assert(!/in bloom|you’re|Your rival|You,|undefined|NaN/.test(svg));
 assert(svg.includes(i18n.translate('in bloom.',lang)));if(playerName)assert(svg.includes(playerName));exportCases++;
}
assert.equal(JSON.stringify(raw),before,'Translations must not mutate game records');
console.log(`OK: ${rows.length} three-language entries, locale precedence, placeholders, full rules, ${exportCases} localized share exports and opaque player names.`);
