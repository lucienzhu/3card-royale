"""Publish one measured policy; feature/rules versions and checksum travel with it."""
import argparse
import hashlib
import json
from pathlib import Path
import re

p=argparse.ArgumentParser();sizes=p.add_mutually_exclusive_group(required=True)
sizes.add_argument('--width',type=int);sizes.add_argument('--model',help='Model ID such as 256x512')
p.add_argument('--root',default='artifacts/nn-policy')
args=p.parse_args();root=Path(args.root);target=Path('models/nn-policy');target.mkdir(exist_ok=True)
model_id=args.model or str(args.width)
if not re.fullmatch(r'[1-9]\d*(?:x[1-9]\d*)?',model_id):p.error('Invalid model ID')
record=next(m for m in json.loads((root/'training.json').read_text())['models'] if str(m.get('id',m['width']))==model_id)
hidden=record.get('hidden',[record['width'],record['width']//2])
dataset=json.loads((root/'dataset.json').read_text());games=dataset['games']
file=f'policy-mlp-{model_id}-v1.onnx';source=root/'models'/f'mlp-{model_id}.onnx'
content=source.read_bytes();assert len(content)<5_000_000
manifest={'version':f'bc-{games}-mlp{model_id}-v1','rules':'1.0.0','features':'gym-v1','episode':'game',
          'file':file,'sha256':hashlib.sha256(content).hexdigest(),'bytes':len(content),
          'architecture':f'obs336 + candidate72 -> MLP {hidden[0]}/{hidden[1]} -> logit','hidden':hidden,
          'teacher':dataset['teacher'],'training_games':games,'training_method':'behavioral-cloning',
          'history':False,'max_candidates':512}
(target/file).write_bytes(content);(target/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps(manifest,indent=2))
