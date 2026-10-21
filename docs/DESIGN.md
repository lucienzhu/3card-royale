# Design language

[简体中文](DESIGN.zh-CN.md) · [Visual identity](https://lucienzhu.github.io/gk-royale-playtest/brand.html?lang=en)

One card, one flower, two players; the ground is Shenzhen's green, the flower its red. The bougainvillea mark ties a game made in Shenzhen to an ordinary deck: three identical bracts rotated by 120°, each with a small golden centre. The mark is a flat gold card, with no metallic light and no texture. The card back is that same card, and the flower card is that card with an index.

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

The interface uses the system sans; the wordmark is Noto Sans SC Bold (Chinese) with Archivo (English), outlined to SVG. Three radii only: 4, 8 and 16. Two buttons: red fill, ink underline. The menu marks the current tab by ink colour and weight alone, with no underline. Each swap target zone carries one red circle-⇄ badge. Wounds are a count beside the name plus five bracts filled in the identity colour. Never use colour as the only way to identify a state.

The shared flower of rules 1.0 needs a single indicator: a small gold token in your heading row with the rank and suit side by side (`2♥`), so it never makes the row taller; historical variants keep separate wildcards. Keep the first action clear, reveal full rules on demand, and preserve the player's selection when opening help. English is 3Card Royale; Simplified Chinese is 深圳花牌. Translation must distinguish a small game from the full race to Ace.

On a phone held upright the table gives its height to the cards you play with. The menu is 44 px, the level track 34 px, the rival's hand is backs only and smaller, and your hand grows with the height the screen allows: 52 × 74 below 580 px, 70 × 98 around 667 px, 84 × 118 from 800 px. Wound racks keep their place so the table never jumps when the first wound lands.

**Circuit board (Easter egg).** Off by default; one switch in Settings › Preferences turns the table into a live board. The mask is circuit green, the copper under it a lighter green, pads gold, silkscreen white; text on the board turns light and the action panel becomes a dark module. Each card zone is a chip, wired the way the game flows: each hand to its wound rack, each wound rack to the attack zone, the attack zone to the defence zone. The stock and discard take no part in the circuit. A small rectangular SMD LED at the top-left of the attack and defence zones lights, with the bus that drives it, in the colour of whoever has to act: red for you, gold for the rival. Packets of light run along the buses; with reduced motion set in the system they stand still.

Original assets use MIT. Custom emoji PNGs are images for platforms that support uploads, not universal Unicode emoji. The mark is stylized and is not a claim of uniqueness or botanical realism.
