# NN · structured v2

Author: [@lucienzhu](https://github.com/lucienzhu) · MIT.

Behavioral cloning of SDK Code AI. A shared MLP reads the current 336-value
observation and the 396-value prefix encoding, then predicts 65 fixed token logits.
Conditional masks constrain each step; only the completed action changes the game.
Three-, four- and five-card plays, swaps and declines share one versioned vocabulary.

256 → 128 hidden layers, 228,929 parameters, 916,663-byte FP32 ONNX, epoch 16.
[Training, exact recipe, data generation and limitations](../../../training/structured/README.md).
[Contract](../../../docs/ACTIONS.md) · [3,000-game comparison](../../../models/structured-policy/evaluation.json).

This baseline wins 23.9% against Hard Code AI (239/1,000 games), below the legacy
NN's 42.6% on the same paired seeds. The teacher provided no positive skip/stop
examples. The contract supports those actions, but this checkpoint has not learned
them through positive demonstrations. Improved interface semantics do not imply
improved playing strength. Official Arena Elo is assigned separately at release.

The submitted model is the same checksum-verified artifact as
`models/structured-policy/policy.onnx`. Run `npm run arena:submit -- --policy
nn-structured-v2` to regenerate the four-game validation receipt.
