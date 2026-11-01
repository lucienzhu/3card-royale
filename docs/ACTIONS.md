# Structured actions · v2

A policy returns a complete move with stable physical card IDs. Neural policies build that move autoregressively: operation → cards / source → target. `actions-v2` changes the interface, not Standard Rules 1.0.0 or save schema 2.

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

`ThreeCardRoyale-v1` is registered when importing `gym_structured`. Observation: `state: float32[336]`, root `action_mask: int8[65]`. Action transport: `MultiDiscrete([66] * 6)`. This requires an **autoregressive policy**, not independent MultiDiscrete heads. `action_masks(prefix)` returns subsequent conditional masks. Partial prefixes must not be passed to `step`.

For policy gradients, sum log probabilities of the chosen non-PAD tokens as the complete action log probability. Sample from masked softmax during training; greedy argmax is only the baseline deployment decoder. Store state, prefix and masks for replay. One environment transition gives one reward, discount and termination signal. Do not discount between tokens. For entropy regularization, document whether token entropies are summed or length-normalized. Invalid complete actions use the existing Gym invalid-action penalty/budget without changing cards or RNG. RL algorithms such as PPO still need a custom autoregressive distribution and value head; a stock independent MultiDiscrete actor is not compatible.

## Model and compatibility

Input = 336 current-state features + six 66-way prefix positions (396). Shared MLP: `732 → 256 → 128 → 65`, ReLU. Re-run it for each token, mask impossible next tokens, and submit the resulting semantic move. At most six predictions, no recurrent game history.

`royale-policy-v2` JS plugins receive semantic legal moves and return a semantic move. ONNX uses `structured-v2`, `state [B,336] + prefix [B,396] → logits [B,65]`. Old `royale-policy-v1` / `gym-v1` plugins and `ThreeCardRoyale-v0` keep their original contracts and model files. Old checkpoint results do not describe v2. See [model evidence](../models/structured-policy/training.json), [3,000-game evaluation](../models/structured-policy/evaluation.json), and [training recipe](../training/structured/README.md).

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
in `policies/entries/nn-structured-v2/`, declare `features: "structured-v2"`, and
use a new ID. Never change the weights of an already rated entry.
