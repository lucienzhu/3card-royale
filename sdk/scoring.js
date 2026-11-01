/* Whole-move scoring is a model profile, not a different action protocol. */
(function(root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./actions.js'), require('./features.js'));
  else root.RoyaleScoring = factory(root.RoyaleActions, root.RoyaleFeatures);
})(typeof globalThis !== 'undefined' ? globalThis : this, function(A, F) {
  'use strict';
  function locate(cards, card) {
    const index = cards.indexOf(card);
    if (index < 0) throw Error('Scoring card is absent from its public zone');
    return index;
  }
  // Reuse the frozen 72-feature descriptor so old weights can be compared exactly.
  // Zone indices here are private model features; the submitted action uses card IDs.
  function descriptorAction(o, a) {
    if (a.type !== 'swap') return a;
    const zone = o.hand.includes(a.source) ? 'hand' : 'wounds';
    const source = {zone, index:locate(o[zone], a.source)};
    const t = a.target;
    if (['deck','blind'].includes(t.zone)) return {type:'swap', source, target:{zone:t.zone}};
    const own = t.zone.startsWith('own_'), targetZone = t.zone === 'own_hand' ? 'hand' : 'wounds';
    const cards = own ? o[targetZone] : o.enemy_wounds;
    return {type:'swap', source, target:{zone:targetZone, who:own ? o.player : 1-o.player, index:locate(cards,t.card)}};
  }
  function encode(o, episode='game') {
    const moves = A.build(o).rows.map(r=>r.action);
    const f = F.encode({...o,legal_actions:moves.map(a=>descriptorAction(o,a))}, episode);
    return {...f, actions:moves};
  }
  function choose(o, scores) {
    const rows = A.build(o).rows;
    if (scores.length !== rows.length) throw Error('Expected one score per complete legal action');
    return rows[F.bestLegal(scores,rows.length)].action;
  }
  return {version:'scoring-v2', encode, choose};
});
