// Adapter for the browser's original visible-information heuristic.
// Arena applies the SDK's canonical action order, shared by all entrants.
export function createPolicy({core}) {
  return {act: o => {
    const table = cards => cards.map(card=>({card,up:card!==null,pending:card===null}));
    const toCoreSwap = a => ({source:{zone:a.source.zone==='wounds'?'table':'hand',index:a.source.index},
      ...(a.target.zone==='deck'?{exchange:'deck'}:a.target.zone==='blind'?{exchange:'opponent',who:1-o.player,zone:'hand',blind:true}:
      {exchange:'card',who:a.target.who,zone:a.target.zone==='wounds'?'table':'hand',index:a.target.index})});
    const swaps = o.legal_actions.filter(a=>a.type==='swap');
    const attack = o.active[o.attacker];
    const view = {version:o.rules,hand:o.hand,table:table(o.wounds),enemyTable:table(o.enemy_wounds),
      level:o.levels[0],enemyLevel:o.levels[1],flowerLevel:o.flower_level,role:o.phase,
      attackScore:attack?.score??null,attackMove:attack?{...attack,rankKey:attack.rank_key}:null,
      actor:o.player,enemyHandCount:o.enemy_hand_count,refreshRemaining:o.pending?.remaining||0,refreshOptions:swaps.map(toCoreSwap)};
    if (o.phase==='refresh') {
      const selected = JSON.stringify(core.chooseRefresh(view));
      return o.legal_actions.indexOf(swaps.find(a=>JSON.stringify(toCoreSwap(a))===selected));
    }
    const cards = core.choosePlay(view).sort((a,b)=>a-b).join(',');
    return o.legal_actions.findIndex(a=>a.type==='play' && a.cards.join(',')===cards);
  }};
}
