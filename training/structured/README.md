# Autoregressive policy · reproducible baseline

This is one autoregressive experiment, not the required architecture for `actions-v2`. Whole-move scorers and code policies use the same action protocol; see [model profiles](../../docs/ACTIONS.md#model-and-compatibility).

Schema `actions-v2`; rules 1.0.0. 336 state + 396 prefix → 256 → 128 → 65. The teacher is frozen **SDK Code AI**, not browser Hard. The policy imitates complete actions through masked, teacher-forced token predictions; each decision has total weight one.

```sh
node training/structured/collect.cjs
python -m venv .venv
. .venv/bin/activate
pip install -r training/structured/requirements.txt
python training/structured/train.py --epochs 40
tensorboard --logdir artifacts/structured-v2/tensorboard
node training/evaluate-baselines.mjs --games 1000 --seed-start 91000000 \
  --output artifacts/neural-baselines
```

The collection command defaults to 10,000 games and seed 20261101. Start levels mix 2, varied levels and Ace to cover 3/4/5-card wild combinations. Whole games use `game_id % 10`: 0 validation, 1 test, 2–9 training. Both seats stay together. 8,000/1,000/1,000 games yield 252,906 decisions and 988,571 token targets. No game exceeded the safety bound.

The deterministic gzip is **12,665,068 bytes**, above the 10 MB repository threshold, so data is regenerated instead of checked in. SHA-256: `a7d4da6f5c218c9cfb00c39240cd6bd6578ec13e90caf7174b00a8f29c524315`. `dataset.json` contains source hashes and counts. The generator builds complete legal prefixes using the same actions module as the browser. Teacher never declines a swap: skip/stop have no positive demonstrations, a limitation for future reward training.

Training: CPU, four threads, deterministic PyTorch, seed 20261101, batch 1024, AdamW 0.001, weight decay 0.0001, gradient clipping 5, 40 epochs. Best validation loss selects **epoch 16**, before test evaluation. Train/validation curves are in TensorBoard and `history.json`. Recorded environment: Python 3.9.6, PyTorch 2.8.0, NumPy 2.0.2, Apple M1. Python 3.9 is the recorded training environment; the SDK package supports Python ≥3.10. Cross-platform float/ONNX byte identity is not promised; pin the recorded environment for closest reproduction.

Saved ONNX: **228,929 parameters, 916,663 bytes**. SHA-256 `16e452b48837e6fa681216c13279bbe500997c97b86f56efa19e449b1699baf3`. Export uses opset 17, dynamic batch, FP32. On 2,048 held-out token targets, PyTorch and ONNX have identical masked choices; max logit difference 0.00001145. Test token agreement is 90.44%, **not whole-action accuracy**. Test loss 0.266315.

## Playing strength

Each neural policy faces all six other public Arena entries. Every matchup uses
500 paired seeds, swapped seats, balanced first movers and level-2 starts:
**11,000 distinct games**, all complete, with no illegal actions or truncations.

| Opponent | Whole-move scoring · 256 → 128 | Autoregressive · 256 → 128 |
| --- | ---: | ---: |
| Code AI (Hard) | 426/1,000 · 42.6% | 239/1,000 · 23.9% |
| SDK Code AI | 455/1,000 · 45.5% | 266/1,000 · 26.6% |
| Easy · 64 | 559/1,000 · 55.9% | 366/1,000 · 36.6% |
| Whole-move scoring · 512 → 256 | 505/1,000 · 50.5% | 298/1,000 · 29.8% |
| Random | 1,000/1,000 · 100.0% | 997/1,000 · 99.7% |

Direct matchup: autoregressive vs whole-move scoring **288/1,000 (28.8%)**.
[All reports, hashes and reproduction](../../docs/experiments/neural-baselines/README.md).

The [complete benchmark](../../docs/experiments/complete-baseline/README.md) also
measures five scoring widths and all code baselines against both Code AI opponents
on the same seeds. Its 19,000 games include 4,000 reproduced games from this suite.

**On this matched seed cohort, the autoregressive checkpoint has the lower win rate.** Representation clarity does not establish playing strength; teacher-forcing agreement also does not measure autoregressive sequence errors. Future experiments should evaluate free-running action agreement, improve card encodings, and train from rewards. The independent Arena rating is **provisional Elo 1237**, from 14/60 wins against the three fixed references. The whole-move scorer remains the fixed 1440 reference. Those rating seeds and opponents differ from this evaluation.

Maximum opponent-batch whole Worker decision p95 for the autoregressive policy is **0.958 ms** across 62,427 decisions on Apple M1 / Node 22 / single-thread WASM. Includes encoding and all autoregressive calls; excludes initial model load. It is not a browser/mobile benchmark.

Checked-in artifacts are in `models/structured-policy/`; the identical ONNX is in `policies/entries/nn-structured-v2/` for Arena integrity checks. Local `.pt`, data and TensorBoard files stay under ignored `artifacts/`. After deliberately replacing a checkpoint, update both artifacts, byte/hash manifests, receipts and evaluation; published policy IDs must be immutable.

## Game and browser checks

See [gametest evidence and commands](../../docs/GAMETEST.md). The saved browser
report is `models/structured-policy/browser-profile.json`; its short smoke run is
not a mobile performance benchmark.

To rebuild the bilingual Blog figures, install the optional `matplotlib==3.11.2`
in a Python ≥3.11 environment and run:

```sh
python training/structured/figures.py /path/to/blog/img/blog/3card-royale \
  --cjk-font /path/to/ChineseFont.ttc
```

This reads the checked-in 40-epoch history, not an illustrative loss curve.
