# Arena · season public-game-v1

Product release **1.1.0**. Rules remain **1.0.0**; historical NN experiments remain
unchanged. [Policy submission contract](../policies/README.md) · [中文](../policies/README.zh-CN.md)

## Evaluate locally

Node 24, no extra install required: the repository includes the pinned ONNX Runtime
Web/WASM used by the website. Pure JS and NN use the same workers and observation
encoder. No Python inference backend mismatch is hidden in the results.

```sh
npm run arena:validate
npm run arena:test
node arena/evaluate.mjs --games 200 --output arena/results/season-1.json
# Quick smoke test, not official leaderboard output:
node arena/evaluate.mjs --games 4 --policies random-v1,nn-256-v1 --output /tmp/smoke.json
```

Every unordered pair plays 200 independent **small games**, starting at levels
`[2,2]`, rules 1.0.0. Each direct core seed plays twice with policy seats swapped;
the first attacker alternates across seed pairs. Games must be a multiple of four.
The host chooses separate deterministic policy RNG seeds, never exposes the deal
seed or RNG state, and recreates policy instances at each game. Recorded hashes
pin engine, encoder, policy, evaluator and rating source. The final state hash
supports reproducibility without putting hidden game states in policy inputs.

All actions use the SDK's canonical list and order. The Code AI adapter uses the
browser's original `choosePlay` / `chooseRefresh` heuristic on a reconstructed
**public** view; it does not receive the game. Its action application is canonical
SDK order, so this is a new experiment, not a relabeling of earlier table-engine
statistics. The legacy default difficulty routes are unchanged.

No policy gets a hidden-hand advantage; **Godlike is not a contestant**. Browser
play never writes ratings. Load failures, invalid actions, 1-second decision
limits or 4,096-step game limits abort an evaluation with no partial report and
no fallback AI. A failed entrant must be fixed or withdrawn before the official
round-robin rerun. Local execution timing is recorded with CPU, Node version and
single-thread WASM backend, not marketed as mobile latency.

## Published season-1 Elo (historical)

Start everyone at 1500; K=24 per game. Expected score is
`1 / (1 + 10 ** ((opponentElo - elo) / 400))`.
Process blocks by seed then alphabetical pair ID. Both games in a seat pair use
the same pre-block ratings: `delta = 2 * K * (meanScore - expected)`; apply equal
and opposite deltas. Finally shift everyone by the same amount to anchor
`code-table-v1` at 1500. This preserves pairwise differences.

This is sequential Elo, not a confidence interval or proof of strength. Changing
opponent pool, schedule, K or ordering changes ratings: rerun the entire season
when admitting a policy. Do not paste historical win rates into this leaderboard.
The raw paired games and every policy's wins/losses accompany the scores. Fewer
than 200 games is provisional; having more is still not a significance test.

The first five policies play 2,000 games in total (10 pairs × 200), each entrant
plays 800. Win rate is across its opponents, not only against Code AI. Never mix
privileged information or different rule / episode contracts into this season.

## Reviewing a PR

`arena:validate` checks manifest schema, registry paths, size and hashes without
importing policy code. It is a metadata check, not a malware detector. Review a
JS submission before importing it. **Workers and timeouts are not security
sandboxes**; Node plugins can access the host. PR smoke tests run in a credential-free, network-disabled container with read-only
source, 2 CPUs, 2 GiB of memory and a job timeout. They never publish ratings.
A passing smoke test checks execution, not security or playing strength.

For unfamiliar code, review then use an isolated checkout and a credential-free
container with networking disabled. For example, from a disposable checkout:

```sh
mkdir -p /tmp/royale-arena-output
docker run --rm --network none --read-only --cap-drop ALL --security-opt no-new-privileges \
  --memory 2g --cpus 2 --pids-limit 128 --tmpfs /tmp:rw,noexec,nosuid,size=64m \
  -v "$PWD:/app:ro" -v /tmp/royale-arena-output:/output -w /app node:24-bookworm-slim \
  node arena/evaluate.mjs --games 200 --output /output/season.json
```

Use a locally available official image (pin its digest for reproducible runs).
No SSH agents, cloud tokens, home-directory mounts or Docker socket. Container
setup is separate from web deployment and was not required for evaluating the
reviewed in-repo baseline policies. Python/other source should be ported with
Codex/Claude Code and checked with saved reference decisions before entry.

## Static deployment

GitHub Pages serves `arena.html`, `policies/registry.json`, reviewed entry files,
`arena/results/season-1.json` and the existing ONNX runtime. No server, database,
API token or background inference service is needed. The web uses single-thread
WASM, avoiding a dependency on cross-origin isolation / SharedArrayBuffer. A
custom header configuration is not required for this mode.

