'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),GK=require(path.join(root,'gamecore.js'));
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(x=>['.git','node_modules','target','build','__pycache__','.venv'].includes(x.name)||x.name.endsWith('.egg-info')?[]:x.isDirectory()?walk(path.join(dir,x.name)):[path.join(dir,x.name)]);
let refs=0,scripts=0;
for(const p of walk(root)){
 if(p.endsWith('.js')||p.endsWith('.cjs')){new vm.Script(fs.readFileSync(p,'utf8'),{filename:p});scripts++;}
 if(!p.endsWith('.html'))continue;const html=fs.readFileSync(p,'utf8');
 for(const m of html.matchAll(/(?:href|src)="([^"#]+)"/g)){const u=m[1];if(/^(?:https?:|data:|mailto:|#|\?)/.test(u))continue;const local=u.split(/[?#]/)[0];assert(fs.existsSync(path.resolve(path.dirname(p),local)),p+' missing '+local);refs++;}
}
const id=(r,s)=>{for(let c=0;c<52;c++)if(GK.rankLabel(GK.rank(c))===r&&GK.SUITS[GK.suit(c)]===s)return c;throw Error(r+s);};
const cards=xs=>xs.map(x=>id(x.slice(0,-1),x.slice(-1)));
assert.equal(GK.evaluate(cards(['7♠','7♥','7♣','7♦']),2,'1.0.0').score,6);
assert.equal(GK.evaluate(cards(['6♣','7♣','8♣']),2,'1.0.0').score,4);
assert.equal(GK.outcome(GK.evaluate(cards(['K♣','9♠','4♦']),2,'1.0.0'),GK.evaluate(cards(['K♦','9♣','4♥']),2,'1.0.0'),'1.0.0').effectiveDelta,0);
const g=new GK.Game(20261018,{version:'1.0.0',first:0});for(let i=0;i<24;i++){if(g.phase==='game_over'||g.phase==='match_over')break;g.aiStep();g.check();}assert.equal(GK.Game.restore(g.save()).version,'1.0.0');
console.log(`OK: ${scripts} JavaScript files, ${refs} local HTML references, card examples, exact tie and a saved-game round trip.`);
