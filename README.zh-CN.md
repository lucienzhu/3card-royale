# 深圳花牌 · 3Card Royale

**简体中文** · [English](README.md)

![深圳花牌 · 一副牌，两个人，从2打到A](assets/repository-cover.svg)

**一副普通扑克，两个人，从 2 打到 A。**

来自深圳的开放扑克玩法：八张手牌选三张，伤牌也能出，防守成功换机会。四张同点炸弹，也能改变这一手。

[**开始试玩 ↗**](https://lucienzhu.github.io/gk-royale-playtest/?lang=zh-CN) · [学会怎么玩](https://lucienzhu.github.io/gk-royale-playtest/about.html?lang=zh-CN) · [完整规则](docs/RULES.zh-CN.md) · [视觉识别](https://lucienzhu.github.io/gk-royale-playtest/brand.html?lang=zh-CN)

在线是与电脑对战的试玩版；线下双人只需一副52张普通扑克。无需注册，无下注、无现金兑换。

## 一轮怎么玩

1. 从手牌与自己的公开伤牌中选三张；四张同点炸弹也可以出。
2. 进攻赢，造成伤害；防守赢，获得换牌机会；完全同型同点无事发生。
3. 中途交换攻防不补手牌，双方各进攻一次后，保留余牌、补到八张。

达到五伤输小局，赢家按完整终局伤势差升级并在下局先攻。先升到A，再赢下一局以A开局的游戏，才赢整场。

## 不一样的地方

- **伤牌也能出。** 用后原位补新牌，伤势不变；受伤同时增加可用的牌。
- **防守打的是机会。** 用自己的手牌或伤牌，换对手的牌、自己的另一牌区，或弃旧摸新。
- **双方共用花牌。** 红桃百搭牌跟随上一局赢家升级后的等级，整小局固定。

## 本地运行

纯静态项目，无构建步骤与运行时依赖。用任意静态HTTP服务打开，例如：

```sh
python3 -m http.server 8000 --bind 127.0.0.1
# 打开 http://127.0.0.1:8000/about.html?lang=zh-CN
```

安装Node.js后，可运行项目检查：

```sh
node scripts/check.cjs
```

## 文档与参与

| 内容 | 入口 |
| --- | --- |
| 规则 | [0.3.8完整规则](docs/RULES.zh-CN.md) |
| 贡献 | [本地开发、目录、反馈与翻译](docs/CONTRIBUTING.zh-CN.md) |
| 设计 | [颜色、标志、UI与语言原则](docs/DESIGN.zh-CN.md) |
| 反馈 | [提交试玩记录或Bug](https://github.com/lucienzhu/gk-royale-playtest/issues/new/choose) |
| 研究 | [历史三张牌概率研究](https://lucienzhu.github.io/gk-royale-playtest/probability.html?lang=zh-CN) |

**当前状态：**试玩规则0.3.8，继续收集真人反馈。模拟不等于平衡性证明，也不等于流行度。旧规则仍能从游戏菜单选择，已有版本标签不移动。

## 许可

代码、规则说明和原创视觉采用[MIT许可](LICENSE)，保留版权与许可声明。欢迎试玩、改编、翻译和实现；变体请注明规则差异，不冒充原项目维护者。

## 用它做自己的游戏

SDK 0.1.1／规则0.3.8：JavaScript＋TypeScript类型、Python／Rust／C++17原生核心，共用卡牌编号、动作与JSON状态。提供只看可见信息的基础策略和可选Gymnasium环境。

- [移植核心与示例](docs/SDK.zh-CN.md)
- [RL环境、掩码与观察](docs/RL.zh-CN.md)
- [C++源码与CMake](cpp/README.zh-CN.md) · [Python源码](python/threecard_royale/) · [Rust源码](rust/) · [JavaScript接口](sdk/)

`python -m pip install -e './python[gym]'`后运行`python examples/train_random.py`；Rust用`cargo build --manifest-path rust/Cargo.toml --locked`。目前按仓库源码交付，尚未上传软件包注册库。

## 小 Tips：名字的由来

**三张牌是内核，三角梅是深圳的花。**「花牌」连起花札、炸金花与《小丑牌》（Balatro）的玩法灵感：组合、公开牌取舍、换牌与成长。目标是用一副普通扑克，把两个人的1v1做得尽可能好玩，随时随地愿意再来一局。实体牌仍是52张，不含大小王。
