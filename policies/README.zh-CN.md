# Policy 插件 · Arena 1.1

[English](README.md) · [天梯](../arena.html?lang=zh-CN) · [评估协议](../arena/README.md)

参赛单位是 **policy**，既可以是纯 JavaScript，也可以是 ONNX 神经网络。
训练不是必要条件。网页试玩与本地评估加载同一份文件；GitHub Pages 只托管文件，
推理在玩家设备上完成，正式 Elo 由维护者本地评估后提交。

## 投稿格式

在 `policies/entries/<新策略ID>/` 放入：

- `manifest.json`：作者、许可、接口版本、规则、记忆范围、文件大小和 SHA-256。
- `policy.mjs` 或 `policy.onnx`：单文件，不超过 5,000,000 字节。
- `README.md`：策略说明、来源、训练／复现方法。

复制已有示例，加入 `policies/registry.json`，运行 `node arena/stamp.mjs <id>` 更新哈希。
已评分的 ID 不覆盖修改；新代码或权重用新 ID。兼容接口为 `royale-policy-v1`，
玩法规则 1.0.0，按独立小局评估，所有策略只获得公开观察。

纯代码导出 `createPolicy({random, sdk})`，返回 `{act(observation)}`。
`act` 返回当前 `observation.legal_actions` 的序号，可异步。手牌和双方公开伤牌可见；
对手手牌、牌堆顺序、发牌种子和引擎 RNG 不传入。观察是只读副本。
随机策略使用传入的 `random()`，不使用时间、网络、存储或 `Math.random()`。
每小局重建实例，记忆只保留在实例中。不要远程 import、读取环境变量或调用外部服务。

**Python 或其他语言的策略，请先用 Codex / Claude Code 翻译成 JavaScript。**
保留原始代码及许可，用固定观察样本检查转换前后动作一致，再提交网页可加载的版本。
[转换提示词与校验流程](templates/PORTING.md)。这不是线上自动转换服务。
神经网络可直接导出 ONNX：`state [1,336] + candidates [1,N,72] → logits [1,N]`，
float32，动态 N≤512，输出有限数值，最高分对应动作。[训练与导出](../docs/MODEL.zh-CN.md)。

## 工作流程

PR → 检查格式与代码 → 本地评估 → 提交 Elo 与原始对局 → 合并 → Pages 试玩。

`npm run arena:validate` 仅检查元数据和文件哈希，不运行投稿代码。
PR 的 CI 另在隔离 Linux 容器中，让每个参赛策略与 Code AI 打 4 小局，平衡席位和先攻。
非法动作、超时或未完成对局都会失败。维护者可加 `arena-benchmark` 标签，或在 Actions
手动跑完整循环赛。[Linux 实测](../arena/README.md#measured-linux-capacity)：2 核、2 GiB，
2,000 局约 47 秒、峰值约 360 MiB。CI 不自动发布 Elo，投稿仍需审核和正式评估。
`npm run arena:evaluate` 默认每对策略 200 小局，交换座位并平衡先攻。
新增对手需重跑整个赛季，让所有策略面对相同对手池。未评估或哈希变化的策略显示“待评估”。
Godlike 不进天梯。网页挑战结果不改变正式 Elo。

Worker 用于不卡界面和超时终止，**不是安全沙箱**。只加载已审核合并的注册策略；
不接受任意 URL 的 JS。评估陌生 PR 时，用无凭据、禁网的容器，不在有秘密的工作流中运行。
本地决策超时、非法动作或小局未结束都会中止整次评估，不用回退 AI 冒充参赛结果。
网页试玩失败则明确显示提示并回退 Easy。

新投稿、加载器、接口集中在 `policies/`。旧 `sdk/` 策略与 `models/nn-policy/` 保留为
兼容入口和历史基线，现有困难档、Godlike、存档与规则不变。
