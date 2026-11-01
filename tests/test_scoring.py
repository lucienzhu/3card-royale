import json, subprocess, sys, unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'python'))
import numpy as np
from threecard_royale.actions import observation, Grammar, from_legacy
from threecard_royale.scoring import encode, choose
from threecard_royale.gym_structured import StructuredRoyaleEnv
from threecard_royale.policy import choose_action


class ScoringTests(unittest.TestCase):
    def test_cross_language_and_permutation(self):
        fixtures=json.loads((ROOT/'tests/fixtures/actions-v2.json').read_text())
        script="""const S=require('./sdk/scoring.js'),A=require('./sdk/actions.js');
        const fs=require('fs');const f=JSON.parse(fs.readFileSync('tests/fixtures/actions-v2.json'));
        process.stdout.write(JSON.stringify(f.map(x=>{const e=S.encode(A.observation(x.observation));
        return {state:Array.from(e.state),candidates:Array.from(e.candidates),actions:e.actions};})));"""
        js=json.loads(subprocess.check_output(['node','-e',script],cwd=ROOT))
        for fixture,expected in zip(fixtures,js):
            o=observation(fixture['observation']); before=json.dumps(o)
            encoded=encode(o)
            np.testing.assert_allclose(encoded['state'],expected['state'],rtol=0,atol=1e-7)
            np.testing.assert_allclose(encoded['candidates'].ravel(),expected['candidates'],rtol=0,atol=1e-7)
            self.assertEqual(encoded['actions'],expected['actions'])
            for seq,a in zip(encoded['tokens'],encoded['actions']):
                self.assertEqual(Grammar(o).resolve(seq.tolist())['action'],a)
            scores=np.arange(len(encoded['actions']),dtype=float)
            chosen=choose(o,scores)
            self.assertEqual(choose({**o,'legal_actions':list(reversed(o['legal_actions']))},scores[::-1]),chosen)
            with self.assertRaises(ValueError):choose(o,scores[:-1])
            with self.assertRaises(ValueError):choose(o,np.full_like(scores,np.nan))
            self.assertEqual(json.dumps(o),before)

    def test_gym_whole_actions(self):
        for seat in (0,1):
            env=StructuredRoyaleEnv(player=seat);env.reset(seed=19)
            for _ in range(4096):
                before=env.game.save();f=env.scoring_observation()
                self.assertEqual(before,env.game.save())
                o=env.game.observation(seat)
                teacher=from_legacy(o,choose_action(o))
                index=f['actions'].index(teacher)
                _,_,term,cut,info=env.step(f['tokens'][index])
                self.assertFalse(info['invalid_action'])
                if term or cut:
                    self.assertTrue(term);self.assertFalse(cut)
                    with self.assertRaises(RuntimeError):env.scoring_observation()
                    break
            else:self.fail('Game did not finish')
            env.close()


if __name__=='__main__':unittest.main()
