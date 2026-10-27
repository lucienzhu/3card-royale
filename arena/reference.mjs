import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {validateManifest,ID} from '../policies/contract.mjs';
export const LIMITS=Object.freeze({prTargets:3,batchTargets:10,smokeGames:4,pairMs:60000,totalMs:180000});
export const digest=value=>createHash('sha256').update(typeof value==='string'||Buffer.isBuffer(value)?value:JSON.stringify(value)).digest('hex');
export async function context(){
 const bytes=await fs.readFile('arena/reference-panel.json'),panel=JSON.parse(bytes);
 if(panel.id!=='reference-elo-v1'||panel.opponents.length!==3||panel.gamesPerOpponent!==20||panel.logisticScale!==400||panel.priorSd!==400||panel.priorMean!==1500)throw Error('Unsupported reference panel');
 if(digest(await fs.readFile(panel.calibration.path))!==panel.calibration.sha256)throw Error('Calibration hash changed');
 for(const [file,hash]of Object.entries(panel.sourceSha256))if(digest(await fs.readFile(file))!==hash)throw Error(`Season dependency changed: ${file}; explicitly recalibrate a new panel`);
 const registry=JSON.parse(await fs.readFile('policies/registry.json')),manifests=new Map();
 for(const entry of registry.policies){
  if(!ID.test(entry.id)||entry.manifest!==`entries/${entry.id}/manifest.json`||manifests.has(entry.id))throw Error('Invalid registry');
  const m=validateManifest(JSON.parse(await fs.readFile('policies/'+entry.manifest)));if(m.id!==entry.id)throw Error('Manifest ID mismatch');manifests.set(m.id,m);
 }
 if(new Set(panel.opponents.map(p=>p.id)).size!==3)throw Error('Duplicate reference');
 for(const p of panel.opponents)if(digest(manifests.get(p.id))!==digest(p.manifest)||!Number.isFinite(p.elo))throw Error(`Frozen reference changed: ${p.id}`);
 return {panel,panelSha256:digest(bytes),manifests};
}
export function targetsFor(ctx,{explicit='',changed=null,baseManifests=null,limit=LIMITS.batchTargets}={}){
 if(baseManifests)for(const [id,m]of ctx.manifests)if(baseManifests[id]&&digest(baseManifests[id])!==digest(m))throw Error(`${id}: published IDs are immutable; submit a new ID`);
 const refs=new Set(ctx.panel.opponents.map(p=>p.id)),eligible=[...ctx.manifests.keys()].filter(id=>!refs.has(id));let targets;
 if(explicit.trim())targets=explicit.split(',').map(x=>x.trim());
 else if(changed===null)targets=eligible;
 else targets=eligible.filter(id=>(baseManifests&&!baseManifests[id])||changed.some(p=>p.startsWith(`policies/entries/${id}/`)));
 if(new Set(targets).size!==targets.length||targets.some(id=>!ID.test(id)||id.length>80||!ctx.manifests.has(id)||refs.has(id)))throw Error('Select registered non-reference policy IDs');
 if(targets.length>limit)throw Error(`At most ${limit} policies per run; split the submission or select a smaller manual batch`);
 return targets.sort();
}
export function checkMatch(report,ctx,target,opponent,games,seedStart){
 const ids=[target,opponent].sort();
 if(report.records?.length!==games||report.protocol?.gamesPerPair!==games||report.protocol?.seedStart!==seedStart||report.rules!=='1.0.0'||report.information!=='public'||report.episode!=='game')throw Error('Wrong match protocol');
 if(digest(report.sourceSha256)!==digest(ctx.panel.sourceSha256))throw Error('Wrong match source');
 if(report.policies.length!==2||new Set(report.policies.map(m=>m.id)).size!==2||report.policies.some(m=>!ids.includes(m.id)||digest(m)!==digest(ctx.manifests.get(m.id))))throw Error('Wrong match manifests');
 const seen=new Set();
 for(const r of report.records){
  const index=(r.seed-seedStart)*2+r.leftSeat,key=`${r.seed}:${r.leftSeat}`;
  if(r.status!=='complete'||r.left!==ids[0]||r.right!==ids[1]||r.pair!==ids.join('/')||!ids.includes(r.winner)||!Number.isInteger(index)||index<0||index>=games||![0,1].includes(r.leftSeat)||r.first!==Math.floor(index/2)%2||seen.has(key)||!Number.isInteger(r.decisions)||r.decisions<1||r.decisions>4096||!/^[a-f0-9]{64}$/.test(r.finalStateSha256))throw Error('Invalid, duplicate or unbalanced game');seen.add(key);
 }
 if(seen.size!==games)throw Error('Incomplete games');
}
export function receiptFor(ctx,id,report){return {schema:1,policyId:id,manifestSha256:digest(ctx.manifests.get(id)),panelSha256:ctx.panelSha256,games:LIMITS.smokeGames,seedStart:ctx.panel.smokeSeedStart,records:report.records};}
export function checkReceipt(receipt,ctx,id,report){
 if(digest(receipt)!==digest(receiptFor(ctx,id,report)))throw Error(`${id}: local validation is missing or stale; run npm run arena:submit -- --policy ${id}, then commit validation.json`);
}
export function fixedRating(ctx,id,matches){
 if(matches.length!==3||new Set(matches.map(x=>x.opponent)).size!==3)throw Error('Need all three reference opponents');
 const opponents=matches.map(({opponent,report})=>{const ref=ctx.panel.opponents.find(p=>p.id===opponent);if(!ref)throw Error('Unknown reference');checkMatch(report,ctx,id,opponent,20,ctx.panel.seedStart);return {id:opponent,elo:ref.elo,games:20,wins:report.records.filter(r=>r.winner===id).length};}).sort((a,b)=>a.id.localeCompare(b.id));
 // Strictly convex one-dimensional MAP fit; fixed work per entrant, no NxN matrix.
 const mean=ctx.panel.priorMean,sd=ctx.panel.priorSd,k=Math.log(10)/400;
 const gradient=rating=>(rating-mean)/(sd*sd)+opponents.reduce((s,o)=>s+k*(o.games/(1+10**((o.elo-rating)/400))-o.wins),0);
 let lo=-10000,hi=10000;for(let i=0;i<80;i++){const mid=(lo+hi)/2;if(gradient(mid)>0)hi=mid;else lo=mid;}
 const games=60,wins=opponents.reduce((n,o)=>n+o.wins,0),timings=matches.map(x=>x.report.leaderboard.find(r=>r.id===id));
 if(timings.some(r=>!r||!Number.isFinite(r.latencyP95Ms)||r.latencyP95Ms<0||!Number.isInteger(r.decisions)))throw Error('Missing timing');
 return {id,elo:Math.round((lo+hi)/2),games,wins,losses:games-wins,provisional:true,reference:false,opponents,latencyP95Ms:Math.max(...timings.map(r=>r.latencyP95Ms)),decisions:timings.reduce((n,r)=>n+r.decisions,0)};
}
