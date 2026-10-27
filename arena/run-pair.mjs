import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import {LIMITS} from './reference.mjs';
export async function runPair(a,b,{games,seedStart,file,deadline=Date.now()+LIMITS.pairMs}){
 const timeout=Math.min(LIMITS.pairMs,deadline-Date.now());if(timeout<=0)throw Error('Evaluation budget exhausted');
 await new Promise((resolve,reject)=>{
  const child=spawn(process.execPath,['arena/evaluate.mjs','--games',String(games),'--seed-start',String(seedStart),'--policies',[a,b].join(','),'--output',file],{stdio:['ignore','ignore','inherit']});
  let expired=false;const timer=setTimeout(()=>{expired=true;child.kill('SIGKILL');},timeout);
  child.on('error',e=>{clearTimeout(timer);reject(e);});child.on('exit',(code,signal)=>{clearTimeout(timer);code===0&&!expired?resolve():reject(Error(expired?'Pair exceeded time budget':`Evaluation failed: ${signal||code}`));});
 });
 return JSON.parse(await fs.readFile(file));
}
