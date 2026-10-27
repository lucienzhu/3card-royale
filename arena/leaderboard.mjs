import {digest,checkMatch,checkReceipt,fixedRating,LIMITS} from './reference.mjs';
export function referenceRows(ctx){return ctx.panel.opponents.map(p=>({id:p.id,elo:p.elo,games:0,wins:0,losses:0,provisional:false,reference:true,latencyP95Ms:null}));}
export function mergeLeaderboard(previous,bundle,ctx,{expectedCommit,runUrl}={}){
 if(bundle.schema!==1||bundle.method!==ctx.panel.id||bundle.panelSha256!==ctx.panelSha256||!bundle.rated||bundle.sourceCommit!==expectedCommit||!Array.isArray(bundle.targets)||!Array.isArray(bundle.results)||bundle.targets.length!==bundle.results.length||bundle.targets.length>LIMITS.batchTargets||new Set(bundle.targets).size!==bundle.targets.length)throw Error('Invalid or stale rating bundle');
 if(previous&&(previous.method!==ctx.panel.id||previous.panelSha256!==ctx.panelSha256))throw Error('Start a new leaderboard when the reference panel changes');
 const refs=new Set(ctx.panel.opponents.map(p=>p.id)),results=new Map();
 for(const entry of bundle.results){
  const id=entry.id;
  if(!bundle.targets.includes(id)||results.has(id)||!ctx.manifests.has(id)||refs.has(id)||digest(entry.manifest)!==digest(ctx.manifests.get(id)))throw Error('Unregistered, duplicated or modified rated policy');
  checkMatch(entry.smokeReport,ctx,id,'code-table-v1',4,ctx.panel.smokeSeedStart);checkReceipt(entry.receipt,ctx,id,entry.smokeReport);
  const rating=fixedRating(ctx,id,entry.matches);if(digest(rating)!==digest(entry.rating))throw Error('Rating does not match raw games');
  results.set(id,{...rating,updatedAt:bundle.createdAt,sourceCommit:expectedCommit,runUrl});
 }
 const oldPolicies=new Map((previous?.policies||[]).map(m=>[m.id,m]));
 const retained=(previous?.leaderboard||[]).filter(r=>!r.reference&&!results.has(r.id)&&ctx.manifests.has(r.id)&&digest(oldPolicies.get(r.id))===digest(ctx.manifests.get(r.id)));
 return {schema:2,method:ctx.panel.id,panelSha256:ctx.panelSha256,createdAt:bundle.createdAt,protocol:{gamesPerOpponent:20,opponents:ctx.panel.opponents.map(({id,elo})=>({id,elo})),priorMean:1500,priorSd:400,pairedSeats:true,balancedFirst:true},policies:[...ctx.manifests.values()],leaderboard:[...referenceRows(ctx),...retained,...results.values()].sort((a,b)=>b.elo-a.elo||a.id.localeCompare(b.id))};
}
