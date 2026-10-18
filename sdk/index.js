/* SDK 0.1.1 / rules 0.3.8. Uses the frozen browser rules engine. */
(function (root, factory) {
  if (typeof module === "object" && module.exports)
    module.exports = factory(require("../gamecore.js"));
  else root.ThreeCardRoyale = factory(root.GK);
})(typeof globalThis !== "undefined" ? globalThis : this, function (GK) {
  "use strict";
  const RULES = "0.3.8",
    copy = (v) => JSON.parse(JSON.stringify(v)),
    stable = (v) =>
      JSON.stringify(
        v && typeof v === "object" && !Array.isArray(v)
          ? Object.fromEntries(
              Object.keys(v)
                .sort()
                .map((k) => [k, JSON.parse(stable(v[k]))]),
            )
          : Array.isArray(v)
            ? v.map((x) => JSON.parse(stable(x)))
            : v,
      );
  const requireValid = (x, m) => {
    if (!x) throw Error(m);
  };
  const move = (m) =>
    m
      ? {
          score: m.score,
          kind: m.kind,
          rank_key: m.rankKey,
          wild: m.wild,
          cards: [...m.cards],
          origins: m.origins.map((o) =>
            o.zone === "table"
              ? { zone: "wounds", index: o.index }
              : { zone: "hand" },
          ),
        }
      : null;
  const evaluate = (cards, level = 2) => {
    requireValid(
      Number.isInteger(level) && level >= 2 && level <= 14,
      "Invalid flower level",
    );
    const e = GK.evaluate(cards, level, RULES);
    return copy({
      score: e.score,
      kind: e.kind,
      rank_key: e.rankKey,
      wild: e.wild,
    });
  };
  const outcome = (a, b) => {
    const x = GK.outcome(
      { score: a.score, rankKey: a.rank_key },
      { score: b.score, rankKey: b.rank_key },
      RULES,
    );
    return {
      delta: x.delta,
      effective_delta: x.effectiveDelta,
      reason: x.reason,
    };
  };
  function plays(cards, level) {
    cards = [...cards].sort((a, b) => a - b);
    const out = GK.combinations(cards);
    for (let a = 0; a < cards.length - 3; a++)
      for (let b = a + 1; b < cards.length - 2; b++)
        for (let c = b + 1; c < cards.length - 1; c++)
          for (let d = c + 1; d < cards.length; d++) {
            const cs = [cards[a], cards[b], cards[c], cards[d]],
              rs = cs.filter((c) => !GK.wild(c, level)).map(GK.rank);
            if (new Set(rs).size === 1) out.push(cs);
          }
    return out;
  }
  class Game {
    constructor(seed, first) {
      if (seed === undefined)
        seed = globalThis.crypto.getRandomValues(new Uint32Array(1))[0];
      requireValid(
        Number.isInteger(seed) && seed >= 0 && seed < 4294967296,
        "seed must be uint32",
      );
      requireValid(
        first === undefined || first === 0 || first === 1,
        "first must be 0 or 1",
      );
      this.g = new GK.Game(seed, { version: RULES, first, record: false });
    }
    get actor() {
      return this.g.currentActor();
    }
    save() {
      const g = this.g;
      return copy({
        schema: 1,
        rules: RULES,
        seed: g.seed,
        rng: g.rng.state,
        players: g.players.map((p) => ({
          level: p.level,
          hand: [...p.hand],
          wounds: p.table.map((x) => x.card),
        })),
        a_losses: g.aLosses,
        game: g.game,
        round: g.round,
        results: g.results,
        next_first: g.nextFirst ?? null,
        last_combat: g.lastCombat
          ? {
              delta: g.lastCombat.delta,
              effective_delta: g.lastCombat.effectiveDelta,
              reason: g.lastCombat.reason,
              attacker: g.lastCombat.attacker,
              moves: g.lastCombat.moves.map(move),
            }
          : null,
        first: g.first,
        attacker: g.attacker,
        battle_index: g.battleIndex,
        flower_level: g.flowerLevel,
        stock: g.stock,
        discard: g.discard,
        active: g.active.map(move),
        pending: g.pendingRefresh,
        round_uses: g.roundUses,
        cards_played: g.roundCardsPlayed,
        phase: g.phase,
      });
    }
    static restore(s) {
      requireValid(
        s.schema === 1 &&
          s.rules === RULES &&
          Number.isInteger(s.rng) &&
          s.rng > 0 &&
          s.rng < 4294967296,
        "Unsupported SDK state",
      );
      const obj = Object.create(Game.prototype),
        g = Object.create(GK.Game.prototype);
      Object.assign(g, {
        version: RULES,
        seed: s.seed,
        rng: new GK.RNG(s.rng),
        players: s.players.map((p, i) => ({
          name: String(i),
          level: p.level,
          hand: copy(p.hand),
          table: p.wounds.map((card) => ({ card, up: card !== null })),
        })),
        record: false,
        events: [],
        stats: {},
        results: copy(s.results),
        game: s.game,
        round: s.round,
        roundsSeen: s.round,
        first: s.first,
        attacker: s.attacker,
        battleIndex: s.battle_index,
        flowerLevel: s.flower_level,
        stock: copy(s.stock),
        discard: copy(s.discard),
        active: s.active.map((m) =>
          m
            ? {
                ...copy(m),
                rankKey: copy(m.rank_key),
                name: GK.NAMES[m.kind],
                level: s.flower_level,
                origins: m.origins.map((o) =>
                  o.zone === "wounds"
                    ? { zone: "table", index: o.index }
                    : { zone: "hand" },
                ),
              }
            : null,
        ),
        aLosses: copy(s.a_losses),
        nextFirst: s.next_first,
        pendingRefresh: copy(s.pending),
        pendingFlip: null,
        roundUses: copy(s.round_uses),
        roundCardsPlayed: copy(s.cards_played),
        roundRefreshes: [0, 0],
        phase: s.phase,
        lastCombat: s.last_combat
          ? {
              ...copy(s.last_combat),
              effectiveDelta: s.last_combat.effective_delta,
              moves: s.last_combat.moves.map((m) => ({
                ...copy(m),
                rankKey: m.rank_key,
                origins: m.origins.map((o) =>
                  o.zone === "wounds"
                    ? { zone: "table", index: o.index }
                    : { zone: "hand" },
                ),
              })),
              refreshes: [],
            }
          : null,
        lastRefill: null,
      });
      g.rng.state = s.rng;
      g.check();
      obj.g = g;
      return obj;
    }
    legalActions() {
      const s = this.save(),
        who = this.actor;
      if (s.phase === "attack" || s.phase === "defend")
        return plays(this.g.available(who), s.flower_level).map((cards) => ({
          type: "play",
          cards,
        }));
      if (s.phase === "refresh") {
        const p = s.players[who],
          q = s.players[1 - who],
          out = [];
        for (const zone of ["hand", "wounds"])
          p[zone].forEach((c, i) => {
            if (c === null) return;
            const source = { zone, index: i };
            out.push({ type: "swap", source, target: { zone: "deck" } });
            if (q.hand.length)
              out.push({ type: "swap", source, target: { zone: "blind" } });
            q.wounds.forEach((c, j) => {
              if (c !== null)
                out.push({
                  type: "swap",
                  source,
                  target: { zone: "wounds", who: 1 - who, index: j },
                });
            });
            const other = zone === "hand" ? "wounds" : "hand";
            p[other].forEach((c, j) => {
              if (c !== null)
                out.push({
                  type: "swap",
                  source,
                  target: { zone: other, who, index: j },
                });
            });
          });
        out.push({ type: "stop_swaps" });
        return out;
      }
      if (s.phase === "resolved") return [{ type: "advance" }];
      if (s.phase === "game_over") return [{ type: "next_game" }];
      return [];
    }
    step(a) {
      requireValid(
        a && this.legalActions().some((x) => stable(x) === stable(a)),
        "Illegal action",
      );
      const before = this.g.save();
      try {
        if (a.type === "play") this.g.play(this.actor, a.cards);
        else if (a.type === "swap") {
          const who = this.actor,
            t = a.target,
            source = {
              zone: a.source.zone === "wounds" ? "table" : "hand",
              index: a.source.index,
            };
          this.g.refresh(
            t.zone === "deck"
              ? { source, exchange: "deck" }
              : t.zone === "blind"
                ? {
                    source,
                    exchange: "opponent",
                    who: 1 - who,
                    zone: "hand",
                    blind: true,
                  }
                : {
                    source,
                    exchange: "card",
                    who: t.who,
                    zone: t.zone === "wounds" ? "table" : "hand",
                    index: t.index,
                  },
          );
        } else if (a.type === "stop_swaps") {
          this.g.pendingRefresh = null;
          this.g.finishCombat();
        } else if (a.type === "advance") this.g.advance();
        else if (a.type === "next_game") this.g.nextGame();
        this.g.check();
      } catch (e) {
        this.g = GK.Game.restore(before);
        throw e;
      }
      return this.observation(this.actor ?? 0);
    }
    observation(who) {
      requireValid(who === 0 || who === 1, "player must be 0 or 1");
      const s = this.save(),
        p = s.players[who],
        q = s.players[1 - who];
      return copy({
        rules: RULES,
        player: who,
        actor: this.actor,
        phase: s.phase,
        game: s.game,
        round: s.round,
        first: s.first,
        attacker: s.attacker,
        battle_index: s.battle_index,
        levels: [p.level, q.level],
        a_losses: [s.a_losses[who], s.a_losses[1 - who]],
        flower_level: s.flower_level,
        hand: p.hand,
        wounds: p.wounds,
        enemy_wounds: q.wounds,
        enemy_hand_count: q.hand.length,
        deck_count: s.stock.length,
        discard: s.discard,
        active: s.active,
        pending: s.pending,
        last_combat: s.last_combat,
        results: s.results,
        legal_actions: this.actor === who ? this.legalActions() : [],
      });
    }
  }
  return { RULES, Game, evaluate, outcome, plays };
});
