const { Game } = require("../sdk/index.js");
const { chooseAction } = require("../sdk/policy.js");
const game = new Game(42);
for (let n = 0; n < 10000 && game.save().phase !== "match_over"; n++) {
  const actions = game.legalActions(),
    actor = game.actor;
  game.step(
    actor === null
      ? actions[0]
      : chooseAction(game.observation(actor), actions),
  );
}
console.log(
  JSON.stringify(
    { phase: game.save().phase, results: game.save().results },
    null,
    2,
  ),
);
