# NN AI

The game loads `manifest.json` and verifies the model's SHA-256 before inference.
The web game uses the **256 → 128 → 1** MLP. Every legal
candidate receives a score from the same network; the highest score wins.

Input: 336 public observation features plus 72 candidate-action features. The
first projection is factored for efficiency, mathematically equivalent to one
408-dimensional input layer. There are two ReLU hidden layers and one scalar
output layer. No sequence, hidden opponent cards or search is provided.

The selected model contains 137,729 parameters and is 552,407 bytes in FP32 ONNX.
Its SHA-256 is recorded in `manifest.json`.
The 5 MB limit applies to each model. The separately cached ONNX Runtime WASM is
about 14 MB uncompressed and is downloaded only when NN AI is selected.

This is imitation learning from Code AI, not reinforcement learning. It is a
first policy baseline, not a claim of improved strength. Epoch 5 minimizes
validation loss; its held-out test action agreement is 89.36% and it wins 462/1,000
evaluation games against Code AI.

See [experiment results](../../docs/experiments/nn-policy-v1/README.md) and
[reproduction instructions](../../training/README.md).

Only the deployment model is kept here. Other architectures are preserved in
Git tag `nn-policy-experiments-20261024` and the local experiment artifacts.

Run `python training/reproduce.py` to rebuild data and train 256/128. That command
keeps its outputs separate; `training/publish.py --model 256 --root artifacts/nn-policy-256`
explicitly selects a rerun for deployment.
