"""Cross-language state/action/observation and RNG replay against the frozen JS core.
Run: python tests/conformance.py --node node --rust rust/target/debug/royale-json --cpp /tmp/royale-cpp/royale-json-cpp
"""

import argparse, json, os, subprocess, sys, random, itertools, time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "python"))
from threecard_royale import Game, evaluate, choose_action


class Bridge:
    def __init__(self, args):
        self.p = subprocess.Popen(
            args,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            text=True,
            bufsize=1,
            cwd=ROOT,
        )

    def ask(self, v):
        self.p.stdin.write(json.dumps(v) + "\n")
        self.p.stdin.flush()
        line = self.p.stdout.readline()
        if not line:
            raise RuntimeError("Bridge ended: " + str(self.p.poll()))
        return json.loads(line)

    def close(self):
        self.p.stdin.close()
        self.p.wait(timeout=10)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--node", default="node")
    ap.add_argument("--rust", required=True)
    ap.add_argument("--report")
    ap.add_argument("--cpp", help="Native C++ JSON-lines executable")
    args = ap.parse_args()
    js = Bridge([args.node, "tests/js_bridge.cjs"])
    rs = Bridge([str(Path(args.rust).resolve())])
    bridges = [("JS", js), ("Rust", rs)]
    if args.cpp:
        bridges.append(("C++", Bridge([str(Path(args.cpp).resolve())])))
    rnd = random.Random(20261018)
    t = time.time()
    decisions = complete = restores = 0
    routes = set()
    max_actions = 0

    def compare(g, req):
        nonlocal decisions, max_actions
        expected = {
            "state": g.save(),
            "actions": g.legal_actions(),
            "observations": [g.observation(0), g.observation(1)],
        }
        for tag, bridge in bridges:
            value = bridge.ask(req)
            assert "error" not in value, (tag, value)
            for k in expected:
                assert expected[k] == value[k], (
                    tag,
                    k,
                    g.s["game"],
                    g.s["round"],
                    g.s["phase"],
                    json.dumps(expected[k])[:1800],
                    json.dumps(value[k])[:1800],
                )
        max_actions = max(max_actions, len(expected["actions"]))
        decisions += 1

    try:
        for seed in [
            0,
            1,
            2,
            3,
            42,
            101,
            4096,
            0xFFFFFFFF,
            314159,
            65536,
            20261018,
            73,
        ]:
            first = None if seed % 2 else seed % 2
            g = Game(seed, first)
            req = {"op": "init", "seed": seed, "first": first}
            compare(g, req)
            for n in range(5000):
                if g.s["phase"] == "match_over":
                    complete += 1
                    break
                actions = g.legal_actions()
                if g.actor is not None:
                    action = (
                        choose_action(g.observation(g.actor), actions)
                        if n % 3
                        else rnd.choice(actions)
                    )
                    expected_policy = choose_action(g.observation(g.actor), actions)
                    for tag, bridge in bridges:
                        assert (
                            bridge.ask({"op": "inspect", "policy": True})["policy"]
                            == expected_policy
                        ), (tag, "Policy parity")
                else:
                    action = actions[0]
                if action["type"] == "swap":
                    routes.add(
                        action["source"]["zone"] + ">" + action["target"]["zone"]
                    )
                g.step(action)
                req = {"op": "step", "action": action}
                compare(g, req)
                if n % 53 == 0:
                    state = json.loads(json.dumps(g.save()))
                    g = Game.restore(state)
                    req = {"op": "restore", "state": state}
                    compare(g, req)
                    restores += 1
            else:
                raise AssertionError("Conformance match exceeded bound")
        # Eight directed routes plus empty-deck reshuffle from synthetic, trusted states.
        for source in ["hand", "wounds"]:
            for target in ["deck", "blind", "enemy", "own"]:
                g = Game(11, 0)
                s = g.save()
                s["phase"] = "refresh"
                s["pending"] = {"actor": 0, "remaining": 1, "total": 1}
                s["players"] = [
                    {"level": 2, "hand": list(range(8)), "wounds": [8, 9]},
                    {"level": 2, "hand": list(range(10, 18)), "wounds": [18, 19]},
                ]
                s["stock"] = []
                s["discard"] = list(range(20, 52))
                e = evaluate([20, 21, 22], 2)
                m = dict(e, cards=[20, 21, 22], origins=[{"zone": "hand"}] * 3)
                s["last_combat"] = {
                    "delta": -1,
                    "effective_delta": -1,
                    "reason": "type",
                    "attacker": 1,
                    "moves": [m, m],
                }
                g = Game.restore(s)
                req = {"op": "restore", "state": s}
                compare(g, req)
                actions = g.legal_actions()
                a = next(
                    x
                    for x in actions
                    if x["type"] == "swap"
                    and x["source"]["zone"] == source
                    and (
                        x["target"]["zone"] == target
                        if target in ("deck", "blind")
                        else x["target"].get("who") == (1 if target == "enemy" else 0)
                    )
                )
                g.step(a)
                req = {"op": "step", "action": a}
                compare(g, req)
                routes.add(source + ">" + target)
        # Standard five-card attacks, wound-origin refill and defensive round budgets.
        def fixture(hands, wounds):
            g = Game(51, 0)
            s = g.save()
            s["players"] = [{"level": 2, "hand": h, "wounds": w} for h, w in zip(hands, wounds)]
            held = [c for p in s["players"] for c in p["hand"] + p["wounds"]]
            assert len(held) == len(set(held))
            s["stock"] = [c for c in range(52) if c not in held]
            return Game.restore(s)
        g = fixture([[5,18,31,44,0,2,4,6],[1,16,35,3,8,9,10,11]], [[13],[14,15,17,19]])
        compare(g,{"op":"restore","state":g.save()})
        for a in [{"type":"play","cards":[5,13,18,31,44]},{"type":"play","cards":[1,16,35]}]:
            g.step(a); compare(g,{"op":"step","action":a})
        assert g.s["players"][1]["wounds"] and len(g.s["players"][1]["wounds"])==11
        assert len(g.s["players"][0]["wounds"])==1 and g.s["results"][-1]["gain"]==10
        g = fixture([[6,19,32,45,1,3,9,10],[5,18,31,44,13,0,2,4]],[[],[]])
        compare(g,{"op":"restore","state":g.save()})
        for a in [{"type":"play","cards":[6,19,32,45]},{"type":"play","cards":[5,13,18,31,44]},{"type":"stop_swaps"},{"type":"advance"},{"type":"play","cards":[0,2,4]},{"type":"play","cards":[1,3,9]},{"type":"stop_swaps"},{"type":"advance"}]:
            g.step(a); compare(g,{"op":"step","action":a})
        assert g.s["round"]==2 and all(len(p["hand"])==8 for p in g.s["players"])
        # A rank is not an Ace challenge: only the immutable level owner can pass.
        for owner, winner, flower in [(0,1,10),(0,0,10),(0,1,14),(1,1,14),(1,0,14),(0,0,14)]:
            wh=[0,13,26,39,2,5,7,10];lh=[1,4,8,12,14,17,19,21]
            hands=[wh,lh] if winner==0 else [lh,wh]
            wounds=[[11],[22,23,24,27]] if winner==0 else [[22,23,24,27],[11]]
            g=fixture(hands,wounds);s=g.save()
            s["players"][0]["level"]=14 if flower==14 or owner!=0 else 10
            s["players"][1]["level"]=14 if flower==14 or owner!=1 else 10
            s.update(level_owner=owner,flower_level=flower,first=winner,attacker=winner,round=1 if winner==owner else 2)
            s["a_losses"]=[2,2]
            g=Game.restore(s);compare(g,{"op":"restore","state":s})
            for a in [{"type":"play","cards":[0,13,26,39]},{"type":"play","cards":[1,4,8]}]:
                g.step(a);compare(g,{"op":"step","action":a})
            assert (g.s["phase"]=="match_over")==bool(flower==14 and winner==owner)
            if flower==10: assert g.s["a_losses"][1-owner]==2
            elif winner!=owner: assert g.s["players"][owner]["level"]==2 and g.s["a_losses"][owner]==0
            if g.s["phase"]=="game_over":
                a={"type":"next_game"};g.step(a);compare(g,{"op":"step","action":a})
                assert g.s["level_owner"]==winner
        # Three failed-A boundaries and four+four round budgets, from fresh synthetic states.
        for losses in (0, 1, 2):
            g = Game(17, 0)
            s = g.save()
            s["players"] = [
                {"level": 2, "hand": [0, 13, 26, 39, 3, 5, 6, 7], "wounds": []},
                {
                    "level": 14,
                    "hand": [1, 4, 8, 10, 11, 12, 14, 15],
                    "wounds": [16, 17, 18, 19],
                },
            ]
            held = {c for p in s["players"] for c in p["hand"] + p["wounds"]}
            s["stock"] = [c for c in range(52) if c not in held]
            s["a_losses"][1] = losses
            s.update(level_owner=1, flower_level=14, round=2)
            g = Game.restore(s)
            req = {"op": "restore", "state": s}
            compare(g, req)
            for action in [
                {"type": "play", "cards": [0, 13, 26, 39]},
                {"type": "play", "cards": [1, 4, 8]},
                {"type": "next_game"},
            ]:
                g.step(action)
                req = {"op": "step", "action": action}
                compare(g, req)
        g = Game(10, 0)
        s = g.save()
        s["players"] = [
            {"level": 2, "hand": [0, 13, 26, 39, 2, 15, 28, 41], "wounds": []},
            {"level": 2, "hand": [1, 14, 27, 40, 3, 16, 29, 42], "wounds": []},
        ]
        held = {c for p in s["players"] for c in p["hand"]}
        s["stock"] = [c for c in range(52) if c not in held]
        g = Game.restore(s)
        req = {"op": "restore", "state": s}
        compare(g, req)
        for action in [
            {"type": "play", "cards": [0, 13, 26, 39]},
            {"type": "play", "cards": [1, 14, 27, 40]},
            {"type": "stop_swaps"},
            {"type": "advance"},
            {"type": "play", "cards": [3, 16, 29, 42]},
            {"type": "play", "cards": [2, 15, 28, 41]},
            {"type": "advance"},
        ]:
            g.step(action)
            req = {"op": "step", "action": action}
            compare(g, req)
        assert g.s["round"] == 2 and all(len(p["hand"]) == 8 for p in g.s["players"])
        # Invalid actions must leave state AND RNG untouched in all hosts.
        for bad in [
            {"type": "play", "cards": [0, 0, 0]},
            {
                "type": "swap",
                "source": {"zone": "hand", "index": 99},
                "target": {"zone": "blind"},
            },
            {"type": "bogus"},
        ]:
            before = g.save()
            try:
                g.step(bad)
                raise AssertionError("Accepted invalid action")
            except ValueError:
                pass
            assert g.save() == before
            for _, b in bridges:
                assert "error" in b.ask({"op": "step", "action": bad})
                assert b.ask({"op": "inspect"})["state"] == before
        # All natural triples plus sampled wildcard/four-card hands.
        cases = []
        for cs in itertools.combinations(range(52), 3):
            level = next(l for l in range(2, 15) if 13 + l - 2 not in cs)
            cases.append({"cards": cs, "level": level})
        for _ in range(1200):
            cases.append(
                {"cards": rnd.sample(range(52), 3), "level": rnd.randint(2, 14)}
            )
        for l in range(2, 15):
            for r in range(2, 15):
                natural = [r - 2 + 13 * s for s in range(4)]
                cases.append({"cards": natural, "level": l})
                flower = 13 + l - 2
                if flower not in natural:
                    cases.append({"cards": natural[:3] + [flower], "level": l})
                    cases.append({"cards": natural + [flower], "level": l})
        for i in range(0, len(cases), 256):
            batch = cases[i : i + 256]
            want = [evaluate(x["cards"], x["level"]) for x in batch]
            for _, b in bridges:
                assert b.ask({"op": "evaluate", "cases": batch}) == {
                    "evaluations": want
                }, ("Hand mismatch", i)
        result = {
            "status": "passed",
            "rule_version": "1.0.0",
            "sdk_version": "0.2.0",
            "native_runtimes": ["JavaScript", "Python", "Rust"]
            + (["C++"] if args.cpp else []),
            "full_matches": complete,
            "compared_decision_states": decisions,
            "restored_states": restores,
            "evaluated_hands": len(cases),
            "maximum_legal_actions_seen": max_actions,
            "swap_routes": sorted(routes),
            "invalid_actions_atomic": True,
            "strategy_js_python_rust_parity": True,
            "strategy_cpp_parity": bool(args.cpp),
            "seconds": round(time.time() - t, 3),
            "scope": "Synthetic seeded states only. No human balance or enjoyment claim.",
        }
        if args.report:
            Path(args.report).write_text(json.dumps(result, indent=2) + "\n")
        print(json.dumps(result))
    finally:
        for _, bridge in bridges:
            bridge.close()


if __name__ == "__main__":
    main()
