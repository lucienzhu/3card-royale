# NN policy · 256

[简体中文](MODEL.zh-CN.md) · [RL environment](RL.md) · [Reproduce](../training/README.md)

NN AI is a **behavioral-cloning baseline** trained to imitate Code AI. It uses one
current public observation and scores the legal moves. It has no recurrent memory,
search, private opponent cards or reward-trained value function. The Gym environment
supports RL experiments; a PPO trainer and critic are not implemented.

## Released model

| Item | Value |
| --- | --- |
| Model / features / task | `bc-10000-mlp256-v1` / `gym-v1` / `game` |
| Rules / SDK | 1.0.0 / 0.2.0 |
| Network | 336 state + 72 candidate → 256 → 128 → 1 |
| Parameters / ONNX | 137,729 / 552,407 bytes; FP32, opset 17 |
| Data | 10,000 completed small games; 252,859 decisions from both Code AI seats |
| Selection | Epoch 5, lowest validation cross-entropy |
| Held-out agreement | 89.36% of Code AI action labels |
| Evaluation | 462 / 1,000 games won against Code AI |

The two hidden layers use ReLU. Each candidate shares the same scoring network:
`h = ReLU(W_state × state + W_action × candidate + bias)`, then `256 → 128 → 1`.
The factored first projection is equivalent to concatenating 408 inputs. **512 is
the candidate capacity, not a hidden-layer size or a fixed action-class head.**

The [manifest](../models/nn-policy/manifest.json) identifies the deployed
[ONNX](../models/nn-policy/policy-mlp-256-v1.onnx). SHA-256:
`5b98061d4188c116080eb6784c6378536a89e0b3c1db333df88217379e4dde13`.
Accuracy measures imitation, not strength. Equivalent tied moves can count as
errors. Evaluation uses 500 held-out seeds with the NN seats swapped, normal
level-2 starts and balanced first movers; it does not establish an advantage over
Code AI. See [metrics and profiling limits](experiments/nn-policy-v1/README.md).

## Shared Gym → Torch → ONNX → JS contract

[Python encoding](../python/threecard_royale/gym_env.py) and
[JS encoding](../sdk/features.js) use the same `gym-v1` features.

| Tensor | Shape / dtype | Construction |
| --- | --- | --- |
| `state` | B × 336 / float32 | Row-major `cards` (6 × 52), then 24 `meta` values |
| `candidates` | B × N × 72 / float32 | Current legal-action features, in SDK order |
| `logits` | B × N / float32 | One unnormalized score for each candidate |

Gym pads to 512 rows and supplies `action_mask`; JS passes only N legal rows.
B and N are dynamic in ONNX. For a padded batch, mask invalid logits **before**
cross-entropy, sampling or argmax. The ONNX graph does not apply a mask itself.
Map the chosen index back to that observation's legal actions; indices have no
meaning in the next state. Do not sample if no legal actions remain.

The six card zones are own hand, own wounds, rival public wounds, discard, own
active play and rival active play. [RL](RL.md#observation-and-action-contract)
defines all candidate columns, including swap/skip distinctions. `meta[23]` is
the task flag: 0 for `game`, 1 for `match`. The released model and browser encoder
use `game`; switching to `match` is a new training/evaluation setting.

## Run the released ONNX in Gym

From the repository root, install the [pinned dependencies](../training/README.md),
then `.venv/bin/pip install --no-deps -e ./python`. Run this with that Python:

```python
import numpy as np
import onnxruntime as ort
from threecard_royale.gym_env import RoyaleEnv

session = ort.InferenceSession(
    "models/nn-policy/policy-mlp-256-v1.onnx",
    providers=["CPUExecutionProvider"],
)
env = RoyaleEnv(episode="game", player=0)  # rival: Code AI
try:
    obs, info = env.reset(seed=42)
    done = info["reset_terminal"] or info["reset_truncated"]
    while not done:
        legal = np.flatnonzero(obs["action_mask"])
        assert legal.size > 0
        state = np.concatenate([obs["cards"].ravel(), obs["meta"]])
        logits = session.run(["logits"], {
            "state": state.astype(np.float32)[None, :],
            "candidates": obs["candidates"][legal][None, :, :],
        })[0][0]
        assert np.isfinite(logits).all()
        action = int(legal[logits.argmax()])
        obs, reward, terminated, truncated, info = env.step(action)
        assert not info["invalid_action"]
        done = terminated or truncated
finally:
    env.close()
```

Only the public Gym observation enters the model. `env.game`, `Game.save()` and
conformance/debug snapshots contain private state and must stay outside policy inputs.

## Reproduction and TensorBoard

[The recipe](../training/recipe-256.json) regenerates Code AI self-play, verifies
100 shard hashes, trains 256/128 and exports/evaluates the selected checkpoint.
Games stay together across the 8,000 / 1,000 / 1,000 train/validation/test split.
The actual tar.gz is 112,497,347 bytes, so data and `.pt` files are regenerated;
Git stores code, checksums, reports, TensorBoard events and the selected ONNX.
The [full rerun](experiments/nn-policy-v1/reproduction-256.json) reproduced both
the data and ONNX byte-for-byte on the recorded environment.

```sh
.venv/bin/python training/reproduce.py
.venv/bin/tensorboard --logdir artifacts/nn-policy-256/tensorboard --port 6006
```

Use a fresh `--root` for another run. Track `loss/train`, `loss/val`,
`accuracy/train`, `accuracy/val` and the attack/defend/swap accuracy tags. Test
metrics are logged once after checkpoint selection. Full setup, seeds, optimizer,
export and profiling commands: [training guide](../training/README.md).

## Extending the baseline with RL

This is an integration plan, not an existing training command:

1. Reproduce the BC run and load `models/mlp-256.pt` from its artifact directory
   into `training.train.PolicyMLP(256, 128)` using `checkpoint['state_dict']`.
   This restores policy weights, not optimizer state.
2. Use masked logits as the actor distribution; sample during rollouts and use
   argmax for a deterministic evaluation. A PPO-style extension needs a separate
   critic, initially based only on the same public state.
3. Store each observation, candidate table, mask, selected index, reward, old log
   probability, value and terminal/truncation flags together. Recompute updates
   against that stored candidate table, never against the next state's actions.
4. Start with `episode='game'` and the existing +1/-1 terminal reward. One Gym step
   can also execute opponent moves and host transitions: a learner step is not a
   single card play. Preserve `terminated` versus `truncated`; bootstrap from the
   final observation for an external cutoff, not a reset observation. See
   [Gymnasium's time-limit guidance](https://gymnasium.farama.org/tutorials/gymnasium_basics/handling_time_limits/).
5. Keep a frozen Code AI evaluation and held-out seeds with both seats. Report
   wins, truncations and illegal moves separately; log RL reward/loss/evaluation
   curves separately from the existing BC train/validation curves.
6. Export the selected actor alone with the same tensor names and dynamic action
   axis. A changed task or feature meaning needs an explicit new model contract
   and matching encoder/worker support. Retrain, check parity and profile before
   changing the deployed manifest.

The browser [worker](../app/policy-worker.js) verifies rules, feature version,
SHA-256 and the 5 MB model limit. [Integration](../app/policy-ai.js) provides Code AI
fallback on load/inference failure. Code AI stays the default. The separately
cached WASM runtime is about 14 MB; it is not included in the model-size figure.
