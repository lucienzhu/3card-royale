/* Tensor parity with python/threecard_royale/gym_env.py; visible information only. */
(function(root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./index.js'));
  else root.RoyaleFeatures = factory(root.ThreeCardRoyale);
})(typeof globalThis !== 'undefined' ? globalThis : this, function(SDK) {
  'use strict';
  function encode(o, episode = 'game') {
    const who = o.player, n = o.legal_actions.length;
    if (n > 512 || n < 1) throw Error('No supported legal decisions');
    const state = new Float32Array(336), candidates = new Float32Array(n * 72);
    const groups = [o.hand, o.wounds, o.enemy_wounds, o.discard,
      o.active[who]?.cards || [], o.active[1 - who]?.cards || []];
    groups.forEach((cards, i) => cards.forEach(c => { if (c !== null) state[i * 52 + c] = 1; }));
    state[312 + ['attack','defend','refresh','resolved','game_over','match_over'].indexOf(o.phase)] = 1;
    state.set([o.levels[0]/14, o.levels[1]/14, o.flower_level/14,
      Math.min(o.wounds.length,10)/10, Math.min(o.enemy_wounds.length,10)/10,
      o.enemy_hand_count/8, o.deck_count/52, o.discard.length/52,
      o.a_losses[0]/3, o.a_losses[1]/3, +(o.first === who), +(o.attacker === who),
      o.battle_index, (o.pending?.remaining || 0)/7, +(o.actor === who),
      Math.min(o.round,1024)/1024, Math.min(o.game,1024)/1024, +(episode === 'match')], 318);
    o.legal_actions.forEach((a, i) => {
      const f = candidates.subarray(i*72, (i+1)*72);
      f[52 + ['play','swap','stop_swaps','advance','next_game'].indexOf(a.type === 'skip_swap' ? 'stop_swaps' : a.type)] = 1;
      if (a.type === 'skip_swap') f[59] = 1;
      if (a.type === 'play') {
        a.cards.forEach(c => { f[c] = 1; });
        const e = SDK.evaluate(a.cards, o.flower_level);
        f[67] = e.score/7; f[68] = e.kind/7; f[69] = e.rank_key[0]/14;
        f[70] = a.cards.length/5; f[71] = +(o.flower_level === 14 && o.level_owner === who);
      }
      if (a.type === 'swap') {
        const s = a.source, t = a.target;
        f[o[s.zone][s.index]] = 1; f[57 + +(s.zone === 'wounds')] = 1; f[59] = s.index/11;
        f[t.zone === 'deck' ? 60 : t.zone === 'blind' ? 61 : t.who === who ? 62 : 63] = 1;
        if (!['deck','blind'].includes(t.zone)) {
          const c = t.who === who ? o[t.zone][t.index] : o.enemy_wounds[t.index];
          f[64] = (c%13 + 2)/14; f[65] = Math.floor(c/13)/3; f[66] = c/51;
        }
      }
    });
    return {state, candidates, count: n};
  }
  function bestLegal(logits, count) {
    if (logits.length < count || !count) throw Error('Invalid policy output');
    let best = -1;
    for (let i=0; i<count; i++) {
      if (!Number.isFinite(logits[i])) throw Error('Non-finite policy output');
      if (best < 0 || logits[i] > logits[best]) best = i;
    }
    return best;
  }
  return {encode, bestLegal, version: 'gym-v1'};
});
