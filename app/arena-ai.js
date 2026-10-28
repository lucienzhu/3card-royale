/* Registry-only policies; arbitrary URLs / scripts never enter the game loader. */
(function(){
  'use strict';
  const field=document.getElementById('arena-policy-field'),select=document.getElementById('arena-policy-select'),status=document.getElementById('arena-policy-status'),elo=document.getElementById('arena-policy-elo');
  const root=new URL('../policies/',document.currentScript.src),key='sz_arena_policy_v1';
  const requested=new URLSearchParams(location.search).get('policy');
  let selected=requested||'code-table-v1',client=null,gameRef=null,gameNumber=null,loaded=null,entries=[],failed='',revision=0,ratings=null,ratingsUnavailable=false;
  try{if(!requested)selected=localStorage.getItem(key)||selected;}catch{}
  const en=()=>window.GKLocale?.language==='en';
  function rating(id){
    const manifest=entries.find(e=>e.manifest.id===id)?.manifest,recorded=ratings?.policies?.find(p=>p?.id===id),row=ratings?.leaderboard?.find(r=>r?.id===id);
    // Match the ladder's manifest check: a new artifact must not inherit an old score.
    return manifest&&recorded&&JSON.stringify(manifest)===JSON.stringify(recorded)&&Number.isFinite(row?.elo)&&(row.reference||row.games>0)?row:null;
  }
  function paint(){
    field.hidden=window.SZPolicy?.selected!=='arena';
    document.getElementById('arena-policy-label').textContent=en()?'Arena policy':'天梯策略';
    document.getElementById('arena-link').textContent=en()?'Leaderboard ↗':'查看天梯 ↗';
    document.getElementById('arena-link').href='arena.html?lang='+(en()?'en':'zh-CN');
    const row=rating(selected),unrated=ratingsUnavailable?(en()?'Elo unavailable':'Elo 暂不可用'):ratings?(en()?'Unrated':'待评估'):'Elo —';
    elo.textContent=row?`Elo ${row.elo}`:unrated;
    elo.title=row?(row.reference?(en()?'Fixed reference':'固定基准'):row.provisional?(en()?'Provisional':'暂定'):'') :'';
    elo.setAttribute('aria-label',[elo.textContent,elo.title].filter(Boolean).join(' · '));
    entries.forEach(({manifest:m},i)=>{const r=rating(m.id);select.options[i].textContent=m.name+' · '+(r?`Elo ${r.elo}`:unrated);});
    status.textContent=failed?(en()?'Policy unavailable · using Easy AI':'策略暂不可用 · 使用 Easy AI'):loaded?(en()?'Ready · runs on this device':'已就绪 · 本机运行'):(en()?"Loads on opponent’s turn":'对手行动时加载');
    // Before loading, the rating context is more useful than a runtime detail.
    if(!failed&&!loaded&&row)status.textContent=row.reference?(en()?'Fixed reference':'固定基准'):(row.provisional?(en()?'Provisional · ':'暂定 · '):'')+row.games+(en()?' games':' 局');
  }
  // Scores are optional metadata; a failed request must never disable a playable policy.
  fetch(new URL('../arena/results/leaderboard.json',root),{cache:'no-cache'}).then(response=>{if(!response.ok)throw Error('Ratings unavailable');return response.json();}).then(data=>{
    if(!Array.isArray(data.policies)||!Array.isArray(data.leaderboard))throw Error('Invalid ratings');ratings=data;paint();
  }).catch(()=>{ratings=null;ratingsUnavailable=true;paint();});
  const ready=Promise.all([import(new URL('catalog.mjs',root)),import(new URL('client.mjs',root))]).then(async([catalog,{PolicyClient}])=>{
    entries=await catalog.catalog();
    select.replaceChildren(...entries.map(({manifest:m})=>{const option=document.createElement('option');option.value=m.id;option.textContent=`${m.name} · ${m.type==='onnx'?'NN':'JS'}`;return option;}));
    if(!entries.some(e=>e.manifest.id===selected))failed='Unknown registry policy';
    select.value=selected;client=new PolicyClient({decisionMs:3000});paint();
  }).catch(e=>{failed=e.message;paint();throw e;});
  // Do not create an unhandled rejection when the optional catalog is offline.
  ready.catch(()=>{});
  function cancel(){revision++;client?.cancel();loaded=null;gameRef=null;gameNumber=null;paint();}
  async function decide(game){
    const serial=revision;
    try {
      await ready;if(failed)throw Error(failed);
      if(!loaded){await client.load(selected);if(serial!==revision)throw Error('Canceled');loaded=selected;}
      if(gameRef!==game||gameNumber!==game.game){await client.reset(crypto.getRandomValues(new Uint32Array(1))[0]);gameRef=game;gameNumber=game.game;}
      const adapter=Object.create(ThreeCardRoyale.Game.prototype);adapter.g=game;
      const observation=adapter.observation(game.currentActor()),result=await client.act(observation);
      if(serial!==revision)throw Error('Canceled');paint();
      return {kind:'arena',action:observation.legal_actions[result.index],version:selected};
    }catch(e){if(serial===revision){failed=e.message;client?.cancel();loaded=null;paint();}throw e;}
  }
  select.addEventListener('change',()=>{
    cancel();selected=select.value;failed='';try{localStorage.setItem(key,selected);}catch{}
    const url=new URL(location.href);url.searchParams.set('policy',selected);history.replaceState(null,'',url);
    window.dispatchEvent(new Event('sz-policy-change'));paint();
  });
  window.addEventListener('sz-policy-change',()=>{if(window.SZPolicy?.selected!=='arena')cancel();else failed='';paint();});
  let lang=document.documentElement.lang;new MutationObserver(()=>{if(lang!==document.documentElement.lang){lang=document.documentElement.lang;paint();}}).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
  window.SZArenaPolicy={decide,cancel,get selected(){return selected;},get diagnostics(){return {selected,loaded,error:failed};}};
  queueMicrotask(paint);
})();
