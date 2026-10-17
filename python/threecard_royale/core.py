"""Native, UI-free rules 0.3.8. SDK state schema 1; trusted full states are private."""

from copy import deepcopy
from itertools import combinations
from functools import lru_cache
import secrets

RULES = "0.3.8"
PHASES = ("attack", "defend", "refresh", "resolved", "game_over", "match_over")


def require(ok, message):
    if not ok:
        raise ValueError(message)


def rank(c):
    return c % 13 + 2


def wild(c, level):
    return c // 13 == 1 and rank(c) == level


def _plain(cards):
    rs = sorted(map(rank, cards), reverse=True)
    straight = len(set(rs)) == 3 and (rs[0] - rs[2] == 2 or rs == [14, 3, 2])
    flush = len({c // 13 for c in cards}) == 1
    kind = (
        5
        if flush and straight
        else (
            4
            if len(set(rs)) == 1
            else 3 if flush else 2 if straight else 1 if len(set(rs)) == 2 else 0
        )
    )
    key = (
        [3 if rs == [14, 3, 2] else rs[0]]
        if kind in (2, 5)
        else (
            [rs[0]]
            if kind == 4
            else (
                [
                    next(r for r in rs if rs.count(r) == 2),
                    next(r for r in rs if rs.count(r) == 1),
                ]
                if kind == 1
                else rs
            )
        )
    )
    return {
        "score": 5 if kind == 4 else 4 if kind == 5 else kind,
        "kind": kind,
        "rank_key": key,
        "wild": None,
    }


@lru_cache(maxsize=65536)
def _evaluate(ids, level):
    wc = next((c for c in ids if wild(c, level)), None)
    others = [c for c in ids if c != wc]
    if len(ids) == 4:
        target = rank(others[0])
        require(
            all(rank(c) == target for c in others),
            "Four cards must be one rank, allowing the flower card",
        )
        virtual = next(
            (c for c in range(52) if rank(c) == target and c not in others), None
        )
        return {
            "score": 6,
            "kind": 6,
            "rank_key": [target],
            "wild": None if wc is None else {"physical": wc, "as": virtual},
        }
    best = _plain(ids)
    if wc is not None:
        virtual = wc
        for c in range(52):
            if c not in others:
                e = _plain(others + [c])
                if (e["score"], e["rank_key"]) > (best["score"], best["rank_key"]):
                    best, virtual = e, c
        best["wild"] = {"physical": wc, "as": virtual}
    return best


def evaluate(cards, level=2):
    require(isinstance(level, int) and 2 <= level <= 14, "Invalid flower level")
    require(
        isinstance(cards, (list, tuple))
        and len(cards) in (3, 4)
        and all(type(c) is int and 0 <= c < 52 for c in cards)
        and len(set(cards)) == len(cards),
        "Use 3 or 4 distinct card IDs, 0..51",
    )
    return deepcopy(_evaluate(tuple(sorted(cards)), level))


def outcome(a, b):
    delta = a["score"] - b["score"]
    r = (a["rank_key"] > b["rank_key"]) - (a["rank_key"] < b["rank_key"])
    return {
        "delta": delta,
        "effective_delta": delta if delta else r,
        "reason": (
            "type"
            if delta
            else "rank_attack" if r > 0 else "rank_defend" if r < 0 else "exact_tie"
        ),
    }


def plays(cards, level):
    cards = sorted(cards)
    out = [list(x) for x in combinations(cards, 3)]
    for cs in combinations(cards, 4):
        rest = [c for c in cs if not wild(c, level)]
        if len({rank(c) for c in rest}) == 1:
            out.append(list(cs))
    return out


class Game:
    """Trusted host owns this object. Only observation() may go to a player."""

    def __init__(self, seed=None, first=None):
        seed = secrets.randbits(32) if seed is None else seed
        require(type(seed) is int and 0 <= seed < 2**32, "seed must be uint32")
        require(
            first is None or type(first) is int and first in (0, 1),
            "first must be 0 or 1",
        )
        self.s = {
            "schema": 1,
            "rules": RULES,
            "seed": seed,
            "rng": seed or 0x6D2B79F5,
            "players": [{"level": 2, "hand": [], "wounds": []} for _ in range(2)],
            "a_losses": [0, 0],
            "game": 0,
            "round": 0,
            "results": [],
            "next_first": None,
            "last_combat": None,
        }
        first = (0 if self.random() < 0.5 else 1) if first is None else first
        self.start_game(first)

    def random(self):
        x = self.s["rng"]
        x ^= (x << 13) & 0xFFFFFFFF
        x ^= x >> 17
        x ^= (x << 5) & 0xFFFFFFFF
        self.s["rng"] = x & 0xFFFFFFFF
        return self.s["rng"] / 4294967296

    def shuffle(self, cards):
        for i in range(len(cards) - 1, 0, -1):
            j = int(self.random() * (i + 1))
            cards[i], cards[j] = cards[j], cards[i]

    def draw(self):
        if not self.s["stock"]:
            require(bool(self.s["discard"]), "No cards to draw")
            self.s["stock"], self.s["discard"] = self.s["discard"], []
            self.shuffle(self.s["stock"])
        return self.s["stock"].pop()

    def start_game(self, first):
        s = self.s
        s["game"] += 1
        s.update(
            round=1,
            first=first,
            attacker=first,
            battle_index=0,
            flower_level=s["players"][first]["level"],
            stock=list(range(52)),
            discard=[],
            active=[None, None],
            pending=None,
            round_uses=[0, 0],
            cards_played=[0, 0],
            phase="attack",
            last_combat=None,
        )
        self.shuffle(s["stock"])
        for p in s["players"]:
            p.update(hand=[], wounds=[])
        for _ in range(8):
            for who in (first, 1 - first):
                s["players"][who]["hand"].append(self.draw())
        self.check()

    @property
    def actor(self):
        s = self.s
        return (
            s["attacker"]
            if s["phase"] == "attack"
            else (
                1 - s["attacker"]
                if s["phase"] == "defend"
                else s["pending"]["actor"] if s["phase"] == "refresh" else None
            )
        )

    def available(self, who):
        p = self.s["players"][who]
        return p["hand"] + [c for c in p["wounds"] if c is not None]

    def legal_actions(self):
        s = self.s
        phase = s["phase"]
        who = self.actor
        if phase in ("attack", "defend"):
            return [
                {"type": "play", "cards": cs}
                for cs in plays(self.available(who), s["flower_level"])
            ]
        if phase == "refresh":
            p, q = s["players"][who], s["players"][1 - who]
            out = []
            for zone in ("hand", "wounds"):
                for i, c in enumerate(p[zone]):
                    if c is None:
                        continue
                    src = {"zone": zone, "index": i}
                    out.append(
                        {"type": "swap", "source": src, "target": {"zone": "deck"}}
                    )
                    if q["hand"]:
                        out.append(
                            {"type": "swap", "source": src, "target": {"zone": "blind"}}
                        )
                    for j, c2 in enumerate(q["wounds"]):
                        if c2 is not None:
                            out.append(
                                {
                                    "type": "swap",
                                    "source": src,
                                    "target": {
                                        "zone": "wounds",
                                        "who": 1 - who,
                                        "index": j,
                                    },
                                }
                            )
                    other = "wounds" if zone == "hand" else "hand"
                    for j, c2 in enumerate(p[other]):
                        if c2 is not None:
                            out.append(
                                {
                                    "type": "swap",
                                    "source": src,
                                    "target": {"zone": other, "who": who, "index": j},
                                }
                            )
            out.append({"type": "stop_swaps"})
            return out
        if phase == "resolved":
            return [{"type": "advance"}]
        if phase == "game_over":
            return [{"type": "next_game"}]
        return []

    def step(self, action):
        # Validate before mutation; rollback protects integrations from malformed inputs.
        require(
            isinstance(action, dict) and action in self.legal_actions(),
            "Illegal action",
        )
        before = deepcopy(self.s)
        try:
            kind = action["type"]
            if kind == "play":
                self._play(action["cards"])
            elif kind == "swap":
                self._swap(action)
            elif kind == "stop_swaps":
                self.s["pending"] = None
                self.finish_combat()
            elif kind == "advance":
                self._advance()
            elif kind == "next_game":
                self.start_game(self.s["next_first"])
            self.check()
        except Exception:
            self.s = before
            raise
        return self.observation(self.actor if self.actor is not None else 0)

    def _play(self, cards):
        s = self.s
        who = self.actor
        p = s["players"][who]
        e = evaluate(cards, s["flower_level"])
        origins = []
        for c in cards:
            if c in p["hand"]:
                p["hand"].remove(c)
                origins.append({"zone": "hand"})
            else:
                i = p["wounds"].index(c)
                p["wounds"][i] = None
                origins.append({"zone": "wounds", "index": i})
                s["round_uses"][who] += 1
        s["cards_played"][who] += len(cards)
        s["active"][who] = dict(e, cards=list(cards), origins=origins)
        if s["phase"] == "attack":
            s["phase"] = "defend"
            return
        attack = s["attacker"]
        moves = deepcopy(s["active"])
        result = outcome(moves[attack], moves[1 - attack])
        s["last_combat"] = dict(result, attacker=attack, moves=moves)
        for move in moves:
            s["discard"].extend(move["cards"])
        s["active"] = [None, None]
        for actor in (attack, 1 - attack):
            for i in sorted(
                o["index"] for o in moves[actor]["origins"] if o["zone"] == "wounds"
            ):
                s["players"][actor]["wounds"][i] = self.draw()
        d = result["effective_delta"]
        if d > 0:
            for _ in range(d):
                s["players"][1 - attack]["wounds"].append(self.draw())
            self.finish_combat()
        elif d < 0:
            s["pending"] = {"actor": 1 - attack, "total": -d, "remaining": -d}
            s["phase"] = "refresh"
            if len(self.legal_actions()) == 1:
                s["pending"] = None
                self.finish_combat()
        else:
            self.finish_combat()

    def _swap(self, action):
        s = self.s
        who = self.actor
        src = action["source"]
        target = action["target"]
        p = s["players"][who]
        old = p[src["zone"]][src["index"]]
        if target["zone"] == "deck":
            s["discard"].append(old)
            p[src["zone"]][src["index"]] = self.draw()
        else:
            if target["zone"] == "blind":
                other = 1 - who
                zone = "hand"
                i = int(self.random() * len(s["players"][other]["hand"]))
            else:
                other = target["who"]
                zone = target["zone"]
                i = target["index"]
            p[src["zone"]][src["index"]], s["players"][other][zone][i] = (
                s["players"][other][zone][i],
                old,
            )
        s["pending"]["remaining"] -= 1
        if not s["pending"]["remaining"]:
            s["pending"] = None
            self.finish_combat()

    def finish_combat(self):
        s = self.s
        loser = next(
            (i for i, p in enumerate(s["players"]) if len(p["wounds"]) >= 5), None
        )
        if loser is None:
            s["phase"] = "resolved"
            return
        winner = 1 - loser
        p = s["players"][winner]
        old = p["level"]
        gain = len(s["players"][loser]["wounds"]) - len(p["wounds"])
        p["level"] = min(14, old + gain)
        s["next_first"] = winner
        s["phase"] = "match_over" if old == 14 else "game_over"
        reset = None
        if s["players"][loser]["level"] == 14 and old != 14:
            s["a_losses"][loser] += 1
            if s["a_losses"][loser] == 3:
                s["players"][loser]["level"] = 2
                s["a_losses"][loser] = 0
                reset = {"who": loser, "from": 14, "to": 2, "failures": 3}
        if old < 14 and p["level"] == 14:
            s["a_losses"][winner] = 0
        s["results"].append(
            {
                "game": s["game"],
                "rounds": s["round"],
                "winner": winner,
                "damage": [len(x["wounds"]) for x in s["players"]],
                "gain": gain,
                "from": old,
                "to": p["level"],
                "match_won": old == 14,
                "aLosses": list(s["a_losses"]),
                "a_reset": reset,
            }
        )

    def _advance(self):
        s = self.s
        if s["battle_index"] == 0:
            s.update(
                battle_index=1,
                attacker=1 - s["first"],
                phase="attack",
                last_combat=None,
            )
            return
        nxt = 1 - s["first"]
        for who in (nxt, 1 - nxt):
            while len(s["players"][who]["hand"]) < 8:
                s["players"][who]["hand"].append(self.draw())
        s.update(
            first=nxt,
            attacker=nxt,
            battle_index=0,
            round=s["round"] + 1,
            round_uses=[0, 0],
            cards_played=[0, 0],
            last_combat=None,
            phase="attack",
        )

    def observation(self, who):
        require(type(who) is int and who in (0, 1), "player must be 0 or 1")
        s = self.s
        p, q = s["players"][who], s["players"][1 - who]
        return deepcopy(
            {
                "rules": RULES,
                "player": who,
                "actor": self.actor,
                "phase": s["phase"],
                "game": s["game"],
                "round": s["round"],
                "first": s["first"],
                "attacker": s["attacker"],
                "battle_index": s["battle_index"],
                "levels": [p["level"], q["level"]],
                "a_losses": [s["a_losses"][who], s["a_losses"][1 - who]],
                "flower_level": s["flower_level"],
                "hand": p["hand"],
                "wounds": p["wounds"],
                "enemy_wounds": q["wounds"],
                "enemy_hand_count": len(q["hand"]),
                "deck_count": len(s["stock"]),
                "discard": s["discard"],
                "active": s["active"],
                "pending": s["pending"],
                "last_combat": s["last_combat"],
                "results": s["results"],
                "legal_actions": self.legal_actions() if self.actor == who else [],
            }
        )

    def save(self):
        return deepcopy(self.s)

    @classmethod
    def restore(cls, state):
        g = cls.__new__(cls)
        g.s = deepcopy(state)
        g.check()
        return g

    def check(self):
        s = self.s
        require(
            s["schema"] == 1 and s["rules"] == RULES and s["phase"] in PHASES,
            "Unsupported SDK state",
        )
        require(type(s["rng"]) is int and 0 < s["rng"] < 2**32, "Invalid RNG state")
        require(
            s["flower_level"] in range(2, 15)
            and all(
                p["level"] in range(2, 15) and len(p["hand"]) <= 8 for p in s["players"]
            ),
            "Invalid player state",
        )
        ids = s["stock"] + s["discard"]
        for p in s["players"]:
            ids = ids + p["hand"] + [c for c in p["wounds"] if c is not None]
        for m in s["active"]:
            if m:
                ids += m["cards"]
        require(
            len(ids) == 52 and set(ids) == set(range(52)), "52-card conservation failed"
        )
        for who, p in enumerate(s["players"]):
            for i, c in enumerate(p["wounds"]):
                if c is None:
                    require(
                        s["active"][who]
                        and {"zone": "wounds", "index": i}
                        in s["active"][who]["origins"],
                        "Untracked wound slot",
                    )
        require(
            s["phase"] != "refresh" or s["pending"] and s["pending"]["remaining"] > 0,
            "Invalid swap phase",
        )
        return True
