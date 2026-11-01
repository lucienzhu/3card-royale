# AI opponents

[简体中文](DIFFICULTY.zh-CN.md) · [Complete benchmark](experiments/complete-baseline/README.md)

Choose **Settings → Preferences → AI opponent**.

| Opponent | Policy |
| --- | --- |
| Easy | Compare up to 64 legal plays; deck redraws |
| NN AI | Autoregressive 256 → 128; imitates SDK Code AI |
| Hard · Code AI | Original table policy; evaluates plays, retained combinations and swaps |
| Godlike | Current-hand search with access to the rival's hand |
| Arena AI | Registered JavaScript and ONNX entries, including whole-move scoring |

New visitors start on Easy. Switching opponents takes effect on the next AI
choice without redealing. NN load/inference failure visibly falls back to Easy;
Godlike failure visibly falls back to Hard. Rule variants use their original
Code AI. These options apply to Standard 1.0.

The NN option is an experimental policy, not a promise of strength between Easy
and Hard. Both neural architectures share the same complete-action protocol.
Their model profiles and training recipes are documented in [MODEL.md](MODEL.md).

## Current comparison

Each cell uses 1,000 small games: 500 shared seeds, paired seats and balanced
first attackers, level-2 starts. Browser **Code AI** is Hard; **SDK Code AI** is
the frozen training teacher. They are different policies.

| Policy | vs Code AI | vs SDK Code AI |
| --- | ---: | ---: |
| Random | 0.0% | 0.0% |
| Easy · 64 | 34.1% | 35.6% |
| SDK Code AI | 48.0% | Self |
| Whole-move scoring · 256 → 128 | 42.6% | 45.5% |
| Autoregressive · 256 → 128 | 23.9% | 26.6% |
| Godlike · open hand | 67.0% | 67.5% |

The matched neural evaluation also gives autoregressive **36.6% against Easy**
and **28.8% against the 256/128 scorer**. Difficulty names do not establish an
ordering of these policies or predict human win rates. Godlike has extra
information and is excluded from the public-information ladder.

[19,000-game benchmark and latency](experiments/complete-baseline/README.md) ·
[11,000-game neural comparison](experiments/neural-baselines/README.md).
The two suites share 4,000 games; their totals must not be added as independent
samples. Saved reports record seeds, hashes, runtimes and reproduction commands.

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

The limit of 64 is empirical, not an optimum. Eight hand cards have 56
three-card combinations; wounds and legal four-/five-card bombs can expand the
pool. The [budget comparison](experiments/difficulty-v1/evaluation.json) informed
this choice and is not an independent test of it. Current performance above uses
a separate seed cohort.

[JavaScript](../sdk/easy-policy.js) and
[Python](../python/threecard_royale/easy_policy.py) share this policy and are
checked on identical observations.

## Hard: original table policy

Hard calls `Game.aiStep()`. It evaluates attack strength, damage in defense,
useful remaining combinations, and swap gains. Swaps include blind rival-hand
exchanges, visible wound exchanges and deck redraws. It uses no hidden cards or
future-turn search. This is distinct from the simpler SDK training teacher.

Regression checks compare 100 complete games / 2,550 identical decisions,
including 572 swaps (262 blind), against the original table policy. Switching
opponents leaves the save and deal RNG unchanged. Another 3,000 opening-state
comparison matches the pre-NN engine.

## Godlike: current-hand advantage

Opt in through **Settings → Preferences → AI opponent → Godlike · Sees your hand**.
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

See the complete benchmark above for current results. Node Worker latency is
not mobile latency. Run the targeted regressions with:

```sh
node tests/code-policy-regression.cjs
node tests/easy-policy.cjs
node tests/godlike-policy.cjs
```
