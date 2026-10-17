import { Game, type Action, type State } from "../sdk/index";
import { chooseAction } from "../sdk/policy";
const game = new Game(42, 0);
if (game.actor !== null) {
  const action: Action = chooseAction(game.observation(game.actor));
  game.step(action);
}
const saved: State = game.save();
Game.restore(saved);
// @ts-expect-error only the two real players may observe a game
game.observation(2);
const invalid: Action = {
  type: "swap",
  source: { zone: "hand", index: 0 },
  // @ts-expect-error a blind swap does not name a private target card
  target: { zone: "blind", card: 42 },
};
void invalid;
