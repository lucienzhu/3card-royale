# NN AI

The game loads `manifest.json` and verifies the model's SHA-256 before inference.
This experimental branch uses the **256 → 512 → 1** MLP. Every legal
candidate receives a score from the same network; the highest score wins.

Input: 336 public observation features plus 72 candidate-action features. The
first projection is factored for efficiency, mathematically equivalent to one
408-dimensional input layer. There are two ReLU hidden layers and one scalar
output layer. No sequence, hidden opponent cards or search is provided.

The selected model contains 236,801 parameters and is 948,695 bytes in FP32 ONNX.
Its SHA-256 is recorded in `manifest.json`.
The 5 MB limit applies to each model. The separately cached ONNX Runtime WASM is
about 14 MB uncompressed and is downloaded only when NN AI is selected.

This is imitation learning from Code AI, not reinforcement learning. It is a
first policy baseline, not a claim of improved strength. The saved experiment
folder also contains 64/32, 128/64, 256/128 and 512/256 variants and their checkpoints.

See [experiment results](../../docs/experiments/nn-policy-v1/README.md) and
[reproduction instructions](../../training/README.md).

The checked-in 512/256 alternative has 340,993 parameters and is 1,365,463 bytes.
Its best validation checkpoint is epoch 5; switch deployments with
`python training/publish.py --width 512` after generating/restoring local artifacts.

Select this architecture with `python training/publish.py --model 256x512`.
