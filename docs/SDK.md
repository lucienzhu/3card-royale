# Portable core & integration

[简体中文](SDK.zh-CN.md) · [RL environment](RL.md) · [Rules](RULES.md)

SDK **0.2.0**, rules **1.0.0**, state schema **2**. Standard browser games use rules 1.0.0 in a separate save namespace; older variants and saves retain their original rules. The SDK's JSON state is a separate host format, not a browser-save replacement.

| Runtime | Implementation | Entry point |
| --- | --- | --- |
| JavaScript | Frozen rules engine with a portable adapter; Node/CommonJS or browser scripts | `sdk/index.js` |
| TypeScript | Typed interface to the same JS runtime, not a second rules implementation | `sdk/index.d.ts` |
| Python 3.10+ | Native standard-library rules, no Node process | `python/threecard_royale/core.py` |
| Rust | Native library and JSON-lines CLI; serde/serde_json dependencies | `rust/src/lib.rs` |
| C++17 | Native header-only core and baseline; vendored nlohmann/json, offline build | `cpp/include/threecard_royale/` |

Only current 1.0.0 is exposed by the SDK. Historical variants remain in the browser. The C++, Rust and Python implementations run independently and are replay-tested against the actual website engine. Packages are supplied as repository source; they have not been uploaded to npm, PyPI, crates.io or a C++ package registry.

## Start a game

```js
const {Game} = require('./sdk/index.js');
const {chooseAction} = require('./sdk/policy.js');
const game = new Game(42); // omit seed for a fresh random game
const player = game.actor;
const observation = game.observation(player);
game.step(chooseAction(observation));
```

```python
# pip install -e ./python
from threecard_royale import Game, choose_action

game = Game(seed=42)  # omit seed for fresh entropy
obs = game.observation(game.actor)
game.step(choose_action(obs))
```

```rust
use threecard_royale::{Game, choose_action};
let mut game = Game::new(42, None)?;
let actor = game.actor().unwrap();
let public_observation = game.observation(actor)?;
let action = choose_action(&game.observation(actor)?)?;
game.step(&action)?;
```

```cpp
#include <threecard_royale/policy.hpp>
using namespace threecard_royale;
Game game; // fresh host entropy; Game(42) for reproducible experiments
const auto actor = game.actor().value();
game.step(choose_action(game.observation(actor)));
auto resumed = Game::restore(game.save());
```

C++: [build, embed and install instructions](../cpp/README.md). It runs natively, without a JS/Python/Rust process.

Rust takes an explicit `u32` seed; the host chooses fresh entropy for real games. Fixed seeds are for debugging and experiments. All runtimes use the same xorshift32/Fisher–Yates sequence and preserve RNG state. This PRNG is for reproducibility, not adversarial online security.

Browser integration: load `gamecore.js`, then `sdk/index.js`; use `window.ThreeCardRoyale`. A browser bundler may instead consume the CommonJS module. The simple JS policy is a separate CommonJS module. No UI, networking, accounts or rendering is required by the core.

## Cards, phases and actions

Card ID `0..51`: `suit * 13 + rank - 2`. Suits: spades 0, hearts 1, clubs 2, diamonds 3; ranks 2..14 (Ace 14). Jokers are excluded. The shared heart flower card substitutes for one card; four of a kind scores 6.

Get a legal action from `legalActions()` / `legal_actions()` and pass it to `step`. Lists are deterministic: ascending physical IDs for triples, then legal quadruples, then legal quintuples; swap sources in hand/wound index order. JSON object-key order is irrelevant, card-array order is canonical.

| Phase | Action |
| --- | --- |
| `attack`, `defend` | `{"type":"play","cards":[0,13,26]}` |
| `refresh` | `{"type":"swap","source":{"zone":"hand","index":0},"target":{"zone":"blind"}}` |
| `refresh` | `{"type":"stop_swaps"}` ends remaining opportunities |
| `resolved` | `{"type":"advance"}` swaps roles or refills a round |
| `game_over` | `{"type":"next_game"}` starts with the winner |
| `match_over` | No actions |

