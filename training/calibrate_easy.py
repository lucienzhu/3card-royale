"""Compare Easy attention budgets on seeds separate from the held-out evaluation."""
import argparse
from concurrent.futures import ProcessPoolExecutor
import hashlib
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "python"))
from threecard_royale.gym_env import RoyaleEnv
from threecard_royale.easy_policy import choose_action, BUDGET


def evaluate(task):
    budget, games, seed_start = task
    wins = truncated = 0
    for index in range(games):
        env = RoyaleEnv(player=index % 2)
        try:
            _, info = env.reset(seed=seed_start + index // 2, options={"first": (index // 2) % 2})
            if info["reset_terminal"] or info["reset_truncated"]:
                raise RuntimeError("Unexpected terminal reset")
            done = cut = False
            while not (done or cut):
                o = env.game.observation(env.player)
                a = choose_action(o, budget=budget)
                _, reward, done, cut, info = env.step(o["legal_actions"].index(a))
                if info["invalid_action"]:
                    raise RuntimeError("Illegal Easy action")
            wins += not cut and reward > 0
            truncated += cut
        finally:
            env.close()
    return {"budget": budget, "wins": wins, "games": games, "truncated": truncated}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--budgets", nargs="+", type=int, default=[24, 32, 48, 64])
    parser.add_argument("--games", type=int, default=120)
    parser.add_argument("--seed-start", type=int, default=82000000)
    parser.add_argument("--output", type=Path, default=Path("artifacts/easy-calibration.json"))
    args = parser.parse_args()
    if args.games < 4 or args.games % 4 or args.seed_start < 0 or any(b < 1 for b in args.budgets):
        parser.error("Use positive budgets, a positive multiple of four games, and a nonnegative seed start")
    with ProcessPoolExecutor(max_workers=3) as pool:
        results = list(pool.map(evaluate, [(b, args.games, args.seed_start) for b in args.budgets]))
    sources = ["sdk/easy-policy.js", "python/threecard_royale/easy_policy.py",
               "python/threecard_royale/policy.py", "python/threecard_royale/core.py",
               "python/threecard_royale/gym_env.py", "training/calibrate_easy.py"]
    report = {"seed_start": args.seed_start, "seed_count": args.games // 2,
              "games_per_budget": args.games, "opponent": "code", "selected_budget": BUDGET,
              "swap_strategy": "Use every legal deck redraw; no rival-card swaps",
              "seats": "index % 2", "first": "(index // 2) % 2", "levels": [2, 2],
              "source_sha256": {p: hashlib.sha256((ROOT / p).read_bytes()).hexdigest() for p in sources},
              "results": results}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(results), flush=True)


if __name__ == "__main__":
    main()
