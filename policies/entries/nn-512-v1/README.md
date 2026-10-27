# NN · 512 → 256

By [@lucienzhu](https://github.com/lucienzhu) · MIT · `royale-policy-v1`.

The original 512/256 behavioral-cloning checkpoint from the 2026-10-24 experiment,
submitted as an optional Arena opponent. The default NN AI remains 256/128.

- Public observation: 336 features; each legal candidate: 72 features.
- Shared MLP: 512 → 256 → 1, ReLU, 340,993 parameters, FP32 ONNX opset 17.
- No memory, hidden cards or search. Highest-scoring legal candidate wins ties by index.
- Artifact: 1,365,463 bytes; SHA-256
  `6ecafc81a29aefcff3cb9922f9070db42dc84b81fe7c937fc08de1354b7d10de`.
- Selected by validation loss at epoch 5; test agreement with the SDK teacher: 89.57%.

This is byte-identical to `models/nn-policy/policy-mlp-512-v1.onnx` in tag
`nn-policy-experiments-20261024`. [Training metrics](../../../docs/experiments/nn-policy-v1/training.json),
[epoch history](../../../docs/experiments/nn-policy-v1/mlp-512-history.json) and
[TensorBoard events](../../../docs/experiments/nn-policy-v1/tensorboard/mlp-512/)
record the original experiment. Its historical 450/1,000 wins against SDK Code AI
are separate from the current fixed-reference Arena rating.

## Reproduce

Use Python 3.12.14, Node 24.19.0, and the pinned
[training dependencies](../../../training/requirements-lock.txt), from the repo root:

```sh
python3.12 -m venv .venv
.venv/bin/pip install -r training/requirements-lock.txt
.venv/bin/python training/collect.py --games 10000 --seed 20261024 --output artifacts/nn512/data
.venv/bin/python training/train.py --root artifacts/nn512 --widths 512 --epochs 10 --batch-size 128 --threads 4 --seed 20261024
```

These commands use the same 10,000 SDK Code AI self-play games, game-level split,
optimizer and checkpoint selection as the [original recipe](../../../training/README.md).
Floating-point differences across environments can change regenerated weights;
this committed artifact is the exact evaluated model.

## Submit and rate

```sh
node arena/validate.mjs
node arena/submit.mjs --policy nn-512-v1
```

The committed `validation.json` records four balanced games against Code AI.
PR CI replays those games. After merge, **Publish Arena** plays 20 games against
each of the three frozen references, then publishes the provisional Elo and raw
records to the leaderboard. No hand-entered rating is included in this submission.
