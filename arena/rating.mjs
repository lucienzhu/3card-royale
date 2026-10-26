// Batch Elo on a fixed 400-point logistic scale. The Code AI anchor never moves.
// This is a provisional estimate, independent of game processing order.
const SCALE=400/Math.log(10);
function solve(matrix,vector){
 const a=matrix.map((row,i)=>[...row,vector[i]]),n=vector.length;
 for(let i=0;i<n;i++){
  let pivot=i;for(let j=i+1;j<n;j++)if(Math.abs(a[j][i])>Math.abs(a[pivot][i]))pivot=j;
  [a[i],a[pivot]]=[a[pivot],a[i]];if(Math.abs(a[i][i])<1e-12)throw Error('Singular rating system');
  const d=a[i][i];for(let j=i;j<=n;j++)a[i][j]/=d;
  for(let k=0;k<n;k++)if(k!==i){const f=a[k][i];for(let j=i;j<=n;j++)a[k][j]-=f*a[i][j];}
 }
 return a.map(row=>row[n]);
}
export function estimateRatings(records,ids,{anchor='code-table-v1',anchorElo=1500,priorSd=400}={}){
 if(new Set(ids).size!==ids.length||!ids.includes(anchor)||ids.length<2||!Number.isFinite(anchorElo)||!Number.isFinite(priorSd)||priorSd<=0)throw Error('Invalid rating configuration');
 const names=[...ids].sort(),table=Object.fromEntries(names.map(id=>[id,{id,games:0,wins:0,losses:0}]));
 const blocks=new Map(),pairs=new Map(),graph=new Map(names.map(id=>[id,new Set()]));
 for(const r of records){
  if(r.status!=='complete'||!Number.isSafeInteger(r.seed)||r.seed<0||![0,1].includes(r.leftSeat)||![0,1].includes(r.first)||r.pair!==`${r.left}/${r.right}`||!table[r.left]||!table[r.right]||r.left===r.right||![r.left,r.right].includes(r.winner))throw Error('Only complete, legal games enter ratings');
  const key=JSON.stringify([r.left,r.right,r.seed]);if(!blocks.has(key))blocks.set(key,[]);blocks.get(key).push(r);
 }
 // Sort before summation for reproducible, order-independent fitting.
 for(const [,block]of [...blocks].sort(([a],[b])=>a.localeCompare(b))){
  if(block.length!==2||new Set(block.map(r=>r.leftSeat)).size!==2||block[0].first!==block[1].first)throw Error('Incomplete or duplicate paired evaluation');
  const {left,right}=block[0],pairKey=JSON.stringify([left,right]);
  if(!pairs.has(pairKey))pairs.set(pairKey,{left,right,wins:0,games:0});
  const p=pairs.get(pairKey);graph.get(left).add(right);graph.get(right).add(left);
  for(const r of block){p.games++;p.wins+=Number(r.winner===left);table[left].games++;table[right].games++;table[r.winner].wins++;table[r.winner===left?right:left].losses++;}
 }
 const connected=new Set([anchor]),pending=[anchor];while(pending.length)for(const id of graph.get(pending.pop()))if(!connected.has(id)){connected.add(id);pending.push(id);}
 if(connected.size!==names.length)throw Error('Every entrant must connect to the anchor through played games');
 const free=names.filter(id=>id!==anchor),index=new Map(free.map((id,i)=>[id,i])),n=free.length,lambda=(SCALE/priorSd)**2;
 const list=[...pairs.values()].sort((a,b)=>a.left.localeCompare(b.left)||a.right.localeCompare(b.right));
 const value=(x,id)=>id===anchor?0:x[index.get(id)];
 const objective=x=>list.reduce((sum,p)=>{const d=value(x,p.left)-value(x,p.right);return sum+p.games*(Math.max(d,0)+Math.log1p(Math.exp(-Math.abs(d))))-p.wins*d;},lambda*x.reduce((sum,v)=>sum+v*v,0)/2);
 let x=Array(n).fill(0),converged=false;
 for(let iteration=0;iteration<100;iteration++){
  const gradient=x.map(v=>lambda*v),h=Array.from({length:n},(_,i)=>Array.from({length:n},(_,j)=>i===j?lambda:0));
  for(const p of list){
   const d=value(x,p.left)-value(x,p.right),prob=1/(1+Math.exp(-d)),g=p.games*prob-p.wins,w=p.games*prob*(1-prob);
   const terms=[[index.get(p.left),1],[index.get(p.right),-1]].filter(([i])=>i!==undefined);
   for(const [i,sign]of terms){gradient[i]+=sign*g;for(const[j,other]of terms)h[i][j]+=sign*other*w;}
  }
  if(Math.max(...gradient.map(Math.abs))<1e-8){converged=true;break;}
  const step=solve(h,gradient),before=objective(x);let rate=1,candidate;
  while(rate>1e-8){candidate=x.map((v,i)=>v-rate*step[i]);if(objective(candidate)<=before+1e-12)break;rate/=2;}
  if(rate<=1e-8)throw Error('Rating fit failed to converge');x=candidate;
 }
 if(!converged)throw Error('Rating fit failed to converge');
 return names.map(id=>({...table[id],elo:Math.round(anchorElo+SCALE*value(x,id)),provisional:table[id].games<200})).sort((a,b)=>b.elo-a.elo||a.id.localeCompare(b.id));
}
export const RATING_METHOD=Object.freeze({id:'batch-elo-v1',model:'Bradley-Terry with Gaussian shrinkage',anchor:'code-table-v1',anchorElo:1500,logisticScale:400,priorSdElo:400,provisionalBelowGames:200});
