#include <threecard_royale/policy.hpp>
#include <iostream>

int main() {
    using namespace threecard_royale;
    Game game(42);
    for (int i = 0; i < 10000; ++i) {
        if (game.save().at("phase") == "match_over") {
            std::cout << game.save().at("results").dump(2) << '\n';
            return 0;
        }
        game.step(game.actor() ? choose_action(game.observation(*game.actor())) : game.legal_actions()[0]);
    }
    std::cerr << "Baseline match exceeded the action bound\n";
    return 1;
}
