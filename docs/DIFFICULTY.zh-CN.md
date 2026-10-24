# 三档难度

[English](DIFFICULTY.md) · [原始对战记录](experiments/difficulty-v1/evaluation.json)

设置 → 偏好 → 难度：

| 难度 | 策略 | 特点 |
| --- | --- | --- |
| 简单 | Easy AI | 少看一些组合，换牌只从牌堆抽取 |
| 中等 | NN AI | 现有 256/128 模仿学习模型 |
| 困难 | 牌桌 Code AI | 原牌桌策略，保留组合并评估换牌收益 |

新玩家默认简单；已有 `code` / `nn` 偏好分别保留为困难 / 中等。
切换从 AI 的下一次决策生效，不重新发牌。NN 加载或推理失败时回退 Easy AI，并显示提示。
历史规则仍使用原版 Code AI，界面会注明；三档难度用于标准规则 1.0。

## 简单 AI 怎样变弱

- 进攻：不重复抽取最多 **64** 个合法组合，再按固定 SDK 基线的标准选出其中最好的一手。
- 防守：如果有不会立即输局的应对，先排除立即输局的组合，再从中抽取最多 64 手比较。
- 换牌：每次机会都换掉优先级最低的牌，从牌堆抽入一张，不与对手的牌交换。

它认识牌型、知道眼前危险，但会漏掉组合。不会根据玩家胜率调整强度，
也不会故意选择能避开的致命防守。采样只使用当前公开观察，采用 FNV-1a 与 xorshift32；
相同观察得到相同选择，不消耗发牌随机数，不读取对手暗牌或牌堆顺序。这仍是规则策略，
没有训练新模型，也没有向后搜索。

[JS](../sdk/easy-policy.js) 与 [Python](../python/threecard_royale/easy_policy.py) 采用相同实现，
以同一批观察核对动作。玩法、特征编码、SDK 基线和已部署 ONNX 权重均保持不变；困难档恢复原牌桌策略。
Rust / C++ 保留原有 SDK Code AI；Easy 提供 JS 与 Python 实现。

## 网页困难档：原牌桌策略

接入 NN 时，困难档误接到了较简单的 SDK 训练策略。现在恢复调用原本的
`Game.aiStep()`：保留剩余组合、比较换牌收益，也恢复盲换对手手牌。
Easy 仍为 64 候选，NN checkpoint 未改变。

使用实际网页引擎，每组 1,000 局，沿用相同 Gym 种子映射、交换席位并平衡先攻：

| 策略 | 对手 | 胜局 |
| --- | --- | --- |
| Easy 64 | 牌桌 Code AI（困难） | **315 / 1,000 · 31.5%** |
| NN AI | 牌桌 Code AI（困难） | **412 / 1,000 · 41.2%** |
| 牌桌 Code AI（困难） | SDK Code AI 基线 | **547 / 1,000 · 54.7%** |
| NN AI（对照） | SDK Code AI 基线 | **462 / 1,000 · 46.2%** |

4,000 局全部正常完成，无非法动作。对照组逐局复现了之前 NN / SDK 的胜负。
[完整记录](experiments/difficulty-v1/table-code-evaluation.json)。评估直接执行
`Game.aiStep()`，保留原牌桌的出牌与弃牌顺序，不用排序后的 SDK 动作替代。

回归检查覆盖 100 个完整小局、2,550 次相同决策，含 572 次换牌（262 次盲换）。
切换难度和选牌不改变存档或发牌随机数。另核对了 3,000 个初始状态，与接入 NN
前完全一致；规则和发牌引擎未改动。

## 固定 SDK 基线对比

每组 **1,000 小局**，使用从 81,000,000 开始的相同 500 个 Gym 评估种子，
交换席位、平衡先攻，从正常 2 级开始。无非法动作、无截断。

| 策略 | 对手 | 获胜 |
| --- | --- | --- |
| Easy AI | SDK Code AI | **361 / 1,000 · 36.1%** |
| Easy AI | NN AI | **441 / 1,000 · 44.1%** |
| NN AI | SDK Code AI | **462 / 1,000 · 46.2%** |

Easy 在这些对比中更弱。难度标签不等于 Elo，也不代表真人胜率；恢复后的困难档结果单列在上方。
当前上线 **easy-v2**，上限为 **64 手**。此前 48 手版本在同一组种子上对 SDK Code 胜率为
30.4%，对 NN 为 39.0%（[历史记录](experiments/difficulty-v1/evaluation-48.json)）。
64 是比较这两种上限后选定的，因此这组数据用于可复现对照，不再是未参与选型的独立测试集。
另一组从 82,000,000 开始的 120 局校准使用相同的牌堆换牌策略：

| 候选上限 | 对 SDK Code AI 获胜 |
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
此前纯随机策略对 SDK Code AI 仅赢 0.1%，因此没有直接用作练习对手。

安装[训练依赖](../training/README.md)后复现：

```sh
python training/evaluate_difficulties.py --output artifacts/difficulties-64.json
python training/evaluate_difficulties.py --easy-budget 48 --output artifacts/difficulties-48.json
python training/calibrate_easy.py --output artifacts/easy-calibration.json
python training/evaluate_table_policy.py --node node --output artifacts/table-code.json
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
