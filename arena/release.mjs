import {digest,targetsFor,LIMITS} from './reference.mjs';

// Select pending ratings by manifest + panel, not by the most recent git diff:
// a release may contain several already-validated PRs.
export function releaseTargets(ctx,board,{explicit='',limit=LIMITS.batchTargets}={}){
 if(board&&(board.schema!==2||board.method!==ctx.panel.id||board.panelSha256!==ctx.panelSha256))throw Error('Release leaderboard does not match the frozen panel');
 const eligible=targetsFor(ctx,{explicit,limit:Infinity});
 const manifests=new Map((board?.policies||[]).map(m=>[m.id,m]));
 const rows=new Map((board?.leaderboard||[]).map(r=>[r.id,r]));
 const targets=explicit.trim()?eligible:eligible.filter(id=>{
  const row=rows.get(id),manifest=manifests.get(id);
  return !manifest||digest(manifest)!==digest(ctx.manifests.get(id))||!row||row.reference||row.games!==60||!Number.isFinite(row.elo);
 });
 if(targets.length>limit)throw Error(`At most ${limit} pending policies per release run; publish explicit smaller batches first`);
 return targets;
}
