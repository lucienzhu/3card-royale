# 深圳花牌 · 3Card Royale

一副普通扑克，两个人，从2打到A。开放的双人扑克玩法，欢迎试玩、改编与实现。

[玩法介绍](https://lucienzhu.github.io/gk-royale-playtest/about.html) · [开始试玩](https://lucienzhu.github.io/gk-royale-playtest/) · [Play in English](https://lucienzhu.github.io/gk-royale-playtest/?lang=en) · [标志与视觉](https://lucienzhu.github.io/gk-royale-playtest/brand.html)

## 当前规则 0.3.8

- 一副52张普通扑克牌，去掉大小王。各8张起手，手牌保密，伤牌全亮；初始级数2。首局随机先攻，随后小局赢家下一局先攻，局内每轮交换先攻。
- 通常出3张，也可出4张同点炸弹。双方共用花牌（逢人配／会子／百搭牌）：首局♥2，此后按小局赢家升级后的等级确定下一小局的红桃花牌，一小局内固定；手牌与自己的公开伤牌可混用。三张和四炸可互相接，不要求张数相同。
- 四炸6 > 三炸5 > 同花顺4 > 同花3 > 顺子2 > 对子1 > 高牌0。同牌型比较点数；A23为3高、QKA为A高，KA2不成顺，花色不分大小。
- 进攻胜按分差加伤；同牌型点数胜造成1伤。5伤即败小局，完整伤害仍计入升级。完全同型同点无事发生。
- 防守胜按分差获得交换机会，同牌型点数胜得1次。先选自己的手牌或伤牌，再选对手盲手牌、对手公开伤牌、自己的另一牌区，或牌库。每次消耗1机会，双方手牌／伤牌张数不变，不回血。
- 与牌直接交换，不经弃牌堆；对手手牌盲抽，公开伤牌可指定。与牌库交换时弃掉自己的牌，摸新牌补原位。换入伤区公开，手牌仍保密。
- 双方出牌先弃置、用过的伤牌原位补明牌，之后才执行伤害或交换。新补牌不影响本次牌型。中间交换攻防不补手牌；双方各进攻一次为一轮，轮末保留余牌、补手牌至8张。牌堆耗尽时重洗弃牌堆。
- 赢局按完整终局伤势差升级，升到A后，再以A开局赢一小局才赢整场。以A开局失败亮红灯；三次失败仅该玩家回2级，对手保留等级。

网页内“规则”提供各版本完整条款。旧九版分别保留，不把不同版本的规则混合。

## 实现与视觉

- 当前界面：sz-hand-examples-1；规则仍0.3.8。简中深圳花牌，英文3Card Royale。
- 自包含index.html和probability.html可离线打开；gamecore.js是相同的0.3.8引擎，可用CommonJS载入或作为浏览器脚本使用。概率页只统计三张组合，不含四炸。
- brand-mark.svg是矢量牌花，vi.css提供配色和界面样式；brand.html展示实际视觉系统，social-preview.png为1200×630分享图。
- 首次／新场随机发牌，复盘种子选填，刷新续玩。更名继续兼容原有各版本浏览器存档。

## 开放许可与变体

本仓库代码、规则说明和原创视觉素材采用[MIT许可](LICENSE)。可复制、修改、发布和实现，保留许可中的版权与许可声明。名字用于介绍这套玩法，不要求其他实现获得名称独占授权；不冒充官方或本项目维护者即可。若修改规则，请写明版本和差异，方便玩家对齐。

不需要账号，无ChatGPT依赖、无下注、无现金兑换。程序对局不替代真人试玩。

## 开发与托管

纯静态页面，GitHub Pages从main根目录部署。标志、配色和名称变更不改引擎规则版本。旧Git标签保持，当前发布标签gk-v0.3.8-ranks2；双语介绍页about.html包含交互攻防示例、线下开局与可打印规则。

花红采用三角梅紫红 #D83B74；牌形与三角梅轮廓为原生单色SVG，实心版及透明128px自定义emoji可在视觉页下载。自定义emoji不是Unicode通用字符。

规则弹窗默认六步图解完整一轮，可切换完整文字；旧版本保持自己的文字规则。三片花瓣来自同一轮廓按120度旋转，左右对称。

Desktop: the upgrade race is centered on the table with equal side columns; mobile portrait keeps its stacked header. Three small white flowers replace the central circle in the bougainvillea mark.

Toggle hand ranks beside the desktop combat area or at the top of compact tables. Scores follow the selected rules version.

04 logo palette and all UI share daylight tokens: paper, bougainvillea, pale mint and small flat sun-yellow details. The game engine, rules and save keys are unchanged.

Day / Dusk share the same bougainvillea geometry, with a separate system/light/dark preference. The illustrated guide uses a single compact toolbar and a non-overlapping footer. Rules, engine and game save keys are unchanged.

Each hand ranking includes a miniature natural-card example, with the active version’s order and points. Dark and light themes are retained.
