# 可移植核心与接入

[English](SDK.md) · [RL环境](RL.zh-CN.md) · [规则](RULES.zh-CN.md)

SDK **0.1.0**，规则 **0.3.8**，状态格式 **schema 1**。游戏网站继续沿用原引擎与存档；SDK的JSON状态是独立宿主格式，不覆盖浏览器存档。

| 语言 | 实现 | 入口 |
| --- | --- | --- |
| JavaScript | 冻结网页引擎＋独立接口，Node/CommonJS或浏览器脚本 | `sdk/index.js` |
| TypeScript | 同一JS运行时的完整类型，并非第二套规则 | `sdk/index.d.ts` |
| Python 3.10+ | 原生标准库实现，不需要Node进程 | `python/threecard_royale/core.py` |
| Rust | 原生库与JSON行协议工具，依赖serde／serde_json | `rust/src/lib.rs` |

SDK只暴露当前0.3.8，历史版本留在网页。Python／Rust独立运行，用网页实际引擎交叉回放验证。均以仓库源码交付，未上传npm／PyPI／crates.io。

## 最短接入

```js
const {Game} = require('./sdk/index.js');
const {chooseAction} = require('./sdk/policy.js');
const game = new Game(42); // 不传seed则随机开局
const obs = game.observation(game.actor);
game.step(chooseAction(obs));
```

```python
# pip install -e ./python
from threecard_royale import Game, choose_action

game = Game(seed=42)  # 不传seed则使用新熵
obs = game.observation(game.actor)
game.step(choose_action(obs))
```

```rust
use threecard_royale::{Game, choose_action};
let mut game = Game::new(42, None)?;
let observation = game.observation(game.actor().unwrap())?;
let action = choose_action(&observation)?;
game.step(&action)?;
```

Rust明确传入u32种子，实际游戏由宿主生成新熵。固定种子用于复现／实验，三套实现沿用相同xorshift32与Fisher–Yates序列，保存后继续随机流；该随机数不是对抗性联网安全方案。

浏览器先加载`gamecore.js`再加载`sdk/index.js`，通过`window.ThreeCardRoyale`使用；打包工具也可接CommonJS。JS基础策略是独立CommonJS模块。核心不依赖UI、网络或账号。

## 卡牌、阶段与动作

卡牌ID为`花色*13+点数-2`，范围0—51。花色顺序黑桃0、红桃1、梅花2、方块3；点数2—14，A=14，不含大小王。双方共用红桃花牌，可百搭；四炸6分。

先调用`legalActions()`／`legal_actions()`拿合法列表，再将其中一个动作交给`step`。顺序固定：实体ID升序的三张组合，再合法四张；换牌按手牌／伤牌位置枚举。对象键序不影响判断，出牌数组按列表中的规范顺序使用。

| 阶段 | 动作 |
| --- | --- |
| attack／defend | `{"type":"play","cards":[0,13,26]}` |
| refresh | `{"type":"swap","source":{"zone":"hand","index":0},"target":{"zone":"blind"}}` |
| refresh | `{"type":"stop_swaps"}`放弃剩余机会 |
| resolved | `{"type":"advance"}`交换攻防或轮末补牌 |
| game_over | `{"type":"next_game"}`胜者下局先攻 |
| match_over | 无动作 |

换牌来源为自己的hand／wounds；目标为deck弃旧摸新、blind盲换对手手牌，或附who／index的具体公开伤牌、自己的另一牌区。每次1机会，伤势与区域张数不变。牌堆空时重洗弃牌，可能抽回刚弃的牌。

`actor`为0／1，宿主过渡阶段为null。非法动作拒绝并保持状态与随机流不变。宿主自行推进显式过渡动作，不要求UI为每个动作增加按钮。

## 隐藏信息边界

`save()`返回独立的完整私有状态，包含双方手牌、牌库顺序和RNG。`restore`只接可信schema-1状态并检查52张守恒；不要把这个对象交给玩家或策略，网络实现仍需自行做输入校验、认证及服务端裁决。

`observation(player)`只含己方手牌、双方公开伤牌（使用后待补位为null）、已出的牌、公开弃牌、手牌／余牌数量、个人等级、共同花牌、A失败灯、阶段与公开结果；仅本人行动时附合法列表。没有对手暗手牌、牌库顺序、种子或RNG。观察值为拷贝，位置索引随状态变化，不要跨step缓存。

状态字段以`sdk/index.d.ts`为准。Rust的JSON行协议支持init／restore／step／inspect／evaluate，专为开发者集成和一致性验证返回完整状态，不能直接作为玩家公开协议。

## 基础策略

Python／Rust `choose_action`、JS `chooseAction`只接收观察和合法动作。进攻选当前最强组合，防守先少受伤、再争机会，同效优先利用伤牌、保留花牌；换牌按公开点数／花牌或重抽弱牌处理。它是确定性启发式，没有训练，也不代表最优策略。`examples/play.js`可跑有上限的整场，`examples/train_random.py`演示合法掩码采样。

## 验证与扩展

```sh
node scripts/check.cjs
python -m unittest discover -s tests -p 'test_*.py'
cargo build --manifest-path rust/Cargo.toml --locked
python tests/conformance.py --rust rust/target/debug/royale-json
```

Python全套检查需先安装可选Gym依赖。一致性验证比较完整状态、合法动作顺序、双方观察、牌型、保存恢复，覆盖八条交换路径及重洗。后续移植保持卡牌编号、洗牌算法、补位顺序和花牌等值选择；玩法变化单独升规则版本。

Rust完整对局示例：`cargo run --manifest-path rust/Cargo.toml --locked --example baseline`。
