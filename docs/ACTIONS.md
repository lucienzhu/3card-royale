# Structured actions · v2

[日本語](GUIDE.ja.md) · [한국어](GUIDE.ko.md) · [Español](GUIDE.es.md)

A policy returns a complete move with stable physical card IDs. **One action space and protocol; many policy architectures.** Code, whole-move ranking and autoregressive networks all submit the same semantic action. `actions-v2` changes the interface, not Standard Rules 1.0.0 or save schema 2.

```text
Code / search ────────────┐
Score complete moves ────┼→ actions-v2 → legal validation → one GameCore step
Generate tokens ─────────┘
```

Three separate concepts:

- **Action space:** all complete legal plays, swaps and control actions in the current state, with stable card IDs and meanings.
- **Action protocol:** the canonical object below, or its equivalent six-position token encoding. The host validates the complete move before executing it.
- **Model profile:** the features, architecture and training objective a policy uses to select that move. Candidate rows, network heads and decoding steps are model choices, not new game actions.

A scorer may enumerate legal moves internally. Its row number is local to that decision; it must return the selected semantic action. An autoregressive policy may use conditional token masks. Neither changes the shared action space.

## Fixed vocabulary

| IDs | Meaning |
| --- | --- |
| 0–51 | Physical card: `suit * 13 + rank - 2`; suits ♠ ♥ ♣ ♦, ranks 2…A |
| 52 / 53 / 54 | PLAY_3 / PLAY_4 / PLAY_5 |
| 55 | SWAP |
| 56 / 57 | Skip one swap chance / stop all remaining swaps |
| 58 / 59 | Advance resolution / start next game |
| 60 / 61 | Deck / random rival hand card |
| 62 / 63 / 64 | Own hand / own wound rack / rival wound rack |
| 65 | PAD, only to pad a completed sequence to six positions; never a model output |

A token always means the same thing. A **mask bit changes legality**, never identity. The mask has 65 entries and is conditioned on the current state **and selected prefix**. It is not a 512-entry candidate table. Card IDs identify real cards, including the heart wild card; no virtual replacement card is selected.

## Complete actions

```js
{type: 'play', cards: [12, 25, 38]} // three Aces, ascending physical IDs
// tokens: [52, 12, 25, 38, 65, 65]
{type: 'play', cards: [5, 18, 31, 44]} // four 7s
// tokens: [53, 5, 18, 31, 44, 65]
{type: 'play', cards: [5, 13, 18, 31, 44]} // five 7s, if ♥2 is wild
// tokens: [54, 5, 13, 18, 31, 44]
{type: 'swap', source: 34, target: {zone: 'deck'}}
// tokens: [55, 34, 60, 65, 65, 65]
{type: 'swap', source: 34, target: {zone: 'rival_wounds', card: 1}}
// tokens: [55, 34, 64, 1, 65, 65]
{type: 'skip_swap'} // [56, 65, 65, 65, 65, 65]
{type: 'stop_swaps'} // [57, 65, 65, 65, 65, 65]
```

Availability follows the current rules: three-card plays can mix hand and wounds; four/five cards must form a legal bomb. Cards are selected in ascending ID order, eliminating permutations of the same play. A prefix is selectable only if at least one complete legal move extends it. Duplicate cards, illegal bombs and incomplete submissions are rejected. The ascending-order constraint is part of the encoding, not a new game rule.

Swap source IDs resolve to their current hand/wound locations. Visible targets specify both relative zone and card ID; deck/blind swaps specify no hidden target ID. Own hand ↔ wounds and rival wounds are supported. Skip consumes one opportunity; stop declines all remaining opportunities.

## Atomic GameCore boundary

```js
const {Game, actions} = require('../sdk/structured.js');
const game = new Game(19, 0);
const obs = game.structuredObservation(game.actor);
const grammar = actions.build(obs);
const {mask, complete} = grammar.next([actions.T.PLAY_3]);
// Query as many prefixes as needed. No state, RNG, reward or turn advances.
game.stepStructured(obs.legal_actions[0]); // a complete legal semantic move
// Or game.stepTokens([...]); submit only after completing the move.
```

Use `game.grammar()` for automatic `advance` / `next_game` transitions. Terminal match state has no actions. Existing `Game.step`, saved games, replay events, Rust and C++ rules cores remain unchanged. The v2 adapter validates the whole action, resolves card IDs, and invokes the established engine once. It currently derives prefix masks from the existing exhaustive legal-move generator; this is an implementation detail, not the external policy action space.

## Gym and RL

```python
from threecard_royale.gym_structured import StructuredRoyaleEnv
from threecard_royale.actions import PAD

env = StructuredRoyaleEnv(episode='game', player=0)
obs, info = env.reset(seed=19)
prefix = []
# Sample masked p(token | state, prefix) until the grammar is complete.
# mask = env.action_masks(prefix)
# Complete the sequence, append PAD to length 6, then env.step(sequence).
```

