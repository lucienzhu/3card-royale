import {validateIndex} from './contract.mjs';
export class PolicyClient {
  constructor({makeWorker=()=>new Worker(new URL('./worker.mjs',import.meta.url),{type:'module'}),decisionMs=1000,loadMs=30000}={}) {
    this.makeWorker=makeWorker;this.decisionMs=decisionMs;this.loadMs=loadMs;this.pending=new Map();this.sequence=0;this.worker=null;
  }
  cancel(message='Policy canceled') {
    this.worker?.terminate();this.worker=null;
    for(const p of this.pending.values()){clearTimeout(p.timer);p.reject(Error(message));}this.pending.clear();
  }
  request(command,payload={},timeout=this.decisionMs) {
    if(!this.worker) {
      const w=this.worker=this.makeWorker();
      const onMessage=data=>{
        if(this.worker!==w)return;
        const p=this.pending.get(data.id);if(!p)return;
        this.pending.delete(data.id);clearTimeout(p.timer);
        if(data.error)p.reject(Error(data.error));else p.resolve(data.result);
      };
      if(typeof w.on==='function') {w.on('message',onMessage);w.on('error',()=>{if(this.worker===w)this.cancel('Policy worker failed');});w.on('exit',()=>{if(this.worker===w)this.cancel('Policy worker exited');});}
      else {w.onmessage=e=>onMessage(e.data);w.onerror=()=>{if(this.worker===w)this.cancel('Policy worker failed');};}
    }
    return new Promise((resolve,reject)=>{
      const id=++this.sequence;
      const timer=setTimeout(()=>this.cancel('Policy timed out'),timeout);
      this.pending.set(id,{resolve,reject,timer});
      try{this.worker.postMessage({id,command,...payload});}catch(e){this.cancel(e.message);}
    });
  }
  load(policy){return this.request('load',{policy},this.loadMs);}
  reset(seed){return this.request('reset',{seed});}
  async act(observation){const result=await this.request('act',{observation});validateIndex(result.index,observation.legal_actions.length);return result;}
}
