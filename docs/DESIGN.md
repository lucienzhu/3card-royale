# Design language

[简体中文](DESIGN.zh-CN.md) · [Visual identity](https://lucienzhu.github.io/gk-royale-playtest/brand.html?lang=en)

One card, one flower, two players; everything else is paper and ink. The bougainvillea mark ties a game made in Shenzhen to an ordinary deck: three identical bracts rotated by 120°, each with a small golden centre. The mark is a flat gold card, with no metallic light and no texture. The card back is that same card, and the flower card is that card with an index.

| Name | Role | Value |
| --- | --- | --- |
| Red flower (红花) | the flower, your identity, primary buttons, selection | `#C5416B` (small text on black uses `#E38BA6`) |
| Egret white (白鹭) | day ground: page `#F6F7F6`, table `#ECEEED`, panels `#FFFEFA`; text at night | `#F6F7F6` |
| Board black (黑盘) | night ground: page `#121417`, table `#1A1D21`, panels `#24282D`; day text `#2A3331` | `#121417` |
| The gold card | mark, card back and flower card: face `#ECCE80`, edge `#A17C35`, centres `#F2CD5D` | `#ECCE80` |
| Rival gold | the rival's flower, bracts and vine marker; as text `#946F06` (day) / `#E4C46A` (night) | `#C4931C` |
| Circuit green (绿板) | brand and website only, never on the table | `#16765F` |

The red flower and the gold card are identical in both themes; only grounds and functional text switch for contrast. These are design cues, not official city colours or demographic research.

The card is one component: a white face with an index in ink or flower red. Ranks use a thirteen-glyph subset of Archivo 800 (OFL); suits are inline SVG written into the card, 0.66 of the rank size, stacked in one column with it, and "10" is narrowed. Cards that lie on the table (attack, defence, wounds) share one size and cast no shadow; held cards are larger and lifted with a shadow. The flower on the flower card is a translucent watermark in the same corner as every other card's suit watermark.

The interface uses the system sans; the wordmark is Noto Sans SC Bold (Chinese) with Archivo (English), outlined to SVG. Three radii only: 4, 8 and 16. Two buttons: red fill, ink underline. Each swap target zone carries one red circle-⇄ badge. Wounds are a count beside the name plus five bracts filled in the identity colour. Never use colour as the only way to identify a state.

The shared flower of rules 1.0 needs a single indicator; historical variants keep separate wildcards. Keep the first action clear, reveal full rules on demand, and preserve the player's selection when opening help. English is 3Card Royale; Simplified Chinese is 深圳花牌. Translation must distinguish a small game from the full race to Ace.

Original assets use MIT. Custom emoji PNGs are images for platforms that support uploads, not universal Unicode emoji. The mark is stylized and is not a claim of uniqueness or botanical realism.
