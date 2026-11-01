const fs=require('node:fs'),SDK=require('../sdk/index.js');
const fixtures=require('../tests/fixtures/actions-v2.json');
const g=new SDK.Game(9,1),hand=[5,18,31,44,13,1,9,11],rest=Array.from({length:52},(_,i)=>i).filter(c=>!hand.includes(c));
g.g.players[1].hand=hand;g.g.players[0].hand=rest.splice(0,8);g.g.stock=rest;g.g.check();
const entries=[
 {name:['构造示例 · 进攻 · 3 / 4 / 5 张','Constructed attack · 3 / 4 / 5 cards'],observation:g.observation(1)},
 {name:['真实示例 · 防守','Saved position · defense'],observation:fixtures.find(x=>x.observation.phase==='defend').observation},
 {name:['真实示例 · 换牌','Saved position · swaps'],observation:require('../arena/observation-example.json').observation}
];
for(const {observation:o} of entries){delete o.results;delete o.last_combat;}
fs.writeFileSync('arena/structured-examples.json',JSON.stringify(entries)+'\n');
