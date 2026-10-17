"""Smoke rollout, not a trained model. pip install -e './python[gym]' first."""

import numpy as np
from threecard_royale.gym_env import RoyaleEnv


def main():
    rng = np.random.default_rng(42)
    env = RoyaleEnv(episode="game")
    wins = truncated = 0
    for seed in range(20):
        obs, info = env.reset(seed=seed)
        if info["reset_terminal"] or info["reset_truncated"]:
            continue
        while True:
            legal = np.flatnonzero(obs["action_mask"])
            obs, reward, terminated, cut, info = env.step(int(rng.choice(legal)))
            if terminated or cut:
                wins += int(reward > 0)
                truncated += int(cut)
                break
    print({"episodes": 20, "random_agent_wins": wins, "truncated": truncated})
    env.close()


if __name__ == "__main__":
    main()
