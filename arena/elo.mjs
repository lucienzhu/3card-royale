// All games in a paired block use the pre-block ratings; swapping seats cannot change its Elo delta.
export function ratings(records,ids,{initial=1500,k=24,anchor='code-table-v1'}={}) {
  const table=Object.fromEntries([...ids].sort().map(id=>[id,{id,elo:initial,games:0,wins:0,losses:0}]));
  const blocks=new Map();
  for(const r of records) {
    if(r.status!=='complete'||!Number.isSafeInteger(r.seed)||r.seed<0||![0,1].includes(r.leftSeat)||![0,1].includes(r.first)||r.pair!==`${r.left}/${r.right}`||![r.left,r.right].includes(r.winner)||!table[r.left]||!table[r.right]||r.left===r.right)throw Error('Only complete, legal games enter Elo');
    const key=[r.pair,r.seed].join(':');
    if(!blocks.has(key))blocks.set(key,[]);blocks.get(key).push(r);
  }
  for(const block of [...blocks.values()].sort((a,b)=>a[0].seed-b[0].seed||a[0].pair.localeCompare(b[0].pair))) {
    if(block.length!==2||new Set(block.map(r=>r.leftSeat)).size!==2)throw Error('Incomplete paired evaluation');
    const {left,right}=block[0],a=table[left],b=table[right];
    if(block.some(r=>r.left!==left||r.right!==right||r.first!==block[0].first))throw Error('Inconsistent paired evaluation');
    const score=block.filter(r=>r.winner===left).length/2,expected=1/(1+10**((b.elo-a.elo)/400));
    const delta=k*2*(score-expected);a.elo+=delta;b.elo-=delta;
    for(const r of block){a.games++;b.games++;table[r.winner].wins++;table[r.winner===left?right:left].losses++;}
  }
  const shift=table[anchor]?initial-table[anchor].elo:0;
  return Object.values(table).map(x=>({...x,elo:Math.round(x.elo+shift),provisional:x.games<200})).sort((a,b)=>b.elo-a.elo||a.id.localeCompare(b.id));
}
