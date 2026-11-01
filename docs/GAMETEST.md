# Structured actions v2 · gametest

Recorded 2026-11-01 on the `unify-action-space` branch. Rules remain Standard
1.0.0. GameCore receives one complete move; token selection is not a game turn.

## Coverage and evidence

| Check | Result |
| --- | --- |
| Structured vs legacy JS | 32 games, 1,081 states, 235,110 prefix checks; exact saved-state/RNG parity |
| Move grammar | Three/four/five-card plays, wild bombs, all five swap destinations, skip/stop; duplicate cards, invalid bombs and partial moves rejected |
| Match lifecycle | 8 full 2-to-A matches, 90 completed games, 3,124 decisions; restore and legacy parity after every move |
| Ace reset | 8 sequences covering both seats and four round positions: third failed own-A resets to 2; rival's following own-A win ends the match |
| Python / Gym | 19 tests including legacy coverage, JS encoding fixtures, v1 Gym checker for game/match, invalid-action rollback, 2 complete Gym games and 8 adapter parity games |
| Legacy policy replay | 2,000 historical games; identical final-state hashes, keeping frozen Elo references valid |
| New NN evaluation | 3,000 games over three policy pairings, all completed with legal actions |
| Browser | Chrome 156: 8 games, 129 decisions; built-in v2 and Arena v2 loaders; Chinese/English at 390 and 1440 px |
| Interactive explorer | Attack, defense and swap examples; 3/4/5-card selection, conditional masks, undo, semantic output and horizontal-overflow checks |
| ONNX parity | 2,048 held-out token targets; PyTorch and ONNX masked choices all agree |
| Data reproduction smoke | Regenerated first 10 games: all 238 decision records identical to the saved training dataset |

The browser run is a desktop smoke test, including mobile-sized layouts. It does
not establish iPhone/Android runtime performance. Its 59 NN decisions measured
0.7 ms Worker round-trip p95, excluding model loading. The larger Node evaluation
measured 0.691 ms whole-decision p95 across 20,487 v2 decisions. Both are local
Apple M1 measurements. No mobile latency claim is made.

## Run the checks

Use Node 22 and Python ≥3.10. Install the package's Gym extra in a virtualenv:

```sh
npm ci
pip install -e './python[gym]'
npm test
python -m unittest discover -s tests -p 'test_*.py'
node tests/structured-match.cjs
npm run arena:submit -- --policy nn-structured-v2
```

`npm test` includes the JS grammar and full-match tests, existing UI/gameplay
checks, policy contracts, reference replay guards and release-workflow checks.
The additional match command above is useful when running that regression alone.
For the standalone grammar plus Python suite, run `npm run test:actions` with the
virtualenv active.

Optional real-browser test (install Playwright in a separate tools folder):

```sh
python -m http.server 59184 --bind 127.0.0.1
# In another terminal:
PLAYWRIGHT_MODULE=/path/to/node_modules/playwright \
CHROME_PATH=/path/to/chrome \
TEST_URL=http://127.0.0.1:59184 \
REPORT_PATH=/tmp/structured-browser.json \
node tests/structured-browser.cjs
```

The page explorer clicks real controls and the browser game loop executes the
same Worker and policy files used in play. This is automated verification, not a
claim of human playtesting.

## Saved reports

- [Browser smoke measurements](../models/structured-policy/browser-profile.json)
- [New policy evaluation and per-game records](../models/structured-policy/evaluation.json)
- [Legacy replay audit](../arena/legacy-v2-replay.json)
- [Arena submission receipt](../policies/entries/nn-structured-v2/validation.json)
- [Training/export evidence](../models/structured-policy/training.json)

The new checkpoint is a weaker baseline: 23.9% versus browser Hard Code AI,
compared with 42.6% for the legacy NN on these same new seeds. Passing gametest
establishes legal play and compatibility, not improved playing strength. Official
Elo is still pending release evaluation; historical results are unchanged.
