/* Live component gallery; fixtures use an isolated seeded game and never touch saves. */
(()=>{'use strict';
const $=id=>document.getElementById(id),q=new URLSearchParams(location.search);
let lang=q.get('lang')==='en'?'en':'zh-CN',theme=q.get('theme')==='dark'?'dark':'light';
const copy={opponent:['AI 对手','AI opponent'],arenaPolicy:['天梯策略','Arena policy'],leaderboard:['查看天梯 ↗','Leaderboard ↗'],arenaStatus:['对手行动时加载','Loads on opponent’s turn'],controls:['选择与展开','Select & expand'],controlDefault:['默认','Default'],controlFocus:['聚焦','Focus'],controlDisabled:['禁用','Disabled'],followSystem:['跟随系统','Follow system'],light:['浅色','Light'],dark:['深色','Dark'],controlDetails:['高级选项','Advanced options'],controlNote:['44 px · 键盘与手机原生选择','44 px · Native keyboard & mobile selection'],brand:['深圳花牌','3Card Royale'],language:['语言','Language'],theme:['主题','Theme'],title:['同一套组件，同一朵花。','One system. One flower.'],intro:['正式组件 · 明暗 · 中英','Production components · Light / dark · 中文 / EN'],play:['进入牌桌','Open game'],spec:['设计规范','Design specification'],assets:['品牌素材','Brand assets'],color:['01 · 颜色与材质','01 · Color & surfaces'],markNote:['金底、红花、金蕊。','Gold card. Red flower. Gold centres.'],cards:['02 · 牌与玩家','02 · Cards & players'],hand:['手牌 · 点选弹起','Hand · select to lift'],onTable:['攻防与伤牌 · 平贴桌面','Plays & wounds · resting on the table'],back:['牌背','Card backs'],swap:['换牌机会','Swap opportunities'],remaining:['剩余 2 次 · 每次可换或跳过','2 left · swap or skip each one'],swapButton:['换牌','Swap'],skip:['跳过这次','Skip this one'],choiceNote:['样式预览 · 选中弹起，⇄标目标。','Selection lifts. ⇄ marks targets. Style preview only.'],shell:['03 · 容器与控件','03 · Panels & controls'],help:['规则 · 牌型 · 设置 · 回放','Rules · Hands · Settings · Replay'],helpNote:['手机右侧抽屉，桌面居中弹窗；切换等高。','Right drawer on mobile. Centered modal on desktop. Fixed height.'],inspect:['在正式牌桌中查看','Inspect in the game'],resultNote:['单局轻结算；整场全屏开花。','Compact game results. Full-screen match bloom.'],shares:['04 · 结算画面','04 · Results'],openShare:['打开回顾与分享','Open review & share'],footer:['tokens.css · controls.css · card-face.js · mark.js · share-card.js','tokens.css · controls.css · card-face.js · mark.js · share-card.js']};
const t=(a,b)=>lang==='en'?b:a;
const g=new GK.Game(19,{version:'1.0.0',first:0});let steps=0;
while(!['game_over','match_over'].includes(g.phase)&&steps++<2000)g.aiStep();
if(!g.results.length)throw new Error('Gallery fixture did not settle.');
const raw={results:g.results,snapshot:g.snapshot(),events:g.events,first:0,seed:19,version:'1.0.0',match:false};
const card=(rank,s,cls='',wild=false)=>`<button type="button" class="card ${cls}${SZSuit.isRed(s)?' red':''}" aria-label="${rank}${s}" aria-pressed="${cls.includes('selected')}"><span class="${SZSuit.rankClass(rank)}">${rank}</span><span class="suit">${SZSuit.svg(s)}</span><span class="center">${SZSuit.svg(s)}</span>${wild?'<span class="wild" aria-hidden="true">'+SZFlowerMark.replace('viewBox="0 0 64 64"','viewBox="8 12 48 48"')+'</span>':''}</button>`;
const cardBack=(target=false)=>`<span class="card back${target?' swap-destination':''}" aria-label="${t('牌背','Card back')}"><span class="motif">${SZFlowerMark}</span></span>`;
const flower=who=>`<svg class="player-flower player-flower-${who===0?'red':'gold'}" viewBox="0 0 64 72" aria-hidden="true">${SZBloomAssets.flower}</svg>`;
const identity=(who,n)=>flower(who)+`<strong>${who===0?t('你','You'):t('对手','Rival')}</strong><span class="damage" id="${who===0?'own':'opp'}-damage" aria-label="${n}${t('伤',n===1?' wound':' wounds')}">`+[0,1,2,3,4].map(i=>`<svg class="wound-bract${i<n?' filled':''}" viewBox="22 11 20 26" aria-hidden="true">${SZBloomAssets.bract}<circle class="bract-core" cx="32" cy="30.6" r="2.4"/></svg>`).join('')+'</span>';
const layouts=[['recap','本局回顾','Game recap'],['finish','决胜现场','Final hand'],['highlight','高光一手','Best play']];
let urls=[];
function render(){
 document.documentElement.lang=lang;document.documentElement.dataset.szTheme=theme;
 document.querySelectorAll('[data-i]').forEach(el=>{el.textContent=copy[el.dataset.i][lang==='en'?1:0];});
 $('ds-theme').options[0].textContent=t('日间','Light');$('ds-theme').options[1].textContent=t('夜间','Dark');
 $('ds-language').value=lang;$('ds-theme').value=theme;$('ds-spec').href='docs/DESIGN'+(lang==='en'?'':'.zh-CN')+'.md';
 document.querySelectorAll('a[href^="index.html"],a[href^="brand.html"],a[href^="arena.html"]').forEach(a=>{a.href=a.pathname.split('/').pop()+'?lang='+lang;});
 const cs=getComputedStyle(document.documentElement),swatches=[['paper','页面','Page'],['table','牌桌','Table'],['panel','浮层','Panel'],['red','红花','Red flower'],['gold-base','金牌','Gold card'],['gold','对手金','Rival gold']];
 $('ds-swatches').innerHTML=swatches.map(([key,zh,en])=>{const v=cs.getPropertyValue('--'+key).trim();return `<div class="ds-swatch"><i style="background:${v}"></i><b>${t(zh,en)}</b><code>${v}</code></div>`;}).join('');
 $('ds-hand').innerHTML=card('6','s')+card('10','c')+card('3','h','selected')+card('Q','d')+card('2','h','',true);
 $('ds-combat').innerHTML=card('K','c')+card('8','s')+card('A','h');$('ds-backs').innerHTML=cardBack()+cardBack()+cardBack();
 $('ds-rival').innerHTML=identity(1,2);$('ds-you').innerHTML=identity(0,1)+`<span class="shared-flower">${t('花牌','Flower')}${card('2','h','',true)}</span>`;
 $('ds-target').innerHTML=cardBack(true)+cardBack(true)+cardBack(true);
 for(const button of $('ds-hand').querySelectorAll('button'))button.onclick=()=>{const selected=button.classList.toggle('selected');button.setAttribute('aria-pressed',String(selected));};
 urls.forEach(URL.revokeObjectURL);urls=[];
 $('ds-posters').innerHTML=layouts.map(([layout,zh,en])=>{const svg=SZShareCard.makeSVG(SZShareCard.summarize({...raw,lang,theme,layout}),SZBloomAssets,SZShareAssets.cityStyle,SZBloom,SZFinale),url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));urls.push(url);return `<article><h3>${t(zh,en)}</h3><div class="ds-poster"><img src="${url}" alt="${t(zh,en)}"></div></article>`;}).join('');
}
$('ds-opponent').onchange=e=>{$('ds-arena-field').hidden=e.target.value!=='arena';};
$('ds-language').onchange=e=>{lang=e.target.value;render();};$('ds-theme').onchange=e=>{theme=e.target.value;render();};$('ds-open-share').onclick=()=>SZShareCard.open({...raw,lang,theme});render();
})();
