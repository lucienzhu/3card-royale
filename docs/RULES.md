# 3Card Royale · Standard Rules 1.0

Three cards. Play your way. One ordinary deck, two players, from 2 to Ace.

[简体中文](RULES.zh-CN.md)

## 1. Objective and setup

Use one 52-card deck without jokers. Both players start at level 2 with 8 private hand cards and no wounds. Choose the first attacker randomly. Reach Ace, then win the game in which you are playing your own Ace level to pass the final challenge and win the match.

One attack and its defense form a combat. A round contains one attack by each player. A player reaching 5 wounds ends the game. Several games and level advances form the match.

## 2. The shared flower card

The **flower card** is the wildcard, called 花牌 in Chinese. It is one of the deck's hearts, not an extra card.

Both players use ♥2 in the first game. After each game, advance the winner's level; the heart of that new level becomes both players' flower card in the next game. Personal levels may differ. For example, a winner reaching 7 makes ♥7 the next shared flower.

The **level owner** is fixed at the start of a game: the initial attacker in the first game, then the previous game’s winner. Their level sets the shared flower. Rotating first attack between rounds does not change the level owner.

The flower remains fixed throughout a game, including swaps, combats and personal Ace resets. It works from the hand or the wound area. Evaluate the strongest legal hand it can form. A three-card play or four of a kind cannot duplicate another exact virtual card face in that play; five of a kind is the explicit fifth-rank exception below. Suits never break ties.

## 3. Plays and hand ranks

Select your own hand cards, your own public wounds, or a mix. Usually play 3 cards. A 4-card play must be four of a kind; a 5-card play must be five of a kind. Attack and defense may use different numbers of cards: any legal 3-, 4- or 5-card play may answer another. You need not follow suit or hand type and may defend with a weaker hand. Each physical card may appear only once in a play. Never play an opponent's cards.

All examples below use ♥2 as the flower card, strongest first:

| Hand | Points | Requirement | Example |
| --- | --- | --- | --- |
| Five of a kind | 7 | All four natural cards of one rank plus the flower | A♠ A♥ A♣ A♦ + ♥2 |
| Four of a kind | 6 | Four equal ranks; may use the flower | 7♠ 7♥ 7♣ 7♦ |
| Three of a kind | 5 | Three equal ranks; may use the flower | Q♠ Q♥ Q♣ |
| Straight flush | 4 | Three consecutive ranks of one suit | 6♣ 7♣ 8♣ |
| Flush | 3 | Three of one suit, not a straight | 3♦ 8♦ K♦ |
| Straight | 2 | Three consecutive ranks, not all one suit | 4♠ 5♥ 6♣ |
| Pair | 1 | Two equal ranks and one different rank | 9♠ 9♥ K♣ |
| High card | 0 | Any other three cards | 3♠ 8♥ K♣ |

Five of a kind requires the current flower and all four natural cards of its declared rank. No extra wildcard or duplicate physical card is allowed. Its rank cannot equal the flower's level: with ♥7 wild, the four natural 7s already include ♥7, so no fifth 7 exists. Those four still form four of a kind.

The flower can also complete smaller hands: 7♠ 7♣ 7♦ + ♥2 is four of a kind. Five of a kind versus four of a kind differs by 1 point; versus high card, by 7.

## 4. Comparison and combat effects

Compare points first, then ranks within the same hand type. Ace is highest, 2 lowest. Equal-rank hands compare their repeated rank; straights and straight flushes compare their high card; pairs compare the pair, then the kicker; flushes and high cards compare ranks in descending order. Natural and wildcard-assisted hands of equal strength are equal.

A23 is a 3-high straight, lower than 234. QKA is Ace-high, the highest straight. KA2 is not a straight.

The attacker reveals a play; the defender sees it before choosing. An attack win adds wounds to the defender equal to the point difference. A defense win grants the defender that many swap opportunities. A rank-only win within the same type deals 1 wound or earns 1 swap. An exact tie has no effect.

Discard both plays first. Refill each used wound position face up, attacker first, then defender. These new cards do not change the hand just compared. Then apply the entire damage or all earned swap opportunities. All wounds are public. Reaching at least 5 wounds loses the game. **Do not cap damage at 5:** add every wound and use the full final wound difference for advancement.

## 5. Defensive swaps

Spend 1 opportunity per swap. Give one of your cards and receive the destination card. You may repeat routes or stop early.

| Your source | Available destinations |
| --- | --- |
| Hand | Random hidden enemy hand card / specified enemy wound / own wound / draw pile |
| Wound | Random hidden enemy hand card / specified enemy wound / own hand / draw pile |

Enemy hand swaps are random; do not reveal or select the hidden identity. Public-card swaps exchange the two cards directly. A draw-pile swap discards your source first, then draws one card into its position. Cards entering hands remain private; cards entering wound areas are public. Every area's card count and each player's wound total remain unchanged. Swapping never heals or deals extra damage. The shared flower remains wild after changing owners.

## 6. Rounds and refills

If the game continues, reverse attack and defense after the first combat without refilling hands. After the second combat, the round ends. Keep all unused cards and refill each hand to 8, this round's first attacker first. Wounds remain.

Reverse the first attacker next round, giving the sequence A→B→B→A. Larger plays consume their actual card counts; the rule remains “refill the hand to 8 at round end.” Playing a wound only replaces that position and never reduces wounds.

Whenever the draw pile runs out, shuffle the discard pile and continue. This may draw the card just discarded.

## 7. Advancement and the match

The game winner advances by the **full final wound difference**, capped at Ace. If the opponent has 7 wounds and you have 2, advance 5 levels. Excess advancement beyond Ace is not carried over.

Reaching Ace alone does not win. You must be the level owner playing your own Ace game (shared ♥A) and win that game. If you are personally at Ace while your rival is playing their 10, winning only earns you the next game playing your own Ace; losing does not count as an Ace-challenge loss. Even if both players are at Ace, only this game’s level owner can pass the challenge.

Only a loss while playing your own Ace game records a failed challenge. On the third, that player resets to level 2 and clears the count; the rival keeps their level. The first two failures leave you at Ace. Challenge ownership is locked at game start and is independent of who attacks or defends in a particular combat.

After a game, collect and shuffle all 52 cards, clear both wound areas and deal 8 each. Keep only levels and unreset Ace-loss counts. The previous winner attacks first and their new level sets the next shared flower. If the loser resets from Ace to 2, use the winner's level for the flower.

## 8. Standard version

Standard 1.0 adds five of a kind for 7 points to the shared-flower, five-wound, public-wound, four-route-swap rules, with winner-first games and three-loss Ace resets. Version 0.3.8 and earlier remain historical variants; their records are not rewritten.
