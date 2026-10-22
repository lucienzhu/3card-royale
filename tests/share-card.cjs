'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),ROOT=path.resolve(__dirname,'..'),S=require('../app/share-card.js'),B=require('../app/bloom.js'),F=require('../app/finale.js'),ctx={window:{}};
for(const n of ['bloom-assets.js','share-assets.js'])vm.runInNewContext(fs.readFileSync(path.join(ROOT,'app',n),'utf8'),ctx);
const results=[{game:1,winner:0,from:2,to:6,gain:4,rounds:5,damage:[1,5],match_won:false,ace_challenger:null},{game:2,winner:1,from:2,to:4,gain:2,rounds:3,damage:[5,3],match_won:false,ace_challenger:null},{game:3,winner:0,from:6,to:14,gain:8,rounds:4,damage:[1,9],match_won:false,ace_challenger:null},{game:4,winner:1,from:4,to:5,gain:1,rounds:5,damage:[5,4],match_won:false,ace_challenger:0,aLosses:[1,0]},{game:5,winner:0,from:14,to:14,gain:2,rounds:4,damage:[3,5],match_won:true,ace_challenger:0,aLosses:[1,0]}];
const input={results,snapshot:{players:[{level:14},{level:5}],aLosses:[1,0],phase:'match_over',levelOwner:0},first:0,seed:42,version:'1.0.0',match:true},before=JSON.stringify(input),d=S.summarize(input);
assert.deepEqual(d.wins,[3,2]);assert.equal(d.rounds,21);assert.equal(d.firstAce,3);assert.equal(d.setbacks,1);assert.equal(JSON.stringify(input),before);d.results[0].winner=1;assert.equal(input.results[0].winner,0);
let cases=0;for(const lang of ['zh-CN','en'])for(const theme of ['light','dark'])for(const winner of [0,1])for(const match of [true,false]){
 const data=S.summarize({...input,lang,theme,match,results:[...results.slice(0,-1),{...results.at(-1),winner,match_won:match}]});const svg=S.makeSVG(data,ctx.window.SZBloomAssets,ctx.window.SZShareAssets.cityStyle,B,F);
 assert(svg.includes('width="1080" height="1440"'));assert(!svg.includes('foreignObject'));assert(!svg.includes('var(--'));assert(!svg.includes('transform-origin'));assert(svg.includes('transform="rotate(120 32 36)"'));assert(svg.includes('transform="rotate(-120 32 36)"'));assert(!/@import|<image|<script/.test(svg));assert(svg.includes('data-skyline-revision="layer19"'));assert(svg.includes(match?(lang==='en'?'in bloom.':'开花了。'):(lang==='en'?'won this game.':'赢下这一局。')));assert(svg.includes(theme==='dark'?'#0C2118':'#EDF4EF'));assert.equal(svg.includes('#DCE6E0'),match);assert(svg.includes('id="szf1"'));assert.equal(svg.includes(winner===0?'#C5416B':'#D6A41C'),true);assert(S.filename(data).endsWith('.png'));cases++;
}
assert.throws(()=>S.summarize({results:[]}));assert.throws(()=>S.summarize({...input,results:results.slice(0,-1)}));
for(const version of ['0.3.8','0.3.7']){const data=S.summarize({...input,version,match:false}),svg=S.makeSVG(data,ctx.window.SZBloomAssets,ctx.window.SZShareAssets.cityStyle,B,F);assert(svg.includes('规则 '+version));assert(!svg.includes('闯关成功'));}
const privateState=S.summarize({...input,snapshot:{...input.snapshot,players:[{level:14,hand:[1,2,3]},{level:5,hand:[11,12,13]}]}});assert(privateState.snapshot.players.every(p=>!('hand' in p)));
const bad=S.summarize({...input,match:false,version:'<script>&"'});assert(S.makeSVG(bad,ctx.window.SZBloomAssets,ctx.window.SZShareAssets.cityStyle,B,F).includes('&lt;script&gt;&amp;&quot;'));assert.equal(JSON.stringify(input),before);
// WeChat on iOS: a share carries one kind of item, never a title or text beside the PNG.
const png={name:'shenzhen-flower-match-42-5.png',type:'image/png'},both={share(){},canShare:()=>true},linkOnly={share(){},canShare:x=>!('files' in x)};
let pay=S.sharePayload(png,both,d);assert.deepEqual(Object.keys(pay),['files']);assert.deepEqual(pay.files,[png]);
for(const nav of [linkOnly,{share(){}}])for(const lang of ['zh-CN','en']){pay=S.sharePayload(png,nav,{...d,lang});assert.deepEqual(Object.keys(pay).sort(),['title','url']);assert.equal(pay.url,S.SHARE_URL);assert.equal(pay.title,lang==='en'?'3Card Royale':'深圳花牌');}
for(const nav of [undefined,{},{canShare:()=>true},{share(){},canShare(){throw new TypeError('blocked');}}])assert.equal(S.sharePayload(png,nav,d),null);
// The copy path hands WeChat the image itself; it needs clipboard.write and a ClipboardItem that takes PNG.
const clip={clipboard:{write(){}}},Item=function(){},PngItem=Object.assign(function(){},{supports:t=>t==='image/png'}),NoPng=Object.assign(function(){},{supports:()=>false});
assert.equal(S.copySupported(clip,Item),true);assert.equal(S.copySupported(clip,PngItem),true);
for(const [nav,I] of [[clip,NoPng],[clip,undefined],[{},Item],[undefined,Item],[{clipboard:{}},Item],[clip,Object.assign(function(){},{supports(){throw new Error('x');}})]])assert.equal(S.copySupported(nav,I),false);
console.log(JSON.stringify({share_card:'passed',share_payload:'png_alone_or_link_alone',copy_image:'png',render_cases:cases,width:S.WIDTH,height:S.HEIGHT,results_unchanged:true,self_contained_svg:true}));
