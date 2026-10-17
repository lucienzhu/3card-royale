# Contributing

[简体中文](CONTRIBUTING.zh-CN.md) · [Project](../README.md)

A better game can start with one clear playtest observation, a translation, an accessibility fix or a small implementation change.

## Work locally

Clone this repository and serve its root with a static HTTP server, for example `python3 -m http.server 8000 --bind 127.0.0.1`. No bundler or package installation is required. Run `node scripts/check.cjs` before submitting a change.

## Where things live

| Path | Responsibility |
| --- | --- |
| `index.html` | Playable table; the existing root URL remains the game |
| `about.html` / `brand.html` | Bilingual introduction / identity |
| `site.css` / `site.js` | Site layout, language, themes and illustrated examples |
| `app/game.css` | Existing game and tutorial styles |
| `app/experience.css` / `app/experience.js` | Product-level game UI refinements |
| `app/locale.js` | Game translations |
| `app/table.js` | Table rendering, actions and saved-game integration |
| `app/rules.js` / `app/hand-reference.js` | Illustrated rule guide / hand examples |
| `gamecore.js` | Shared rules engine; also loadable via CommonJS |
| `app/replays.js` | Frozen historical study traces |
| `docs/` / `assets/` | Paired English/Chinese documentation / brand assets |

## Review expectations

Keep a change focused and explain its player-facing effect. For UI work, check a small phone and a desktop, both languages and themes, keyboard focus, touch targets and selected cards surviving a rules-dialog round trip. Keep gameplay state independent from appearance and language preferences.

Rules changes need a separately identified variant and examples of resolution order, wildcard use, card conservation and saved-game behavior. Update both rulebooks and the game’s rule text; do not silently reinterpret old variants or move release tags.

Report a bug with rule version, browser/device, steps, expected result and actual result. A replay seed or screenshot can help; remove personal data from anything you share. Automated matches are not evidence of enjoyment or a substitute for human playtests.

## Languages and community

English and Simplified Chinese are peers. Update paired documents and preserve the precise meaning of rules rather than translating word for word. Other-language contributions are welcome; discuss a consistent glossary first. Be respectful and describe observable behavior when disagreeing about a design.

Contributions are shared under this repository’s MIT license. Keep copyright and license notices and credit prior work.

## Core & RL changes

See [SDK](SDK.md) and [Gym](RL.md). Keep all native implementations in lockstep with current rules; run the public conformance suite before changing actions, shuffle or scoring. Python/Gym and Rust tools are optional for web-only UI work.
