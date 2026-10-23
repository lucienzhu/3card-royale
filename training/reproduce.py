"""Regenerate Code-AI data, verify it, train the selected 256 model and evaluate it.

Generated data/checkpoints stay in ignored artifacts/. The committed web model
is never replaced by this command; publishing is an explicit separate step.
"""
import argparse
import hashlib
from importlib.metadata import version
import json
from pathlib import Path
import platform
import subprocess
import sys

from verify_data import verify

REPO = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--root', default='artifacts/nn-policy-256')
    parser.add_argument('--workers', type=int, help='Collection workers; does not change seeds or samples')
    parser.add_argument('--reuse-data', action='store_true', help='Verify an already collected dataset before training')
    args = parser.parse_args()
    recipe = json.loads((REPO / 'training/recipe-256.json').read_text())
    root = (REPO / args.root).resolve()
    if (root / 'models').exists():
        parser.error('Model outputs already exist; use a fresh --root to preserve that run')
    if not args.reuse_data and root.exists() and any(root.iterdir()):
        parser.error('Output directory is not empty; use a fresh --root or --reuse-data')
    workers = args.workers or recipe['collection']['workers']
    if workers < 1:
        parser.error('--workers must be positive')
    root.mkdir(parents=True, exist_ok=True)

    def run(script, *arguments):
        subprocess.run([sys.executable, str(REPO / 'training' / script), *map(str, arguments)], cwd=REPO, check=True)

    collection = recipe['collection']
    if not args.reuse_data:
        run('collect.py', '--games', collection['games'], '--seed', collection['seed'],
            '--shard-games', collection['shard_games'], '--workers', workers, '--output', root / 'data')
    data = verify(root, REPO / recipe['reference_dataset'])
    print('Verified dataset: ' + json.dumps(data), flush=True)
    train = recipe['training']
    run('train.py', '--root', root, '--hidden', *train['hidden'], '--seed', train['seed'],
        '--epochs', train['epochs'], '--batch-size', train['batch_size'], '--threads', train['threads'])
    run('parity.py', '--root', root)
    run('evaluate.py', '--root', root, '--models', '256', '--games', recipe['evaluation_games'])
    model = root / 'models/mlp-256.onnx'
    digest = hashlib.sha256(model.read_bytes()).hexdigest()
    report = {
        'recipe': recipe, 'dataset': data,
        'environment': {'python': platform.python_version(), 'system': platform.system(),
                        'machine': platform.machine(), **{name: version(name) for name in ('numpy', 'torch', 'onnx', 'onnxruntime')}},
        'model': {'bytes': model.stat().st_size, 'sha256': digest,
                  'matches_reference': digest == recipe['reference_sha256']},
        'training': json.loads((root / 'training.json').read_text()),
        'evaluation': json.loads((root / 'evaluation.json').read_text())}
    (root / 'reproduction.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    main()
