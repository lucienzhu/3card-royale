import sys, unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "python"))
from threecard_royale import Game, evaluate


class CoreTests(unittest.TestCase):
    def test_cards_and_atomicity(self):
        g = Game(0, 0)
        before = g.save()
        for a in ({"type": "play", "cards": [0, 0, 1]}, {"type": "advance"}):
            with self.assertRaises(ValueError):
                g.step(a)
            self.assertEqual(before, g.save())
        with self.assertRaises(ValueError):
            evaluate([0, 1, 2, 3], 2)
        x = g.save()
        x["stock"][0] = x["stock"][1]
        with self.assertRaises(ValueError):
            Game.restore(x)

    def test_standard_a_boundary(self):
        # A fresh synthetic SDK state, not a reconstruction of the parked UI report.
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
            g = Game.restore(s)
            g.step({"type": "play", "cards": [0, 13, 26, 39]})
            g.step({"type": "play", "cards": [1, 4, 8]})
            self.assertEqual(g.s["phase"], "game_over")
            self.assertEqual(g.s["players"][1]["level"], 2 if losses == 2 else 14)
            self.assertEqual(g.s["a_losses"][1], 0 if losses == 2 else losses + 1)
            winner_level = g.s["players"][0]["level"]
            g.step({"type": "next_game"})
            self.assertEqual(g.s["first"], 0)
            self.assertEqual(g.s["flower_level"], winner_level)


if __name__ == "__main__":
    unittest.main()
