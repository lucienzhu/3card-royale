# AI difficulty

[简体中文](DIFFICULTY.zh-CN.md) · [Evaluation records](experiments/difficulty-v1/evaluation.json)

Settings → Preferences → Difficulty:

| Difficulty | Policy | Behavior |
| --- | --- | --- |
| Easy | Easy AI | Limited attention; deck-only redraws |
| Medium | NN AI | Existing 256/128 behavioral-cloning checkpoint |
| Hard | Table Code AI | Original table policy; preserves combinations and evaluates swaps |
| Godlike | Current-hand search | Sees your hand; forgets played cards |

New visitors start on Easy. Saved `code` / `nn` preferences remain Hard / Medium.
Changing difficulty takes effect on the next AI decision, without redealing.
NN load/inference failure falls back to Easy with a visible notice; it never
silently raises the difficulty to Hard. Historical rule variants retain their
original Code AI and show a notice. These difficulty settings apply to Standard 1.0.

## Godlike: current-hand advantage

Opt in through **Settings → Preferences → Difficulty → Godlike · Sees your hand**.
It sees both current hands, public wounds and the active attack. It never reads
stock order, discard, seed, RNG, prior combats or results. Other difficulties keep
their existing information boundaries and behavior. This is a JavaScript search
policy, not a new NN checkpoint; the public SDK/Gym observation is unchanged.

- **Attack:** enumerate every legal three-card play and four-/five-card bomb,
  then every legal rival response. Choose the best worst-case current-combat value.
- **Defense:** compare all legal responses to the actual attack. Avoidable lethal
  damage is dominated by survival; a guaranteed lethal attack dominates nonlethal outcomes.
- **Swap:** compare one-step expected gains for deck draws, random rival-hand
  exchanges and known wound exchanges, including keeping the current cards.
  Blind swaps remain uniformly random under the rules, even though the AI can
  see the candidate identities. Re-evaluate after each actual swap.
- **Forget:** a hypothetical draw can be any identity absent from the current
  hands, wounds and active play, equally weighted. Previously discarded cards
  remain possible hypotheses. No remembered card counts or actual deck composition.

“Best” is relative to this bounded heuristic, not a solved match. Combat utility
prioritizes lethal outcomes (1,000,000), then wound increase using
`pain(w) = 120w + 25w²`, defensive swap chances (28 each), retained best-hand
strength (22×), and wound-card use (7×). Retained strength includes rank tiebreaks
and a small card-count term. Swap value is own best usable combination minus the
rival's; moving a card between one's own zones does not change that value.
Unknown replacement cards and future refills are not searched. Two swap chances
are evaluated one at a time, not as an exhaustive multi-step tree.

Search runs in a separate Web Worker. If it fails or times out, the game visibly
falls back to Hard Code AI; selecting Godlike again retries. Changing difficulty
cancels its outstanding search and never changes the deal RNG.

### Measured result

**650 / 1,000 small games · 65.0% against the original browser Hard Code AI.**
500 independent direct core seeds (83,000,000–83,000,499), seats swapped for each
seed, first attacker balanced, both players starting at level 2. All games ended
legally. These use a separate seed protocol from the older Gym experiments, and
Godlike has privileged information; this is not a fair-information NN benchmark.
A prior 100-game smoke run on seed range 84,000,000–84,000,049 won 68 games.

On Apple M1 / Node 24, decision p95 was **13.1 ms attack, 8.2 ms defense,
30.1 ms swap**. These are local Node measurements, not mobile/browser latency.
The report records each seed, outcome, trace hash, timing and source checksums.

[Evaluation](experiments/godlike-v1/evaluation.json) · [Smoke run](experiments/godlike-v1/calibration.json)

```sh
node training/evaluate_godlike.cjs --games 1000 --output artifacts/godlike.json
node tests/godlike-policy.cjs
```

## How Easy is weaker

- Attack: sample at most **64** legal plays without replacement, then choose the
  best among them with the frozen SDK baseline comparison.
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
feature schema, SDK baseline, or deployed ONNX weights changed. Hard restores the original table policy. Rust/C++ retain their
existing SDK Code AI; Easy is provided in JS and Python.

## Browser Hard: original table policy

The NN integration accidentally routed Hard to the simpler SDK training policy.
Hard now calls the original `Game.aiStep()` again. It preserves useful remaining
combinations and compares swap gains; blind rival-hand swaps are restored.
Easy remains at 64 candidates and the NN checkpoint is unchanged.

Actual browser-engine evaluation, 1,000 games per matchup, using the same Gym
seed mapping, paired seats and balanced first attackers:

| Policy | Opponent | Wins |
| --- | --- | --- |
| Easy 64 | Table Code AI (Hard) | **315 / 1,000 · 31.5%** |
| NN AI | Table Code AI (Hard) | **412 / 1,000 · 41.2%** |
| Table Code AI (Hard) | SDK Code AI baseline | **547 / 1,000 · 54.7%** |
| NN AI (control) | SDK Code AI baseline | **462 / 1,000 · 46.2%** |

All 4,000 games completed legally. The control reproduces all prior NN/SDK
outcomes. [Records](experiments/difficulty-v1/table-code-evaluation.json).
The original browser card/discard order is preserved by evaluating the actual
`Game.aiStep()`, rather than applying a sorted SDK action on its behalf.

Regression checks cover 100 complete games / 2,550 identical AI decisions,
including 572 swaps (262 blind). Switching difficulty and deciding do not change
the saved game or deal RNG. An audit of 3,000 initial states also matched the
pre-NN release exactly. The rules/deal engine itself did not change.

## Frozen SDK baseline comparison

Each pair: **1,000 completed small games**, 500 Gym evaluation seeds starting at
81,000,000, swapped seats, balanced first attackers, normal level-2 starts.
No illegal actions or truncated games.

| Policy | Opponent | Wins |
| --- | --- | --- |
| Easy AI | SDK Code AI | **361 / 1,000 · 36.1%** |
| Easy AI | NN AI | **441 / 1,000 · 44.1%** |
| NN AI | SDK Code AI | **462 / 1,000 · 46.2%** |

Easy is weaker in these comparisons. Difficulty labels are not an Elo scale
or a prediction of human win rates; the restored Hard results are reported separately above.
The shipped policy is **easy-v2**, with a **64-play** limit. The earlier 48-play
version won 30.4% vs SDK Code and 39.0% vs NN on these same evaluation seeds
([archived report](experiments/difficulty-v1/evaluation-48.json)). The limit was
changed after comparing 48 and 64, so these results are a reproducible comparison,
not an untouched test of the choice. A separate 120-game calibration, starting
at seed 82,000,000 with deck-only redraws, gave:

| Candidate limit | Wins vs SDK Code AI |
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
baseline won only 0.1% against SDK Code AI, making it a poor default practice rival.

Reproduce after installing [training dependencies](../training/README.md):

```sh
python training/evaluate_difficulties.py --output artifacts/difficulties-64.json
python training/evaluate_difficulties.py --easy-budget 48 --output artifacts/difficulties-48.json
python training/calibrate_easy.py --output artifacts/easy-calibration.json
python training/evaluate_table_policy.py --node node --output artifacts/table-code.json
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
