'use strict';
// Rebuild the website example from the blog's recorded SDK observation.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const source='tests/fixtures/nn-observations.json',sample=9,episode='game';
const fixture=JSON.parse(fs.readFileSync(path.join(root,source)))[sample],o=fixture.observation;
const encoded=require('../sdk/features.js').encode(o,episode);
const rawMeta=[...o.levels,o.flower_level,o.wounds.length,o.enemy_wounds.length,o.enemy_hand_count,o.deck_count,o.discard.length,...o.a_losses,+(o.first===o.player),+(o.attacker===o.player),o.battle_index,o.pending.remaining,+(o.actor===o.player),o.round,o.game,0];
// This is an observation, never a save: no hidden hand or deck order is exported.
const {last_combat,results,...observation}=o;
const data={source,sample,episode,player:o.player,game:o.game,round:o.round,phase:o.phase,state:Array.from(encoded.state),rawMeta,candidateCount:encoded.count,observation,candidates:Array.from({length:encoded.count},(_,i)=>Array.from(encoded.candidates.slice(i*72,(i+1)*72)))};
const output=JSON.stringify(data,null,2).replace(/\[\s+([\d.,e\s-]+)\s+\]/g,(_,values)=>'['+values.replace(/\s+/g,'')+']')+'\n';
if(require.main===module)fs.writeFileSync(path.join(root,'arena/observation-example.json'),output);
module.exports=data;
