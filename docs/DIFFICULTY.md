# Three difficulty levels

[简体中文](DIFFICULTY.zh-CN.md) · [Evaluation records](experiments/difficulty-v1/evaluation.json)

Settings → Preferences → Difficulty:

| Difficulty | Policy | Behavior |
| --- | --- | --- |
| Easy | Easy AI | Limited attention; deck-only redraws |
| Medium | NN AI | Existing 256/128 behavioral-cloning checkpoint |
| Hard | Code AI | Existing heuristic over every legal action |

New visitors start on Easy. Saved `code` / `nn` preferences remain Hard / Medium.
Changing difficulty takes effect on the next AI decision, without redealing.
NN load/inference failure falls back to Easy with a visible notice; it never
silently raises the difficulty to Hard. Historical rule variants retain their
original Code AI and show a notice. Three-level play applies to Standard 1.0.

## How Easy is weaker

- Attack: sample at most **64** legal plays without replacement, then choose the
  best among them with the existing Code AI comparison.
- Defense: first exclude immediately losing plays **if a nonlethal defense exists**;
  sample at most 64 of the remaining plays and compare them in the same way.
- Swaps: use every opportunity to replace the lowest-priority card with a draw
  from the deck; never target a rival's card.

Easy understands hands and immediate danger, but misses combinations. It does
not adapt to a player's win rate or deliberately choose a
losing defense. Sampling is deterministic FNV-1a + xorshift32 from public
observation fields. The same observation gives the same move; the deck RNG is
untouched. It sees no hidden rival cards or deck order. This is a heuristic,
not a trained model or lookahead search.

[JavaScript](../sdk/easy-policy.js) and [Python](../python/threecard_royale/easy_policy.py)
share the policy and are checked against the same observations. No core rules,
feature schema, Code AI, or deployed ONNX weights changed. Rust/C++ retain their
existing Code AI; Easy is provided in JS and Python.

## Evaluation

Each pair: **1,000 completed small games**, 500 Gym evaluation seeds starting at
81,000,000, swapped seats, balanced first attackers, normal level-2 starts.
No illegal actions or truncated games.

| Policy | Opponent | Wins |
| --- | --- | --- |
| Easy AI | Code AI | **361 / 1,000 · 36.1%** |
| Easy AI | NN AI | **441 / 1,000 · 44.1%** |
| NN AI | Code AI | **462 / 1,000 · 46.2%** |

Easy is distinctly weaker in these games. Medium and Hard remain close: these
are practical labels, not an Elo scale or a prediction of human win rates.
The shipped policy is **easy-v2**, with a **64-play** limit. The earlier 48-play
version won 30.4% vs Code and 39.0% vs NN on these same evaluation seeds
([archived report](experiments/difficulty-v1/evaluation-48.json)). The limit was
changed after comparing 48 and 64, so these results are a reproducible comparison,
not an untouched test of the choice. A separate 120-game calibration, starting
at seed 82,000,000 with deck-only redraws, gave:

| Candidate limit | Wins vs Code AI |
| --- | --- |
| 24 | 16 / 120 · 13.3% |
| 32 | 24 / 120 · 20.0% |
| 48 | 34 / 120 · 28.3% |
| **64** | **44 / 120 · 36.7%** |

64 is an empirical difficulty setting, not a mathematical threshold or a proven
optimum. The opening eight-card hand has 56 three-card combinations, all of which fit
within 64; public wounds and valid four- or five-card plays can expand the pool
beyond that limit. Limiting attention lets Easy
miss strong plays while retaining coherent hand selection and a survival guard.
The [current calibration](experiments/difficulty-v1/calibration.json) and the
[initial half-skip experiment](experiments/difficulty-v1/calibration-initial.json)
are recorded separately. The prior uniform random
baseline won only 0.1% against Code AI, making it a poor default practice rival.

Reproduce after installing [training dependencies](../training/README.md):

```sh
python training/evaluate_difficulties.py --output artifacts/difficulties-64.json
python training/evaluate_difficulties.py --easy-budget 48 --output artifacts/difficulties-48.json
python training/calibrate_easy.py --output artifacts/easy-calibration.json
node tests/easy-policy.cjs
PYTHONPATH=python python -m unittest discover -s tests -p test_easy_policy.py
```

Every game records its seed, seat, result and action-trace hash. Reports include
policy source hashes and the released ONNX checksum.

Use Easy as a Gym opponent:

```python
from threecard_royale.gym_env import RoyaleEnv
from threecard_royale.easy_policy import choose_action

env = RoyaleEnv(opponent=choose_action)
```
