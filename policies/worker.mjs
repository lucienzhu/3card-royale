import {catalog} from './catalog.mjs';
import {loadPolicy} from './runtime.mjs';
const node=typeof process!=='undefined'&&!!process.versions?.node;
const port=node?(await import('node:worker_threads')).parentPort:self;
let policy;
async function handle(data) {
  const {id,command}=data;
  try {
    let result;
    if(command==='load') {
      const entry=(await catalog()).find(e=>e.manifest.id===data.policy);
      if(!entry)throw Error('Policy is not in the reviewed registry');
      await policy?.dispose();policy=await loadPolicy(entry.url);
      result={manifest:policy.manifest};
    } else {
      if(!policy)throw Error('Policy not loaded');
      if(command==='reset'){policy.reset(data.seed);result={ready:true};}
      else if(command==='act'){
        const start=performance.now(),index=await policy.act(data.observation);
        result={index,elapsedMs:performance.now()-start};
      } else throw Error('Unknown policy command');
    }
    port.postMessage({id,result});
  }catch(error){port.postMessage({id,error:String(error.message||error)});}
}
// Serialize loads, resets and decisions; stateful policies never overlap.
let queue=Promise.resolve();
const enqueue=data=>{queue=queue.then(()=>handle(data));};
if(node)port.on('message',enqueue);else self.onmessage=event=>enqueue(event.data);
