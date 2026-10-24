# NN Policy v1 · 2026-10-24

Experiment snapshot: Git tag `nn-policy-experiments-20261024`. Game rules remain 1.0.0.
The selected web model is **256/128**. Reproduce it with `training/reproduce.py`;
the comparisons below preserve all five historical experiments.
Full rerun evidence: [reproduction-256.json](reproduction-256.json). All 100 data
shards and the exported 256/128 ONNX match the references byte-for-byte.
Source base: `947d5f2e61ffa5d74b10d6ac87b5bc7567088fbc`.

## Dataset

Two SDK Code AIs played **10,000 complete single-game episodes** through the
Gymnasium environment. Both seats were recorded: **252,859 decisions** and
**19,789,638 legal candidate rows**. No truncated episode retries were needed.
Collection seed: 20261024. Collection took 169.47 seconds on the local machine.

One third of games start at level 2, one third at random levels, and one third
with a player on Ace. First movers alternate. These are environment reset
options, not rule changes. Test matches use normal level-2 starts.

Split by whole game ID: 8,000 training games / 202,325 decisions; 1,000 validation
games / 24,950 decisions; 1,000 test games / 25,584 decisions. Both seats stay in
the same split. IDs modulo ten select validation (0), test (1), and training
(2–9). There is no decision-level split across the same game.

Compressed shards use float16 storage; model operations and ONNX weights are
float32. Public current-state features include hand, wounds, visible opponent
wounds, discard, current played cards and game metadata. Hidden hands, deck
order, seed, RNG and historical events are excluded.

## Model and training

`observation (336) + legal candidate (72) → MLP H1 → H2 → score`

Two ReLU hidden layers and a scalar output. Shared scoring supports variable
legal action counts; illegal/padded actions are masked out. Features retain the
existing environment's public card evaluation fields. There is no recurrence,
look-ahead search or reward learning.

PyTorch, AdamW (lr 0.001, weight decay 0.0001), batch 128, ten epochs, CPU with four
threads. Each size starts with seed 20261024. The checkpoint with the lowest
validation cross-entropy is exported to FP32 ONNX opset 17. Test metrics are
reported once after checkpoint selection. Accuracy is agreement with Code AI's
chosen action, not game win rate; equivalent tied actions can count as errors.

![Train and validation curves](train-val.png)

Numeric summaries are in [training.json](training.json), per-epoch JSON files,
and the original [TensorBoard events](tensorboard/). Start TensorBoard against
this folder's `tensorboard/` directory to inspect the saved runs without
regenerating samples.

## Evaluation and profiling

[evaluation.json](evaluation.json) contains 1,000 seeded games per
model against Code AI, with equal seat counts and balanced first movers. Paired
seeds swap the NN's seat. These are held-out game seeds, not training samples.
The reported Wilson intervals treat individual games as trials; paired-game
correlation is not accounted for, so small differences are not evidence of a
strength improvement.

[browser-profile.json](browser-profile.json) records Chrome on this Mac, WASM,
one thread, FP32. Each candidate count gets three warmups and 100 timed runs.
56, 220 and 512 candidates cover ordinary and large action lists. The large
lists repeat public candidate rows to isolate inference cost. Timing excludes
network download, feature extraction and the UI's 400 ms thinking delay. Cold
load includes local file access and session initialization, not a mobile-network
benchmark. No physical iPhone measurement has been made.

The browser harness also compares all model logits and chosen actions on twelve
real positions with PyTorch/ONNX, then checks the deployed Web Worker's model
version and all twelve actions. Python/JavaScript input and teacher parity
checks cover 55,584 values. See `tests/nn-policy.cjs` and `training/parity.py`.

## Playing and reliability

The current browser offers **Easy / Medium / Hard** in Settings → Preferences →
Difficulty, using Easy AI / NN AI / Code AI. New visitors start on Easy (64
candidates, deck-only redraws); it wins 36.1% vs Code and 44.1% vs NN over 1,000
games each. [Difficulty records](../difficulty-v1/evaluation.json). Code AI uses
the same visible-information SDK policy used to generate samples. NN AI uses
the 256/128 hidden-layer model. Unsupported older rules keep their original policy.

Models and runtime are hosted as static files from the same origin. Inference
runs in a Web Worker. On load failure, timeout or invalid logits, the game falls
back to Easy AI and shows a short status message. Failed loads back off for a
minute; selecting NN AI again retries immediately. Switching modes or replacing
a game invalidates in-flight results, preventing stale actions.

The model is below 5 MB; the separately cached runtime is about 14 MB raw. First
NN selection therefore downloads more than the model size alone.

See [reproduction instructions](../../../training/README.md). The independent
local experiment folder retains raw data and checkpoints; Git contains the
pipeline, the selected deployment weights, metrics, curves and TensorBoard events.
Raw data is 118.2 MB; tar.gz is 112.5 MB, so data is regenerated from fixed seeds.

## Comparison

See [the measured results table](RESULTS.md). In collected data, attacks have a
median of 84 candidates and defenses 56; both have a p95 of 220. The observed
maximum is 227. The 512-candidate benchmark is a synthetic capacity stress test.

The expanded architecture uses **256 → 512** hidden units, independently chosen
rather than automatically halving the first layer. It has 236,801 parameters,
compared with 137,729 for 256/128 and 340,993 for 512/256. This changes the amount
of computation and capacity allocated to each layer without changing inputs,
legal-action handling or the teacher.

All five models use the same collected data, splits, optimizer, seed and ten-epoch
schedule. Checkpoints are selected by validation loss. See RESULTS.md for the
updated action agreement, game outcomes and same-session browser timings. Small
win-rate differences in 1,000 games do not establish a strength improvement.
The 256/512 experiment won 465/1,000 evaluation games versus 462/1,000 for 256/128 and 450/1,000 for
512/256. Test action agreement is 89.28%, with a 948,695-byte ONNX file. Both
browser timing runs are retained in this folder because their timings varied;
RESULTS.md documents the repeat run and the first run's slower measurements.
Production selects the smaller 256/128 model (552,407 bytes). The alternative
weights remain in the experiment tag rather than the deployment directory.

## Uniform random baseline · 2026-10-24

The additional **uniform legal-action** policy won **1/1,000 games (0.1%)**
against the same Code AI: 1 win from seat 0, 0 from seat 1, no truncations and no
illegal actions. The individual-game Wilson 95% interval is approximately
0.018–0.564%; as above, it does not account for paired-game correlation.

It samples every masked legal candidate with equal probability, including swaps
and declines. It has no training data, weights, card evaluation or look-ahead.
The deal seeds, seats, first attackers, level-2 starts and episode limits match
the five NN evaluations. A separate PCG64 stream per game controls policy choices.

[Raw episodes and protocol](random-baseline.json) ·
[Evaluator](../../../training/evaluate_random.py) ·
[Reproduce](../../../training/README.md#uniform-random-baseline)

Two full runs produced byte-identical reports. ONNX size and neural inference
latency are not applicable; random sampling was not browser-profiled.
