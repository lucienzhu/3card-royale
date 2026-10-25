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

## Elo

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
sandboxes**; Node plugins can access the host. There is deliberately no privileged
auto-evaluation action for untrusted PRs.

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
