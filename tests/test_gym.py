"""Gym API, masking, truncation and hidden-information regression checks."""

import sys, json, unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "python"))
import numpy as np
from gymnasium.utils.env_checker import check_env
from gymnasium.vector import SyncVectorEnv
from threecard_royale import Game, choose_action
from threecard_royale.gym_env import RoyaleEnv


class GymTests(unittest.TestCase):
    def test_official_checker(self):
        for mode in ("game", "match"):
            check_env(RoyaleEnv(episode=mode), skip_render_check=True)

    def test_seed_limits_and_invalid_actions(self):
        for mode in ("game", "match"):
            a, b = RoyaleEnv(episode=mode, max_steps=1), RoyaleEnv(
                episode=mode, max_steps=1
            )
            x, _ = a.reset(seed=42)
            y, _ = b.reset(seed=42)
            for key in x:
                np.testing.assert_array_equal(x[key], y[key])
            before = a.game.save()
            obs, r, term, trunc, info = a.step(511)
            self.assertEqual(before, a.game.save())
            self.assertEqual(r, -0.05)
            self.assertFalse(term)
            self.assertTrue(trunc)
            self.assertTrue(info["invalid_action"])
            with self.assertRaises(RuntimeError):
                a.step(0)
            c = RoyaleEnv(max_internal_steps=1)
            obs, info = c.reset(seed=2, options={"first": 1})
            self.assertTrue(info["reset_truncated"])
            self.assertTrue(c.observation_space.contains(obs))

    def test_hidden_state_invariance(self):
        for who in (0, 1):
            g = Game(8, who)
            s = g.save()
            before = g.observation(who)
            q = s["players"][1 - who]
            q["hand"][0], s["stock"][0] = s["stock"][0], q["hand"][0]
            s["stock"].reverse()
            s["rng"] = 789
            other = Game.restore(s).observation(who)
            self.assertEqual(before, other)
            self.assertEqual(choose_action(before), choose_action(other))
            e = RoyaleEnv(player=who)
            e.reset(seed=8, options={"first": who})
            a = e._obs()
            state = e.game.save()
            q = state["players"][1 - who]
            q["hand"][0], state["stock"][0] = state["stock"][0], q["hand"][0]
            state["stock"].reverse()
            state["rng"] = 999
            e.game = Game.restore(state)
            b = e._obs()
            for key in a:
                np.testing.assert_array_equal(a[key], b[key])
            info = e._info()
            self.assertFalse(
                set(info) & {"seed", "rng", "stock", "state", "enemy_hand"}
            )

    def test_rollouts(self):
        rng = np.random.default_rng(123)
        episodes = 0
        for mode in ("game", "match"):
            for player in (0, 1):
                env = RoyaleEnv(episode=mode, player=player)
                for seed in range(10):
                    obs, info = env.reset(seed=seed)
                    self.assertFalse(info["reset_terminal"])
                    self.assertFalse(info["reset_truncated"])
                    for n in range(4096):
                        self.assertTrue(env.observation_space.contains(obs))
                        legal = np.flatnonzero(obs["action_mask"])
                        self.assertTrue(len(legal) > 0)
                        obs, r, term, trunc, info = env.step(int(rng.choice(legal)))
                        if term or trunc:
                            self.assertFalse(trunc)
                            self.assertIn(r, (-1.0, 1.0))
                            episodes += 1
                            break
                    else:
                        self.fail("Unbounded episode")
        self.assertEqual(episodes, 40)

    def test_vector_and_render(self):
        e = RoyaleEnv(render_mode="ansi")
        e.reset(seed=3)
        self.assertIsInstance(e.render(), str)
        v = SyncVectorEnv([lambda: RoyaleEnv() for _ in range(2)])
        obs, _ = v.reset(seed=5)
        acts = np.array([np.flatnonzero(m)[0] for m in obs["action_mask"]])
        obs, _, _, _, _ = v.step(acts)
        self.assertEqual(obs["candidates"].shape, (2, 512, 72))
        v.close()


if __name__ == "__main__":
    unittest.main()
