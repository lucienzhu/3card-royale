# 3Card Royale · 深圳花牌

[简体中文](README.zh-CN.md) · **English**

![3Card Royale — One deck. Two players. Race to Ace.](assets/repository-cover.svg)

**One standard deck. Two players. Race from 2 to Ace.**

An open card game from Shenzhen: build three-card hands, turn wounds into playable options, and earn swaps by defending well. A four-card bomb can change the whole hand.

[**Play in English ↗**](https://lucienzhu.github.io/gk-royale-playtest/?lang=en) · [Learn the game](https://lucienzhu.github.io/gk-royale-playtest/about.html?lang=en) · [Read the rules](docs/RULES.md) · [Visual identity](https://lucienzhu.github.io/gk-royale-playtest/brand.html?lang=en)

The browser demo plays against the computer. For two people at a table, all you need is a standard 52-card deck. No sign-in, betting, or cash conversion.

## How a round works

1. Make a three-card hand from your private hand and your face-up wounds. Four of a kind may use four cards.
2. Attack wins deal damage. Defense wins earn card swaps. An exact tie does nothing.
3. Swap roles without refilling. After each player has attacked once, keep your unused cards and refill to eight.

At five wounds you lose the game. The winner levels up by the complete final damage gap and attacks first next game. Reach A, then win a game that you began at A to win the match.

## What makes it different

- **Wounds are options.** You may play them, but replace them afterward: using a wound does not heal it.
- **Defense changes your next hand.** Swap your hand or wound cards with a rival’s cards, your other card zone, or the draw pile.
- **One shared flower.** A heart wildcard follows the previous winner’s new level. Both players share it for the whole game.

## Run locally

No build step or runtime dependencies. Serve the repository with any static HTTP server. For example:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
# Open http://127.0.0.1:8000/about.html?lang=en
```

With Node.js installed, run the repository checks:

```sh
node scripts/check.cjs
```

## Explore and contribute

| Resource | Start here |
| --- | --- |
| Rules | [Full 0.3.8 rulebook](docs/RULES.md) |
| Contributing | [Local development, structure, feedback and translations](docs/CONTRIBUTING.md) |
| Design | [Colors, logo, UI and language principles](docs/DESIGN.md) |
| Feedback | [Playtest notes and bug reports](https://github.com/lucienzhu/gk-royale-playtest/issues/new/choose) |
| Research | [Historical three-card probability lab](https://lucienzhu.github.io/gk-royale-playtest/probability.html?lang=en) |

**Status:** playtest rules 0.3.8. Rules are still being tested with people; simulation results are not a claim of balance or popularity. Older rule variants remain selectable in the game menu, and release tags are immutable.

## License

Code, rule text and original visual assets are released under the [MIT license](LICENSE). Keep the copyright and license notice. You are welcome to play, adapt, translate and build your own implementation; identify rule changes and avoid presenting a fork as the original project.

## Build with the game

SDK 0.1.0 / rules 0.3.8: JavaScript + TypeScript types, native Python and native Rust share card IDs, actions and a JSON state format. A visible-information strategy opponent and optional Gymnasium environment are included.

- [Portable SDK and examples](docs/SDK.md)
- [RL environment, masks and observations](docs/RL.md)
- [Python source](python/threecard_royale/) · [Rust source](rust/) · [JavaScript API](sdk/)

`python -m pip install -e './python[gym]'`, then `python examples/train_random.py`. Build Rust with `cargo build --manifest-path rust/Cargo.toml --locked`. These are source distributions; no registry package has been published.

## Why the name?

**Three cards at the core. Bougainvillea at the heart.** Shenzhen gives the game its home and flower; Hanafuda, Zha Jin Hua and Balatro inspire the fusion of combinations, visible-card choices, swapping and progression. The goal is simple: make one ordinary deck as fun as it can be for two people. The standard 52-card deck still has no jokers.
