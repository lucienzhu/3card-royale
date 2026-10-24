# 三档难度

[English](DIFFICULTY.md) · [原始对战记录](experiments/difficulty-v1/evaluation.json)

设置 → 偏好 → 难度：

| 难度 | 策略 | 特点 |
| --- | --- | --- |
| 简单 | Easy AI | 少看一些组合，换牌只从牌堆抽取 |
| 中等 | NN AI | 现有 256/128 模仿学习模型 |
| 困难 | Code AI | 比较全部合法动作的原有规则策略 |

新玩家默认简单；已有 `code` / `nn` 偏好分别保留为困难 / 中等。
切换从 AI 的下一次决策生效，不重新发牌。NN 加载或推理失败时回退 Easy AI，并显示提示。
历史规则仍使用原版 Code AI，界面会注明；三档难度用于标准规则 1.0。

## 简单 AI 怎样变弱

- 进攻：不重复抽取最多 **64** 个合法组合，再按 Code AI 的标准选出其中最好的一手。
- 防守：如果有不会立即输局的应对，先排除立即输局的组合，再从中抽取最多 64 手比较。
- 换牌：每次机会都换掉优先级最低的牌，从牌堆抽入一张，不与对手的牌交换。

它认识牌型、知道眼前危险，但会漏掉组合。不会根据玩家胜率调整强度，
也不会故意选择能避开的致命防守。采样只使用当前公开观察，采用 FNV-1a 与 xorshift32；
相同观察得到相同选择，不消耗发牌随机数，不读取对手暗牌或牌堆顺序。这仍是规则策略，
没有训练新模型，也没有向后搜索。

[JS](../sdk/easy-policy.js) 与 [Python](../python/threecard_royale/easy_policy.py) 采用相同实现，
以同一批观察核对动作。玩法、特征编码、原有 Code AI 和已部署 ONNX 权重均保持不变。
Rust / C++ 保留原有 Code AI；Easy 提供 JS 与 Python 实现。

## 实测

每组 **1,000 小局**，使用从 81,000,000 开始的相同 500 个 Gym 评估种子，
交换席位、平衡先攻，从正常 2 级开始。无非法动作、无截断。

| 策略 | 对手 | 获胜 |
| --- | --- | --- |
| Easy AI | Code AI | **361 / 1,000 · 36.1%** |
| Easy AI | NN AI | **441 / 1,000 · 44.1%** |
| NN AI | Code AI | **462 / 1,000 · 46.2%** |

Easy 明显更弱；中等与困难仍比较接近。难度标签不等于 Elo，也不代表真人胜率。
当前上线 **easy-v2**，上限为 **64 手**。此前 48 手版本在同一组种子上对 Code 胜率为
30.4%，对 NN 为 39.0%（[历史记录](experiments/difficulty-v1/evaluation-48.json)）。
64 是比较这两种上限后选定的，因此这组数据用于可复现对照，不再是未参与选型的独立测试集。
另一组从 82,000,000 开始的 120 局校准使用相同的牌堆换牌策略：

| 候选上限 | 对 Code AI 获胜 |
| --- | --- |
| 24 | 16 / 120 · 13.3% |
| 32 | 24 / 120 · 20.0% |
| 48 | 34 / 120 · 28.3% |
| **64** | **44 / 120 · 36.7%** |

64 是比较后选定的难度参数，没有特殊的数学意义，也不是已证明的最优值。
开局 8 张手牌的 56 个三张组合可以全部看完；加入公开伤牌及合法四张、五张组合后，候选可能超过 64。
限制比较范围，让它会漏掉好牌，但保留正常的选牌逻辑和眼前的防守意识。
[当前校准](experiments/difficulty-v1/calibration.json)与
[最初约一半概率跳过换牌的实验](experiments/difficulty-v1/calibration-initial.json)分别保存。
此前纯随机策略对 Code AI 仅赢 0.1%，因此没有直接用作练习对手。

安装[训练依赖](../training/README.md)后复现：

```sh
python training/evaluate_difficulties.py --output artifacts/difficulties-64.json
python training/evaluate_difficulties.py --easy-budget 48 --output artifacts/difficulties-48.json
python training/calibrate_easy.py --output artifacts/easy-calibration.json
node tests/easy-policy.cjs
PYTHONPATH=python python -m unittest discover -s tests -p test_easy_policy.py
```

报告保留每局种子、席位、结果、动作轨迹摘要、源代码校验值和模型校验值。

在 Gym 中使用简单对手：

```python
from threecard_royale.gym_env import RoyaleEnv
from threecard_royale.easy_policy import choose_action

env = RoyaleEnv(opponent=choose_action)
```
