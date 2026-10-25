import fs from 'node:fs/promises';
import {sdk,code} from '../policies/dependencies.mjs';
const args=process.argv.slice(2),i=args.indexOf('--output'),output=i<0?'/tmp/royale-observations.json':args[i+1];
const cases=[];
for(let seed=1;seed<=12;seed++){
 const game=new sdk.Game(seed,seed%2);let steps=0;
 while(!['game_over','match_over'].includes(game.g.phase)){
  if(++steps>4096)throw Error('Fixture game limit');
  if(game.actor===null){game.step(game.legalActions()[0]);continue;}
  const observation=game.observation(game.actor);cases.push({observation});game.step(code.chooseAction(observation));
 }
}
await fs.writeFile(output,JSON.stringify({api:'royale-policy-v1',cases},null,2)+'\n');console.log(`${cases.length} observations → ${output}`);
