# 策略基线

纯代码、整手评分和自回归模型共享 **actions-v2**：实体牌 ID 固定，完整动作一次提交，
支持三、四、五张牌。动作协议统一，模型结构和训练目标可以不同。

| 神经网络策略 | 隐藏层 | 参数 | ONNX | 决策样本 | 选模 epoch |
| --- | --- | ---: | ---: | ---: | ---: |
| [整手评分](../training/README.md) | 256 → 128 | 137,729 | 0.55 MB | 252,859 | 5 |
| [自回归](../training/structured/README.md) | 256 → 128 | 228,929 | 0.92 MB | 252,906 | 16 |

两者均模仿 SDK Code AI，各自生成 10,000 局自对弈数据，按整局划分训练、验证和测试集。
它们是独立策略提交，通过同一动作协议评估。产物标识保持固定，便于复现。

[统一评估](experiments/neural-baselines/README.md)：两种模型分别与竞技场其余六个公开策略对战，
每组 1,000 小局，均使用种子 91,000,000–91,000,499，交换座位、平衡先攻、从 2 级开局。
合计 **11,000 个不同小局**，全部完成，无非法动作、无截断；两模型的直接对战只计一次。

| 对手 | 整手评分 · 256 → 128 | 自回归 · 256 → 128 |
| --- | ---: | ---: |
| Code AI (Hard) | 426/1,000 · 42.6% | 239/1,000 · 23.9% |
| SDK Code AI | 455/1,000 · 45.5% | 266/1,000 · 26.6% |
| Easy · 64 | 559/1,000 · 55.9% | 366/1,000 · 36.6% |
| 整手评分 · 512 → 256 | 505/1,000 · 50.5% | 298/1,000 · 29.8% |
| Random | 1,000/1,000 · 100.0% | 997/1,000 · 99.7% |

直接对战：自回归对整手评分 **288／1,000（28.8%）**，整手评分为 **712／1,000（71.2%）**。
整次决策的最高对手批次 p95 分别为 **1.289 ms（整手评分）**与 **0.958 ms（自回归）**，
Apple M1 / Node 22 / 单线程 WASM，包含编码和全部推理、不含首次加载；并非手机测量。

竞技场独立按固定基准评分：自回归 **Elo 1237（暂定）**，60 局 14 胜；整手评分是
**1440 固定基准**，80 局 60 胜。两者天梯对手集合不同，不能用总胜率直接排名。
[评分记录](../arena/results/reference-elo-v1/nn-structured-v2.json) · [天梯](../arena/results/leaderboard.json)

