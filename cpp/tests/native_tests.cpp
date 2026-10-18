#include <threecard_royale/policy.hpp>
#include <iostream>

using namespace threecard_royale;
void check(bool v, const char* message) { if (!v) throw std::runtime_error(message); }
template <class F> void rejects(F f) {
    bool rejected = false;
    try { f(); } catch (const std::exception&) { rejected = true; }
    check(rejected, "Expected invalid input to be rejected");
}
int main() {
    Game g(42, 0), same(42, 0);
    check(g.save() == same.save(), "Seed replay");
    const auto original = g.save();
    for (const auto& bad : Json::array({Json{{"type", "bogus"}}, Json{{"type", "play"}, {"cards", {0, 0, 0}}}})) {
        rejects([&] { g.step(bad); });
        check(g.save() == original, "Rejected action changed state or RNG");
    }
    auto copy = g.save(); copy["players"][0]["hand"][0] = 999;
    auto observation = g.observation(0); observation["hand"][0] = 999;
    check(g.save() == original, "Detached state and observation");
    auto hidden = original;
    std::swap(hidden["players"][1]["hand"][0], hidden["stock"][0]);
    auto changed = Game::restore(hidden);
    check(changed.observation(0) == g.observation(0), "Observation leaked opponent hand or deck order");
    check(choose_action(changed.observation(0)) == choose_action(g.observation(0)), "Policy used hidden state");
    rejects([&] { Game::restore(copy); });
    rejects([&] { g.observation(2); });
    rejects([] { evaluate({0, 0, 1}); });
    rejects([] { evaluate({0, 1, 2, 3}); });
    rejects([] { evaluate({0, 1, 52}); });
    check(evaluate({0, 13, 26, 39}).at("score") == 6, "Natural four bomb");
    check(evaluate({0, 26, 39, 14}, 3).at("score") == 6, "Wildcard four bomb");
    check(evaluate({0, 1, 12}, 4).at("rank_key") == Json::array({3}), "Ace-low straight");
    const auto e = evaluate({2, 4, 7}, 2);
    check(outcome(e, e).at("effective_delta") == 0, "Exact tie");
    const auto a = choose_action(g.observation(0));
    g.step(a);
    auto restored = Game::restore(g.save());
    const auto b = choose_action(g.observation(*g.actor()));
    g.step(b); restored.step(b);
    check(g.save() == restored.save(), "Restore continuation");
    Game random_game;
    check(random_game.check(), "Fresh entropy construction");
    std::cout << "Native input, atomicity, privacy, scoring and restore checks passed\n";
}
