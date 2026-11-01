/* Reproducible SDK Code AI self-play; complete games stay in one split. */
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto');
const SDK=require('../../sdk/index.js'),code=require('../../sdk/policy.js'),A=require('../../sdk/actions.js');
const args=process.argv.slice(2),get=(k,d)=>args.includes(k)?args[args.indexOf(k)+1]:d;
const games=Number(get('--games',10000)),seed=Number(get('--seed',20261101)),out=get('--out','artifacts/structured-v2/data.jsonl.gz');
if(!Number.isInteger(games)||games<10||!Number.isInteger(seed))throw Error('Invalid collection recipe');
if(fs.existsSync(out))throw Error('Use a fresh dataset path');fs.mkdirSync(path.dirname(out),{recursive:true});
const gzip=zlib.createGzip({level:9}),file=fs.createWriteStream(out,{flags:'wx'});gzip.pipe(file);
let samples=0,tokens=0,retries=0;const started=Date.now(),kinds={},splits={train:0,val:0,test:0};
async function run(){
 for(let id=0;id<games;id++){
  let records,completed=false,attempt=0;
  while(!completed){
   const g=new SDK.Game((seed+id+attempt*1000003)>>>0,id%2);
   // Levels sampled independently of the deck. Both seats stay public-only.
   if(id%3){g.g.players[0].level=2+(Math.imul(id+1,1664525)>>>0)%13;g.g.players[1].level=2+(Math.imul(id+1,1013904223)>>>0)%13;if(id%3===2)g.g.players[id%2].level=14;g.g.flowerLevel=g.g.players[id%2].level;}
   records=[];
   for(let step=0;step<4096;step++){
    if(['game_over','match_over'].includes(g.g.phase)){completed=true;break;}
    if(g.actor===null){g.step(g.legalActions()[0]);continue;}
    const o=g.observation(g.actor),action=code.chooseAction(o),grammar=A.build(o),seq=A.tokens(A.fromLegacy(o,action));
    const masks=seq.map((_,i)=>Array.from(grammar.next(seq.slice(0,i)).mask).flatMap((v,t)=>v?[t]:[]));
    records.push({game:id,state:Array.from(A.state(o)),tokens:seq,masks});g.step(action);
   }
   if(!completed){retries++;if(++attempt>5)throw Error('Repeated truncation');}
  }
  for(const r of records){
   if(!gzip.write(JSON.stringify(r)+'\n'))await new Promise(resolve=>gzip.once('drain',resolve));
   samples++;tokens+=r.tokens.length;kinds[r.tokens[0]]=(kinds[r.tokens[0]]||0)+1;
   splits[id%10===0?'val':id%10===1?'test':'train']++;
  }
  if((id+1)%100===0)console.log(JSON.stringify({games:id+1,samples,seconds:Math.round((Date.now()-started)/1000)}));
 }
 gzip.end();await new Promise((resolve,reject)=>{file.on('finish',resolve);file.on('error',reject);gzip.on('error',reject);});
 const bytes=fs.readFileSync(out),summary={schema:A.VERSION,teacher:'sdk-code-policy-v0.2.0',games,seed,samples,tokens,kinds,splits,retries,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),split:'game ID modulo 10: 0 val, 1 test, 2..9 train',seconds:(Date.now()-started)/1000};
 const sources=['gamecore.js','sdk/index.js','sdk/policy.js','sdk/actions.js','training/structured/collect.cjs'];
 summary.sources=Object.fromEntries(sources.map(file=>[file,crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,'../..',file))).digest('hex')]));
 fs.writeFileSync(path.join(path.dirname(out),'dataset.json'),JSON.stringify(summary,null,2)+'\n');console.log(summary);
}
run().catch(e=>{console.error(e);process.exitCode=1;gzip.destroy();file.destroy();});
