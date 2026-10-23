"""Verify regenerated self-play against the checked-in 10,000-game manifest."""
import argparse
import hashlib
import json
from pathlib import Path


def verify(root, reference):
    expected = json.loads(reference.read_text())
    actual = json.loads((root / 'dataset.json').read_text())
    for key in ('rules', 'features', 'teacher', 'games', 'seed', 'samples', 'split', 'starts', 'both_seats', 'episode'):
        if actual[key] != expected[key]:
            raise ValueError(f'Dataset mismatch: {key}')
    names = {p.name for p in (root / 'data').glob('*.npz')}
    if names != {r['file'] for r in expected['shards']}:
        raise ValueError('Missing or unexpected dataset shards')
    for shard in expected['shards']:
        path = root / 'data' / shard['file']
        if hashlib.sha256(path.read_bytes()).hexdigest() != shard['sha256']:
            raise ValueError(f'Dataset checksum mismatch: {path.name}')
    return {'games': actual['games'], 'samples': actual['samples'], 'verified_shards': len(names),
            'reference_sha256': hashlib.sha256(reference.read_bytes()).hexdigest()}


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--root', default='artifacts/nn-policy-256')
    parser.add_argument('--reference', default='docs/experiments/nn-policy-v1/dataset.json')
    args = parser.parse_args()
    print(json.dumps(verify(Path(args.root), Path(args.reference)), indent=2))
