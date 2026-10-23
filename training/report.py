"""Copy reproducible evidence and render train/validation curves for every width."""
import json
import os
from pathlib import Path
import shutil
os.environ.setdefault('MPLCONFIGDIR', '/tmp/3card-royale-matplotlib')
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

root = Path('artifacts/nn-policy')
dest = Path('docs/experiments/nn-policy-v1')
dest.mkdir(parents=True, exist_ok=True)
for name in ['dataset.json', 'training.json', 'evaluation.json', 'browser-profile.json', 'action-counts.json']:
    if (root / name).exists():
        shutil.copy2(root / name, dest / name)
paths = sorted((root / 'models').glob('mlp-*-history.json'), key=lambda p: int(p.name.split('-')[1]))
fig, axes = plt.subplots(2, len(paths), figsize=(4 * len(paths), 6), squeeze=False)
for j, path in enumerate(paths):
    history = json.loads(path.read_text()); width = int(path.name.split('-')[1])
    shutil.copy2(path, dest / path.name)
    for i, metric in enumerate(['loss', 'accuracy']):
        ax = axes[i, j]
        for split, color in [('train', '#c5416b'), ('val', '#16765f')]:
            ax.plot([h['epoch'] for h in history], [h[split][metric] for h in history], label=split, color=color)
        ax.set_title(f'MLP {width}/{width // 2} · {metric}'); ax.set_xlabel('Epoch')
        ax.grid(alpha=.2); ax.legend()
fig.tight_layout(); fig.savefig(dest / 'train-val.png', dpi=150); plt.close(fig)
shutil.copytree(root / 'tensorboard', dest / 'tensorboard', dirs_exist_ok=True)
print(dest)

training = json.loads((root / 'training.json').read_text())
evaluation = {r['model']: r for r in json.loads((root / 'evaluation.json').read_text())}
profiles = json.loads((root / 'browser-profile.json').read_text())['results']
lines = ['# Measured results', '', '| Hidden layers | ONNX bytes | Best epoch | Val accuracy | Test accuracy | Wins vs Code AI | Browser p95, 220 actions | Browser p95, 512 actions |', '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |']
for m in training['models']:
    width = m['width']; history = json.loads((root / 'models' / f'mlp-{width}-history.json').read_text())
    va = history[m['best_epoch'] - 1]['val']['accuracy']
    ev = evaluation.get(f'mlp-{width}.onnx')
    latency = {r['candidates']: r['p95_ms'] for r in profiles if r['width'] == width}
    fmt = lambda n: f'{latency[n]:.2f} ms' if n in latency else 'pending'
    win = f"{ev['wins']}/{ev['games']} ({ev['win_rate']:.1%})" if ev else 'pending'
    lines.append(f"| {width}/{width//2} | {m['bytes']:,} | {m['best_epoch']} | {va:.2%} | {m['test']['accuracy']:.2%} | {win} | {fmt(220)} | {fmt(512)} |")
lines += ['', 'Accuracy means agreement with teacher actions. Win rates are a separate 1,000-game evaluation per model.', '', 'Latency: Chrome on Mac, WASM one thread, FP32, 100 measured runs after three warmups. Physical phone latency is unmeasured.', '', 'The data has p95 220 candidates for attack/defense; 512 is a synthetic capacity stress test, above the observed dataset maximum of 227.', '', 'The 512 experiment uses the same data and ten-epoch schedule. Greater training accuracy without a matching validation gain indicates overfitting; the saved checkpoint minimizes validation loss.', '']
(dest / 'RESULTS.md').write_text('\n'.join(lines))
