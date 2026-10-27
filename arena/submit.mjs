// Run reviewed local policy code and save a reproducible receipt to include in the PR.
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {context,targetsFor,LIMITS,checkMatch,receiptFor} from './reference.mjs';
import {runPair} from './run-pair.mjs';
const args=process.argv.slice(2),id=args[args.indexOf('--policy')+1];
if(!args.includes('--policy')||!id)throw Error('Use --policy <registered-new-id>');
const ctx=await context();targetsFor(ctx,{explicit:id,limit:1});
const dir=await fs.mkdtemp(path.join(os.tmpdir(),'royale-local-'));
try{
 const report=await runPair(id,'code-table-v1',{games:4,seedStart:ctx.panel.smokeSeedStart,file:path.join(dir,'report.json')});
 checkMatch(report,ctx,id,'code-table-v1',4,ctx.panel.smokeSeedStart);
 const destination=`policies/entries/${id}/validation.json`;
 await fs.writeFile(destination,JSON.stringify(receiptFor(ctx,id,report),null,2)+'\n');
 console.log(`Passed ${LIMITS.smokeGames} paired games. Commit ${destination} with the policy.`);
}finally{await fs.rm(dir,{recursive:true,force:true});}
