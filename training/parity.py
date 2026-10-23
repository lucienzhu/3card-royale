"""Export independently checked Torch/ONNX logits for browser verification."""
import json
from pathlib import Path
import numpy as np
import onnxruntime as ort
import torch
from train import PolicyMLP

root=Path('artifacts/nn-policy'); fixtures=json.loads(Path('tests/fixtures/nn-observations.json').read_text())
models=sorted((root/'models').glob('*.pt'));torch.set_num_threads(1)
for fixture in fixtures:
    fixture['logits']={}
for path in models:
    ckpt=torch.load(path,weights_only=True);width=ckpt['width'];model=PolicyMLP(width)
    model.load_state_dict(ckpt['state_dict']);model.eval()
    options=ort.SessionOptions();options.intra_op_num_threads=1
    session=ort.InferenceSession(str(path.with_suffix('.onnx')),options)
    for f in fixtures:
        state=np.array(f['state'],np.float32)[None,:];cs=np.array(f['candidates'],np.float32)[None,:,:]
        with torch.no_grad(): logits=model(torch.from_numpy(state),torch.from_numpy(cs)).numpy()
        actual=session.run(None,{'state':state,'candidates':cs})[0]
        np.testing.assert_allclose(logits,actual,atol=1e-4,rtol=1e-4)
        assert logits.argmax()==actual.argmax()
        f['logits'][str(width)]=logits[0].tolist()
(root/'parity.json').write_text(json.dumps(fixtures,separators=(',',':')))
print(f'Torch/ONNX numeric parity: {len(fixtures)} positions × {len(models)} models')
