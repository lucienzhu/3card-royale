"""Uniform legal-action baseline, paired with the held-out NN evaluation games."""
import argparse
import hashlib
import json
from pathlib import Path
import platform
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "python"))
import gymnasium
import numpy as np
from threecard_royale.gym_env import RoyaleEnv


def game_setup(index):
    """Same seats, deal seeds and first attackers as training/evaluate.py."""
    return index % 2, 81000000 + index // 2, (index // 2) % 2


def random_action(mask, rng):
    legal = np.flatnonzero(mask)
    if not len(legal):
        raise ValueError("No legal action at a decision")
    return int(legal[0]) if len(legal) == 1 else int(rng.choice(legal))


def evaluate(games=1000, policy_seed=20261024, max_steps=4096):
    if games < 4 or games % 4:
        raise ValueError("Use a positive multiple of four to balance seats and first attackers")
    if policy_seed < 0:
        raise ValueError("Policy seed must be nonnegative")
    records = []
    for index in range(games):
        seat, seed, first = game_setup(index)
        # A separate stream per game; policy sampling never consumes the deal RNG.
        rng = np.random.Generator(np.random.PCG64(np.random.SeedSequence([policy_seed, index])))
        env = RoyaleEnv(episode="game", player=seat, max_steps=max_steps)
        trace = hashlib.sha256()
        choices = steps = 0
        try:
            obs, info = env.reset(seed=seed, options={"first": first})
            done, cut = info["reset_terminal"], info["reset_truncated"]
            # A normal level-2 game always has decisions before its terminal state.
            if done:
                raise RuntimeError("Unexpected terminal reset; evaluation protocol changed")
            reward = 0.0
            while not (done or cut):
                n = int(np.count_nonzero(obs["action_mask"]))
                action = random_action(obs["action_mask"], rng)
                trace.update(f"{n}:{action};".encode("ascii"))
                choices += int(n > 1)
                steps += 1
                obs, reward, done, cut, info = env.step(action)
                if info["invalid_action"]:
                    raise RuntimeError("Random policy selected an illegal action")
            if done and reward not in (-1.0, 1.0):
                raise RuntimeError("Unexpected terminal reward")
            records.append({
                "index": index, "seed": seed, "seat": seat, "first": first,
                "reward": reward, "truncated": bool(cut), "decisions": steps,
                "choices": choices, "action_trace_sha256": trace.hexdigest(),
            })
        finally:
            env.close()
    completed = sum(not r["truncated"] for r in records)
    wins = sum(not r["truncated"] and r["reward"] > 0 for r in records)
    rate = wins / completed if completed else None
    interval = None
    if completed:
        z = 1.96
        center = (rate + z*z/(2*completed)) / (1 + z*z/completed)
        half = z * (rate*(1-rate)/completed + z*z/(4*completed*completed))**.5 / (1 + z*z/completed)
        interval = [center-half, center+half]
    sources = ["python/threecard_royale/core.py", "python/threecard_royale/policy.py",
               "python/threecard_royale/gym_env.py", "training/evaluate.py", "training/evaluate_random.py"]
    return {
        "policy": "uniform-legal-random-v1", "opponent": "Code AI", "episode": "game",
        "rules": "1.0.0", "games": games, "completed": completed, "wins": wins,
        "losses": completed-wins, "win_rate": rate, "wilson95": interval,
        "interval_note": "Individual-game Wilson interval; paired-game correlation is not accounted for.",
        "seat_wins": [sum(not r["truncated"] and r["reward"] > 0 and r["seat"] == s for r in records) for s in (0, 1)],
        "truncated": games-completed, "invalid_actions": 0,
        "decisions": sum(r["decisions"] for r in records),
        "choices": sum(r["choices"] for r in records),
        "protocol": {
            "seed_start": 81000000, "seed_count": games//2, "levels": [2, 2],
            "seat": "index % 2", "first": "(index // 2) % 2", "policy_seed": policy_seed,
            "policy_rng": "NumPy PCG64(SeedSequence([policy_seed, game_index])); independent from environment",
            "selection": "Uniform over all masked legal candidate indices, including swap and decline actions; forced actions consume no RNG",
            "max_steps": max_steps, "max_internal_steps": 10000,
        },
        "runtime": {"python": platform.python_version(), "numpy": np.__version__, "gymnasium": gymnasium.__version__},
        "source_sha256": {p: hashlib.sha256((ROOT/p).read_bytes()).hexdigest() for p in sources},
        "episodes": records,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--games", type=int, default=1000)
    parser.add_argument("--policy-seed", type=int, default=20261024)
    parser.add_argument("--output", type=Path, default=Path("artifacts/random-baseline.json"))
    args = parser.parse_args()
    if args.games < 4 or args.games % 4 or args.policy_seed < 0:
        parser.error("--games must be a positive multiple of four; --policy-seed must be nonnegative")
    result = evaluate(args.games, args.policy_seed)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps({k: v for k, v in result.items() if k != "episodes"}, indent=2))


if __name__ == "__main__":
    main()
