"use strict";
const { evaluate, outcome } = require("./index.js");
const rank = (c) => (c % 13) + 2,
  wild = (c, l) => Math.floor(c / 13) === 1 && rank(c) === l;
function compare(a, b) {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] ?? 0,
      y = b[i] ?? 0,
      d = Array.isArray(x) ? compare(x, y) : x - y;
    if (d) return d;
  }
  return 0;
}
function chooseAction(o, actions = o.legal_actions) {
  if (!actions.length) throw Error("No legal decision");
  if (!["attack", "defend", "refresh"].includes(o.phase)) return actions[0];
  const level = o.flower_level,
    key = (a) => {
      if (o.phase !== "refresh") {
        const e = evaluate(a.cards, level),
          uses = a.cards.filter((c) => o.wounds.includes(c)).length,
          w = a.cards.filter((c) => wild(c, level)).length;
        if (o.phase === "attack") return [e.score, e.rank_key, uses, -w];
        const d = outcome(o.active[o.attacker], e).effective_delta;
        return [-Math.max(d, 0), Math.max(-d, 0), uses, -w];
      }
      if (a.type === "stop_swaps") return [-1000];
      const c = o[a.source.zone][a.source.index],
        t = a.target;
      if (["deck", "blind"].includes(t.zone))
        return [
          0,
          -Number(wild(c, level)),
          -rank(c),
          Number(t.zone === "deck"),
        ];
      if (t.who === o.player) return [-100];
      const take = o.enemy_wounds[t.index];
      const diff = Number(wild(take, level)) - Number(wild(c, level)),
        improves = diff > 0 || (diff === 0 && rank(take) > rank(c));
      return [improves ? 1 : -1, diff, rank(take) - rank(c), -1];
    };
  let best = actions[0],
    k = key(best);
  for (const a of actions.slice(1)) {
    const next = key(a);
    if (compare(next, k) > 0) {
      best = a;
      k = next;
    }
  }
  return best;
}
module.exports = { chooseAction };
