"""Paired, held-out small games for the shipped Easy / NN / Code policies."""
import argparse
from concurrent.futures import ProcessPoolExecutor
import hashlib
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "python"))
import numpy as np
import onnxruntime as ort
from threecard_royale.gym_env import RoyaleEnv, encode_observation
from threecard_royale.easy_policy import choose_action as easy_action, VERSION, BUDGET
from threecard_royale.policy import choose_action as code_action


def evaluate_pair(task):
    left, right, games, seed_start = task
    session = None
    if "nn" in (left, right):
        options = ort.SessionOptions()
        options.intra_op_num_threads = options.inter_op_num_threads = 1
        manifest = json.loads((ROOT / "models/nn-policy/manifest.json").read_text())
        model = ROOT / "models/nn-policy" / manifest["file"]
        assert hashlib.sha256(model.read_bytes()).hexdigest() == manifest["sha256"]
        session = ort.InferenceSession(str(model), options, providers=["CPUExecutionProvider"])

    def nn_action(o, actions):
        if len(actions) == 1:
            return actions[0]
        f = encode_observation(o)
        state = np.concatenate([f["cards"].ravel(), f["meta"]]).astype(np.float32)[None, :]
        logits = session.run(None, {"state": state, "candidates": f["candidates"][None, :len(actions), :]})[0][0]
        if not np.isfinite(logits).all():
            raise RuntimeError("Non-finite NN scores")
        return actions[int(logits.argmax())]

    policies = {"easy": easy_action, "code": code_action, "nn": nn_action}
    records = []
    for index in range(games):
        seat, seed, first = index % 2, seed_start + index // 2, (index // 2) % 2
        trace = hashlib.sha256()
        counts = {left: 0, right: 0}

        def pick(name, o, actions):
            a = policies[name](o, actions)
            counts[name] += 1
            trace.update(json.dumps([o["player"], o["phase"], a], separators=(",", ":"), sort_keys=True).encode())
            return a

        env = RoyaleEnv(episode="game", player=seat, opponent=lambda o, actions: pick(right, o, actions))
        try:
            _, info = env.reset(seed=seed, options={"first": first})
            if info["reset_terminal"] or info["reset_truncated"]:
                raise RuntimeError("Unexpected terminal reset")
            done = cut = False
            while not (done or cut):
                o = env.game.observation(seat)
                action = pick(left, o, o["legal_actions"])
                _, reward, done, cut, info = env.step(o["legal_actions"].index(action))
                if info["invalid_action"]:
                    raise RuntimeError("Illegal policy action")
            records.append({"index": index, "seed": seed, "seat": seat, "first": first,
                            "reward": reward, "truncated": cut, "decisions": counts,
                            "action_trace_sha256": trace.hexdigest()})
        finally:
            env.close()
    completed = sum(not r["truncated"] for r in records)
    wins = sum(not r["truncated"] and r["reward"] > 0 for r in records)
    return {"policy": left, "opponent": right, "games": games, "completed": completed,
            "wins": wins, "win_rate": wins / completed if completed else None,
            "seat_wins": [sum(not r["truncated"] and r["reward"] > 0 and r["seat"] == s for r in records) for s in (0, 1)],
            "truncated": games-completed, "invalid_actions": 0, "episodes": records}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--games", type=int, default=1000)
    parser.add_argument("--seed-start", type=int, default=81000000)
    parser.add_argument("--output", type=Path, default=Path("artifacts/difficulties.json"))
    args = parser.parse_args()
    if args.games < 4 or args.games % 4 or args.seed_start < 0:
        parser.error("Use a positive multiple of four games and a nonnegative seed start")
    pairs = [(a, b, args.games, args.seed_start) for a, b in [("easy", "code"), ("easy", "nn"), ("nn", "code")]]
    with ProcessPoolExecutor(max_workers=3) as pool:
        results = list(pool.map(evaluate_pair, pairs))
    sources = ["sdk/easy-policy.js", "python/threecard_royale/easy_policy.py", "python/threecard_royale/policy.py",
               "python/threecard_royale/core.py", "python/threecard_royale/gym_env.py", "training/evaluate_difficulties.py"]
    report = {"rules": "1.0.0", "episode": "game", "easy_version": VERSION, "attention_budget": BUDGET,
              "nn_sha256": json.loads((ROOT / "models/nn-policy/manifest.json").read_text())["sha256"],
              "protocol": {"seed_start": args.seed_start, "seed_count": args.games//2, "levels": [2, 2],
                           "seats": "index % 2", "first": "(index // 2) % 2",
                           "easy_sampling": "Deterministic FNV-1a / xorshift32 from public observation; independent of deal RNG",
                           "easy_swaps": "Use every legal deck redraw; no rival-card swaps",
                           "calibration": "Separate 60 paired seeds starting at 82000000; held-out evaluation starts at 81000000",
                           "max_steps": 4096, "max_internal_steps": 10000},
              "source_sha256": {p: hashlib.sha256((ROOT/p).read_bytes()).hexdigest() for p in sources},
              "results": results}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2)+"\n")
    for r in results:
        print(json.dumps({k: v for k, v in r.items() if k != "episodes"}), flush=True)


if __name__ == "__main__":
    main()
