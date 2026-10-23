"""Deterministic visible-information baseline, not a trained or optimal agent."""

from .core import evaluate, outcome, rank, wild


def choose_action(obs, actions=None):
    actions = obs["legal_actions"] if actions is None else actions
    if not actions:
        raise ValueError("No legal decision")
    if obs["phase"] not in ("attack", "defend", "refresh"):
        return actions[0]
    flower = obs["flower_level"]
    if obs["phase"] in ("attack", "defend"):

        def key(a):
            e = evaluate(a["cards"], flower)
            uses = sum(c in obs["wounds"] for c in a["cards"])
            if obs["phase"] == "attack":
                return (
                    e["score"],
                    e["rank_key"],
                    uses,
                    -sum(wild(c, flower) for c in a["cards"]),
                )
            r = outcome(obs["active"][obs["attacker"]], e)["effective_delta"]
            return (
                -max(r, 0),
                max(-r, 0),
                uses,
                -sum(wild(c, flower) for c in a["cards"]),
            )

        return max(actions, key=key)

    def key(a):
        if a["type"] in ("skip_swap", "stop_swaps"):
            return (-1000,)
        src = a["source"]
        c = obs["hand" if src["zone"] == "hand" else "wounds"][src["index"]]
        t = a["target"]
        if t["zone"] in ("deck", "blind"):
            # Prefer redraw to gifting unknown opponents a useful card.
            return (0, -int(wild(c, flower)), -rank(c), int(t["zone"] == "deck"))
        incoming = (
            obs["enemy_wounds"][t["index"]]
            if t["who"] != obs["player"]
            else obs[t["zone"]][t["index"]]
        )
        if t["who"] == obs["player"]:
            return (-100,)
        diff = int(wild(incoming, flower)) - int(wild(c, flower))
        improves = diff > 0 or diff == 0 and rank(incoming) > rank(c)
        return (1 if improves else -1, diff, rank(incoming) - rank(c), -1)

    return max(actions, key=key)
