import copy
import json
from pathlib import Path
import shutil
import subprocess
import unittest
from threecard_royale.core import Game
from threecard_royale.easy_policy import choose_action
from threecard_royale.policy import choose_action as code_action

ROOT = Path(__file__).resolve().parents[1]


class EasyPolicyTest(unittest.TestCase):
    def test_js_python_parity_and_legal_games(self):
        observations = []
        for seed in range(12):
            game = Game(seed, seed % 2)
            for _ in range(1000):
                if game.s["phase"] in ("game_over", "match_over"):
                    break
                if game.actor is None:
                    game.step(game.legal_actions()[0])
                    continue
                o = game.observation(game.actor if game.actor is not None else 0)
                before = copy.deepcopy(o)
                a = choose_action(o)
                self.assertIn(a, o["legal_actions"])
                self.assertEqual(a, choose_action(o))
                self.assertEqual(o, before)
                if o["phase"] == "refresh":
                    self.assertEqual(a["type"], "swap")
                    self.assertEqual(a["target"]["zone"], "deck")
                observations.append(o)
                game.step(a if game.actor == 1 else code_action(o))
            else:
                self.fail("Easy game did not terminate")
        node = shutil.which("node")
        self.assertIsNotNone(node, "Node is required for Easy JS/Python parity")
        result = subprocess.run([node, "-e", "const p=require('./sdk/easy-policy.js');let s='';process.stdin.on('data',d=>s+=d);process.stdin.on('end',()=>process.stdout.write(JSON.stringify(JSON.parse(s).map(o=>o.legal_actions.indexOf(p.chooseAction(o))))));"],
                                cwd=ROOT, input=json.dumps(observations), text=True, capture_output=True, check=True)
        expected = [o["legal_actions"].index(choose_action(o)) for o in observations]
        self.assertEqual(json.loads(result.stdout), expected)

    def test_invalid_decisions(self):
        with self.assertRaises(ValueError):
            choose_action({"legal_actions": []})
        o = Game(1).observation(0)
        with self.assertRaises(ValueError):
            choose_action(o, budget=0)


if __name__ == "__main__":
    unittest.main()
