# C++17 · 深圳花牌

[English](README.md) · [统一SDK协议](../docs/SDK.zh-CN.md)

原生仅头文件实现：规则 **1.0.0**、SDK **0.2.0**、JSON状态 **schema 2**。运行无需Node、Python或Rust。要求标准C++17和异常支持。本次实际验证AppleClang 21／macOS arm64，其他平台尚未实测。

```cpp
#include <threecard_royale/policy.hpp>
using namespace threecard_royale;
Game game; // 默认使用新熵；实验复现用 Game(42, 0)
auto action = choose_action(game.observation(game.actor().value()));
game.step(action);
auto restored = Game::restore(game.save());
```

`core.hpp`提供`Game`、`evaluate(cards, flower_level)`和`outcome(attack, defense)`；`policy.hpp`提供只看可见信息的确定性基础策略`choose_action(observation)`。状态、动作和观察采用`threecard_royale::Json`（nlohmann/json）。卡牌ID、动作顺序、洗牌、花牌声明和存档与其他原生核心一致。非法动作抛异常，状态及随机流不变；出牌数组按`legal_actions()`返回的规范顺序使用。

`actor()`返回`std::optional<int>`；宿主过渡阶段为空，此时执行唯一合法的`advance`／`next_game`。`save()`含双方暗手牌、牌库顺序与RNG，只供可信宿主；给对手和策略的只能是`observation(player)`。恢复入口接可信SDK状态，不直接接未校验客户端输入，也不替换网页存档。

## 构建与示例

在仓库根目录运行：

```sh
cmake -S cpp -B /tmp/royale-cpp -DCMAKE_BUILD_TYPE=Release
cmake --build /tmp/royale-cpp --parallel
ctest --test-dir /tmp/royale-cpp --output-on-failure
/tmp/royale-cpp/royale-baseline-cpp
```

CMake要求3.16以上，也可直接编译：

```sh
c++ -std=c++17 -O2 -Icpp/include cpp/examples/baseline.cpp -o /tmp/royale-baseline
/tmp/royale-baseline
```

`royale-json-cpp`按行接受JSON，支持init／restore／step／inspect／evaluate，返回完整私有状态用于开发与一致性检查，不是玩家公开协议。例如先输入`{"op":"init","seed":42,"first":0}`，再输入`{"op":"inspect","policy":true}`。

## 嵌入与安装

```cmake
add_subdirectory(path/to/gk-royale-playtest/cpp royale-core)
target_link_libraries(my_game PRIVATE threecard_royale::core)
```

作为子目录嵌入时，工具和测试默认关闭。也可安装后复用：

```sh
cmake --install /tmp/royale-cpp --prefix /tmp/royale-install
```

```cmake
# 配置宿主项目时加 -DCMAKE_PREFIX_PATH=/tmp/royale-install
find_package(threecard_royale 0.1 CONFIG REQUIRED)
target_link_libraries(my_game PRIVATE threecard_royale::core)
```

无需额外分发已编译库，CMake目标提供头文件路径与C++17要求。内部采用JSON状态，优先可移植性和清晰回放；未承诺固定内存分配或高吞吐性能。

## 依赖与授权

随源码原样附带MIT授权的[nlohmann/json v3.11.3](https://github.com/nlohmann/json/tree/v3.11.3)单头文件，位于`include/nlohmann/json.hpp`，保留[第三方许可证](third_party/nlohmann-json.LICENSE)。构建无需联网拉依赖。核心采用[MIT许可](LICENSE)，尚未发布C++注册库包。

跨语言检查见[统一SDK文档](../docs/SDK.zh-CN.md)，在原Python／JS／Rust检查命令中增加`--cpp /tmp/royale-cpp/royale-json-cpp`。

标准1.0增加五炸7分：四张自然同点牌＋本局共用花牌。见[完整标准规则](../docs/RULES.zh-CN.md)。合法动作包含五张出牌；`wild.as`只表示虚拟牌面，五炸可引用已存在的同点代表牌，实体ID仍不重复。Gym分数／类别特征改按7归一，出牌数按5归一。
