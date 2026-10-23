#pragma once
#include "core.hpp"

namespace threecard_royale {
// Visible-information baseline. Never accepts a Game or private full state.
inline Json choose_action(const Json& o) {
    const auto& actions = o.at("legal_actions");
    detail::require(actions.is_array() && !actions.empty(), "No legal decision");
    const std::string phase = o.at("phase");
    if (phase != "attack" && phase != "defend" && phase != "refresh") return actions[0];
    const int flower = o.at("flower_level");
    std::optional<std::array<int, 6>> best;
    Json chosen;
    for (const auto& a : actions) {
        std::array<int, 6> key{};
        if (phase != "refresh") {
            const auto cards = detail::ints(a.at("cards"));
            const auto e = evaluate(cards, flower);
            int uses = 0, wc = 0;
            for (int c : cards) {
                uses += std::find(o.at("wounds").begin(), o.at("wounds").end(), Json(c)) != o.at("wounds").end();
                wc += detail::wild(c, flower);
            }
            if (phase == "attack") {
                key[0] = e.at("score");
                const auto ranks = detail::ints(e.at("rank_key"));
                for (std::size_t i = 0; i < ranks.size(); ++i) key[1 + i] = ranks[i];
                key[4] = uses; key[5] = -wc;
            } else {
                const int d = outcome(o.at("active").at(o.at("attacker").get<int>()), e).at("effective_delta");
                key[0] = -std::max(d, 0); key[1] = std::max(-d, 0); key[2] = uses; key[3] = -wc;
            }
        } else if (a.at("type") == "stop_swaps" || a.at("type") == "skip_swap") key[0] = -1000;
        else {
            const auto& source = a.at("source"); const auto& target = a.at("target");
            const int c = o.at(source.at("zone").get<std::string>()).at(source.at("index").get<std::size_t>());
            const std::string zone = target.at("zone");
            if (zone == "deck" || zone == "blind") {
                key[1] = -detail::wild(c, flower); key[2] = -detail::rank(c); key[3] = zone == "deck";
            } else if (target.at("who") == o.at("player")) key[0] = -100;
            else {
                const int take = o.at("enemy_wounds").at(target.at("index").get<std::size_t>());
                const int diff = static_cast<int>(detail::wild(take, flower)) - static_cast<int>(detail::wild(c, flower));
                const bool improves = diff > 0 || (diff == 0 && detail::rank(take) > detail::rank(c));
                key[0] = improves ? 1 : -1; key[1] = diff; key[2] = detail::rank(take) - detail::rank(c); key[3] = -1;
            }
        }
        if (!best || key > *best) { best = key; chosen = a; }
    }
    return chosen;
}
} // namespace threecard_royale
