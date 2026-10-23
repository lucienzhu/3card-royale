"""Publish one measured policy; feature/rules versions and checksum travel with it."""
import argparse
import hashlib
import json
from pathlib import Path
import shutil

p=argparse.ArgumentParser();p.add_argument('--width',type=int,required=True);p.add_argument('--root',default='artifacts/nn-policy')
args=p.parse_args();root=Path(args.root);target=Path('models/nn-policy');target.mkdir(exist_ok=True)
file=f'policy-mlp-{args.width}-v1.onnx';source=root/'models'/f'mlp-{args.width}.onnx'
content=source.read_bytes();assert len(content)<5_000_000
manifest={'version':f'bc-10000-mlp{args.width}-v1','rules':'1.0.0','features':'gym-v1','episode':'game',
          'file':file,'sha256':hashlib.sha256(content).hexdigest(),'bytes':len(content),
          'architecture':f'obs336 + candidate72 -> MLP {args.width}/{args.width//2} -> logit',
          'teacher':'sdk-code-policy-v0.2.0','training_games':10000,'training_method':'behavioral-cloning',
          'history':False,'max_candidates':512}
(target/file).write_bytes(content);(target/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps(manifest,indent=2))
