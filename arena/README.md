# Arena · Reference Elo

Product **1.1.0**, rules **1.0.0**, independent small games from levels `[2,2]`.
[Submit a policy](../policies/README.md) · [中文](../policies/README.zh-CN.md) · [Leaderboard](../arena.html)

## Local validation → CI → automatic publication

Node 24; the repository includes the browser's pinned ONNX Runtime / WASM.

```sh
npm run arena:validate
npm run arena:submit -- --policy your-policy-v1
# Commit policies/entries/your-policy-v1/validation.json with the policy.
# Optional local rating, using the same reference panel as CI:
npm run arena:rate -- --policies your-policy-v1
```

The local command plays **4 games against Code AI**, covering both seats and
first movers. Its receipt binds the policy manifest, reference panel and final
state hashes. CI independently replays the games and requires identical results
before rating. Missing or stale receipts fail the run. This verifies reproducible
play, not which computer produced a receipt. Review unfamiliar code before running it.

1. `Arena policy checks` validates metadata and replays each changed/new policy's
   four-game receipt on PRs and ordinary main pushes. It never rates or publishes.
2. Publish a GitHub Release, or run **Actions → Publish Arena → Run workflow** on
   `main`. This separate workflow rates pending policies, then publishes the board.
   Leave `policies` blank to reuse unchanged scores; specify IDs only to rerate them.
3. A separate trusted job checks the JSON and recalculates scores. It commits only
   `arena/results/leaderboard.json` and `arena/results/reference-elo-v1/<id>.json`.
4. The job explicitly requests a GitHub Pages build; the Arena reads the new JSON.

A merge alone does not award Elo. A new policy can appear on the existing Pages
site as **Unrated** until the publication workflow runs. Release selection compares
all registered policy manifests with the saved board, so it includes pending
policies from multiple merged PRs, not just the last commit. Releasing with no
pending policies plays zero games and rebuilds Pages using the existing scores.

Publish the current main revision. A release tag must contain the same source as
`main`; result-only commits may differ. If main code advances during rating, the
publisher stops instead of mixing two releases. Existing tags are never rewritten.
The workflow may be rerun after a failure. To check selection/rating locally:

```sh
npm run arena:release:check
# Explicit rerating of one policy:
npm run arena:release:check -- --policies your-policy-v1
```

Invalid actions, decision timeouts, incomplete games or mismatched receipts stop
publication. There is no substitute AI and no partial leaderboard. New or unmatched
policy manifests show **Unrated**. Re-running the same panel/seeds replaces an
entry's report; it does not accumulate repeated games. Browser play never awards Elo.

## Bounded work

At publication, each pending entrant plays **20 games against each of 3 frozen
references**: Easy, NN and Code AI. That is **60 rated games + 4 validation games**, independent of how many
policies are registered. N entrants require 64N games, not an all-pairs tournament.
Submission checks play only four validation games per changed/new entrant. Release
rating selects pending entries and reuses matching existing scores. Registry/manifest
bookkeeping remains O(N).

| Limit | Budget |
| --- | ---: |
| Validated policies per PR or main push | 3 |
| Rated policies per publication run | 10 |
| Each opponent batch | 60 seconds |
| Total match-running time | 180 seconds |
| Evaluation job | 5 minutes |
| Container | 2 CPUs / 2 GiB / no network |

Publish Arena accepts comma-separated policy IDs for explicit rerating. If more than
10 pending policies have accumulated, publish explicit batches of at most 10 first,
then run with a blank field to collect the remainder. Documentation or frontend
changes do not replay existing policies. Engine/runtime or reference changes require a new calibrated panel;
the source-hash check refuses to silently mix incompatible seasons. Already published
IDs are immutable: submit a new ID for changed code, weights or metadata.

## Reference Elo calculation

The fixed panel is in [reference-panel.json](reference-panel.json):

