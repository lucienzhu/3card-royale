"""Two visible-information Code AIs, exactly N completed Gym game episodes.

Both seats are recorded. Split by complete game, never by individual decisions.
Shards use ragged candidates; no hidden cards, stock order or RNG in features.
"""
import argparse
from concurrent.futures import ProcessPoolExecutor
import hashlib
import json
from pathlib import Path
import sys
import time

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "python"))
import numpy as np
from threecard_royale.gym_env import RoyaleEnv, encode_observation
from threecard_royale.policy import choose_action


def collect_shard(task):
    start, count, directory, seed = task
    states, candidates, offsets, labels, game_ids, phases, wins = [], [], [0], [], [], [], []
    attempts = 0
    begin = time.monotonic()
    fixtures = []
    for game_id in range(start, start + count):
        # IDs/seeds are metadata, never network inputs.
        rng = np.random.default_rng(seed + game_id)
        levels = [2, 2] if game_id % 3 == 0 else [int(x) for x in rng.integers(2, 15, 2)]
        if game_id % 3 == 2:
            levels[game_id % 2] = 14
        records = []

        def teacher(o, actions=None):
            actions = o["legal_actions"] if actions is None else actions
            action = choose_action(o, actions)
            if o["phase"] in ("attack", "defend", "refresh"):
                encoded = encode_observation(o)
                n = len(actions)
                state = np.concatenate([encoded["cards"].ravel(), encoded["meta"]]).astype(np.float16)
                records.append((state, encoded["candidates"][:n].astype(np.float16), actions.index(action), o["phase"]))
                if start == 0 and len(fixtures) < 12 and (len(fixtures) < 3 or o["phase"] == "refresh"):
                    fixtures.append({"observation": o, "label": actions.index(action),
                                     "state": state.astype(float).tolist(),
                                     "candidates": encoded["candidates"][:n].tolist()})
            return action

        env = RoyaleEnv(episode="game", opponent=teacher)
        while True:
            records.clear()
            # Reattempt only time-limited episodes; publish the count explicitly.
            _, info = env.reset(seed=seed + game_id + attempts * 1000003,
                                options={"first": game_id % 2, "levels": levels})
            cut = info["reset_truncated"]
            done = info["reset_terminal"]
            while not (done or cut):
                o = env.game.observation(0)
                action = teacher(o)
                _, reward, done, cut, _ = env.step(o["legal_actions"].index(action))
            if done:
                break
            attempts += 1
            if attempts > count * 5:
                raise RuntimeError("Too many truncated games")
        for state, cs, label, phase in records:
            states.append(state); candidates.append(cs); offsets.append(offsets[-1] + len(cs))
            labels.append(label); game_ids.append(game_id); phases.append(["attack", "defend", "refresh"].index(phase))
        wins.append(int(env.game.s["results"][-1]["winner"]))
        env.close()
    target = Path(directory) / f"games-{start:05d}.npz"
    np.savez_compressed(target, states=np.array(states), candidates=np.concatenate(candidates),
                        offsets=np.array(offsets, np.int64), labels=np.array(labels, np.int16),
                        game_ids=np.array(game_ids, np.int32), phases=np.array(phases, np.int8))
    if fixtures:
        (Path(directory).parent / "fixtures.json").write_text(json.dumps(fixtures, separators=(",", ":")))
    result = {"file": target.name, "games": count, "samples": len(states), "candidate_rows": offsets[-1],
              "seat0_wins": wins.count(0), "seat1_wins": wins.count(1), "truncated_retries": attempts,
              "seconds": round(time.monotonic() - begin, 2), "sha256": hashlib.sha256(target.read_bytes()).hexdigest()}
    target.with_suffix(".json").write_text(json.dumps(result, indent=2))
    return result


def main():
    p = argparse.ArgumentParser(); p.add_argument("--games", type=int, default=10000)
    p.add_argument("--workers", type=int, default=6); p.add_argument("--shard-games", type=int, default=100)
    p.add_argument("--seed", type=int, default=20261024); p.add_argument("--output", default="artifacts/nn-policy/data")
    args = p.parse_args(); output = Path(args.output); output.mkdir(parents=True, exist_ok=True)
    if list(output.glob('*.npz')):
        raise SystemExit('Dataset already exists; choose a fresh --output directory to avoid mixing runs.')
    tasks = [(i, min(args.shard_games, args.games-i), str(output), args.seed) for i in range(0, args.games, args.shard_games)]
    results = []; started = time.monotonic()
    with ProcessPoolExecutor(max_workers=args.workers) as pool:
        for result in pool.map(collect_shard, tasks):
            results.append(result)
            print(json.dumps({"completed_games": sum(r["games"] for r in results), "samples": sum(r["samples"] for r in results),
                              "elapsed_s": round(time.monotonic()-started), "last_shard": result}), flush=True)
    summary = {"rules": "1.0.0", "features": "gym-v1", "teacher": "sdk-code-policy-v0.2.0",
               "episode": "game", "games": args.games, "seed": args.seed, "both_seats": True,
               "starts": "1/3 level 2; 1/3 random levels; 1/3 one seat on Ace; alternating first seat",
               "split": "game_id % 10: 0 validation, 1 test, 2..9 train",
               "samples": sum(r["samples"] for r in results), "shards": results,
               "seconds": round(time.monotonic()-started, 2)}
    (output.parent / "dataset.json").write_text(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
