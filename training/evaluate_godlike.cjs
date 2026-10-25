// Current-hand Godlike against the unchanged browser Hard policy, paired seats / first attacker.
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const SDK=require('../sdk/index.js'),policy=require('../sdk/godlike-policy.js');
const args=process.argv.slice(2),option=(name,fallback)=>{const i=args.indexOf(name);return i<0?fallback:args[i+1];};
const games=Number(option('--games',1000)),seedStart=Number(option('--seed-start',83000000));
if(!Number.isInteger(games)||games<4||games%4)throw Error('--games must be a positive multiple of four');
const records=[],latency={attack:[],defend:[],refresh:[]},routes={deck:0,blind:0,wounds:0,skip:0};let wins=0;
const started=performance.now();
for(let i=0;i<games;i++){
  const seed=seedStart+Math.floor(i/2),seat=i%2,first=Math.floor(i/2)%2;
  const sdk=new SDK.Game(seed,first),g=sdk.g,trace=crypto.createHash('sha256');let decisions=0,steps=0;
  while(!['game_over','match_over'].includes(g.phase)){
    if(++steps>4096)throw Error('Game did not finish');
    if(g.currentActor()===seat){
      const before=performance.now(),action=policy.chooseAction(policy.observe(g));
      latency[g.phase].push(performance.now()-before);decisions++;
      if(action.type==='swap')routes[action.target.zone]++;
      else if(action.type==='skip_swap')routes.skip++;
      sdk.step(action);
    }else g.aiStep();
    g.check();trace.update(JSON.stringify(g.save()));
  }
  const won=g.results.at(-1).winner===seat;if(won)wins++;
  records.push({seed,seat,first,won,decisions,trace:trace.digest('hex')});
  if((i+1)%100===0)process.stderr.write(`${i+1}/${games}: ${wins} wins\n`);
}
const percentile=(values,p)=>[...values].sort((a,b)=>a-b)[Math.min(values.length-1,Math.floor(values.length*p))];
const sourceFiles=['sdk/godlike-policy.js','gamecore.js','training/evaluate_godlike.cjs'];
const report={policy:policy.version,opponent:'code-table-v1',rules:'1.0.0',protocol:'Independent level-2 small games. Each direct core seed is played twice with Godlike seats swapped; first attacker alternates between seed pairs. Not the Gym seed mapping.',
  games,wins,win_rate:wins/games,seed_start:seedStart,seed_end:seedStart+games/2-1,
  runtime:{node:process.version,platform:process.platform,arch:process.arch,cpu:require('node:os').cpus()[0].model},
  milliseconds:performance.now()-started,routes,latency_ms:Object.fromEntries(Object.entries(latency).map(([phase,v])=>[phase,{count:v.length,p50:percentile(v,.5),p95:percentile(v,.95),max:Math.max(...v)}])),
  sha256:Object.fromEntries(sourceFiles.map(p=>[p,crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,'..',p))).digest('hex')])),records};
const output=option('--output',null);
if(output){fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({...report,records:undefined},null,2));
