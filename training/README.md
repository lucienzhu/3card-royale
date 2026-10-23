# NN Policy experiment

Single-observation behavioral cloning of the SDK Code AI. No history, recurrence,
search or reward optimization. Rules remain 1.0.0.

## Reproduce

Tested with Python 3.12.14 and Node 24.19.0. Run from the repository root:

Use a fresh checkout or dataset output directory for collection; existing shards
are deliberately not overwritten or combined with another run.

```sh
python3 -m venv .venv
.venv/bin/pip install -r training/requirements-lock.txt
.venv/bin/python training/collect.py --games 10000 --workers 6 --seed 20261024
.venv/bin/python training/train.py --widths 64,128,256,512 --epochs 10
.venv/bin/python training/parity.py
.venv/bin/python training/evaluate.py --games 1000
.venv/bin/python training/publish.py --width 256
node scripts/check.cjs
.venv/bin/python -m unittest discover -s tests -p 'test_*.py'
```

To add one model without replacing existing results:

```sh
.venv/bin/python training/train.py --widths 512 --epochs 10
.venv/bin/python training/parity.py
.venv/bin/python training/evaluate.py --widths 512 --games 1000
```

Training saves a checkpoint at the lowest validation loss. The held-out test split
is evaluated only after checkpoint selection. Re-running an existing width appends
events to that width's TensorBoard folder; use a fresh `--root` for a clean rerun.

## Browser and TensorBoard

```sh
.venv/bin/python -m http.server 59140 --bind 127.0.0.1
.venv/bin/tensorboard --logdir artifacts/nn-policy/tensorboard --port 6006 --host 127.0.0.1
```

Open `http://localhost:59140/`, then **Settings → Preferences → Opponent → NN AI**.
The default remains Code AI. The choice is saved locally. NN inference runs in a
Web Worker; changing games or closing a panel discards stale decisions.

Open `http://localhost:59140/training/profile.html` and click **Run profile** after
training has stopped. Save the JSON shown at the bottom as
`artifacts/nn-policy/browser-profile.json`, then run:

```sh
.venv/bin/python training/report.py
```

The browser harness checks Torch/ONNX action parity and measures 56, 220 and 512
legal candidates with WASM, one thread, three warm-up runs and 100 timed runs.
Those timings measure inference, not the game's deliberate 400 ms thinking pause
or the cold network download. Test real phones before claiming mobile latency.

The runtime is vendored, so gameplay needs no CDN. To refresh the pinned runtime:

```sh
pnpm install --frozen-lockfile
pnpm run vendor:nn
```

## Files

- `artifacts/nn-policy/data/`: 100 compressed shards, both AI seats, 10,000 games.
- `artifacts/nn-policy/prepared/`: disposable memory-mapped training cache.
- `artifacts/nn-policy/models/`: PyTorch checkpoints, ONNX models, epoch histories.
- `artifacts/nn-policy/tensorboard/`: train/val/test event files.
- `models/nn-policy/`: deployed model and checksum/version manifest.
- `docs/experiments/nn-policy-v1/`: checked-in metrics, curves and TensorBoard events.

Raw rollouts, prepared arrays and checkpoints stay outside Git. They can be
regenerated from the seed; the independently saved experiment folder also retains
the actual collected shards and checkpoints.
