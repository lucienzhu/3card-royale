/* Godlike: privileged current-hand search, Standard 1.0 only. No history or deck access. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('../gamecore.js'));
  else root.RoyaleGodlikePolicy=factory(root.GK);
})(typeof globalThis!=='undefined'?globalThis:this,function(GK){
  'use strict';
  const version='godlike-v1',rules='1.0.0';
  const present=cards=>cards.filter(c=>c!==null);
  function observe(game){
    if(game.version!==rules)throw Error('Godlike requires Standard 1.0');
    const player=game.currentActor();
    if(player!==0&&player!==1)throw Error('No current decision');
    const own=game.players[player],enemy=game.players[1-player];
    // Explicit allowlist. Do not use save(), view(), SDK.observation() or game history.
    const active=game.phase==='defend'?game.active[game.attacker]:null;
    return {rules,player,phase:game.phase,attacker:game.attacker,battle_index:game.battleIndex,
      flower_level:game.flowerLevel,hand:[...own.hand],wounds:own.table.map(x=>x.card),
      enemy_hand:[...enemy.hand],enemy_wounds:enemy.table.map(x=>x.card),
      attack:active?{cards:[...active.cards],score:active.score,rankKey:[...active.rankKey]}:null,
      swap_remaining:game.phase==='refresh'?game.pendingRefresh.remaining:0};
  }
  function legalActions(o){
    if(o.rules!==rules)throw Error('Godlike requires Standard 1.0');
    if(o.phase==='attack'||o.phase==='defend')return GK.legalPlays([...o.hand,...present(o.wounds)].sort((a,b)=>a-b),o.flower_level,rules).map(cards=>({type:'play',cards:[...cards].sort((a,b)=>a-b)}));
    if(o.phase!=='refresh')return [];
    const out=[];
    for(const zone of ['hand','wounds'])o[zone].forEach((c,index)=>{
      if(c===null)return;
      const source={zone,index};
      out.push({type:'swap',source,target:{zone:'deck'}});
      if(o.enemy_hand.length)out.push({type:'swap',source,target:{zone:'blind'}});
      o.enemy_wounds.forEach((c,i)=>{if(c!==null)out.push({type:'swap',source,target:{zone:'wounds',who:1-o.player,index:i}});});
      const other=zone==='hand'?'wounds':'hand';
      o[other].forEach((c,i)=>{if(c!==null)out.push({type:'swap',source,target:{zone:other,who:o.player,index:i}});});
    });
    return [...out,{type:'skip_swap'},{type:'stop_swaps'}];
  }
  function unknownCards(o){
    // Deliberately forget all previously played cards, even if they are in the real discard.
    const visible=new Set([...o.hand,...o.wounds,...o.enemy_hand,...o.enemy_wounds,...(o.attack?.cards||[])]);
    return Array.from({length:52},(_,i)=>i).filter(c=>!visible.has(c));
  }
  const strength=e=>e.score+(e.rankKey[0]||0)/30+(e.rankKey[1]||0)/450+(e.rankKey[2]||0)/6750;
  const pain=n=>120*n+25*n*n;
  function search(o){
    const actions=legalActions(o);
    if(!actions.length)throw Error('No legal Godlike action');
    const level=o.flower_level,cache=new Map();
    function moves(pool){return GK.legalPlays([...pool].sort((a,b)=>a-b),level,rules).map(cards=>({cards,e:GK.evaluate(cards,level,rules)}));}
    function quality(pool){
      const key=[...pool].sort((a,b)=>a-b).join(',');
      if(cache.has(key))return cache.get(key);
      const all=moves(pool);let best=0;
      for(const m of all)best=Math.max(best,strength(m.e));
      // Value the strongest retained combination, with a small card-count tie-break.
      const value=best+pool.length*.035;cache.set(key,value);return value;
    }
    const own=[...o.hand,...present(o.wounds)],enemy=[...o.enemy_hand,...present(o.enemy_wounds)];
    if(o.phase==='refresh'){
      const unknown=unknownCards(o);
      const position=(a,b)=>quality(a)-quality(b);
      let best={type:'skip_swap'},bestValue=position(own,enemy);
      const replace=(pool,old,card)=>pool.map(c=>c===old?card:c);
      for(const action of actions){
        if(action.type!=='swap')continue;
        const source=o[action.source.zone][action.source.index],t=action.target;
        // Moving between our own zones does not improve the current usable pool.
        if(t.who===o.player)continue;
        let value;
        if(t.zone==='deck')value=unknown.reduce((sum,c)=>sum+position(replace(own,source,c),enemy),0)/unknown.length;
        else if(t.zone==='blind')value=o.enemy_hand.reduce((sum,c)=>sum+position(replace(own,source,c),replace(enemy,c,source)),0)/o.enemy_hand.length;
        else {const c=o.enemy_wounds[t.index];value=position(replace(own,source,c),replace(enemy,c,source));}
        if(value>bestValue+1e-9){best=action;bestValue=value;}
      }
      return {action:best,value:bestValue,candidates:actions.length,comparisons:0};
    }
    function prepared(pool,wounds){
      return moves(pool).map(m=>{
        const used=new Set(m.cards),remaining=pool.filter(c=>!used.has(c));
        return {...m,retained:quality(remaining),wounds:m.cards.filter(c=>wounds.includes(c)).length};
      });
    }
    const ours=prepared(own,o.wounds),theirs=o.phase==='attack'?prepared(enemy,o.enemy_wounds):null;
    let comparisons=0,best=null,bestValue=-Infinity;
    function value(a,d){
      comparisons++;
      const delta=GK.outcome(a.e,d.e,rules).effectiveDelta;
      const defending=o.phase==='defend',damage=Math.max(0,delta),wounds=defending?o.wounds.length:o.enemy_wounds.length;
      const hit=damage&&wounds+damage>=5?1e6:pain(wounds+damage)-pain(wounds);
      // Exact current combat, then a heuristic for swaps and retained cards.
      const immediate=delta>0?hit:delta*28;
      const attackerFuture=a.retained||0,defenderFuture=d.retained||0;
      const future=(attackerFuture-defenderFuture)*22+((a.wounds||0)-(d.wounds||0))*7;
      return (defending?-1:1)*(immediate+future);
    }
    for(const m of ours){
      let score;
      if(theirs){score=Infinity;for(const reply of theirs)score=Math.min(score,value(m,reply));}
      else score=value({e:o.attack,retained:quality(enemy),wounds:0},m);
      if(score>bestValue+1e-9){best=m;bestValue=score;}
    }
    return {action:{type:'play',cards:[...best.cards].sort((a,b)=>a-b)},value:bestValue,candidates:ours.length,comparisons};
  }
  return {version,observe,legalActions,unknownCards,search,chooseAction:o=>search(o).action};
});
