# Neural policy evaluation

Whole-move scoring and autoregressive policies are separate submissions under the
same **actions-v2** protocol. Both checkpoints are fixed; no retraining or parameter
selection used this evaluation.

## Playing strength

Each policy faces all six other public Arena entries. Every pair containing either
model runs **1,000 small games**, using seeds **91,000,000–91,000,499**, swapped seats,
balanced first movers and level-2 starts under rules 1.0.0. The mutual matchup is
counted once: **11 pairs, 11,000 distinct games**; each focal policy plays 6,000.
All games completed, with **zero invalid actions and zero truncations**. Godlike
is excluded because it receives private opponent cards. These are individual games,
not full 2-to-A matches.

| Opponent | Whole-move scoring · 256 → 128 | Autoregressive · 256 → 128 |
| --- | ---: | ---: |
| Code AI (Hard) | 426/1,000 · 42.6% | 239/1,000 · 23.9% |
| SDK Code AI | 455/1,000 · 45.5% | 266/1,000 · 26.6% |
| Easy · 64 | 559/1,000 · 55.9% | 366/1,000 · 36.6% |
| Whole-move scoring · 512 → 256 | 505/1,000 · 50.5% | 298/1,000 · 29.8% |
| Random | 1,000/1,000 · 100.0% | 997/1,000 · 99.7% |

Direct matchup: autoregressive vs whole-move scoring, **288/1,000 (28.8%)**;
whole-move scoring wins the other **712/1,000 (71.2%)**. Repeated paired seeds
control seats and first movers; small differences between rates do not establish
strength ordering. This cohort was already used in the three-policy comparison;
the reproduced games are not independent additional evidence.

## Latency

| Model | Complete decisions | Maximum opponent-batch p95 |
| --- | ---: | ---: |
| Whole-move scoring · 256 → 128 | 68,163 | 1.289 ms |
| Autoregressive · 256 → 128 | 62,427 | 0.958 ms |

Apple M1, macOS arm64, Node 22.14.0, ONNX Runtime Web 1.30.0 / single-thread WASM.
Pairs run sequentially in isolated subprocesses. Timings include observation
encoding and all inference calls for a complete Worker decision, excluding initial
model load. Values are **maxima of the six per-opponent p95 measurements**, not a
pooled percentile. They are neither mobile measurements nor the fixed-220-candidate
inference-only browser profile. Recorded suite wall time: 187.5 seconds.

## Reference Elo

Official Arena ratings use the unchanged `reference-elo-v1` protocol, independently
of this 11,000-game experiment: 20 games each against Code AI (1500), whole-move
scoring (1440), and Easy (1387). No all-pairs recalibration is required.

The autoregressive submission passed four validation games and completed all 60
rating games: **14 wins, 46 losses, provisional Elo 1237**. Per opponent: Code AI
5/20, Easy 6/20, whole-move scoring 3/20. Decision p95 maximum: **1.049 ms** across
608 decisions. The 64 games all completed without invalid actions. This rating
run used the same Apple M1 / Node environment; other leaderboard records retain
their own recorded CI environments, so cross-row latency is not a hardware-controlled
comparison.

The whole-move scorer is a **fixed reference** at Elo 1440. Its displayed record now
includes 80 games against rated submissions, with 60 wins (75.0%) and max p95
2.547 ms. Reference statistics describe different opponents from entrant statistics;
the headline win rates should not be used to rank policies. The ladder totals
**240 distinct rated games** across four submissions and three fixed references.

[Arena rating receipt](../../../arena/results/reference-elo-v1/nn-structured-v2.json) ·
[Leaderboard](../../../arena/results/leaderboard.json) ·
[Reference protocol](../../../arena/README.md)

## Reproduce and verify

Run with the recorded Node version and repository dependencies:

```sh
npm ci
node training/evaluate-baselines.mjs --games 1000 --seed-start 91000000 \
  --output artifacts/neural-baselines
node tests/neural-evaluation.cjs

node arena/reference-ci.mjs --rate --policies nn-structured-v2 \
  --output /tmp/royale-ar-rating --commit "$(git rev-parse HEAD)"
node arena/publish.mjs --input /tmp/royale-ar-rating/result.json \
  --commit "$(git rev-parse HEAD)"
```

`summary.json` links all 11 complete raw reports with SHA-256 digests, policy
manifests, source hashes, per-matchup wins and latency. Every game retains its seed,
seat, first mover, winner, decision count and final-state digest. Reproduction
should match outcomes and state digests; timestamps and timing are machine-dependent.
The evaluator's raw pairwise Elo fields are diagnostic only; **official standings
come exclusively from the separate fixed-reference rating reports**.

The SDK comparison gives the whole-move scorer 455/1,000 here. The separate SDK
seed cohort records 462/1,000; these are different seeds, not a checkpoint change.
Both raw cohorts remain available, and their counts must not be pooled.

The [complete benchmark](../complete-baseline/README.md) additionally measures all
five scoring widths and code policies against both Code AI opponents. Its 19,000
games overlap this suite by 4,000 games; all overlapping outcomes and final-state
hashes match. The two suites cover 26,000 distinct pair/seed/seat games in total.
