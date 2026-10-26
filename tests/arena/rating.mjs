import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {estimateRatings} from '../../arena/rating.mjs';
const anchor='code-table-v1',ids=[anchor,'rival-v1'];
function pair(seed,winners){return winners.map((winner,leftSeat)=>({pair:ids.join('/'),left:ids[0],right:ids[1],seed,leftSeat,first:seed%2,winner,status:'complete'}));}
const equal=[...pair(1,ids),...pair(2,ids)];
assert(estimateRatings(equal,ids).every(r=>r.elo===1500&&r.wins===2&&r.games===4&&r.provisional));
const wins=[...pair(1,[ids[1],ids[1]]),...pair(2,[ids[1],ids[1]])],fitted=estimateRatings(wins,ids);
assert(fitted[0].elo>1500&&Number.isFinite(fitted[0].elo));assert.equal(fitted.find(r=>r.id===anchor).elo,1500);
assert.deepEqual(fitted,estimateRatings([...wins].reverse(),[...ids].reverse()));
assert(estimateRatings(wins,ids,{priorSd:100})[0].elo<fitted[0].elo);
for(const rows of [wins.slice(1),[...wins,...wins],wins.map(r=>({...r,status:'timeout'})),wins.map(r=>({...r,winner:'nobody'}))])assert.throws(()=>estimateRatings(rows,ids));
assert.throws(()=>estimateRatings(wins,[...ids,'disconnected']));assert.throws(()=>estimateRatings(wins,ids,{priorSd:0}));
// The evaluator's frozen historical raw records provide an independent real-game fixture.
const report=JSON.parse(await fs.readFile(new URL('../../arena/results/season-1.json',import.meta.url))),entries=report.policies.map(p=>p.id);
const subset=report.records.filter(r=>r.seed<report.protocol.seedStart+20),result=estimateRatings(subset,entries);
assert.equal(subset.length,400);assert(result.every(r=>r.games===160&&r.provisional&&Number.isFinite(r.elo)));
assert.deepEqual(result,estimateRatings([...subset].reverse(),[...entries].reverse()));
assert.equal(result.find(r=>r.id===anchor).elo,1500);
console.log('Batch Elo: paired validation, finite boundary scores, anchor, shrinkage, order independence and 400-game fixture passed.');
