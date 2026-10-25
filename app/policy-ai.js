(function() {
  'use strict';
  const key='sz_policy_ai_v1', select=document.getElementById('policy-select'), status=document.getElementById('policy-status');
  const workerURL=new URL('policy-worker.js',document.currentScript.src);
  let selected='easy', worker=null, sequence=0, state='idle', version=null, last=null, retryAfter=0, godlikeFailed=false, selectionRevision=0;
  const pending=new Map();
  try { const saved=localStorage.getItem(key);if(['easy','code','nn','godlike','arena'].includes(saved))selected=saved; }catch{}
  if(window.SZArenaPolicy && new URLSearchParams(location.search).has('policy'))selected='arena';
  select.value=selected;
  const en=()=>window.GKLocale?.language==='en';
  function paint() {
    document.getElementById('policy-label').textContent=en()?'Difficulty':'难度';
    for(const option of select.options)option.textContent=({easy:en()?'Easy · Easy AI':'简单 · Easy AI',nn:en()?'Medium · NN AI':'中等 · NN AI',code:en()?'Hard · Code AI':'困难 · Code AI',godlike:en()?'Godlike · Sees your hand':'超凡 · Godlike AI（明牌）',arena:en()?'Arena · Community policies':'天梯 · 社区策略'})[option.value];
    const unsupported=window.gkGame && window.gkGame.version!=='1.0.0';
    status.textContent=unsupported?(en()?'Historical rules use their original Code AI.':'历史规则使用原版 Code AI。'):selected==='godlike'?(godlikeFailed?(en()?'Godlike unavailable · using Hard Code AI':'Godlike 暂不可用 · 使用困难 Code AI'):(en()?'Sees your hand · No card memory':'可看你的手牌 · 不记牌')):selected!=='nn'?'':
      state==='loading'?(en()?'Loading NN AI…':'正在加载 NN AI…'):
      state==='failed'?(en()?'NN AI unavailable · using Easy AI':'NN AI 暂不可用 · 使用 Easy AI'):
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
    if(selected!=='nn'||(window.gkGame&&window.gkGame.version!=='1.0.0'))return;
    state='loading';paint();
    try{await request();}catch{state='failed';retryAfter=Date.now()+60000;paint();}
  }
  function adapter(game){const sdk=Object.create(ThreeCardRoyale.Game.prototype);sdk.g=game;return sdk;}
  async function decide(game) {
    if(game.version!=='1.0.0')return {kind:'legacy'};
    // Hard preserves the original table policy, including retained-hand and swap evaluation.
    // RoyaleCodePolicy is the frozen, simpler SDK training baseline used by Easy/NN experiments.
    if(selected==='code')return {kind:'code',version:'code-table-v1'};
    // Never send a public SDK observation (which includes discard/history) to Godlike.
    if(selected==='godlike'){
      const revision=selectionRevision;
      if(!godlikeFailed||Date.now()>=retryAfter){
        try{
          const result=await window.SZGodlikeAI.decide(game);
          if(revision===selectionRevision){godlikeFailed=false;last=result;paint();}
          return {kind:'godlike',action:result.action,version:result.version};
        }catch{if(revision===selectionRevision){godlikeFailed=true;retryAfter=Date.now()+60000;paint();}}
      }
      return {kind:'code',version:'code-table-v1',fallback:'godlike'};
    }
    if(selected==='arena'){
      try{return await window.SZArenaPolicy.decide(game);}catch{
        const observation=adapter(game).observation(game.currentActor());
        return {kind:'easy',action:RoyaleEasyPolicy.chooseAction(observation),version:RoyaleEasyPolicy.version,fallback:'arena'};
      }
    }
    const o=adapter(game).observation(game.currentActor());
    if(selected==='nn' && Date.now()>=retryAfter){
      try{
        const result=await request(o);
        if(!Number.isInteger(result.index)||!o.legal_actions[result.index])throw Error('Illegal policy index');
        return {kind:'nn',action:o.legal_actions[result.index],version:result.version};
      }catch{state='failed';retryAfter=Date.now()+60000;paint();}
    }
    return {kind:'easy',action:RoyaleEasyPolicy.chooseAction(o),version:RoyaleEasyPolicy.version,fallback:selected==='nn'};
  }
  function apply(game, decision){
    if(decision.kind==='legacy'||decision.kind==='code')game.aiStep();
    else adapter(game).step(decision.action);
  }
  select.addEventListener('change',()=>{
    selectionRevision++;
    window.SZGodlikeAI?.cancel();
    window.SZArenaPolicy?.cancel();
    selected=['easy','nn','code','godlike','arena'].includes(select.value)?select.value:'easy';
    retryAfter=0;godlikeFailed=false;
    try{localStorage.setItem(key,selected);}catch{}
    if(typeof location!=='undefined'&&typeof history!=='undefined'){const url=new URL(location.href);if(selected==='arena')url.searchParams.set('policy',window.SZArenaPolicy.selected);else url.searchParams.delete('policy');history.replaceState(null,'',url);}
    window.dispatchEvent(new Event('sz-policy-change'));paint();preload();
  });
  let language=document.documentElement.lang;
  new MutationObserver(()=>{if(language!==document.documentElement.lang){language=document.documentElement.lang;paint();}}).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
  document.getElementById('version-select').addEventListener('change',()=>queueMicrotask(paint));
  window.SZPolicy={decide,apply,preload,get selected(){return selected;},get diagnostics(){return {selected,state,version,last,godlikeFailed};}};
  paint();if(selected==='nn')setTimeout(preload,0);
})();
