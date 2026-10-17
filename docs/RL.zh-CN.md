# RL／Gymnasium环境

[English](RL.md) · [移植接口](SDK.zh-CN.md)

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
while True:
    action = int(rng.choice(np.flatnonzero(obs['action_mask'])))
    obs, reward, terminated, truncated, info = env.step(action)
    if terminated or truncated:
        break
```

导入`threecard_royale.gym_env`后可用`gym.make('ThreeCardRoyale-v0')`。遵循Gymnasium接口，支持SyncVectorEnv；实际验证Gymnasium1.2.0，可选依赖范围>=1.2,<2。

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

候选列0—51标记使用／交出的实体牌；52—56为play／swap／stop／advance／next-game的one-hot；57—58来源手牌／伤牌；59来源索引÷11；60—63目标牌库／盲手牌／己方／对方；64—66已知接收牌的点数÷14、花色÷3、ID÷51；67分数÷6、68牌型ID÷6、69比较首点÷14、70张数÷4，71保留0。未知身份始终不编码。牌型ID高牌0、对子1、顺子2、同花3、三炸4、同花顺5、四炸6；三炸／同花顺ID与分数不同，大小用score判断。

`env.action_masks()`返回bool掩码，可接支持mask的算法。候选特征表让策略理解动态动作编号对应什么；不支持掩码的算法需要显式封装合法分布。

## 策略、自博弈与信息边界

`opponent`接收`callable(observation, legal_actions)`，默认为基础启发式，参数是独立公开观察，拿不到Game对象。观察与info没有对手暗手牌、牌库顺序、RNG或种子。完整save只供宿主调试，不能送进策略。

两智能体自博弈使用Game轮流行动接口：查actor，向对应策略提供它的observation，由宿主推进advance／next_game。不声称实现了PettingZoo或已有训练模型。经验回放只收集本策略观察／动作／奖励；若将来要全信息critic，应作为明确的独立训练配置。

官方checker、隐藏信息扰动不变性、向量环境、合法掩码、胜负和截断检查：`python -m unittest discover -s tests -p 'test_*.py'`。接口依据[Gymnasium自定义环境指南](https://gymnasium.farama.org/introduction/create_custom_env/)。
