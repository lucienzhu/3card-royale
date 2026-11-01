# Cross-surface consistency audit · 2026-11-02

Local audit of `unify-action-space`, based on game commit `69492ec` and the
corresponding article branch `codex/structured-policy-blog` at `685a974`, with
the documentation and figure corrections saved alongside this report.
Rules, weights and rating results were not changed by this audit.

## Coverage

| Surface | Result |
| --- | --- |
| Playtest | Rules, seeds, saves, onboarding, touch-selection logic, replays, PNGs, AI routing and fallback checks passed. Hard matched the original policy across 100 games and 2,550 decisions. |
| Action protocol / Gym | JavaScript grammar checked 235,110 prefixes across 1,081 states; eight full matches completed. All 21 Python tests passed. Whole-move scoring retained 70 identical ONNX decisions through the shared protocol. |
| Browser | Chrome 156 completed eight games / 129 decisions, including 59 built-in autoregressive decisions. Arena loading and 17 scorer parity cases passed. |
| Public pages | About, Identity and Arena: 48 combinations of Chinese/English, light/dark and 320/390/768/1440 px; no page overflow, runtime errors or missing translations. Probability and Design System: 16 additional combinations at 320/1440 px. |
| Blog | Chinese/English article fragments checked at four widths; all images loaded. Mobile tables scroll within the article. Five generated figures checked for text outside their SVG bounds. |
| VI / Design System | Canonical original flower geometry, approved 80% flower / 130% centers, flat colors, shared navigation and tokens verified by the repository checks and browser inspection. |
| GitHub introduction | Repository description and homepage URL checked. Both READMEs now describe the current opponents, shared protocol and training routes. |
| Training / Arena | Scoring and autoregressive recipes, tensor interfaces, checkpoint selection, deployment routes, benchmark cells and leaderboard records cross-checked. Both checkpoints use behavior cloning; reward-trained RL is future work. |

## Corrections

- Documented built-in NN AI as the autoregressive checkpoint and whole-move
  scorers as Arena options.
- Updated the Gym inference example to submit a complete action through
  `StructuredRoyaleEnv`; executed it with the checked-in scoring ONNX.
- Distinguished the 65-token conditional mask from internal candidate padding.
- Consolidated bilingual article evaluation and refreshed architecture,
  training, win-rate, card-zone and design figures.
- Aligned difficulty documentation with the current same-seed benchmark.
- Clarified that the evaluation command loads registered checkpoints. Newly
  trained weights require their own policy ID and validation receipt.
- Counted the two retained suites correctly: 19,000 + 11,000 games with 4,000
  shared records = 26,000 distinct games.

## Evidence and reproduction

- [`npm test` output](javascript-tests.txt)
- [Python test output](python-tests.txt)
- [Browser game / model report](browser.json)
- [48 public-page checks](public-pages.json)
- [Blog, SVG and 16 additional page checks](visuals.json)

Run `npm test` and `python -m unittest discover -s tests -p 'test_*.py'` with
Node 22 and the Gym dependencies installed. The browser command and environment
variables are documented in [GAMETEST](../../GAMETEST.md#run-the-checks).

Existing 19,000-game and 11,000-game reports were validated against their
records and hashes, not rerun. No full training run was repeated. Browser
timings are local Apple M1 measurements, not phone benchmarks. Mobile checks
use desktop Chrome viewports; no physical iPhone/WeChat test was performed.
Blog layout checks rendered the article fragments and local figures, not a
full Jekyll site build. These changes are local and have not been deployed.
