import {digest,checkMatch,checkReceipt,fixedRating,LIMITS} from './reference.mjs';
export function referenceRows(ctx,entries=[]){
 return ctx.panel.opponents.map(p=>{
  let games=0,wins=0,decisions=0,latencyP95Ms=null;const opponents=[];
  for(const entry of entries){
   const report=entry.matches.find(m=>m.opponent===p.id)?.report;
   if(!report)throw Error('Missing reference match');
   checkMatch(report,ctx,entry.id,p.id,ctx.panel.gamesPerOpponent,ctx.panel.seedStart);
   const timing=report.leaderboard.find(r=>r.id===p.id);
   if(!timing||!Number.isFinite(timing.latencyP95Ms)||timing.latencyP95Ms<0||!Number.isInteger(timing.decisions)||timing.decisions<1)throw Error('Missing reference timing');
   const count=report.records.length,won=report.records.filter(r=>r.winner===p.id).length;
   games+=count;wins+=won;decisions+=timing.decisions;latencyP95Ms=Math.max(latencyP95Ms??0,timing.latencyP95Ms);
   opponents.push({id:entry.id,games:count,wins:won});
  }
  return {id:p.id,elo:p.elo,games,wins,losses:games-wins,provisional:false,reference:true,opponents,latencyP95Ms,decisions};
 });
}
export function mergeLeaderboard(previous,bundle,ctx,{expectedCommit,runUrl,storedResults=[]}={}){
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
 // Rebuild reference statistics from each current entrant's rated games, once.
 // Smoke games and superseded evaluations never contribute to these totals.
 const reports=[...bundle.results];
 for(const row of retained){
  const saved=storedResults.find(r=>r.id===row.id);
  if(!saved||saved.panelSha256!==ctx.panelSha256||saved.sourceCommit!==row.sourceCommit||digest(saved.manifest)!==digest(ctx.manifests.get(row.id)))throw Error('Missing or stale saved reference results: '+row.id);
  const rating=fixedRating(ctx,row.id,saved.matches);
  if(digest(rating)!==digest(saved.rating)||Object.keys(rating).some(k=>digest(row[k])!==digest(rating[k])))throw Error('Saved results do not match leaderboard: '+row.id);
  reports.push(saved);
 }
 reports.sort((a,b)=>a.id.localeCompare(b.id));
 return {schema:2,method:ctx.panel.id,panelSha256:ctx.panelSha256,createdAt:bundle.createdAt,protocol:{gamesPerOpponent:20,opponents:ctx.panel.opponents.map(({id,elo})=>({id,elo})),priorMean:1500,priorSd:400,pairedSeats:true,balancedFirst:true},policies:[...ctx.manifests.values()],leaderboard:[...referenceRows(ctx,reports),...retained,...results.values()].sort((a,b)=>b.elo-a.elo||a.id.localeCompare(b.id))};
}
