'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),ROOT=path.resolve(__dirname,'..'),S=require('../app/share-card.js'),B=require('../app/bloom.js'),F=require('../app/finale.js'),ctx={window:{}};
for(const n of ['bloom-assets.js','share-assets.js'])vm.runInNewContext(fs.readFileSync(path.join(ROOT,'app',n),'utf8'),ctx);
const results=[{game:1,winner:0,from:2,to:6,gain:4,rounds:5,damage:[1,5],match_won:false,ace_challenger:null},{game:2,winner:1,from:2,to:4,gain:2,rounds:3,damage:[5,3],match_won:false,ace_challenger:null},{game:3,winner:0,from:6,to:14,gain:8,rounds:4,damage:[1,9],match_won:false,ace_challenger:null},{game:4,winner:1,from:4,to:5,gain:1,rounds:5,damage:[5,4],match_won:false,ace_challenger:0,aLosses:[1,0]},{game:5,winner:0,from:14,to:14,gain:2,rounds:4,damage:[3,5],match_won:true,ace_challenger:0,aLosses:[1,0]}];
const input={results,snapshot:{players:[{level:14},{level:5}],aLosses:[1,0],phase:'match_over',levelOwner:0},first:0,seed:42,version:'1.0.0',match:true},before=JSON.stringify(input),d=S.summarize(input);
assert.deepEqual(d.wins,[3,2]);assert.equal(d.rounds,21);assert.equal(d.firstAce,3);assert.equal(d.setbacks,1);assert.equal(JSON.stringify(input),before);d.results[0].winner=1;assert.equal(input.results[0].winner,0);
let cases=0;for(const lang of ['zh-CN','en'])for(const theme of ['light','dark'])for(const winner of [0,1])for(const match of [true,false]){
 const data=S.summarize({...input,lang,theme,match,results:[...results.slice(0,-1),{...results.at(-1),winner,match_won:match}]});const svg=S.makeSVG(data,ctx.window.SZBloomAssets,ctx.window.SZShareAssets.cityStyle,B,F);
 assert(svg.includes('width="1080" height="1440"'));assert(!svg.includes('foreignObject'));assert(!svg.includes('var(--'));assert(!svg.includes('transform-origin'));if(match){assert(svg.includes('transform="rotate(120 32 36)"'));assert(svg.includes('transform="rotate(-120 32 36)"'));}assert(!/@import|<image|<script/.test(svg));assert.equal(svg.includes('data-skyline-revision="layer19"'),match);assert(svg.includes(match?(lang==='en'?'in bloom.':'开花了。'):(lang==='en'?'Won this game':'赢下这一局')));assert(svg.includes(theme==='dark'?'#0C2118':'#EDF4EF'));assert.equal(svg.includes('#DCE6E0'),match);assert.equal(svg.includes('id="szf1"'),match);if(match)assert.equal(svg.includes(winner===0?'#C5416B':'#D6A41C'),true);assert(S.filename(data).endsWith('.png'));cases++;
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
// Share the full, publicly played 3/4/5-card finish, without exposing the next draw
// or the remaining private hands. Keep flower cards physical, with a caption.
const GK=require('../gamecore.js');let handCases=0;
for(const attack of [[6,19,32],[5,18,31,44],[5,18,31,44,13]])for(const winner of [0,1]){
 const g=new GK.Game(42,{version:'1.0.0',first:winner}),defend=[1,4,8],pool=Array.from({length:52},(_,i)=>i).filter(n=>![...attack,...defend].includes(n));
 g.players[winner].hand=attack.slice(1);g.players[winner].table=[{card:attack[0],up:true}];g.players[1-winner].hand=defend;g.players[1-winner].table=pool.splice(0,4).map(card=>({card,up:true}));g.stock=pool;g.check();g.play(winner,attack);g.play(1-winner,defend);g.check();assert.equal(g.phase,'game_over');
 const raw={layout:'highlight',events:g.events,results:g.results,snapshot:g.snapshot(),first:winner,seed:g.seed,version:g.version,match:false},saved=JSON.stringify(raw);
 for(const lang of ['zh-CN','en'])for(const theme of ['light','dark']){
  const data=S.summarize({...raw,lang,theme}),svg=S.makeSVG(data,ctx.window.SZBloomAssets,ctx.window.SZShareAssets.cityStyle,B,F);
  assert.equal((svg.match(/data-card=/g)||[]).length,attack.length+3);assert(svg.includes('data-share-layout="highlight"'));assert(!svg.includes('data-skyline-revision'));assert(!svg.includes('szf1'));assert(svg.includes('data-play="winner"'));assert.deepEqual([...svg.matchAll(/data-player="(\d)"/g)].map(m=>Number(m[1])),[1,0]);
  assert.deepEqual(data.combat.moves[winner].cards,attack);assert.equal(data.combat.moves[winner].wounds[0],true);assert(!('replacements' in data.combat));assert(!('stock' in data.snapshot));assert(data.snapshot.players.every(p=>!('hand' in p)));
  if(attack.length===5){assert.deepEqual(data.combat.moves[winner].wild,{physical:13,as:5});assert(svg.includes('♥2 → ♠7'));}
  data.combat.moves[winner].cards[0]=51;assert.equal(JSON.stringify(raw),saved);handCases++;
 }
}
// Same-score victory must describe the rank tiebreak, not claim zero causes damage.
const tie={...input,layout:'highlight',match:false,results:results.slice(0,1),snapshot:{...input.snapshot,lastCombat:{attacker:0,action:'damage',amount:1,reason:'rank_attack',before:[0,4],after:[0,5],moves:[{...GK.evaluate([10,11,12],2,'1.0.0'),cards:[10,11,12]},{...GK.evaluate([1,2,3],2,'1.0.0'),cards:[1,2,3]}]}}};
const tieSVG=S.makeSVG(S.summarize(tie),ctx.window.SZBloomAssets,ctx.window.SZShareAssets.cityStyle,B,F);assert(tieSVG.includes('你以点数胜出，打出1伤。'));assert(!tieSVG.includes('4 − 4'));
assert.equal(S.summarize({...tie,snapshot:{...tie.snapshot,lastCombat:{...tie.snapshot.lastCombat,moves:[null,null]}}}).combat,null);
console.log(JSON.stringify({single_game_hands:'passed',cases:handCases,physical_wildcards:true,wound_origins:true,rank_tiebreak:true,no_hidden_cards:true}));
console.log(JSON.stringify({share_card:'passed',share_payload:'png_alone_or_link_alone',copy_image:'png',render_cases:cases,width:S.WIDTH,height:S.HEIGHT,results_unchanged:true,self_contained_svg:true}));
// A real game's largest hit, largest hand and finish need not be the same play.
const storyGame=new GK.Game(19,{version:'1.0.0',first:0});
while(storyGame.phase!=='game_over'&&storyGame.phase!=='match_over')storyGame.aiStep();
const storyInput={results:storyGame.results,snapshot:storyGame.snapshot(),events:storyGame.events,first:0,seed:19,version:'1.0.0',match:false},storyBefore=JSON.stringify(storyInput),story=S.summarize(storyInput);
assert.equal(story.winner,0);assert.equal(story.combats.length,storyGame.stats.battles);
assert.equal(S.featured(story,'damage').combat.order,12);assert.equal(S.featured(story,'hand').combat.order,11);assert.equal(story.combats.at(-1).order,13);
assert.equal(S.featured(story,'damage').combat.amount,Math.max(...story.combats.filter(c=>c.action==='damage').map(c=>c.amount)));
assert.equal(Math.max(...S.featured(story,'hand').combat.moves.map(m=>m.score)),Math.max(...story.combats.flatMap(c=>c.moves.map(m=>m.score))));
assert.deepEqual(S.recap(story),story.combats);assert.equal(S.recap(story).length,13);assert(S.recap(story).every((c,i,a)=>i===0||c.order>a[i-1].order));
let storyCases=0;const filenames=new Set();
for(const layout of ['recap','finish','highlight'])for(const lang of ['en','zh-CN'])for(const theme of ['light','dark']){
 const data={...story,layout,lang,theme},svg=S.makeSVG(data,ctx.window.SZBloomAssets);
 assert(svg.includes('data-share-layout="'+layout+'"'));assert(!svg.includes('undefined'));assert(!svg.includes('NaN'));assert(!svg.includes('var(--'));assert(!/@import|<script|<image/.test(svg));assert(svg.includes(S.SHARE_URL));
 if(layout==='recap'){
  assert.deepEqual([...svg.matchAll(/data-story-order="(\d+)"/g)].map(m=>Number(m[1])),story.combats.map(c=>c.order));
  assert.equal((svg.match(/data-card=/g)||[]).length,story.combats.reduce((n,c)=>n+c.moves.flatMap(m=>m.cards).length,0));
  assert.equal(S.exportSize(svg).height,7154);assert.equal(S.exportSize(svg).width,1080);
 }
 const seats=[...svg.matchAll(/data-player="(\d)" data-player-y="([\d.]+)"/g)];
 assert.equal(seats.length,layout==='recap'?story.combats.length*2:2);
 for(let i=0;i<seats.length;i+=2){
  if(layout==='recap'){
   assert.equal(Number(seats[i][1]),story.combats[i/2].attacker);assert.equal(Number(seats[i+1][1]),1-story.combats[i/2].attacker);assert.equal(seats[i][2],seats[i+1][2]);
  }else{assert.equal(seats[i][1],'1');assert.equal(seats[i+1][1],'0');assert(Number(seats[i][2])<Number(seats[i+1][2]));}
 }
 if(layout==='recap'){
  const columns=[...svg.matchAll(/data-player-x="(\d+)" data-role="(attack|defense)"/g)];
  assert.equal(columns.length,story.combats.length*2);
  for(let i=0;i<columns.length;i+=2){assert.equal(columns[i][2],'attack');assert.equal(columns[i+1][2],'defense');assert(Number(columns[i][1])<Number(columns[i+1][1]));}
 }
 if(layout==='finish'){assert(svg.includes('data-play="own-wounds"'));assert(svg.includes('data-play="rival-wounds"'));assert(svg.includes(lang==='en'?'You deal 1 wound and win by 1 wound.':'你打出1伤，以1伤之差获胜。'));}
 if(layout==='highlight')assert(!svg.includes('data-play="own-wounds"'));
 filenames.add(S.filename(data));storyCases++;
}
assert.equal(filenames.size,3);assert.notEqual(S.filename({...story,layout:'highlight',highlightPick:'damage'}),S.filename({...story,layout:'highlight',highlightPick:'hand'}));
assert.equal(JSON.stringify(storyInput),storyBefore);
// No cross-game carry-over, and no extra copy of the last combat from end/refill.
const multi=GK.Game.restore(storyGame.save());multi.nextGame();while(!['game_over','match_over'].includes(multi.phase))multi.aiStep();
const second=S.summarize({...storyInput,results:multi.results,snapshot:multi.snapshot(),events:multi.events});
const onlySecond=S.summarize({...storyInput,results:multi.results,snapshot:multi.snapshot(),events:multi.events.filter(e=>e.game===2)});
assert.deepEqual(second.combats,onlySecond.combats);assert.equal(second.combats.length,multi.stats.battles-storyGame.stats.battles);
// Export only revealed wound faces. A historical face-down card remains a back.
const hidden=S.summarize({...storyInput,events:[],snapshot:{...storyInput.snapshot,players:storyInput.snapshot.players.map((p,i)=>({...p,table:i===0?[{card:51,up:false}]:p.table}))}});
assert.deepEqual(hidden.finalWounds[0],[{card:null}]);assert.equal(hidden.combats.length,1);
const hiddenSVG=S.makeSVG({...hidden,layout:'finish'},ctx.window.SZBloomAssets);assert(hiddenSVG.includes('data-card="hidden"'));assert(!JSON.stringify(hidden.combats).includes('refreshes'));assert(!('hand' in hidden.snapshot.players[0]));
const partial=S.summarize({...storyInput,events:undefined});assert.equal(partial.combats.length,1);assert.equal(S.recap(partial).length,1);
// Long histories grow, never truncate. Raster allocation stays bounded and proportional.
const long={...story,layout:'recap',combats:Array.from({length:80},(_,i)=>({...story.combats[i%13],order:i+1}))},longSVG=S.makeSVG(long,ctx.window.SZBloomAssets),longSize=S.exportSize(longSVG);
assert.equal((longSVG.match(/data-story-order=/g)||[]).length,80);assert(longSVG.includes('data-story-order="80"'));
assert(longSize.width*longSize.height<=12000000);assert(longSize.height<=16384);assert(Math.abs(longSize.width/longSize.height-1080/41056)<.001);
assert.deepEqual(S.exportSize('<svg width="1080" height="1440"></svg>'),{width:1080,height:1440});assert.throws(()=>S.exportSize('<svg width="0" height="0">'));
console.log(JSON.stringify({share_stories:'passed',variants:storyCases,real_game_combats:story.combats.length,distinct_highlights:true,chronological_recap:true,game_scoped:true,hidden_wounds_redacted:true}));
