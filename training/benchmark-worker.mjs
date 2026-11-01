// Local evaluation only. Public policies use the production runtime unchanged.
import {parentPort} from 'node:worker_threads';
import {loadPolicy} from '../policies/runtime.mjs';
import godlike from '../sdk/godlike-policy.js';
let policy,privileged=false;
async function handle({id,command,...data}) {
  try {
    let result;
    if(command==='load') {
      await policy?.dispose();privileged=data.policy==='godlike';
      policy=privileged?null:await loadPolicy(new URL(data.policy));
      result={ready:true};
    } else if(command==='reset') {
      policy?.reset(data.seed);result={ready:true};
    } else if(command==='act') {
      const start=performance.now();
      let index;
      if(privileged) {
        const action=godlike.chooseAction(data.privileged);
        index=data.observation.legal_actions.findIndex(a=>JSON.stringify(a)===JSON.stringify(action));
      } else index=await policy.act(data.observation);
      result={index,elapsedMs:performance.now()-start};
    } else throw Error('Unknown command');
    parentPort.postMessage({id,result});
  } catch(error) {parentPort.postMessage({id,error:String(error.stack||error)});}
}
let queue=Promise.resolve();
parentPort.on('message',data=>{queue=queue.then(()=>handle(data));});
