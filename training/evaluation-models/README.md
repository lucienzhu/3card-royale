# Retained scoring checkpoints

These are the original validation-selected ONNX weights from the five-width
SDK Code AI imitation experiment. They are stored for benchmark reproduction;
they do not replace the browser's selected policy or add leaderboard entries.

| Directory | Hidden layers | Selected epoch | Bytes |
| --- | --- | ---: | ---: |
| `nn-64` | 64 → 32 | 10 | 114,638 |
| `nn-128` | 128 → 64 | 10 | 244,180 |
| `nn-256x512` | 256 → 512 | 5 | 948,695 |

Each directory contains the artifact, a SHA-256 manifest and the corresponding
training metrics. The 256 → 128 and 512 → 256 artifacts already live in
`policies/entries/nn-256-v1/` and `policies/entries/nn-512-v1/`; the evaluation
loads those copies. All five use the same 336-state / 72-candidate encoder and
production ONNX runtime. No weights were retrained for this evaluation.

The artifacts were recovered from the original local NN Policy experiment's
`artifacts/nn-policy/models/` directory. Sizes and metrics match the committed
[training report](../../docs/experiments/nn-policy-v1/training.json).
The two already-retained models also matched SHA-256 byte for byte.

From the repository root:

```sh
node training/evaluate-benchmark.mjs --output /tmp/royale-benchmark
```

This runs every table entry against browser Code AI and SDK Code AI, except
SDK's self-match. See the [evaluation protocol](../../docs/experiments/complete-baseline/README.md).
