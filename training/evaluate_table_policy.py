"""Compare the restored table Code AI with the frozen SDK baseline, Easy and NN."""
import argparse, hashlib, json, subprocess, sys
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'python'))
import numpy as np
import onnxruntime as ort
from threecard_royale.gym_env import encode_observation
from threecard_royale.policy import choose_action as baseline
from threecard_royale.easy_policy import choose_action as easy, BUDGET

def evaluate(task):
    left,right,games,start,node=task
    bridge=subprocess.Popen([node,str(ROOT/'training/table_policy_bridge.cjs')],stdin=subprocess.PIPE,stdout=subprocess.PIPE,text=True,bufsize=1)
    session=None
    if 'nn' in (left,right):
        manifest=json.loads((ROOT/'models/nn-policy/manifest.json').read_text())
        path=ROOT/'models/nn-policy'/manifest['file']
        assert hashlib.sha256(path.read_bytes()).hexdigest()==manifest['sha256']
        config=ort.SessionOptions();config.intra_op_num_threads=config.inter_op_num_threads=1
        session=ort.InferenceSession(str(path),config,providers=['CPUExecutionProvider'])
    def ask(value):
        bridge.stdin.write(json.dumps(value,separators=(',',':'))+'\n');bridge.stdin.flush()
        result=json.loads(bridge.stdout.readline())
        if 'error' in result:raise RuntimeError(result['error'])
        return result
    def nn(o,actions):
        if len(actions)==1:return actions[0]
        f=encode_observation(o)
        state=np.concatenate([f['cards'].ravel(),f['meta']]).astype(np.float32)[None,:]
        scores=session.run(None,{'state':state,'candidates':f['candidates'][None,:len(actions),:]})[0][0]
        assert np.isfinite(scores).all()
        return actions[int(scores.argmax())]
    policies={'easy':easy,'nn':nn,'sdk-code':baseline}
    records=[];routes={'deck':0,'blind':0,'wounds':0}
    try:
        for i in range(games):
            seat=i%2;seed=start+i//2;first=(i//2)%2
            core_seed=int(np.random.default_rng(seed).integers(0,2**32,dtype=np.uint64))
            state=ask({'op':'init','seed':core_seed,'first':first,'player':seat,'left':left,'right':right})
            assert not state['done']
            for step in range(4096):
                o=state['observation']
                action=None if left=='table-code' else policies[left](o,o['legal_actions'])
                state=ask({'op':'step','action':action})
                if state['done']:break
            assert state['done'],'Episode truncated'
            for k,v in state['routes'].items():routes[k]+=v
            records.append({'index':i,'seed':seed,'core_seed':core_seed,'seat':seat,'first':first,'reward':state['reward'],'decisions':state['decisions'],'state_trace_sha256':state['trace']})
        wins=sum(r['reward']>0 for r in records)
        result={'policy':left,'opponent':right,'games':games,'completed':games,'wins':wins,'win_rate':wins/games,'invalid_actions':0,'truncated':0,'table_swap_routes':routes,'episodes':records}
        print(json.dumps({k:v for k,v in result.items() if k!='episodes'}),flush=True)
        return result
    finally:
        bridge.stdin.close();bridge.wait(timeout=10)

def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--node',default='node');p.add_argument('--games',type=int,default=1000);p.add_argument('--seed-start',type=int,default=81000000);p.add_argument('--output',type=Path,default=Path('artifacts/table-code-evaluation.json'));a=p.parse_args()
    if a.games<4 or a.games%4 or a.seed_start<0:p.error('Use a positive multiple of four games and a nonnegative seed')
    pairs=[('easy','table-code'),('nn','table-code'),('table-code','sdk-code'),('nn','sdk-code')]
    with ProcessPoolExecutor(max_workers=3) as pool:results=list(pool.map(evaluate,[(x,y,a.games,a.seed_start,a.node) for x,y in pairs]))
    files=['gamecore.js','app/policy-ai.js','sdk/policy.js','sdk/easy-policy.js','python/threecard_royale/core.py','python/threecard_royale/policy.py','python/threecard_royale/easy_policy.py','python/threecard_royale/gym_env.py','training/table_policy_bridge.cjs','training/evaluate_table_policy.py']
    report={'rules':'1.0.0','episode':'game','table_policy_version':'code-table-v1','easy_budget':BUDGET,'nn_sha256':json.loads((ROOT/'models/nn-policy/manifest.json').read_text())['sha256'],'protocol':{'seed_start':a.seed_start,'seed_count':a.games//2,'levels':[2,2],'seats':'index % 2','first':'(index // 2) % 2','note':'Same Gym seed mapping as the frozen SDK evaluation. Actual browser engine and Game.aiStep preserve original card/discard order. NN receives public observations only.'},'source_sha256':{f:hashlib.sha256((ROOT/f).read_bytes()).hexdigest() for f in files},'results':results}
    a.output.parent.mkdir(parents=True,exist_ok=True);a.output.write_text(json.dumps(report,indent=2)+'\n')
if __name__=='__main__':main()
