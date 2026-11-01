# Complete policy benchmark

Ten policies evaluated against browser Code AI and SDK Code AI under one protocol.
SDK's self-match is omitted: **19 pairs × 1,000 games = 19,000 games**, all completed
without illegal actions or truncation. Code AI is the browser's Hard opponent;
SDK Code AI is the fixed imitation-learning teacher. Their results are separate.

| Policy | vs Code AI | vs SDK Code AI | Complete-decision p95, ms |
| --- | ---: | ---: | ---: |
| Random | 0/1,000 · 0.0% | 0/1,000 · 0.0% | 0.214 |
| Easy · 64 | 341/1,000 · 34.1% | 356/1,000 · 35.6% | 0.588 |
| SDK Code AI | 480/1,000 · 48.0% | Self-match omitted | 0.660 |
| Whole-move scoring · 64 → 32 | 419/1,000 · 41.9% | 478/1,000 · 47.8% | 0.734 |
| Whole-move scoring · 128 → 64 | 425/1,000 · 42.5% | 444/1,000 · 44.4% | 0.876 |
| Whole-move scoring · 256 → 128 | 426/1,000 · 42.6% | 455/1,000 · 45.5% | 1.322 |
| Whole-move scoring · 256 → 512 | 436/1,000 · 43.6% | 447/1,000 · 44.7% | 2.536 |
| Whole-move scoring · 512 → 256 | 403/1,000 · 40.3% | 458/1,000 · 45.8% | 2.714 |
| Autoregressive · 256 → 128 | 239/1,000 · 23.9% | 266/1,000 · 26.6% | 0.873 |
| Godlike · open hand | 670/1,000 · 67.0% | 675/1,000 · 67.5% | 18.119 |

Godlike receives the current rival hand, but not deck order or discard history.
It is an extra-information control and **does not enter the public-information
ladder**. The code policies have no ONNX artifact; their model size is not applicable.

## Protocol

- Rules 1.0.0; individual games starting at level 2, not complete 2-to-A matches.
- 500 seeds, **91,000,000–91,000,499**, each played with swapped seats. First attacker
  alternates across seeds, balancing both policies' first moves.
- Pair IDs are sorted. Game `i` uses `seedStart + floor(i/2)`, left seat `i % 2`,
  and first attacker `floor(i/2) % 2`.
- Each policy's RNG resets per game/seat using
  `(0x9e3779b9 ^ Math.imul(i + 1, 2654435761) ^ seat) >>> 0`.
- Production policy loading, encoding and action validation are used. A game
  aborts on an illegal action, a 1,000 ms decision timeout or 4,096 decisions.
- All checkpoints were fixed before evaluation. The three additional scoring
  artifacts are the original validation-selected weights, not retrained models;
  see [artifact provenance](../../../training/evaluation-models/README.md).

Repeated seeds control deals and seats. Paired games are not independent Bernoulli
samples; small differences in win rate do not establish a policy ranking.
This cohort has already informed the displayed comparisons and is not an untouched
test set for further model selection.

## Timing

Apple M1, macOS arm64, Node 22.14.0, ONNX Runtime Web 1.30.0, single-thread WASM.
Pairs run sequentially, with one Worker per policy. The clock covers the complete
decision inside the Worker: observation encoding, all inference calls, and action
selection. Initial model loading and inter-thread messaging are excluded.

Each table value is the **maximum of the two opponent-batch p95 values**, not a
pooled percentile; SDK has one batch. The p95 is the sorted latency at index
`floor(0.95 × decisions)`. These are local measurements, not browser or mobile
benchmarks. Recorded suite wall time: **414.4 seconds**.

## Evidence and reproduction

[summary.json](summary.json) contains model manifests, source hashes, report
SHA-256 digests, win counts and latency. The 19 linked raw reports preserve every
game's seed, seat, first attacker, winner, decision count and final-state digest.
Weights, dependency versions and manifests are retained in this repository.

```sh
npm ci
node training/evaluate-benchmark.mjs --games 1000 --seed-start 91000000 \
  --output artifacts/complete-baseline
node tests/complete-benchmark.cjs
node tests/rl-page.cjs
```

Use Node 22.14.0 to reproduce. Outcomes and final-state hashes should match;
timestamps and latency depend on the environment. The tests verify the committed
reports, hashes and page values. For a smoke run, use `--games 4` and a separate
output directory. `--subjects nn-64,nn-128` restricts the subjects.

The [two-model opponent suite](../neural-baselines/README.md) adds matchups against
Easy, Random, scoring 512 → 256 and each other. Its 4,000 overlapping games reproduce
**every outcome and final-state hash** in this benchmark. Together the two suites
cover **26,000 distinct pair/seed/seat games**, not 30,000 independent samples.

Benchmark win rates do not change Elo. [Official standings](../../../arena/results/leaderboard.json)
come from the separate fixed-reference protocol; the autoregressive submission's
60-game [rating receipt](../../../arena/results/reference-elo-v1/nn-structured-v2.json)
is retained separately.
