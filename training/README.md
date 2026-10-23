# Reproduce NN AI · 256

Production uses **256 → 128 → 1**: two ReLU hidden layers and a shared score for
each legal action. The input is one public observation (336 values) plus one
candidate action (72). Training imitates Code AI; it has no history or hidden cards.

[Model contract and RL extension](../docs/MODEL.md) · [中文模型说明](../docs/MODEL.zh-CN.md) · [Gym environment](../docs/RL.md)

## One command after setup

Tested with Python **3.12.14** and Node **24.19.0**, from the repository root:

```sh
python3.12 -m venv .venv
.venv/bin/pip install -r training/requirements-lock.txt
.venv/bin/python training/reproduce.py
```

The recipe is [recipe-256.json](recipe-256.json). The command:

1. Runs two Code AIs through the Gym env for 10,000 complete games, seed 20261024.
2. Checks all 100 compressed shards against the committed dataset checksums.
3. Trains only 256/128 for ten epochs, saves the lowest-validation-loss checkpoint,
   then exports FP32 ONNX and measures the held-out test split.
4. Checks Torch/ONNX parity and plays 1,000 held-out games against Code AI.
5. Writes `artifacts/nn-policy-256/reproduction.json`, including environment,
   metrics, model SHA-256 and whether it matches the committed reference exactly.

Split by whole game: 8,000 train / 1,000 validation / 1,000 test. Both seats stay
in the same split. Optimizer: AdamW, lr 0.001, weight decay 0.0001; gradient clip 5;
batch 128; four CPU threads; training seed 20261024. Dependencies are pinned.
Cross-platform floating-point behavior can change trained weights slightly;
the checked-in ONNX is the exact web artifact. Compare the generated report.

The full 2026-10-24 rerun regenerated all 100 shards byte-for-byte and produced
an identical ONNX SHA-256, the same epoch-5 checkpoint, 89.36% test agreement and
462/1,000 evaluation wins. Evidence: [reproduction-256.json](../docs/experiments/nn-policy-v1/reproduction-256.json).

Use a fresh output directory for a rerun:

```sh
.venv/bin/python training/reproduce.py --root artifacts/nn-policy-256-rerun
```

`--reuse-data` resumes after collection, verifies every shard, then trains into a
directory without existing model outputs. `--workers 2` reduces collection CPU use
without changing the seeds. Allow about 4 GB for the temporary prepared arrays.

## Data and saved model

The 252,859 decision samples occupy **118,155,571 bytes** as compressed NPZ shards.
An actual `tar.gz` is **112,497,347 bytes** (112.5 MB), above the 10 MB budget.
Data, prepared arrays and `.pt` checkpoints stay outside Git. They regenerate from
the versioned Code AI, env, recipe, seed and dependency lock; no download is needed.

Git contains the generator, training/export code, reference checksums, results,
TensorBoard events, and **one deployment ONNX**:

- `models/nn-policy/policy-mlp-256-v1.onnx`: **552,407 bytes**, 137,729 parameters.
- Best checkpoint: epoch **5**, selected by validation cross-entropy.
- Test action agreement: **89.36%**. Against Code AI: **462/1,000** wins.
- SHA-256: `5b98061d4188c116080eb6784c6378536a89e0b3c1db333df88217379e4dde13`.

Reproduction does not overwrite the committed web model. Publish a deliberately
selected rerun with:

```sh
.venv/bin/python training/publish.py --root artifacts/nn-policy-256 --model 256
node scripts/check.cjs
.venv/bin/python -m unittest discover -s tests -p 'test_*.py'
```

The five-size experiment remains in Git tag `nn-policy-experiments-20261024`.
Its metrics and curves remain in `docs/experiments/nn-policy-v1/`; non-selected
ONNX files are removed from the current deployment directory.

## TensorBoard and browser

```sh
.venv/bin/tensorboard --logdir artifacts/nn-policy-256/tensorboard --port 6006 --host 127.0.0.1
.venv/bin/python -m http.server 59140 --bind 127.0.0.1
```

Open `http://localhost:59140/`, then **Settings → Preferences → Opponent → NN AI**.
Code AI remains the default. Inference runs in a Web Worker, with a Code AI fallback.
The model is 0.55 MB; the separately cached, vendored WASM runtime is about 14 MB.

After training stops, open `http://localhost:59140/training/profile.html` and click
**Run profile**. For a different artifact folder, append `?run=nn-policy-256-rerun`.
The harness checks parity and measures 56, 220 and 512 candidates. The last is a
synthetic stress test; the dataset maximum was 227. Timings exclude downloads,
feature extraction and the game's 400 ms thinking delay. Physical phone latency
has not been measured.

Earlier runs can be viewed with `?run=nn-policy`. Raw TensorBoard events are also
versioned under `docs/experiments/nn-policy-v1/tensorboard/`.