| Reference | Fixed Elo |
| --- | ---: |
| Code AI | 1500 |
| NN 256 → 128 | 1440 |
| Easy 64 | 1387 |

These coordinates come from the saved [400-game calibration](benchmarks/linux-2026-10-26/quick-rating/rating.json),
not 60 new games by each reference. The webpage labels them **Fixed reference** and
shows no new game count or win rate for them. Calibration itself is a small sample.

For entrant rating R and reference rating B:

`P(win) = 1 / (1 + 10 ** ((B - R) / 400))`.

Fit R to all 60 outcomes at once by minimizing binary negative log likelihood plus
`(R - 1500)^2 / (2 * 400^2)`. This declared Gaussian prior keeps all-win/all-loss
scores finite. An 80-step scalar bisection finds the unique optimum; rounding is
only for display. No K factor or game-order effect. Reference ratings never move
when an entrant joins. Every entrant faces the same panel and seed schedule.

**These are provisional reference scores**, not a claim that all head-to-head
matchups are captured. Fixed opponents can be exploited and miss counterstrategies;
public seeds can be overfit. Small Elo differences are not statistically established.
Use a separately versioned panel for a later season. Do not mix these scores with
historical round-robin or model-experiment scores. Godlike is excluded.

Each seed is played twice with swapped policy seats. First attack alternates between
seed pairs. Rating seeds start at 87000000; validation seeds at 88000000. The evaluator
records engine, encoder, policy and runtime hashes, decisions and final state hashes.
Latency on the board is the **maximum of the three opponent-batch p95 values**,
not a pooled p95 or a phone benchmark. Raw per-opponent reports retain CPU/Node details.

## Execution and publication boundary

PR policy code runs in a credential-free container: no network, read-only source,
non-root user, dropped capabilities and explicit time/memory/process limits. A Worker
alone is not a security sandbox. Do not use privileged `pull_request_target` execution.
Review both policies and workflow changes before merging. Local Node plugins can
access the host; use an isolated checkout/container for unfamiliar code.

Validation and release evaluation jobs have read-only repository permissions. Only
the publication workflow has a separate publisher with `contents: write` and
`pages: write`. It writes to `main` after a successful release evaluation, never on PRs.
It reads bounded JSON, checks hashes and recomputes scores without importing entrant
code. Artifacts expire after 7 days; per-policy raw results remain in Git.

GitHub Pages stays static: `arena.html`, the registry, reviewed JS/ONNX files and the
leaderboard JSON. The bot explicitly [requests a Pages build](https://docs.github.com/en/rest/pages/pages#request-a-github-pages-build)
after committing because ordinary pushes using `GITHUB_TOKEN` do not trigger new
workflow runs. Result-only changes do not schedule another evaluation.

## Historical results and measured Linux capacity

The original [season-1 report](results/season-1.json) is preserved: 2,000 games,
sequential paired Elo, K=24, Code AI anchored at 1500. Its evaluator and source
hashes remain frozen. `arena/ci.mjs` and `arena/rating.mjs` reproduce the later
all-pairs `batch-elo-v1` calibration; neither is the new submission workflow.

| Linux check | Games | Evaluation + validation | Peak container memory |
| --- | ---: | ---: | ---: |
| [Smoke](https://github.com/lucienzhu/3card-royale/actions/runs/40347273843) | 16 | 1.93 s | 158.5 MiB |
| [Full round robin](https://github.com/lucienzhu/3card-royale/actions/runs/40347273843) | 2,000 | 47.17 s | 360.3 MiB |
| [Calibration](https://github.com/lucienzhu/3card-royale/actions/runs/40349419761) | 400 | 11.54 s | 311.5 MiB |

Recorded on Ubuntu 24.04 / Node 24.22.1, with 2 CPU / 2 GiB limits. These are observed
runs, not latency guarantees. [Saved verification](benchmarks/linux-2026-10-26/verification.json).
Routine CI now uses the bounded reference schedule above.
