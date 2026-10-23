# 参与改进

[English](CONTRIBUTING.md) · [项目首页](../README.zh-CN.md)

一条清楚的试玩观察、一次翻译、一处可访问性修复，或一个小功能，都能让游戏更好。

## 本地开发

克隆后，用静态HTTP服务打开根目录，例如 `python3 -m http.server 8000 --bind 127.0.0.1`。无需打包器或安装依赖；提交前运行 `node scripts/check.cjs`。

## 目录职责

| 路径 | 用途 |
| --- | --- |
| `index.html` | 牌桌；原根URL继续直接玩 |
| `about.html` / `brand.html` | 双语官网介绍／视觉识别 |
| `site.css` / `site.js` | 官网布局、语言、明暗和案例 |
| `app/game.css` | 既有游戏及规则图解样式 |
| `app/experience.css` / `app/experience.js` | 本版游戏UI优化 |
| `app/locale.js` | 游戏翻译 |
| `app/table.js` | 牌桌渲染、操作和存档接续 |
| `app/rules.js` / `app/hand-reference.js` | 规则图解／牌型例牌 |
| `gamecore.js` | 共享规则引擎，可通过CommonJS载入 |
| `app/replays.js` | 冻结历史研究回放 |
| `docs/` / `assets/` | 中英配对文档／品牌素材 |

## 提交时说明什么

一次修改围绕一个明确问题，说明玩家会感受到的改变。UI请检查手机、桌面、中英和明暗，保留键盘焦点、触摸操作和开关规则时的选牌。语言和外观不要改变真实对局或存档。

玩法变更要单独标版本，验证结算顺序、花牌、52张守恒和存档兼容，同时更新两份规则书及游戏条款。不要悄悄改旧版语义或移动旧tag。

Bug请给规则版本、设备／浏览器、复现步骤、预期与实际结果。种子或截图有帮助，但分享前移除个人信息。程序场次不能代替真人体验，也不能当作好玩的证明。

## 翻译与交流

英文和简中同等维护，改动同步配对文档；规则表达追求含义准确，不必逐字直译。欢迎其他语言，先讨论统一术语。尊重彼此，讨论设计时尽量描述可观察的行为。

贡献沿用本仓库MIT许可，保留版权和许可声明，并注明使用的既有工作。

## 核心与RL改动

参见[SDK](SDK.zh-CN.md)与[Gym](RL.zh-CN.md)。改动作、洗牌或计分前运行跨语言一致性检查，同步各原生实现；纯网页UI修改无需安装Python／Gym或Rust。

## 模型改动

参照[模型契约](MODEL.zh-CN.md)和[复现配方](../training/README.md)。
保持 `sdk/features.js` 与 `python/threecard_royale/gym_env.py` 一致；特征含义改变时
明确新特征版本，重新采样和训练。运行 `node tests/nn-policy.cjs` 核对 JS／Python 特征
与教师策略，再用 `python training/parity.py --root <run>` 比较 Torch／ONNX logits；
`training/profile.html` 验证浏览器 worker 和延迟。记录任务、种子、划分、留出评估、
模型哈希及 TensorBoard 曲线。原始轨迹和检查点留在忽略的 `artifacts/`；只发布选定
ONNX 与 manifest。契约改变时，同步更新中英模型／RL 文档。
