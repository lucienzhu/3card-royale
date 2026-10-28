# Design language

[简体中文](DESIGN.zh-CN.md) · [Live components](../design-system.html?lang=en) · [Visual identity](https://lucienzhu.github.io/3card-royale/brand.html?lang=en)

One card, one flower, two players; the ground is Shenzhen's green, the flower its red. The bougainvillea mark ties a game made in Shenzhen to an ordinary deck: three identical bracts rotated by 120°, each with a small golden centre. The mark is a flat gold card, with no metallic light and no texture. The card back is that same card, and the flower card is that card with an index.

The brand source is `brand-mark.svg`. After editing it, run `node scripts/sync-brand.cjs` to refresh the table header, dark-mode download and embedded PNG asset. `node scripts/check.cjs` verifies that these copies match.

| Name | Role | Value |
| --- | --- | --- |
| Red flower (红花) | the flower, your identity, primary buttons, selection | `#C5416B` (small text: `#B2365A` by day, `#E38BA6` by night) |
| Green plate (绿牌) | day ground, the pale green of a new-energy licence plate: page `#EDF4EF`, table `#E2ECE5`, panels `#F7FBF8` | `#EDF4EF` |
| Mainboard (主板) | night ground, the deep green of a motherboard's solder mask: page `#0C2118`, table `#112A1F`, panels `#152E23`; text `#10231B` by day, `#EAF3EE` by night | `#0C2118` |
| The gold card | mark, card back and flower card: face `#ECCE80`, edge `#A17C35`, centres `#F2CD5D` | `#ECCE80` |
| Rival gold | the rival's flower, bracts and vine marker; as text `#866300` (day) / `#E4C46A` (night) | `#D6A41C` |
| Circuit green (板绿) | the saturated brand green: the brand page, and the solder mask of the circuit-board Easter egg (`#0F5546` at night); the green plate and the mainboard are its palest and deepest ends | `#16765F` |

The red flower and the gold card are identical in both themes; only the depth of the green ground and functional text switch for contrast. These are design cues, not official city colours or demographic research.

The card is one component: a white face with an index in ink or flower red. Ranks use a thirteen-glyph subset of Archivo 800 (OFL); suits are inline SVG written into the card, 0.66 of the rank size, stacked in one column with it, and "10" is narrowed. Cards that lie on the table (attack, defence, wounds) share one size and cast no shadow; held cards are larger and lifted with a shadow. The flower on the flower card is a translucent watermark in the same corner as every other card's suit watermark.

The interface uses the system sans; the wordmark is Noto Sans SC Bold (Chinese) with Archivo (English), outlined to SVG. The foundation radii are 4, 8 and 16 px; compact cards and chips use proportional 5–6 px corners. The shared drawer and share preview use 18 px corners on desktop and square edges on phones. Two buttons: red fill, ink underline. The menu marks the current tab by ink colour and weight alone, with no underline. Each swap target zone carries one red circle-⇄ badge. Wounds use five bracts beside the name, filled in the identity colour; the numeric count remains available to assistive technology. Never use colour as the only way to identify a state.

The shared flower of rules 1.0 needs a single indicator: a small gold token in your heading row with the rank and suit side by side (`2♥`), so it never makes the row taller; historical variants keep separate wildcards. Keep the first action clear, reveal full rules on demand, and preserve the player's selection when opening help. English is 3Card Royale, aka Shenzhen Flower Cards; Simplified Chinese is 深圳花牌. Keep the alias in introductions, with the compact primary name in navigation and wordmarks. Translation must distinguish a small game from the full race to Ace.

On a phone held upright the table gives its height to the cards you play with. The menu is 44 px, the level track 32 px, the rival's hand is backs only and smaller, and your hand grows with the height the screen allows: 52 × 74 below 580 px, 70 × 98 around 667 px, 84 × 118 from 800 px. Wound racks keep their place so the table never jumps when the first wound lands.

**First visit.** Two interactive plays introduce the game: start with eight hand cards and attack with three Aces (three of a kind, 5, against a flush, 3: deal 2 damage); then defend with 4♦, 8♦ and Q♦ (flush, 3, against a straight flush, 4: take 1 damage). The practice teaches playing cards and losing at five damage before introducing the wound area. It checks scores through the real evaluator but is isolated from the live game, random deal and policy. It uses the shared mobile drawer / desktop modal and pauses the live table.

After completing or leaving practice, contextual bubbles introduce playable wounds, swaps, the flower card and refills only during that first real game. Playing a wound replaces it without healing; each swap opportunity can still be skipped. Dismiss a hint or perform the relevant card action to acknowledge it. `sz-onboarding-v1` retains `seen` / `enabled` and adds the first-game identity `hintGame` plus acknowledged `hints`. Existing users are not automatically shown practice again. Settings → Preferences can disable guidance or reopen practice; reopening does not reset first-game hints. Blocked storage falls back to session or current-page memory.

**Swipe selection and turn pacing.** Swipe horizontally across hand cards or playable face-up wounds to lift/select them once, then confirm Attack / Defend. Taps, keyboard controls and vertical scrolling remain available; a canceled gesture restores the prior selection. After resolution motion, allow about 1.1 seconds to read the result, then automatically exchange roles or refill at round end. Swaps, skips, flips and starting the next game remain player decisions. Drawers, replays, backgrounding and replacement games cancel pending transitions; resuming rechecks the game and event identity.

**Match end: the bloom.** When a player wins their own Ace game, the screen plays a bloom of about six seconds. It reads the winner's physical cards from the final combat, taking the first three in played order for a four- or five-card play. Wildcards retain their actual rank and suit. The cards rise from your side or descend from the rival's side, flip in flight to the shared gold back with its red flower and gold hearts, and flow into one three-bract flower. Arrival, flipping and gathering overlap without a stationary hold. Older records without the final play show backs only, never invented faces. The flower bursts outward along the golden angle until the screen is full, then the flowers separate into softly turning bracts that drift along different wind-bent paths into corners of the city. Existing skyline flower spots fade into bloom when a petal arrives; flight distance and wind determine the timing, with no left-to-right reveal. A fuller canopy of flowers from the burst remains above the skyline, with varied sizes. Flowers near the city become smaller to reveal the buildings. Petals release at staggered times and the tail continues with those same petals, fading at the city edge instead of spawning a second shower above the screen. Two egrets join the same breeze, alternating brief wingbeats with longer glides. A game win keeps its smaller celebration; only a match win triggers the full-screen bloom and city landing. The flower takes the winner's colour: red with gold hearts for you, gold with red hearts for the rival. As falling petals clear the upper sky, "You, in bloom." fades into that space, followed by games and wins. While petals are still falling and the lower flowers have cleared, the vine draws from left to right, revealing ranks and both players' flowers along its path, ending at the final bloom. Play again and Share card follow. A tap anywhere jumps to the end; with reduced motion set in the system the end is shown at once. The skyline is the approved layer19 art, unchanged.

**Share card.** A match's 1080 × 1440 PNG is a still of the bloom: a concise title on top, the winner's flower and the animation's fuller canopy in the middle, flowers tapering in size near the city, egrets, the skyline in bloom, the vine, then the mark, "One deck. Two players. Three cards. Make them bloom.", the address and a QR code. A single-game share has three fixed-height tabs. Game recap includes every recorded combat in chronological order, including defenses that deal no damage. It grows vertically into one long PNG. The preview scrolls within the fixed-height panel at a readable width. Final hand shows the last plays and public wound racks; one sentence combines the last hit and the final wound gap that determines the level gain. Best play switches between biggest damage and highest-scoring hand across the current game's public combats (either player's); ties use the other metric and then recency. Game recap places each combat on one row with two columns: attack left, defense right, with gold/red flower identities following the players as roles change. Final hand and Best play keep the gold-flower rival above the red-flower player, regardless of who attacked or won. Names carry their flower identity; the featured hand grows in place. The owner and attack/defense role are explicit. Display all three, four or five cards without overlap. Mark wound-card origins and caption the flower's substitution without changing its physical face. Reserve a separate caption row below the play and above the wound rack, with clearance from card edges and the footer. Same-score wins name the rank tiebreak. Flowers appear in player identities and the small brand mark; no skyline or decorative bloom. Old records without a final combat show the result without invented cards. Never include remaining private hands, the stock or raw replacement metadata; historical face-down wounds stay face-down. A save without history can show its recorded final combat only. Preview, download, clipboard and system share all use the selected layout; changing tabs cancels stale renders. The same panel height is retained across tabs; small-screen fixed posters can be enlarged. Very long exports scale proportionally to a 12-megapixel, 16384-pixel-side raster budget without omitting any combats. Light and dark, Chinese and English.

**Circuit board (Easter egg).** Off by default; one switch in Settings › Preferences turns the table into a live board. The mask is circuit green, the copper under it a lighter green, pads gold, silkscreen white; text on the board turns light and the action panel becomes a dark module. Each card zone is a chip, wired the way the game flows: each hand to its wound rack, each wound rack to the attack zone, the attack zone to the defence zone. The stock and discard take no part in the circuit. A small rectangular SMD LED at the top-left of the attack and defence zones lights, with the bus that drives it, in the colour of whoever has to act: red for you, gold for the rival. Packets of light run along the buses; with reduced motion set in the system they stand still.

Original assets use MIT. Custom emoji PNGs are images for platforms that support uploads, not universal Unicode emoji. The mark is stylized and is not a claim of uniqueness or botanical realism.

Single-game results remain a compact panel. A red/gold flower identifies the winner beside the title; the level arrow ends in the same gold heart wildcard chip used on the table, showing the next game’s wild rank. Only the match result fills the visible viewport, with no drawer corners or bottom slide. The legacy embedded-browser dialog fallback also fills the screen; short screens scroll within the result.

UI copy leads with one current action or result. Remove repeated explanations and interface narration. Tutorials retain cause, valid targets and essential rules. Keep full rules in the rulebook and a three-line overview on the home page. Update both languages; retain complete accessible labels.

## Current components · 2026-10-23

The [live component page](../design-system.html?lang=en) loads the production card styles, current flower and canonical mark, and renders all three share layouts with the production PNG renderer from a seeded real game. It replaces dated design-lab pages as the current reference.

Gallery language and theme selectors share a 44px control, token-based surfaces, leading icons and a visible focus ring. Native selection keeps keyboard and mobile pickers available. Chapter 04 groups result conventions and share previews.

- **Settings:** One scrolling page, ordered Preferences, New match, Records, without section tabs. Fields, switches, actions and disclosures share a consistent layout. Desktop labels sit beside controls; mobile fields stack. Choose match options before starting; seed and historical research details expand on demand. Language and Back remain in the fixed header; saves and preference behavior are retained.
- **Navigation and help:** Play, Hands, Rules, Settings share one spacing system; Replay is inside Settings. Rules, hand ranks, settings and replay use the same fixed-height shell: a right-side drawer on phones, a centered modal on desktop. Language switching belongs in the header.
- **Replay motion:** forward playback and Next animate visible card moves inside the replay drawer/modal. Public replay hands stay face-up; live rival hands remain anonymous. Backward steps and non-adjacent seeks restore the selected frame immediately. Navigation, scrolling and viewport changes settle any interrupted flight; reduced-motion preferences still apply.
- **Swap choice:** each opportunity offers Swap or Skip this one. The selected source lifts; only valid destination zones carry one circle-⇄ marker. The source zone has no target marker.
- **Single-game share:** Game recap, Final hand, Best play. All three use the canonical logo with its name at the upper right. Keep the logo and name together in both languages. Recap includes every combat, one row / two columns, with space after each result. Final hand and Best play reduce the middle outcome to one sentence; no extra equation, result badge or repeated level arrow.
- **Match result:** full-screen bloom, distinct from the compact single-game panel. PNG uses the matching finale composition.

`app/tokens.css` is the live component layer; `app/theme-tokens.js`, `site.css` and the PNG palettes carry the matching values. `node scripts/check.cjs` checks palette parity, canonical logo copies, current VI labels, embedded rule text and inline-script syntax. Update these together when a component changes. Archived studies are references, never runtime dependencies.

The PNG card renderer consumes a generated copy of the production suit paths, flower mark and card tokens through `app/bloom-assets.js`. Run `node scripts/sync-brand.cjs` after changing these sources; `--check` rejects stale copies. Flower cards use the same flat gold face and flower watermark as the table, with no legacy star badge.

The home introduction reuses the approved layer19 skyline as a softly cropped background. Scale the original drawing proportionally behind the copy, fading it near the text and lower edge. It adds no height or separate illustration row. The phone view uses a smaller skyline to reveal more landmarks without adding vertical space. Controls stay above it with clear focus rings, and the art never intercepts input.

**Godlike difficulty.** Keep Easy, Medium and Hard; add Godlike as an explicit opt-in. Its option and adjacent status must disclose that it sees the player’s hand, without card memory. Keep private hand faces hidden on the table. Use the existing settings drawer/modal and select component; show a visible Hard fallback on search failure.

### Selects and disclosures · 2026-10-27

`app/controls.css` is shared by Settings, the replay chapter picker and the live
component gallery. Native selects retain keyboard navigation and mobile pickers:
44 px minimum height, 16 px text, 14 px left padding, 48 px text clearance on the
right, and a 20 px rounded chevron inset 14 px. Surfaces, border and arrow follow
the light/dark tokens. Hover strengthens the border; keyboard focus uses the red
text token and a soft ring. Disabled fields are muted; reduced motion and forced
colors are supported. Disclosures use the same chevron and right inset, rotating
only when expanded. The gallery shows default, focus, disabled and expand states.

Settings switches align to the right of their title and description. Secondary
actions such as “Practice again” use an outlined secondary button below the
description, left-aligned, on desktop and mobile. Use the shared panel, border and
radius tokens, a 44 px minimum height, and no link underline. Keep the action
separate from the on/off control.

**AI opponent.** Keep built-in difficulty choices and Arena AI in the same selector.
Selecting Arena reveals its policy selector and leaderboard link inside the same
setting. Use the shared `.sz-control-child`: a quiet table-colored surface, inset
content and a left guide line. Align it below the parent control on desktop and
mobile; never give it a separate settings divider. Hide the whole child group
for built-in opponents, retaining the selected policy when switching back.