- [GitHub Pages is static hosting](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)
- [Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)
- [ONNX Runtime Web deployment](https://onnxruntime.ai/docs/tutorials/web/deploy.html)
- [ONNX runtime thread configuration](https://onnxruntime.ai/docs/tutorials/web/env-flags-and-session-options.html)

The artifact cap is a project policy, not Pages' maximum file size. As the catalog
grows, keep the site below Pages limits; larger future collections can store
versioned assets elsewhere with explicit CORS / integrity support. Browser-only
matches are for play and cannot authoritatively award Elo.

The website combines the leaderboard, RL environment, baseline checkpoint and
submission guide at [AI Arena](../arena.html). Old `rl.html` links preserve
language and section anchors. Historical experiments are expandable and remain
distinct from season Elo.

## CI checks

The `Arena policy checks` workflow validates manifest hashes and plays each entry
against table Code AI in four small games, covering both seats and first movers.
It runs on PRs touching policies, Arena, the engine/SDK or the WASM runtime.
Illegal actions, decision timeouts and unfinished games fail the check.

A manual workflow dispatch or maintainer-added `arena-benchmark` PR label now
runs a **quick provisional rating**, defaulting to 40 games per pair: 400 games
for five policies, 160 per entrant. Manual dispatch can instead choose 20 per pair
(200 total). Every seed is played twice with seats swapped, and first attack is
balanced. Ordinary unlabelled PRs only run the four-game validity checks.

Reports capture elapsed time, container peak memory, CPU quota, Node/CPU details,
source hashes and the resolved Docker image digest. Artifacts expire in seven days.
The container receives no credentials or network access; the workflow token is
read-only. Workflow edits still need review. Neither job updates official Elo.

### Quick provisional Elo

```sh
npm run arena:rate
# Smaller initial sample:
node arena/ci.mjs --mode rating --games 20 --output /tmp/royale-arena-rating
```

`rating.json` uses `batch-elo-v1`, distinct from the frozen season-1 sequential
ratings. Code AI is fixed at **1500**. The expected win probability is:

`P(A wins B) = 1 / (1 + 10 ** ((R_B - R_A) / 400))`.

Fit all recorded wins and losses at once using the Bradley–Terry likelihood. Each
non-anchor rating has a weak Gaussian prior centered at 1500, standard deviation
400 Elo: minimize negative log likelihood plus
`sum((R_i - 1500)^2 / (2 * 400^2))`. This declared smoothing keeps all-win/all-loss
scores finite; it is not an extra played game. No online K factor or processing
order affects this estimate. Opponent strengths are fitted jointly, rather than
converting an overall win percentage into Elo.

The report includes the method, source hash, actual wins/losses and per-policy
sample counts. Fewer than 200 games per entrant remains **provisional**. This flag
is a sample-count convention, not a confidence bound; even larger samples do not
prove small differences in strength. With the default five-policy / 400-game run,
every score is provisional. Do not compare a new batch score directly with the
old sequential Elo; any future official migration must refit the whole field.

`raw-games.json` retains the evaluator's original game records and historical
rating fields for traceability; use **`rating.json`** for the new estimate. The
website's published season report is unchanged. A maintainer reviews the complete
report before any leaderboard publication; CI never commits its own results.

[Verified 400-game run](https://github.com/lucienzhu/3card-royale/actions/runs/40349419761)
([saved rating](benchmarks/linux-2026-10-26/quick-rating/rating.json)):
11.54 seconds including validation and fitting, 311.5 MiB peak container memory,
2 CPU / 2 GiB limit, Intel Xeon Platinum 8573C, Node 24.22.1 / Linux x64.
All 400 game records match the corresponding subset of the historical run.

| Policy | Provisional batch Elo | Games |
| --- | ---: | ---: |
| Code AI (anchor) | 1500 | 160 |
| SDK Code AI | 1479 | 160 |
| NN 256 → 128 | 1440 | 160 |
| Easy 64 | 1387 | 160 |
| Random | 567 | 160 |

### Measured Linux capacity

[GitHub run](https://github.com/lucienzhu/3card-royale/actions/runs/40347273843) ·
[Saved summaries, raw games and verification](benchmarks/linux-2026-10-26/verification.json)

On 2026-10-26, `ubuntu-24.04`, Node 24.22.1 / x64, inside a container capped at
**2 CPUs and 2 GiB**:

| Check | Games | Evaluation + validation | Peak container memory | Entire job |
| --- | ---: | ---: | ---: | ---: |
| Submission smoke | 16 | 1.93 s | 158.5 MiB | 11 s |
| Full round robin | 2,000 | 47.17 s | 360.3 MiB | 60 s |

The jobs ran on different AMD EPYC hosts (7763 and 9V74); these are measured runs,
not guaranteed timings. Job duration includes checkout, image preparation and
artifact upload, but excludes queue time. `memory.peak` includes all container
processes and charged cache, not just one policy. All 2,000 game records, including
final-state hashes, exactly match the saved local season; policy and source hashes
also match. Official Elo was not rewritten.

Current capacity is sufficient for the five-policy season. With 200 games per
pair, N policies require `100 × N × (N − 1)` games; future, slower strategies may
also increase time per game. The 2,000-game run was a capacity check; routine
ratings now use 400 games by default. Keep ordinary PR checks short and request
rating runs after review. CI success is an execution check, not admission to the
ladder. Automatic publication of Elo remains disabled.