**评估对手：** 网页 Code AI（`code-table-v1`）是困难档；SDK Code AI 是固定的自对弈老师，
也是另一种评估对手。两者的成绩不能合并。[竞技场对照表](../arena.html#structured-results)
汇总各网络结构和纯代码策略，保留原始记录及性能测量口径。

[动作接口、Gym 与 RL](ACTIONS.md) · [自回归训练与复现](../training/structured/README.md)

## 整手评分 · 256 → 128

[English](MODEL.md) · [RL 环境](RL.zh-CN.md) · [复现步骤](../training/README.md)

整手评分策略是模仿 SDK Code AI 的**行为克隆基线**：读取当前公开观察，为合法动作评分。
没有循环记忆、搜索、对手暗牌或通过奖励训练的价值函数。Gym 环境已支持 RL 实验；
PPO 训练器和 critic 尚未实现。

相同配对种子下，均匀随机合法动作策略对两种 Code AI 均为 **0／1,000（0.0%）**，
无截断、无非法动作。[完整 19,000 局基准](experiments/complete-baseline/README.md)
覆盖五种评分网络、自回归模型与纯代码策略，使用原始检查点，并在同一环境测量整次决策延迟。
其中整手评分／自回归的最高对手批次 p95 为 1.322／0.873 ms，统计两种 Code AI 对手；
上方六对手评估的延迟样本不同。

### 检查点

| 项目 | 当前值 |
| --- | --- |
| 模型／特征／任务 | `bc-10000-mlp256-v1`／`gym-v1`／`game` |
| 规则／SDK | 1.0.0／0.2.0 |
| 网络 | 336 维状态 + 72 维候选动作 → 256 → 128 → 1 |
| 参数／ONNX | 137,729／552,407 字节；FP32，opset 17 |
| 数据 | 10,000 个完整小局，记录两席 Code AI 的 252,859 次决策 |
| 选模 | 第 5 个 epoch，验证集交叉熵最低 |
| 留出集动作一致率 | 89.36%，对照 Code AI 标签 |
| 对战评估 | 对 SDK Code AI 胜 455／1,000 · 45.5%（上方统一评估） |

两层隐藏层都用 ReLU，每个候选动作共享同一网络：
`h = ReLU(W_state × state + W_action × candidate + bias)`，再经过 `256 → 128 → 1`。
首层拆开计算，等价于拼接 408 维输入。**512 是候选动作容量，不是隐藏层大小，
也不是固定的 512 类动作输出头。**

[manifest](../models/nn-policy/manifest.json) 指向整手评分
[ONNX](../models/nn-policy/policy-mlp-256-v1.onnx)，SHA-256：
`5b98061d4188c116080eb6784c6378536a89e0b3c1db333df88217379e4dde13`。
动作一致率衡量模仿程度，不等于胜率；效果相同的并列动作也可能被算错。
对战使用 500 个留出种子、交换 NN 席位，从正常 2 级开局并平衡先攻；
结果不能证明 NN 强于 Code AI。详见[指标与性能测量边界](experiments/nn-policy-v1/README.md)。

## 评分张量 · Gym → Torch → ONNX → JS

以下张量是评分模型的内部接口。竞技场适配器将选中的候选转换为统一结构化动作后执行。
下方 Gym 示例直接使用候选索引适配器。

[Python 编码](../python/threecard_royale/gym_env.py)与
[JS 编码](../sdk/features.js)共用 `gym-v1` 特征。

| 张量 | 形状／类型 | 构成 |
| --- | --- | --- |
| `state` | B × 336／float32 | 按行展平 `cards`（6 × 52），再接 24 维 `meta` |
| `candidates` | B × N × 72／float32 | 当前合法动作特征，保持 SDK 顺序 |
| `logits` | B × N／float32 | 每个候选动作一个未归一化分数 |

Gym 补齐到 512 行并提供 `action_mask`；JS 只传 N 个合法候选。ONNX 的 B、N 均可变。
批次补齐时，须在交叉熵、采样或 argmax **之前**屏蔽非法分数，ONNX 图本身不做掩码。
选出的索引只能映射回这次观察的合法动作；下一状态的同一索引没有相同含义。
没有合法动作时不要采样。

六个牌区依次为己方手牌、己方伤牌、对手公开伤牌、弃牌、己方已出牌、对手已出牌。
[RL 文档](RL.zh-CN.md#观察与动作)列出候选特征，包括换牌与跳过的区别。
`meta[23]` 是任务标记：`game` 为 0、`match` 为 1。评分模型及其编码器使用 `game`；
改成 `match` 需要作为新的训练与评估设置。

## 在 Gym 中运行评分 ONNX

在仓库根目录，按[训练指南](../training/README.md)安装锁定依赖，
再执行 `.venv/bin/pip install --no-deps -e ./python`，用该环境运行：

```python
import numpy as np
import onnxruntime as ort
from threecard_royale.gym_env import RoyaleEnv

session = ort.InferenceSession(
    "models/nn-policy/policy-mlp-256-v1.onnx",
    providers=["CPUExecutionProvider"],
)
env = RoyaleEnv(episode="game", player=0)  # 对手：Code AI
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

模型只接收 Gym 的公开观察。`env.game`、`Game.save()` 和一致性测试／调试快照
包含私有状态，不能作为策略输入。

## 复现与 TensorBoard

[固定配方](../training/recipe-256.json)重新生成 Code AI 自对弈数据，核对 100 个分片，
训练 256/128，再导出和评估最佳检查点。训练／验证／测试按整局划分为
8,000／1,000／1,000 局，同一局的双方不会分到不同集合。
实际 tar.gz 为 112,497,347 字节，所以数据和 `.pt` 重新生成；Git 保存代码、
校验值、报告、TensorBoard 事件及最佳 ONNX。
[完整复现记录](experiments/nn-policy-v1/reproduction-256.json)中，数据与 ONNX 在记录环境里逐字节一致。

```sh
.venv/bin/python training/reproduce.py
.venv/bin/tensorboard --logdir artifacts/nn-policy-256/tensorboard --port 6006
```

再次实验使用新的 `--root`。曲线包括 `loss/train`、`loss/val`、`accuracy/train`、
`accuracy/val` 及进攻／防守／换牌分项；测试集只在选模后记录一次。
安装、种子、优化器、导出和 profiling 命令见[训练指南](../training/README.md)。

## 后续接 RL

以下是接入方案，尚无对应的一键 RL 训练命令：

1. 复现 BC 后，从产物目录的 `models/mlp-256.pt` 读取 `checkpoint['state_dict']`，
   加载到 `training.train.PolicyMLP(256, 128)`。恢复的是策略权重，不含优化器状态。
2. 将掩码后的 logits 用作 actor 分布，采样收集轨迹，确定性评估用 argmax。
   接 PPO 时另加 critic，先只使用同一份公开状态。
3. 每条轨迹一起保存观察、候选表、掩码、动作索引、奖励、旧 log probability、
   value、终止／截断标记。更新时使用当时的候选表，不能使用下一状态的动作表。
4. 先沿用 `episode='game'` 和终局 +1／-1 奖励。一次 Gym step 可能包含对手动作和
   宿主过渡，不等于一次出牌。区分 `terminated` 与 `truncated`；外部截断从截断时
   的观察估计后续价值，不能误用 reset 后的观察。参见
   [Gymnasium 时间上限说明](https://gymnasium.farama.org/tutorials/gymnasium_basics/handling_time_limits/)。
5. 固定 Code AI 评估对手，使用留出种子并交换席位。分别记录胜率、截断和非法动作；
   RL 奖励／损失／评估曲线与现有 BC 训练／验证曲线分开记录。
6. 只导出选定 actor，保持张量名及可变候选维度。任务或特征含义改变时，明确新模型
   契约，并同步编码器与 worker；重新训练、验证一致性、测延迟后再更新上线 manifest。

[竞技场运行时](../policies/runtime.mjs)加载两种建模方式，校验产物及完整动作。
网页通过 Worker 推理。上述模型大小只计算 ONNX 权重，WASM 运行时单独缓存。
参见[对手与回退行为](DIFFICULTY.zh-CN.md)。
