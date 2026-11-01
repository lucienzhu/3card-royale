import json, sys, unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'python'))
import numpy as np
from gymnasium.utils.env_checker import check_env
from threecard_royale.actions import Grammar, Game, state, tokens, from_legacy, T, PAD
from threecard_royale.gym_structured import StructuredRoyaleEnv
from threecard_royale.core import Game as Legacy
from threecard_royale.policy import choose_action

class StructuredTests(unittest.TestCase):
    def test_js_parity(self):
        fixtures=json.loads((Path(__file__).parent/'fixtures/actions-v2.json').read_text())
        for f in fixtures:
            grammar=Grammar(f['observation'])
            self.assertEqual([{'action':r['action'],'tokens':r['tokens']} for r in grammar.rows],f['rows'])
            np.testing.assert_allclose(state(f['observation']),f['state'],rtol=0,atol=1e-7)
            for r in grammar.rows:
                for i,t in enumerate(r['tokens']):self.assertEqual(grammar.next(r['tokens'][:i])[0][t],1)
                self.assertEqual(grammar.resolve(r['tokens']),r)

    def test_gym(self):
        for episode in ['game','match']:check_env(StructuredRoyaleEnv(episode=episode),skip_render_check=True)
        for who in [0,1]:
            env=StructuredRoyaleEnv(player=who);obs,_=env.reset(seed=12)
            before=env.game.save();obs,r,term,cut,info=env.step([PAD]*6)
            self.assertTrue(info['invalid_action']);self.assertEqual(before,env.game.save())
            for _ in range(4096):
                o=env.game.observation(who);a=choose_action(o);seq=tokens(from_legacy(o,a));before=env.game.save()
                for i,t in enumerate(seq):self.assertTrue(env.action_masks(seq[:i])[t])
                self.assertEqual(before,env.game.save())
                obs,r,term,cut,info=env.step(seq+[PAD]*(6-len(seq)))
                self.assertTrue(env.observation_space.contains(obs));self.assertFalse(info['invalid_action'])
                if term or cut:self.assertTrue(term);self.assertFalse(cut);break
            else:self.fail('Game did not terminate')

    def test_atomic(self):
        for seed in range(8):
            old=Legacy(seed,seed%2);new=Game(seed,seed%2)
            for i in range(4096):
                if old.s['phase'] in ['game_over','match_over']:break
                o=old.observation(old.actor if old.actor is not None else 0);o['legal_actions']=old.legal_actions()
                a=choose_action(o) if old.actor is not None else o['legal_actions'][0]
                before=new.save()
                with self.assertRaises(ValueError):new.step_tokens([T['PLAY_3'],51,51,51])
                self.assertEqual(before,new.save());new.step_structured(from_legacy(o,a));old.step(a);self.assertEqual(old.save(),new.save())
            self.assertIn(old.s['phase'], ['game_over', 'match_over'])

if __name__=='__main__':unittest.main()
