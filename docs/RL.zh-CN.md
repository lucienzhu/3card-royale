# RL／Gymnasium环境

[AI Arena：提交 JS 或 ONNX 策略](../policies/README.zh-CN.md) · [天梯](../arena.html?lang=zh-CN)

**策略名称：** SDK Code AI 是固定的训练／评估基线。网页困难档已修复调用回归，恢复原牌桌 Code AI（`code-table-v1`），会保留下一手组合、评估换牌收益并盲换对手手牌。旧 NN 数据仍以 SDK 基线为对手。[当前难度结果](DIFFICULTY.zh-CN.md)。

[English](RL.md) · [移植接口](SDK.zh-CN.md) · [NN 模型](MODEL.zh-CN.md)

上线的 256/128 NN 策略共用这里的观察／动作接口，通过 Code AI 标签学习，尚未按奖励训练。
[模型文档](MODEL.zh-CN.md)提供结构与 ONNX 接入示例；[训练指南](../training/README.md)负责复现。

```sh
python -m pip install -e './python[gym]'
python examples/train_random.py
```

```python
import numpy as np
from threecard_royale.gym_env import RoyaleEnv

env = RoyaleEnv(episode='match', player=0, render_mode='ansi')
obs, info = env.reset(seed=42)
rng = np.random.default_rng(42)
done = info["reset_terminal"] or info["reset_truncated"]
while not done:
    action = int(rng.choice(np.flatnonzero(obs['action_mask'])))
    obs, reward, terminated, truncated, info = env.step(action)
    done = terminated or truncated
env.close()
```

导入`threecard_royale.gym_env`后可用`gym.make('ThreeCardRoyale-v0')`。遵循Gymnasium接口，支持SyncVectorEnv；模型复现已验证Gymnasium 1.4.0，可选依赖范围>=1.2,<2。

## 训练目标

默认`episode='game'`训练一小局；`'match'`自动推进小局，直到冲A赢整场。奖励仅终局胜+1／负-1，合法中间决策0，默认不加伤害或等级塑形。非法索引扣0.05、状态与RNG不变，但占用一次步数；请使用掩码。终止或截断后需reset。

默认4096次玩家决策、10000次内部推进双上限；超时是truncated，不伪装胜负。reset若在首次决策前到达边界／终局，会在info给reset_truncated／reset_terminal。可选reset参数first=0／1、levels=[2..14,2..14]；自定义等级是明确的训练起点，不改变实际游戏开局规则。环境从已设种子的NumPy生成器产生核心种子，不把种子返回策略。

## 观察与动作

动作空间Discrete(512)，索引指向**当前候选表**；并非永久固定的牌组合编号，不能跨step缓存。存活玩家最多12张可用牌，512槽位覆盖当前全部出牌与换牌路线。空槽特征为0、掩码为0。

| 字段 | 形状／类型 | 内容 |
| --- | --- | --- |
| cards | 6×52／int8 | 己方手牌、伤牌、对手公开伤牌、公开弃牌、己方／对手已出牌 |
| meta | 24／float32 | 六阶段one-hot，个人／对手等级、花牌、伤势、手牌／余牌／弃牌数、A灯、先攻／进攻者、攻防序号、剩余机会、本人行动标记、截顶轮／局进度、任务类型 |
| candidates | 512×72／float32 | 候选动作的卡牌、类型与来源／目标特征 |
| action_mask | 512／int8 | 1表示该索引合法 |

候选列0—51标记使用／交出的实体牌；52—56为play／swap／decline／advance／next-game的one-hot；57—58来源手牌／伤牌；59在换牌动作中为来源索引÷11；60—63目标牌库／盲手牌／己方／对方；64—66已知接收牌的点数÷14、花色÷3、ID÷51；67分数÷7、68牌型ID÷7、69比较首点÷14、70张数÷5，71在出牌动作中表示己方是否是本局打A的闯关方（是1／否0，其他动作也为0）。未知身份始终不编码。牌型ID高牌0、对子1、顺子2、同花3、三炸4、同花顺5、四炸6、五炸7；三炸／同花顺ID与分数不同，大小用score判断。

每次换牌机会都可独立选择使用或跳过。`skip_swap`与`stop_swaps`均将第54列的decline动作位置1；此时第59列改作标记：1表示仅跳过当前1次，0表示结束全部剩余机会。跳过不改变牌或随机数状态，候选表仍为512×72。

`env.action_masks()`返回bool掩码，可接支持mask的算法。候选特征表让策略理解动态动作编号对应什么；不支持掩码的算法需要显式封装合法分布。

## 接入可训练策略

按行展平 `cards`，再拼接 `meta`，得到 336 维状态；共享网络为每个 72 维候选动作评分。
先屏蔽补齐行，再计算损失、采样或 argmax。[256/128 模型文档](MODEL.zh-CN.md)包含
Torch／ONNX／浏览器一致的输入契约，以及可运行的 Gym 推理示例。

一次 Gym step 会推进本方动作、对手决策和自动过渡，直到本方再次决策或结束。
`meta[23]` 在 `game` 中为 0、`match` 中为 1；上线模型按 `game` 训练。
采样前先处理 `reset_terminal`／`reset_truncated`，向量化采样也一样。
[后续 RL 接入方案](MODEL.zh-CN.md#后续接-rl)说明权重初始化、候选表留存、critic 与评估。

## 策略、自博弈与信息边界

`opponent`接收`callable(observation, legal_actions)`，默认为基础启发式，参数是独立公开观察，拿不到Game对象。观察与info没有对手暗手牌、牌库顺序、RNG或种子。完整save只供宿主调试，不能送进策略。

两智能体自博弈使用Game轮流行动接口：查actor，向对应策略提供它的observation，由宿主推进advance／next_game。已训练的 BC 策略见[模型文档](MODEL.zh-CN.md)；PettingZoo 适配器与奖励驱动的 RL 训练器尚未实现。经验回放只收集本策略观察／动作／奖励；若将来要全信息critic，应作为明确的独立训练配置。

官方checker、隐藏信息扰动不变性、向量环境、合法掩码、胜负和截断检查：`python -m unittest discover -s tests -p 'test_*.py'`。接口依据[Gymnasium自定义环境指南](https://gymnasium.farama.org/introduction/create_custom_env/)。

标准1.0增加五炸7分：四张自然同点牌＋本局共用花牌。见[完整标准规则](RULES.zh-CN.md)。合法动作包含五张出牌；`wild.as`只表示虚拟牌面，五炸可引用已存在的同点代表牌，实体ID仍不重复。Gym分数／类别特征改按7归一，出牌数按5归一。
