# Policy 插件 · Arena 1.1

## 当前分支：结构化动作 v2

新策略使用 `royale-policy-v2` / `actions-v2`：固定牌 ID，完整动作统一校验、执行一次。纯代码、整手评分和逐步生成都使用这个边界。ONNX 单独声明特征接口：`scoring-v2`（状态 + 完整候选 → 动作分数）或 `structured-v2`（状态 + 前缀 → token 分数）。模型形式不改变动作协议。

[动作定义与迁移](../docs/ACTIONS.md) · [JS 模板](../policies/templates/structured-policy.mjs) · [训练与实测](../training/structured/README.md)。旧 `royale-policy-v1` 继续加载，旧基准权重和 Elo 保持固定。以下按接口版本区分，兼容旧提交。


[English](README.md) · [天梯](../arena.html?lang=zh-CN) · [评估协议](../arena/README.md)

参赛单位是 **policy**，既可以是纯 JavaScript，也可以是 ONNX 神经网络。
训练不是必要条件。网页试玩与本地评估加载同一份文件；GitHub Pages 只托管文件，
推理在玩家设备上完成，PR 与普通合并只验证能否对战；发布版本时计算基准 Elo、更新榜单和网页。

## 投稿格式

在 `policies/entries/<新策略ID>/` 放入：

- `manifest.json`：作者、许可、接口版本、规则、记忆范围、文件大小和 SHA-256。
- `policy.mjs` 或 `policy.onnx`：单文件，不超过 5,000,000 字节。
- `README.md`：策略说明、来源、训练／复现方法。
- `validation.json`：本地验证生成的记录，CI 会独立复跑。

复制已有示例，加入 `policies/registry.json`，为目录条目填写 `"github": "你的GitHub用户名"`（不带 @ 或网址）；新 manifest 的 `author` 使用相同用户名。天梯显示可点击的 `@用户名`。目录署名独立于已评分的 manifest，修改展示资料不会使旧评分失效。

运行 `node arena/stamp.mjs <id>` 更新哈希。
已评分的 ID 不覆盖修改；新代码或权重用新 ID。新接口使用 `royale-policy-v2` 和 `actions-v2`，旧 `royale-policy-v1` 保持兼容；
玩法规则 1.0.0，按独立小局评估，所有策略只获得公开观察。

纯代码导出 `createPolicy({random, sdk})`，返回 `{act(observation)}`。
v2 的 `act` 返回完整结构化动作，可异步；只有 v1 返回当前 `observation.legal_actions` 的序号。
使用 [v2 模板](templates/structured-policy.mjs) 和 [manifest 示例](../docs/ACTIONS.md#plugin-manifest)。手牌和双方公开伤牌可见；
对手手牌、牌堆顺序、发牌种子和引擎 RNG 不传入。观察是只读副本。
随机策略使用传入的 `random()`，不使用时间、网络、存储或 `Math.random()`。
每小局重建实例，记忆只保留在实例中。不要远程 import、读取环境变量或调用外部服务。

**Python 或其他语言的策略，请先用 Codex / Claude Code 翻译成 JavaScript。**
保留原始代码及许可，用固定观察样本检查转换前后动作一致，再提交网页可加载的版本。
[转换提示词与校验流程](templates/PORTING.md)。这不是线上自动转换服务。
v2 ONNX 有两种模型接口，均使用 float32、`memory: "none"`，最终提交 `actions-v2` 完整动作：

| `features` | 模型输入 → 输出 |
| --- | --- |
| `scoring-v2` · 整手评分 | `state [B,336] + candidates [B,N,72] → logits [B,N]` |
| `structured-v2` · 自回归 | `state [B,336] + prefix [B,396] → logits [B,65]` |

整手评分沿用 72 维候选特征，N≤512，不传补齐行；最高分行映射成固定牌 ID 的完整动作，同分取第一行。候选序号只在模型内部使用。自回归按条件 mask 最多六步构造完整动作。两者都经同一套合法性校验。

JS 注入 `actions`、`scoring` 辅助函数；Python 用 `scoring.encode` / `env.scoring_observation()` 得到一致特征与完整动作序列。旧 v1 的 `gym-v1` 和已发布权重不变。[动作协议](../docs/ACTIONS.md) · [训练与导出](../docs/MODEL.zh-CN.md)。

## 工作流程

1. 新策略使用新 ID，加入 registry。
2. 运行 `npm run arena:validate`，再运行 `npm run arena:submit -- --policy <id>`。
   本地与 Code AI 打 4 小局，平衡席位和先攻；把生成的 `validation.json` 一起提交。
3. PR 的 CI 复跑同样的 4 局并核对结果。缺少记录、记录过期、非法动作或超时，都不能评分。
4. 发布 GitHub Release，或在 Actions 手动运行 **Publish Arena**（选择 main）。发布工作流
   才与固定的 Easy、NN、Code AI 各打 20 局，计算 **60 局的基准 Elo**，提交榜单并更新网页。
   默认只评尚未评分的策略，已有分数沿用；需要重评时，在 policies 中填写策略 ID。

发布时每个待评策略固定 64 局（含复验），不随参赛数量增长。每次 PR 最多验证 3 个策略，每次发布最多评分
10 个，整个对战过程最多 180 秒。[计分方法与限制](../arena/README.md)。
固定基准单独标示，新评分均为暂定；它不涵盖所有策略间的克制关系。没有匹配结果的策略
显示“待评估”，网页试玩不改分。Godlike 不参赛。

普通合并不会自动评分；发版前，新策略显示“待评估”。如果一次积累超过 10 个，请手动
指定 ID 分批发布。发布标签须与 main 的代码一致；评分期间代码变化会停止发布。
