"""The random baseline must be legal, reproducible and protocol-compatible."""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "training"))
import numpy as np
from evaluate_random import evaluate, game_setup, random_action


class RandomBaselineTests(unittest.TestCase):
    def test_mask_and_uniform_sampling(self):
        mask = np.array([0, 1, 0, 1, 0, 1])
        rng = np.random.default_rng(42)
        picks = [random_action(mask, rng) for _ in range(6000)]
        self.assertEqual(set(picks), {1, 3, 5})
        for action in (1, 3, 5):
            self.assertTrue(1800 < picks.count(action) < 2200)
        self.assertEqual(random_action([0, 0, 1], rng), 2)
        with self.assertRaises(ValueError):
            random_action([0, 0], rng)

    def test_protocol_and_repeatability(self):
        self.assertEqual([game_setup(i) for i in range(4)],
                         [(0, 81000000, 0), (1, 81000000, 0),
                          (0, 81000001, 1), (1, 81000001, 1)])
        a = evaluate(8)
        self.assertEqual(a, evaluate(8))
        self.assertEqual(a["completed"], 8)
        self.assertEqual(a["invalid_actions"], 0)
        self.assertEqual(a["wins"] + a["losses"], 8)
        self.assertNotEqual(a["episodes"], evaluate(8, policy_seed=20261025)["episodes"])

    def test_truncation_is_not_a_loss(self):
        result = evaluate(4, max_steps=1)
        self.assertGreater(result["truncated"], 0)
        self.assertEqual(result["completed"] + result["truncated"], 4)
        self.assertEqual(result["losses"], sum(
            not r["truncated"] and r["reward"] < 0 for r in result["episodes"]))
        self.assertEqual(result["wins"] + result["losses"], result["completed"])
        if result["completed"]:
            self.assertEqual(result["win_rate"], result["wins"] / result["completed"])
        with self.assertRaises(ValueError):
            evaluate(6)


if __name__ == "__main__":
    unittest.main()
