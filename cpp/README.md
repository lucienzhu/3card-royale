# C++17 · 3Card Royale

[简体中文](README.zh-CN.md) · [Shared SDK contract](../docs/SDK.md)

Native, header-only rules **1.0.0**, SDK **0.2.0**, JSON state schema **2**. No Node, Python or Rust runtime is required. Standard C++17 with exceptions is required. Tested with AppleClang 21 on macOS arm64; other platforms have not been verified here.

```cpp
#include <threecard_royale/policy.hpp>
using namespace threecard_royale;
Game game; // fresh entropy; use Game(42, 0) for deterministic experiments
auto action = choose_action(game.observation(game.actor().value()));
game.step(action);
auto restored = Game::restore(game.save());
```

`Game`, `evaluate(cards, flower_level)` and `outcome(attack, defense)` live in `core.hpp`. `choose_action(observation)` is a deterministic visible-information baseline in `policy.hpp`. All state/action/observation values use `threecard_royale::Json` (nlohmann/json). The card IDs, action order, shuffle, wildcard declarations and snapshots match the other native ports. Invalid actions throw and preserve state and RNG. Use a legal action as returned by `legal_actions()`; card lists have canonical ordering.

`actor()` returns `std::optional<int>`. At host-controlled transitions it is empty: take the sole legal `advance` / `next_game` action. `save()` includes both hidden hands, stock order and RNG; it is for a trusted host. Give opponents and policies **only `observation(player)`**. Restore accepts trusted SDK saves, not unvalidated client input or browser UI saves.

## Build examples and tests

From the repository root:

```sh
cmake -S cpp -B /tmp/royale-cpp -DCMAKE_BUILD_TYPE=Release
cmake --build /tmp/royale-cpp --parallel
ctest --test-dir /tmp/royale-cpp --output-on-failure
/tmp/royale-cpp/royale-baseline-cpp
```

CMake 3.16+ is optional. Direct compilation also works:

```sh
c++ -std=c++17 -O2 -Icpp/include cpp/examples/baseline.cpp -o /tmp/royale-baseline
/tmp/royale-baseline
```

`royale-json-cpp` accepts one JSON object per line: `init`, `restore`, `step`, `inspect`, `evaluate`. It returns full private state for development and parity tests; it is not a player-facing protocol. For example, `{"op":"init","seed":42,"first":0}`, followed by `{"op":"inspect","policy":true}`.

## Embed or install

```cmake
add_subdirectory(path/to/3card-royale/cpp royale-core)
target_link_libraries(my_game PRIVATE threecard_royale::core)
```

Tools/tests default off when embedded. Or install a reusable CMake package:

```sh
cmake --install /tmp/royale-cpp --prefix /tmp/royale-install
```

```cmake
# Configure your project with -DCMAKE_PREFIX_PATH=/tmp/royale-install
find_package(threecard_royale 0.1 CONFIG REQUIRED)
target_link_libraries(my_game PRIVATE threecard_royale::core)
```

There is no compiled library to ship; the target supplies include paths and C++17 requirements. The core uses JSON-backed state for portability and clear replay semantics. It is not a fixed-allocation or benchmarked high-throughput simulation API.

## Dependency and license

The MIT-licensed [nlohmann/json v3.11.3](https://github.com/nlohmann/json/tree/v3.11.3) single header is vendored unchanged at `include/nlohmann/json.hpp`; its license is in [third_party/nlohmann-json.LICENSE](third_party/nlohmann-json.LICENSE). The build never fetches dependencies. This SDK uses the repository's [MIT license](LICENSE). No C++ registry package has been published.

Cross-runtime verification: follow [SDK validation](../docs/SDK.md#validate-a-port), adding `--cpp /tmp/royale-cpp/royale-json-cpp` to the existing Python/JS/Rust conformance command.

Standard 1.0 adds five of a kind (7 points): four natural equal-rank cards plus the shared flower. See [complete standard rules](../docs/RULES.md). Five-card plays are included in legal actions. `wild.as` is a virtual face; in five of a kind it may name an already-present representative face without reusing a physical card. Gym score/kind features use /7 and played-card count uses /5.
