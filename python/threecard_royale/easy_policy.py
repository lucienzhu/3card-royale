"""Reproducible limited-attention opponent; parity with sdk/easy-policy.js."""
import json
from .core import evaluate, outcome
from .policy import choose_action as code_action

VERSION, BUDGET = "easy-v2", 64


def random_for(o):
    key = json.dumps([
        o["player"], o["phase"], o["game"], o["round"], o["battle_index"], o["flower_level"],
        o["hand"], o["wounds"], o["enemy_wounds"], o["discard"],
        [m["cards"] if m else None for m in o["active"]],
        o["pending"]["remaining"] if o["pending"] else 0, o["first"], o["attacker"],
        o["enemy_hand_count"], o["deck_count"],
    ], separators=(",", ":"))
    state = 2166136261
    for c in key:
        state = ((state ^ ord(c)) * 16777619) & 0xffffffff
    state = state or 1

    def sample():
        nonlocal state
        state ^= (state << 13) & 0xffffffff
        state ^= state >> 17
        state ^= (state << 5) & 0xffffffff
        return state / 4294967296
    return sample


def choose_action(o, actions=None, budget=BUDGET):
    actions = o["legal_actions"] if actions is None else actions
    if not actions:
        raise ValueError("No legal decision")
    if type(budget) is not int or budget < 1:
        raise ValueError("Invalid attention budget")
    if o["phase"] not in ("attack", "defend", "refresh"):
        return actions[0]
    if o["phase"] == "refresh":
        skip = next((a for a in actions if a["type"] == "skip_swap"), None)
        skip = skip or next((a for a in actions if a["type"] == "stop_swaps"), None)
        redraws = [a for a in actions if a["type"] == "swap" and a["target"]["zone"] == "deck"]
        if redraws:
            return code_action(o, redraws)
        if skip:
            return skip
        raise ValueError("No legal deck redraw or skip")
    rng = random_for(o)
    pool = actions
    if o["phase"] == "defend":
        safe = [a for a in actions if max(0, outcome(o["active"][o["attacker"]], evaluate(a["cards"], o["flower_level"]))["effective_delta"]) + len(o["wounds"]) < 5]
        if safe:
            pool = safe
    if len(pool) <= budget:
        return code_action(o, pool)
    pool = list(pool)
    for i in range(budget):
        j = i + int(rng() * (len(pool) - i))
        pool[i], pool[j] = pool[j], pool[i]
    return code_action(o, pool[:budget])
