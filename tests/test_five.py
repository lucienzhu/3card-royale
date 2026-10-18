"""Standard 1.0: exhaustive five-kind validity and RL feature bounds."""
import unittest
from threecard_royale import Game, evaluate

class FiveKindTests(unittest.TestCase):
    def test_all_flower_and_target_ranks(self):
        for level in range(2,15):
            for rank in range(2,15):
                if level==rank: continue
                cs=[rank-2+13*s for s in range(4)]+[level+11]
                e=evaluate(cs,level)
                self.assertEqual((e['score'],e['kind'],e['rank_key']), (7,7,[rank]))
    def test_invalid_five_and_atomic_action(self):
        for cs,level in [([5,18,31,44,14],2),([5,18,31,44,18],7),([0,1,2,3,13],2)]:
            with self.assertRaises(ValueError):evaluate(cs,level)
        g=Game(8,0); before=g.save()
        with self.assertRaises(ValueError):g.step({'type':'play','cards':[0,0,0,0,0]})
        self.assertEqual(g.save(),before)
    def test_gym_five_mask_and_bounded_features(self):
        from threecard_royale.gym_env import RoyaleEnv
        env=RoyaleEnv();env.reset(seed=11,options={'first':0})
        g=Game(11,0);s=g.save()
        s['players'][0]['hand']=[5,13,18,31,44,0,2,4]
        held=set(s['players'][0]['hand'])
        s['players'][1]['hand']=[c for c in range(52) if c not in held][:8]
        held.update(s['players'][1]['hand'])
        s['stock']=[c for c in range(52) if c not in held]
        env.game=Game.restore(s);env.player=0
        obs=env._obs()
        i=next(i for i,a in enumerate(env._actions) if a['type']=='play' and len(a['cards'])==5)
        self.assertEqual(obs['action_mask'][i],1)
        self.assertTrue(env.observation_space.contains(obs))
        env.step(i)
        self.assertEqual(env.game.s['cards_played'][0],5)
        env.close()
