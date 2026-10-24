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
for name in ['dataset.json', 'training.json', 'evaluation.json', 'browser-profile.json', 'browser-profile-first-256x512.json', 'action-counts.json', 'random-baseline.json']:
    if (root / name).exists():
        shutil.copy2(root / name, dest / name)
training = json.loads((root / 'training.json').read_text())
models = training['models']
def model_id(m):
    return str(m.get('id', m['width']))
def hidden(m):
    return m.get('hidden', [m['width'], m['width']//2])
fig, axes = plt.subplots(2, len(models), figsize=(4 * len(models), 6), squeeze=False, sharey='row')
for j, model in enumerate(models):
    path = root / 'models' / f'mlp-{model_id(model)}-history.json'
    history = json.loads(path.read_text()); label = '/'.join(map(str, hidden(model)))
    shutil.copy2(path, dest / path.name)
    for i, metric in enumerate(['loss', 'accuracy']):
        ax = axes[i, j]
        for split, color in [('train', '#c5416b'), ('val', '#16765f')]:
            ax.plot([h['epoch'] for h in history], [h[split][metric] for h in history], label=split, color=color)
        ax.set_title(f'MLP {label} · {metric}'); ax.set_xlabel('Epoch')
        ax.grid(alpha=.2); ax.legend()
fig.tight_layout(); fig.savefig(dest / 'train-val.png', dpi=150); plt.close(fig)
shutil.copytree(root / 'tensorboard', dest / 'tensorboard', dirs_exist_ok=True)
print(dest)

evaluation = {r['model']: r for r in json.loads((root / 'evaluation.json').read_text())}
profiles = json.loads((root / 'browser-profile.json').read_text())['results']
lines = ['# Measured results', '', '| Policy / hidden layers | ONNX bytes | Best epoch | Val accuracy | Test accuracy | Wins vs Code AI | Browser p95, 220 actions | Browser p95, 512 actions |', '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |']
random_report = dest / 'random-baseline.json'
if random_report.exists():
    baseline = json.loads(random_report.read_text())
    lines.append(f"| Uniform random | — | — | — | — | {baseline['wins']}/{baseline['completed']} ({baseline['win_rate']:.1%}) | — | — |")
for m in training['models']:
    ident = model_id(m); label = '/'.join(map(str, hidden(m)))
    history = json.loads((root / 'models' / f'mlp-{ident}-history.json').read_text())
    va = history[m['best_epoch'] - 1]['val']['accuracy']
    ev = evaluation.get(f'mlp-{ident}.onnx')
    latency = {r['candidates']: r['p95_ms'] for r in profiles if model_id(r) == ident}
    fmt = lambda n: f'{latency[n]:.2f} ms' if n in latency else 'pending'
    win = f"{ev['wins']}/{ev['games']} ({ev['win_rate']:.1%})" if ev else 'pending'
    lines.append(f"| {label} | {m['bytes']:,} | {m['best_epoch']} | {va:.2%} | {m['test']['accuracy']:.2%} | {win} | {fmt(220)} | {fmt(512)} |")
lines += ['', 'Accuracy means agreement with teacher actions. Win rates are a separate 1,000-game evaluation per model.', '', 'Latency: Chrome on Mac, WASM one thread, FP32, 100 measured runs after three warmups. Physical phone latency is unmeasured.', '', 'The data has p95 220 candidates for attack/defense; 512 is a synthetic capacity stress test, above the observed dataset maximum of 227.', '', 'All architectures use the same data and ten-epoch schedule. Greater training accuracy without a matching validation gain indicates overfitting; the saved checkpoint minimizes validation loss.', '']
first_profile = root / 'browser-profile-first-256x512.json'
if first_profile.exists():
    first = json.loads(first_profile.read_text())['results']
    first_latency = {r['candidates']: r['p95_ms'] for r in first if model_id(r) == '256x512'}
    lines += [f"The table uses the repeat browser run. The first run measured 256/512 at p95 {first_latency[220]:.2f} ms for 220 actions and {first_latency[512]:.2f} ms for 512 actions. Both raw runs are retained; these short measurements vary with browser/system load and are not a latency guarantee.", '']
if random_report.exists():
    lines += ['', '[Uniform random](random-baseline.json) uses the same paired seeds and Code AI opponent. It samples legal candidate indices uniformly, including swaps and declines. It has no ONNX model; neural inference latency is not applicable.', '']
(dest / 'RESULTS.md').write_text('\n'.join(lines))
