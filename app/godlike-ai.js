(function(){
  'use strict';
  const url=new URL('godlike-worker.js?v=godlike1',document.currentScript.src),pending=new Map();
  let worker=null,sequence=0;
  function cancel(){
    worker?.terminate();worker=null;
    for(const item of pending.values()){clearTimeout(item.timer);item.reject(Error('Godlike search canceled'));}
    pending.clear();
  }
  function decide(game){
    const observation=RoyaleGodlikePolicy.observe(game);
    if(!worker){
      worker=new Worker(url);
      worker.onerror=cancel;
      worker.onmessage=({data})=>{
        const item=pending.get(data.id);if(!item)return;
        clearTimeout(item.timer);pending.delete(data.id);
        if(data.error)item.reject(Error(data.error));
        else if(!item.actions.has(JSON.stringify(data.action)))item.reject(Error('Illegal Godlike action'));
        else item.resolve(data);
      };
    }
    return new Promise((resolve,reject)=>{
      const id=++sequence,timer=setTimeout(cancel,15000);
      pending.set(id,{resolve,reject,timer,actions:new Set(RoyaleGodlikePolicy.legalActions(observation).map(a=>JSON.stringify(a)))});
      try{worker.postMessage({id,observation});}catch(error){clearTimeout(timer);pending.delete(id);reject(error);}
    });
  }
  window.SZGodlikeAI={decide,cancel};
})();
