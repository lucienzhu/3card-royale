/* Limited-attention, visible-information opponent for Standard Rules 1.0. */
(function(root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./index.js'), require('./policy.js'));
  else root.RoyaleEasyPolicy = factory(root.ThreeCardRoyale, root.RoyaleCodePolicy);
})(typeof globalThis !== 'undefined' ? globalThis : this, function(SDK, Code) {
'use strict';
const VERSION='easy-v1', BUDGET=48;
// Reproducible from public information alone; never touches the deal RNG.
function randomFor(o) {
  const key=JSON.stringify([o.player,o.phase,o.game,o.round,o.battle_index,o.flower_level,
    o.hand,o.wounds,o.enemy_wounds,o.discard,o.active.map(m=>m?m.cards:null),
    o.pending?o.pending.remaining:0,o.first,o.attacker,o.enemy_hand_count,o.deck_count]);
  let state=2166136261;
  for(let i=0;i<key.length;i++)state=Math.imul(state^key.charCodeAt(i),16777619)>>>0;
  if(!state)state=1;
  return ()=>{state^=state<<13;state^=state>>>17;state^=state<<5;return (state>>>0)/4294967296;};
}
function chooseAction(o, actions=o.legal_actions, budget=BUDGET) {
  if(!actions.length)throw Error('No legal decision');
  if(!Number.isInteger(budget)||budget<1)throw Error('Invalid attention budget');
  if(!['attack','defend','refresh'].includes(o.phase))return actions[0];
  const rng=randomFor(o);
  if(o.phase==='refresh') {
    const skip=actions.find(a=>a.type==='skip_swap')||actions.find(a=>a.type==='stop_swaps');
    // Use each opportunity independently. Redraw low cards; no targeted stealing.
    const redraws=actions.filter(a=>a.type==='swap'&&a.target.zone==='deck');
    if(skip&&(rng()<0.5||!redraws.length))return skip;
    return Code.chooseAction(o,redraws.length?redraws:actions);
  }
  let pool=actions;
  if(o.phase==='defend') {
    // Recognize immediate danger, but do not plan ahead or inspect hidden cards.
    const safe=actions.filter(a=>Math.max(0,SDK.outcome(o.active[o.attacker],SDK.evaluate(a.cards,o.flower_level)).effective_delta)+o.wounds.length<5);
    if(safe.length)pool=safe;
  }
  if(pool.length<=budget)return Code.chooseAction(o,pool);
  pool=pool.slice();
  for(let i=0;i<budget;i++) {
    const j=i+Math.floor(rng()*(pool.length-i));
    [pool[i],pool[j]]=[pool[j],pool[i]];
  }
  return Code.chooseAction(o,pool.slice(0,budget));
}
return {version:VERSION,budget:BUDGET,chooseAction};
});
