const { Game, evaluate } = require("../sdk/index.js");
const { chooseAction } = require("../sdk/policy.js");
let game;
require("node:readline")
  .createInterface({ input: process.stdin })
  .on("line", (line) => {
    try {
      const v = JSON.parse(line);
      if (v.op === "evaluate") {
        console.log(
          JSON.stringify({
            evaluations: v.cases.map((x) => evaluate(x.cards, x.level)),
          }),
        );
        return;
      }
      if (v.op === "init") game = new Game(v.seed, v.first ?? undefined);
      else if (v.op === "restore") game = Game.restore(v.state);
      else if (v.op === "step") game.step(v.action);
      else if (v.op !== "inspect") throw Error("Unknown op");
      const actions = game.legalActions(),
        result = {
          state: game.save(),
          actions,
          observations: [game.observation(0), game.observation(1)],
        };
      if (v.policy && game.actor !== null)
        result.policy = chooseAction(game.observation(game.actor), actions);
      console.log(JSON.stringify(result));
    } catch (e) {
      console.log(JSON.stringify({ error: e.message }));
    }
  });