`ThreeCardRoyale-v1` is registered when importing `gym_structured`. Observation: `state: float32[336]`, root `action_mask: int8[65]`. Action transport: `MultiDiscrete([66] * 6)`. This is a **serialization of one complete move**, not a requirement to use six network heads. `action_masks(prefix)` supports autoregressive construction; partial prefixes must not be passed to `step`.

A whole-move scorer uses the same environment and action transport:

```python
options = env.scoring_observation()
# Custom scorer: one scalar per complete legal move, shape [N].
scores = model(options['state'], options['candidates'])
chosen = int(scores.argmax())
obs, reward, terminated, truncated, info = env.step(options['tokens'][chosen])
# chosen is private to the scorer; env.step receives the complete canonical move.
```

For this profile, training uses a softmax over complete legal moves. Top-1 imitation labels, a distribution over several good moves, or reward-based objectives can share this interface. A teacher score is not automatically a calibrated action value. Existing checkpoints still use top-1 imitation; multi-action supervision is a future experiment.

For an **autoregressive** policy gradient, sum log probabilities of the chosen non-PAD tokens as the complete action log probability. Sample from masked softmax during training; greedy argmax is only the baseline deployment decoder. Store state, prefix and masks for replay. For entropy regularization, document whether token entropies are summed or length-normalized. For a **whole-move scorer**, use the selected move's log probability directly. Both receive one reward, discount and termination signal per environment transition; never discount between tokens. Invalid complete actions use the existing Gym invalid-action penalty/budget without changing cards or RNG. PPO needs a distribution matching the chosen model profile and a value head; a stock independent MultiDiscrete actor cannot enforce conditional legality.

## Model and compatibility

The current **autoregressive experiment** uses 336 state features + six 66-way prefix positions (396). Shared MLP: `732 → 256 → 128 → 65`, ReLU. Re-run it for each token, mask impossible next tokens, and submit the resulting semantic move. At most six predictions, no recurrent game history. This architecture does not define the protocol.

`royale-policy-v2` JS plugins receive semantic legal moves and return a semantic move. The injected `actions` and `scoring` helpers support both construction styles. ONNX profiles are separate manifest fields:

| Policy form | `features` | ONNX inputs → output | Shared submission |
| --- | --- | --- | --- |
| Whole-move scorer | `scoring-v2` | `state [B,336]`, `candidates [B,N,72]` → `logits [B,N]` | Complete `actions-v2` move |
| Autoregressive | `structured-v2` | `state [B,336]`, `prefix [B,396]` → `logits [B,65]` | Complete `actions-v2` move |
| Pure JS / search | No tensor profile | `act(observation)` | Complete `actions-v2` move |

`scoring-v2` reuses the frozen 72-feature descriptor, including hand-type features, for exact legacy-weight comparisons. `sdk/scoring.js` and `python/threecard_royale/scoring.py` map each row back to its semantic move. Its 512-row capacity is a feature-profile limit, **not** an action ID namespace. Other architectures can use the JS plugin contract; a different ONNX tensor format needs a separately versioned loader/profile.

Old `royale-policy-v1` / `gym-v1` plugins and `ThreeCardRoyale-v0` retain their original contracts and model files. Do not relabel historical measurements as a new experiment. See [autoregressive model evidence](../models/structured-policy/training.json), [3,000-game evaluation](../models/structured-policy/evaluation.json), and [training recipe](../training/structured/README.md). The scorer has additional handcrafted features, so these experiments do not isolate architecture alone.

## Plugin manifest

For a new JS entry, copy `policies/templates/structured-policy.mjs` to its own
folder, add a README and use this manifest (replace the ID and author):

```json
{
  "id": "my-structured-v2",
  "name": "My structured policy",
  "api": "royale-policy-v2",
  "actions": "actions-v2",
  "type": "javascript",
  "author": "your-handle",
  "license": "MIT",
  "rules": "1.0.0",
  "episode": "game",
  "information": "public",
  "memory": "none",
  "artifact": {"file": "policy.mjs", "bytes": 0, "sha256": "REPLACE_WITH_SHA256"}
}
```

Add the registry entry, then run `node arena/stamp.mjs my-structured-v2` and
`npm run arena:submit -- --policy my-structured-v2`. Stamping replaces the size/hash
placeholders. Commit the generated validation receipt. For ONNX, use the manifest
in `policies/entries/nn-structured-v2/`, declare `features: "structured-v2"` for
autoregressive decoding or `"scoring-v2"` for whole-move scores, and use a new ID.
Both declare `api: "royale-policy-v2"` and `actions: "actions-v2"`. Never change
the weights of an already rated entry.
