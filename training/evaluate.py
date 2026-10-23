"""Held-out seeded games against Code AI, equal NN seat counts; no learning."""
import argparse
from concurrent.futures import ProcessPoolExecutor
import json
from pathlib import Path
import re
import sys
import time

sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'python'))
import numpy as np
import onnxruntime as ort
from threecard_royale.gym_env import RoyaleEnv


def evaluate(task):
    path, games = task; opts=ort.SessionOptions(); opts.intra_op_num_threads=1; opts.inter_op_num_threads=1
    session=ort.InferenceSession(str(path),opts,providers=['CPUExecutionProvider'])
    wins=cuts=decisions=0; times=[]; seats=[0,0]; start=time.monotonic()
    for i in range(games):
        seat=i%2; env=RoyaleEnv(player=seat)
        # Independent seeds, balanced seats and first movers, real level-2 starts.
        obs,info=env.reset(seed=81000000+i//2,options={'first':(i//2)%2})
        done,cut=info['reset_terminal'],info['reset_truncated']; reward=0
        while not(done or cut):
            n=int(obs['action_mask'].sum())
            if n==1: action=0
            else:
                state=np.concatenate([obs['cards'].ravel(),obs['meta']]).astype(np.float32)[None,:]
                begin=time.perf_counter()
                logits=session.run(None,{'state':state,'candidates':obs['candidates'][None,:n,:]})[0]
                times.append((time.perf_counter()-begin)*1000)
                action=int(logits[0].argmax()); decisions+=1
            obs,reward,done,cut,info=env.step(action)
            if info['invalid_action']: raise RuntimeError('Illegal NN action')
        if done and reward>0: wins+=1;seats[seat]+=1
        cuts+=int(cut);env.close()
    n=games-cuts;p=wins/max(1,n);z=1.96
    center=(p+z*z/(2*n))/(1+z*z/n);half=z*((p*(1-p)/n+z*z/(4*n*n))**.5)/(1+z*z/n)
    return {'model':path.name,'games':games,'completed':n,'wins':wins,'win_rate':p,'wilson95':[center-half,center+half],
            'seat_wins':seats,'truncated':cuts,'nn_decisions':decisions,
            'onnx_cpu_p50_ms':float(np.percentile(times,50)),'onnx_cpu_p95_ms':float(np.percentile(times,95)),
            'seconds':time.monotonic()-start}


def main():
    p=argparse.ArgumentParser();p.add_argument('--root',default='artifacts/nn-policy');p.add_argument('--games',type=int,default=1000)
    group=p.add_mutually_exclusive_group()
    group.add_argument('--widths',help='Comma-separated legacy widths')
    group.add_argument('--models',help='Comma-separated model IDs, e.g. 256,256x512,512; omit for all models')
    args=p.parse_args();root=Path(args.root)
    ids=(args.models or args.widths or '').split(',')
    if ids!=[''] and any(not re.fullmatch(r'[1-9]\d*(?:x[1-9]\d*)?',i) for i in ids):p.error('Invalid model ID')
    paths=[root/'models'/f'mlp-{i}.onnx' for i in ids] if ids!=[''] else sorted((root/'models').glob('*.onnx'))
    with ProcessPoolExecutor(max_workers=min(3,len(paths))) as pool:
        results=list(pool.map(evaluate,[(p,args.games) for p in paths]))
    report=root/'evaluation.json'
    if (args.widths or args.models) and report.exists():
        names={r['model'] for r in results}
        results=[r for r in json.loads(report.read_text()) if r['model'] not in names]+results
    report.write_text(json.dumps(results,indent=2));print(json.dumps(results,indent=2))


if __name__=='__main__':main()
