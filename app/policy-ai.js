(function() {
  'use strict';
  const key='sz_policy_ai_v1', select=document.getElementById('policy-select'), status=document.getElementById('policy-status');
  const workerURL=new URL('policy-worker.js',document.currentScript.src);
  let selected='code', worker=null, sequence=0, state='idle', version=null, last=null, retryAfter=0;
  const pending=new Map();
  try { if(localStorage.getItem(key)==='nn')selected='nn'; }catch{}
  select.value=selected;
  const en=()=>window.GKLocale?.language==='en';
  function paint() {
    document.getElementById('policy-label').textContent=en()?'Opponent':'对手 AI';
    const unsupported=window.gkGame && window.gkGame.version!=='1.0.0';
    status.textContent=selected==='code'?'':unsupported?(en()?'NN AI supports rules 1.0; using Code AI.':'NN AI 仅支持规则 1.0，当前使用 Code AI。'):
      state==='loading'?(en()?'Loading NN AI…':'正在加载 NN AI…'):
      state==='failed'?(en()?'NN AI unavailable · using Code AI':'NN AI 暂不可用 · 使用 Code AI'):
      state==='ready'?(en()?'NN AI ready':'NN AI 已就绪'):'';
    status.hidden=!status.textContent;
  }
  function shutdown(error) {
    worker?.terminate(); worker=null;
    for(const item of pending.values()){clearTimeout(item.timer);item.reject(error);}pending.clear();
    state='failed';retryAfter=Date.now()+60000;paint();
  }
  function request(observation) {
    if(!worker){
      worker=new Worker(workerURL);
      worker.onmessage=({data})=>{
        const item=pending.get(data.id); if(!item)return;
        clearTimeout(item.timer);pending.delete(data.id);
        if(data.error){state='failed';retryAfter=Date.now()+60000;item.reject(Error(data.error));}
        else{state='ready';retryAfter=0;version=data.version;last=data;item.resolve(data);}
        paint();
      };
      worker.onerror=()=>shutdown(Error('Policy worker failed'));
    }
    return new Promise((resolve,reject)=>{
      const id=++sequence;
      const timer=setTimeout(()=>shutdown(Error('Policy request timed out')),15000);
      pending.set(id,{resolve,reject,timer});worker.postMessage({id,observation});
    });
  }
  async function preload(){
    if(selected!=='nn')return;
    state='loading';paint();
    try{await request();}catch{state='failed';retryAfter=Date.now()+60000;paint();}
  }
  function adapter(game){const sdk=Object.create(ThreeCardRoyale.Game.prototype);sdk.g=game;return sdk;}
  async function decide(game) {
    if(game.version!=='1.0.0')return {kind:'legacy'};
    const o=adapter(game).observation(game.currentActor());
    if(selected==='nn' && Date.now()>=retryAfter){
      try{
        const result=await request(o);
        if(!Number.isInteger(result.index)||!o.legal_actions[result.index])throw Error('Illegal policy index');
        return {kind:'nn',action:o.legal_actions[result.index],version:result.version};
      }catch{state='failed';retryAfter=Date.now()+60000;paint();}
    }
    return {kind:'code',action:RoyaleCodePolicy.chooseAction(o)};
  }
  function apply(game, decision){
    if(decision.kind==='legacy')game.aiStep();
    else adapter(game).step(decision.action);
  }
  select.addEventListener('change',()=>{
    selected=select.value==='nn'?'nn':'code';
    retryAfter=0;
    try{localStorage.setItem(key,selected);}catch{}
    window.dispatchEvent(new Event('sz-policy-change'));paint();preload();
  });
  let language=document.documentElement.lang;
  new MutationObserver(()=>{if(language!==document.documentElement.lang){language=document.documentElement.lang;paint();}}).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
  document.getElementById('version-select').addEventListener('change',()=>queueMicrotask(paint));
  window.SZPolicy={decide,apply,preload,get selected(){return selected;},get diagnostics(){return {selected,state,version,last};}};
  paint();if(selected==='nn')setTimeout(preload,0);
})();
