import fs from 'node:fs/promises';
import {Worker} from 'node:worker_threads';
import path from 'node:path';
import os from 'node:os';
import {catalog} from '../policies/catalog.mjs';
import {PolicyClient} from '../policies/client.mjs';
import {sdk} from '../policies/dependencies.mjs';
import {sha256} from '../policies/runtime.mjs';
import {ratings} from './elo.mjs';
const args=process.argv.slice(2),arg=(name,fallback)=>{const i=args.indexOf(name);return i<0?fallback:args[i+1];};
const games=Number(arg('--games',200)),seedStart=Number(arg('--seed-start',86000000));
const output=arg('--output','arena/results/latest.json'),only=arg('--policies','').split(',').filter(Boolean);
if(!Number.isInteger(games)||games<4||games%4||!Number.isSafeInteger(seedStart)||seedStart<0||seedStart+games/2>=2**32)throw Error('Use a multiple of 4 games per pair and valid uint32 seeds');
const entries=(await catalog()).filter(e=>!only.length||only.includes(e.manifest.id)).sort((a,b)=>a.manifest.id.localeCompare(b.manifest.id));
if(entries.length<2||only.some(id=>!entries.some(e=>e.manifest.id===id)))throw Error('Choose at least two registered public policies');
const clients=new Map(),latencies=Object.fromEntries(entries.map(e=>[e.manifest.id,[]]));
const records=[],start=performance.now();
let report;
try {
  for(const entry of entries){
    const client=new PolicyClient({makeWorker:()=>new Worker(new URL('../policies/worker.mjs',import.meta.url),{resourceLimits:{maxOldGenerationSizeMb:256}})});
    clients.set(entry.manifest.id,client);await client.load(entry.manifest.id);
  }
  for(let x=0;x<entries.length;x++)for(let y=x+1;y<entries.length;y++) {
    const left=entries[x].manifest.id,right=entries[y].manifest.id,pair=`${left}/${right}`;
    for(let i=0;i<games;i++) {
      const seed=seedStart+Math.floor(i/2),leftSeat=i%2,first=Math.floor(i/2)%2;
      const g=new sdk.Game(seed,first),players=leftSeat===0?[left,right]:[right,left];
      // Independent policy RNG, never the deal seed. Identical seat seeds across competitors.
      for(let seat=0;seat<2;seat++)await clients.get(players[seat]).reset((0x9e3779b9 ^ Math.imul(i+1,2654435761) ^ seat)>>>0);
      let decisions=0;
      while(!['game_over','match_over'].includes(g.g.phase)) {
        if(++decisions>4096)throw Error('Truncated game; no ratings published');
        if(g.actor===null){g.step(g.legalActions()[0]);continue;}
        const id=players[g.actor],o=g.observation(g.actor),result=await clients.get(id).act(o);
        latencies[id].push(result.elapsedMs);g.step(o.legal_actions[result.index]);
      }
      const winner=players[g.g.results.at(-1).winner];
      records.push({pair,left,right,seed,leftSeat,first,winner,status:'complete',decisions,finalStateSha256:await sha256(new TextEncoder().encode(JSON.stringify(g.save())))});
      if((i+1)%20===0)console.log(`${pair}: ${i+1}/${games}`);
    }
  }
  const sourceFiles=['gamecore.js','sdk/index.js','sdk/features.js','sdk/policy.js','sdk/easy-policy.js','policies/contract.mjs','policies/runtime.mjs','policies/client.mjs','policies/worker.mjs','policies/dependencies.mjs','policies/catalog.mjs','arena/evaluate.mjs','arena/elo.mjs'];
  const hashes={};for(const file of sourceFiles)hashes[file]=await sha256(await fs.readFile(new URL('../'+file,import.meta.url)));
  const rows=ratings(records,entries.map(e=>e.manifest.id));
  for(const row of rows){const v=latencies[row.id].sort((a,b)=>a-b);row.latencyP95Ms=Number(v[Math.min(v.length-1,Math.floor(v.length*.95))].toFixed(3));row.decisions=v.length;}
  report={schema:1,release:'1.1.0',season:'public-game-v1',rules:'1.0.0',episode:'game',information:'public',createdAt:new Date().toISOString(),
    protocol:{gamesPerPair:games,seedStart,seedCount:games/2,levels:[2,2],pairedSeats:true,balancedFirst:true,actionOrder:'SDK canonical',maxDecisions:4096,decisionTimeoutMs:1000,initialElo:1500,k:24,anchor:'code-table-v1',ratingOrder:'seed, then alphabetical pair; simultaneous updates within seat pairs',provisionalBelowGames:200},
    runtime:{node:process.version,platform:process.platform,arch:process.arch,cpu:os.cpus()[0].model,backend:'ONNX Runtime Web / single-thread WASM',elapsedMs:Math.round(performance.now()-start)},
    sourceSha256:hashes,policies:entries.map(e=>e.manifest),leaderboard:rows,records};
} finally {for(const client of clients.values())client.cancel();}
await fs.mkdir(path.dirname(path.resolve(output)),{recursive:true});
const temporary=output+'.tmp';await fs.writeFile(temporary,JSON.stringify(report,null,2)+'\n');await fs.rename(temporary,output);
console.log(JSON.stringify(report.leaderboard,null,2));
