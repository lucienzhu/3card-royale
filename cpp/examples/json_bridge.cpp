// Trusted development bridge: responses include private full state.
#include <threecard_royale/policy.hpp>
#include <iostream>
#include <memory>

int main() {
    using namespace threecard_royale;
    std::unique_ptr<Game> game;
    std::string line;
    while (std::getline(std::cin, line)) {
        Json out;
        try {
            const auto v = Json::parse(line);
            const std::string op = v.at("op");
            if (op == "evaluate") {
                out = {{"evaluations", Json::array()}};
                detail::require(v.at("cases").is_array(), "Missing cases");
                for (const auto& x : v.at("cases")) {
                    const auto& level = x.at("level");
                    detail::require(level.is_number_integer() && level >= 2 && level <= 14, "Invalid level");
                    out["evaluations"].push_back(evaluate(detail::ints(x.at("cards")), level.get<int>()));
                }
            } else {
                if (op == "init") {
                    const auto& seed = v.at("seed");
                    detail::require(seed.is_number_integer() && seed >= 0 && seed <= 0xffffffffULL, "Invalid seed");
                    std::optional<int> first;
                    if (v.contains("first") && !v.at("first").is_null()) {
                        detail::require(v.at("first").is_number_integer() && (v.at("first") == 0 || v.at("first") == 1), "Invalid first");
                        first = v.at("first").get<int>();
                    }
                    game = std::make_unique<Game>(seed.get<std::uint32_t>(), first);
                } else if (op == "restore") game = std::make_unique<Game>(Game::restore(v.at("state")));
                else if (op == "step") {
                    detail::require(static_cast<bool>(game), "Not initialized");
                    game->step(v.at("action"));
                } else detail::require(op == "inspect", "Unknown op");
                detail::require(static_cast<bool>(game), "Not initialized");
                out = {{"state", game->save()}, {"actions", game->legal_actions()}, {"observations", {game->observation(0), game->observation(1)}}};
                if (v.value("policy", false) && game->actor()) out["policy"] = choose_action(game->observation(*game->actor()));
            }
        } catch (const std::exception& e) { out = {{"error", e.what()}}; }
        std::cout << out.dump() << '\n' << std::flush;
    }
}