Swap source is your `hand` or `wounds`. Target is `deck`, `blind` (one random rival hand card), or a specified `hand`/`wounds` with `who` and `index`. You may take a rival wound or trade with your own other zone. Each route consumes one opportunity; no route heals or changes zone counts. Discard-and-draw can redraw the same card when discards are reshuffled.

`actor` is 0 or 1 for player decisions and `null` for host-controlled transitions. Illegal actions are rejected without changing state or RNG. The environment and host should advance the explicit transition actions; a UI does not have to show extra buttons for them.

## State ownership & observations

`save()` returns a deep copy of **private full state**: deck order, both hands and RNG are included. `Game.restore(state)` loads trusted schema-2 states and checks conservation. Do not expose this object to agents or opponents. Integrations still need their own input validation, authentication and server authority.

`observation(player)` contains only that player's hand, both public wound areas (null while a used slot awaits replacement), revealed plays, public discard cards, hand/deck counts, levels, common flower, failed-A lights, phase, public results and legal actions when it is their turn. It never includes the opponent's hand identities, stock order, seed or RNG. JSON observations are detached copies. Legal actions are state-relative and indices must not be cached after `step`.

SDK saves share the fields in `sdk/index.d.ts`: `schema`, `rules`, `rng`, `seed`, `players`, `phase`, `active`, `pending`, `stock`, `discard`, `flower_level`, turn/round counters, levels/lights and results. The JSON-lines Rust and C++ CLIs accepts `init`, `restore`, `step`, `inspect`, `evaluate`; it is a **trusted developer bridge** that returns full state for conformance tests, not a public player protocol.

## Simple strategy opponent

C++ / Python / Rust `choose_action` and JS `chooseAction` receive only observations and legal actions. They attack with the strongest current hand; defend by minimizing incoming wounds, then earning swaps; tie-break toward using wounds and conserving the wildcard. Swaps use visible ranks/wildcards or redraw a weak card. They are deterministic heuristics, not trained agents or optimal play. `examples/play.js` runs an entire bounded match; `examples/train_random.py` demonstrates masked sampling against the baseline.

## Validate a port

```sh
node scripts/check.cjs
python -m unittest discover -s tests -p 'test_*.py'
cargo build --manifest-path rust/Cargo.toml --locked
cmake -S cpp -B /tmp/royale-cpp -DCMAKE_BUILD_TYPE=Release
cmake --build /tmp/royale-cpp --parallel
ctest --test-dir /tmp/royale-cpp --output-on-failure
python tests/conformance.py --rust rust/target/debug/royale-json --cpp /tmp/royale-cpp/royale-json-cpp
```

Install the optional Gym dependencies before the Python suite. Conformance compares complete states, legal-action order, both observations, evaluations and save/restore against the frozen JS engine; it also exercises every directed swap route and reshuffles. Keep the same card IDs, shuffle algorithm, replacement order and wildcard tie-breaking in future ports. A rule change needs a new identified rules version and matching examples.

The four-language Ace regression carries challenge ownership and failure counters through six consecutive games: three failed own-A challenges reset one player to 2; the rival then wins their own A and ends the match immediately. It covers both players, odd/even rounds and save/restore at each game boundary. Winning the rival's A game is still only a single-game win.

Rust full-match example: `cargo run --manifest-path rust/Cargo.toml --locked --example baseline`.

C++ full-match example: `/tmp/royale-cpp/royale-baseline-cpp`. SDK 0.2.0 adds C++; rules, state schema and the browser game remain unchanged.

Standard 1.0 adds five of a kind (7 points): four natural equal-rank cards plus the shared flower. See [complete standard rules](RULES.md). Five-card plays are included in legal actions. `wild.as` is a virtual face; in five of a kind it may name an already-present representative face without reusing a physical card. Gym score/kind features use /7 and played-card count uses /5.

SDK 0.2 accepts rules-1.0.0 states only. Keep SDK 0.1.1 for existing 0.3.8 states or start a new standard game; schema 2 alone does not make rule versions interchangeable.

`level_owner` is fixed at each game start and is independent of the rotating `first` attacker. Only this player can pass or fail an Ace challenge when the shared flower level is 14. Results include `level_owner` and nullable `ace_challenger`. Schema 2 preserves this identity across save/restore.
