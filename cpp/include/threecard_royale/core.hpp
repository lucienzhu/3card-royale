#pragma once
// Native C++17 rules 1.0.0. SDK state schema 2. MIT, see cpp/LICENSE.
#include <nlohmann/json.hpp>
#include <algorithm>
#include <array>
#include <cstdint>
#include <functional>
#include <numeric>
#include <optional>
#include <random>
#include <stdexcept>
#include <string>
#include <utility>
#include <vector>

namespace threecard_royale {
using Json = nlohmann::json;
inline constexpr const char* RULES = "1.0.0";
inline constexpr const char* SDK_VERSION = "0.2.0";
namespace detail {
inline void require(bool ok, const char* message) {
    if (!ok) throw std::invalid_argument(message);
}
inline int rank(int card) { return card % 13 + 2; }
inline bool wild(int card, int level) { return card / 13 == 1 && rank(card) == level; }
inline std::vector<int> ints(const Json& a) {
    require(a.is_array(), "Expected an integer array");
    std::vector<int> result;
    for (const auto& v : a) {
        require(v.is_number_integer() && v >= 0 && v <= 0x7fffffff, "Expected nonnegative integers");
        result.push_back(v.get<int>());
    }
    return result;
}
inline Json plain(const std::vector<int>& cards) {
    std::vector<int> rs;
    for (int c : cards) rs.push_back(rank(c));
    std::sort(rs.begin(), rs.end(), std::greater<int>());
    auto unique = rs;
    unique.erase(std::unique(unique.begin(), unique.end()), unique.end());
    const bool low = rs == std::vector<int>{14, 3, 2};
    const bool straight = unique.size() == 3 && (rs[0] - rs[2] == 2 || low);
    const bool flush = std::all_of(cards.begin(), cards.end(), [&](int c) { return c / 13 == cards[0] / 13; });
    const int kind = flush && straight ? 5 : unique.size() == 1 ? 4 : flush ? 3 : straight ? 2 : unique.size() == 2 ? 1 : 0;
    std::vector<int> key = rs;
    if (kind == 2 || kind == 5) key = {low ? 3 : rs[0]};
    else if (kind == 4) key = {rs[0]};
    else if (kind == 1) {
        int pair = 0, kicker = 0;
        for (int r : rs) {
            if (std::count(rs.begin(), rs.end(), r) == 2) pair = r;
            else kicker = r;
        }
        key = {pair, kicker};
    }
    return {{"score", kind == 4 ? 5 : kind == 5 ? 4 : kind}, {"kind", kind}, {"rank_key", key}, {"wild", nullptr}};
}
inline bool stronger(const Json& a, const Json& b) {
    const int x = a.at("score"), y = b.at("score");
    return x > y || (x == y && ints(a.at("rank_key")) > ints(b.at("rank_key")));
}
} // namespace detail

inline Json evaluate(std::vector<int> cards, int level = 2) {
    using namespace detail;
    require(level >= 2 && level <= 14 && (cards.size() == 3 || cards.size() == 4 || cards.size() == 5), "Invalid cards or flower level");
    require(std::all_of(cards.begin(), cards.end(), [](int c) { return c >= 0 && c < 52; }), "Card IDs must be 0..51");
    std::sort(cards.begin(), cards.end());
    require(std::adjacent_find(cards.begin(), cards.end()) == cards.end(), "Use distinct physical cards");
    int wc = -1;
    std::vector<int> others;
    for (int c : cards) { if (wild(c, level)) wc = c; else others.push_back(c); }
    if (cards.size() == 5) {
        const int target=rank(others.front());
        require(wc>=0 && others.size()==4 && std::all_of(others.begin(),others.end(),[&](int c){return rank(c)==target;}), "Five of a kind needs four natural equal ranks and the flower");
        return {{"score",7},{"kind",7},{"rank_key",{target}},{"wild",{{"physical",wc},{"as",target-2}}}};
    }
    if (cards.size() == 4) {
        const int target = rank(others.front());
        require(std::all_of(others.begin(), others.end(), [&](int c) { return rank(c) == target; }), "Four cards must be one rank");
        Json declaration = nullptr;
        if (wc >= 0) {
            for (int c = 0; c < 52; ++c) {
                if (rank(c) == target && std::find(others.begin(), others.end(), c) == others.end()) {
                    declaration = {{"physical", wc}, {"as", c}};
                    break;
                }
            }
        }
        return {{"score", 6}, {"kind", 6}, {"rank_key", {target}}, {"wild", declaration}};
    }
    Json best = plain(cards);
    if (wc >= 0) {
        int virtual_card = wc;
        for (int c = 0; c < 52; ++c) {
            if (std::find(others.begin(), others.end(), c) != others.end()) continue;
            auto hand = others;
            hand.push_back(c);
            Json candidate = plain(hand);
            if (stronger(candidate, best)) { best = std::move(candidate); virtual_card = c; }
        }
        best["wild"] = {{"physical", wc}, {"as", virtual_card}};
    }
    return best;
}
inline Json outcome(const Json& a, const Json& b) {
    const int delta = a.at("score").get<int>() - b.at("score").get<int>();
    const auto x = detail::ints(a.at("rank_key")), y = detail::ints(b.at("rank_key"));
    const int r = x > y ? 1 : x < y ? -1 : 0;
    return {{"delta", delta}, {"effective_delta", delta ? delta : r},
            {"reason", delta ? "type" : r > 0 ? "rank_attack" : r < 0 ? "rank_defend" : "exact_tie"}};
}

class Game {
public:
    // Explicit seeds replay exactly; no-argument construction asks the host for fresh entropy.
    Game() : Game(static_cast<std::uint32_t>(std::random_device{}()), std::nullopt) {}
    explicit Game(std::uint32_t seed, std::optional<int> first = std::nullopt) {
        detail::require(!first || *first == 0 || *first == 1, "Invalid first player");
        Json p = {{"level", 2}, {"hand", Json::array()}, {"wounds", Json::array()}};
        s_ = {{"schema", 2}, {"rules", RULES}, {"seed", seed}, {"rng", seed ? seed : 0x6d2b79f5U},
              {"players", Json::array({p, p})}, {"a_losses", {0, 0}}, {"game", 0}, {"round", 0},
              {"results", Json::array()}, {"next_first", nullptr}, {"last_combat", nullptr}};
        const int f = first ? *first : random() < 0.5 ? 0 : 1;
        start_game(f);
    }
    std::optional<int> actor() const {
        const std::string phase = s_.at("phase");
        if (phase == "attack") return s_.at("attacker").get<int>();
        if (phase == "defend") return 1 - s_.at("attacker").get<int>();
        if (phase == "refresh") return s_.at("pending").at("actor").get<int>();
        return std::nullopt;
    }
    Json legal_actions() const {
        using namespace detail;
        Json out = Json::array();
        const std::string phase = s_.at("phase");
        if (phase == "attack" || phase == "defend") {
            auto cards = available(*actor());
            std::sort(cards.begin(), cards.end());
            const auto n = cards.size();
            for (std::size_t a = 0; a < n; ++a)
                for (std::size_t b = a + 1; b < n; ++b)
                    for (std::size_t c = b + 1; c < n; ++c)
                        out.push_back({{"type", "play"}, {"cards", {cards[a], cards[b], cards[c]}}});
            const int level = s_.at("flower_level");
            for (std::size_t a = 0; a < n; ++a)
                for (std::size_t b = a + 1; b < n; ++b)
                    for (std::size_t c = b + 1; c < n; ++c)
                        for (std::size_t d = c + 1; d < n; ++d) {
                            const std::vector<int> cs{cards[a], cards[b], cards[c], cards[d]};
                            int target = 0; bool valid = true;
                            for (int card : cs) if (!wild(card, level)) {
                                if (target && target != rank(card)) valid = false;
                                target = rank(card);
                            }
                            if (valid) out.push_back({{"type", "play"}, {"cards", cs}});
                        }
            for(std::size_t a=0;a<n;++a)for(std::size_t b=a+1;b<n;++b)for(std::size_t c=b+1;c<n;++c)for(std::size_t d=c+1;d<n;++d)for(std::size_t e=d+1;e<n;++e){
                const std::vector<int> cs{cards[a],cards[b],cards[c],cards[d],cards[e]};int target=0,count=0;bool valid=true;
                for(int card:cs)if(!wild(card,level)){if(target&&target!=rank(card))valid=false;target=rank(card);++count;}
                if(valid&&count==4)out.push_back({{"type","play"},{"cards",cs}});
            }
        } else if (phase == "refresh") {
            const int who = *actor();
            const auto& p = s_.at("players").at(who);
            const auto& q = s_.at("players").at(1 - who);
            for (const std::string zone : {"hand", "wounds"}) {
                for (std::size_t i = 0; i < p.at(zone).size(); ++i) {
                    if (p.at(zone).at(i).is_null()) continue;
                    const Json source = {{"zone", zone}, {"index", i}};
                    out.push_back({{"type", "swap"}, {"source", source}, {"target", {{"zone", "deck"}}}});
                    if (!q.at("hand").empty()) out.push_back({{"type", "swap"}, {"source", source}, {"target", {{"zone", "blind"}}}});
                    for (std::size_t j = 0; j < q.at("wounds").size(); ++j)
                        if (!q.at("wounds").at(j).is_null()) out.push_back({{"type", "swap"}, {"source", source}, {"target", {{"zone", "wounds"}, {"who", 1 - who}, {"index", j}}}});
                    const std::string other = zone == "hand" ? "wounds" : "hand";
                    for (std::size_t j = 0; j < p.at(other).size(); ++j)
                        if (!p.at(other).at(j).is_null()) out.push_back({{"type", "swap"}, {"source", source}, {"target", {{"zone", other}, {"who", who}, {"index", j}}}});
                }
            }
            out.push_back({{"type", "stop_swaps"}});
        } else if (phase == "resolved") out.push_back({{"type", "advance"}});
        else if (phase == "game_over") out.push_back({{"type", "next_game"}});
        return out;
    }
    Json step(const Json& action) {
        const auto legal = legal_actions();
        detail::require(std::find(legal.begin(), legal.end(), action) != legal.end(), "Illegal action");
        Json before = s_;
        try {
            const std::string type = action.at("type");
            if (type == "play") play(detail::ints(action.at("cards")));
            else if (type == "swap") swap(action);
            else if (type == "stop_swaps") { s_["pending"] = nullptr; finish_combat(); }
            else if (type == "advance") advance();
            else if (type == "next_game") start_game(s_.at("next_first").get<int>());
            check();
        } catch (...) { s_ = std::move(before); throw; }
        return observation(actor().value_or(0));
    }
    Json save() const { return s_; }
    static Game restore(Json state) { return Game(std::move(state), RestoreTag{}); }
    Json observation(int who) const {
        detail::require(who == 0 || who == 1, "Invalid player");
        const auto& p = s_.at("players").at(who);
        const auto& q = s_.at("players").at(1 - who);
        const auto a = actor();
        return {{"rules", RULES}, {"player", who}, {"actor", a ? Json(*a) : Json(nullptr)},
                {"phase", s_.at("phase")}, {"game", s_.at("game")}, {"round", s_.at("round")},
                {"first", s_.at("first")}, {"attacker", s_.at("attacker")}, {"battle_index", s_.at("battle_index")},
                {"levels", Json::array({p.at("level"), q.at("level")})},
                {"a_losses", Json::array({s_.at("a_losses").at(who), s_.at("a_losses").at(1 - who)})},
                {"flower_level", s_.at("flower_level")}, {"level_owner", s_.at("level_owner")}, {"hand", p.at("hand")}, {"wounds", p.at("wounds")},
                {"enemy_wounds", q.at("wounds")}, {"enemy_hand_count", q.at("hand").size()},
                {"deck_count", s_.at("stock").size()}, {"discard", s_.at("discard")},
                {"active", s_.at("active")}, {"pending", s_.at("pending")}, {"last_combat", s_.at("last_combat")},
                {"results", s_.at("results")}, {"legal_actions", a && *a == who ? legal_actions() : Json::array()}};
    }
    bool check() const {
        using namespace detail;
        require(s_.at("schema") == 2 && (s_.at("level_owner")==0 || s_.at("level_owner")==1) && s_.at("rules") == RULES, "Unsupported SDK state");
        const std::vector<std::string> phases{"attack", "defend", "refresh", "resolved", "game_over", "match_over"};
        const auto phase = s_.at("phase").get<std::string>();
        require(std::find(phases.begin(), phases.end(), phase) != phases.end(), "Invalid phase");
        require(s_.at("rng").is_number_integer() && s_.at("rng") > 0 && s_.at("rng") <= 0xffffffffULL, "Invalid RNG state");
        require(s_.at("first").is_number_integer() && (s_.at("first") == 0 || s_.at("first") == 1), "Invalid first");
        require(s_.at("attacker").is_number_integer() && (s_.at("attacker") == 0 || s_.at("attacker") == 1), "Invalid attacker");
        require(s_.at("players").is_array() && s_.at("players").size() == 2 && s_.at("active").size() == 2, "Invalid player arrays");
        require(s_.at("flower_level").is_number_integer() && s_.at("flower_level") >= 2 && s_.at("flower_level") <= 14, "Invalid flower");
        std::array<int, 52> counts{};
        std::size_t total = 0;
        const auto count = [&](const Json& c) {
            require(c.is_number_integer() && c >= 0 && c < 52, "Invalid physical card");
            ++counts.at(c.get<std::size_t>()); ++total;
        };
        for (const auto& c : s_.at("stock")) count(c);
        for (const auto& c : s_.at("discard")) count(c);
        for (int who = 0; who < 2; ++who) {
            const auto& p = s_.at("players").at(who);
            require(p.at("level").is_number_integer() && p.at("level") >= 2 && p.at("level") <= 14 && p.at("hand").size() <= 8, "Invalid player");
            for (const auto& c : p.at("hand")) count(c);
            for (std::size_t i = 0; i < p.at("wounds").size(); ++i) {
                const auto& c = p.at("wounds").at(i);
                if (!c.is_null()) count(c);
                else {
                    const auto& m = s_.at("active").at(who);
                    bool found = false;
                    if (!m.is_null()) for (const auto& o : m.at("origins"))
                        if (o.at("zone") == "wounds" && o.at("index") == i) found = true;
                    require(found, "Untracked wound slot");
                }
            }
            const auto& m = s_.at("active").at(who);
            if (!m.is_null()) for (const auto& c : m.at("cards")) count(c);
        }
        require(total == 52 && std::all_of(counts.begin(), counts.end(), [](int n) { return n == 1; }), "52-card conservation failed");
        if (phase == "refresh") {
            const auto& p = s_.at("pending");
            require(!p.is_null() && (p.at("actor") == 0 || p.at("actor") == 1) && p.at("remaining") > 0 && p.at("remaining") <= p.at("total"), "Invalid swaps");
        }
        return true;
    }
private:
    Json s_;
    struct RestoreTag {};
    Game(Json state, RestoreTag) : s_(std::move(state)) { check(); }
    double random() {
        auto x = s_.at("rng").get<std::uint32_t>();
        x ^= x << 13; x ^= x >> 17; x ^= x << 5;
        s_["rng"] = x;
        return static_cast<double>(x) / 4294967296.0;
    }
    void shuffle_stock() {
        for (std::size_t i = s_.at("stock").size(); i > 1; --i) {
            const auto j = static_cast<std::size_t>(random() * static_cast<double>(i));
            std::swap(s_["stock"][i - 1], s_["stock"][j]);
        }
    }
    int draw() {
        if (s_["stock"].empty()) {
            detail::require(!s_["discard"].empty(), "No cards to draw");
            s_["stock"] = std::move(s_["discard"]); s_["discard"] = Json::array(); shuffle_stock();
        }
        const int c = s_["stock"].back(); s_["stock"].erase(s_["stock"].end() - 1); return c;
    }
    void start_game(int first) {
        s_["game"] = s_.at("game").get<int>() + 1;
        s_["round"] = 1; s_["first"] = first; s_["level_owner"] = first; s_["attacker"] = first; s_["battle_index"] = 0;
        s_["flower_level"] = s_["players"][first]["level"];
        std::vector<int> stock(52); std::iota(stock.begin(), stock.end(), 0); s_["stock"] = stock; shuffle_stock();
        s_["discard"] = Json::array(); s_["active"] = Json::array({nullptr, nullptr}); s_["pending"] = nullptr;
        s_["round_uses"] = {0, 0}; s_["cards_played"] = {0, 0}; s_["phase"] = "attack"; s_["last_combat"] = nullptr;
        for (auto& p : s_["players"]) { p["hand"] = Json::array(); p["wounds"] = Json::array(); }
        for (int i = 0; i < 8; ++i) for (int who : {first, 1 - first}) { const int c = draw(); s_["players"][who]["hand"].push_back(c); }
        check();
    }
    std::vector<int> available(int who) const {
        const auto& p = s_.at("players").at(who); auto out = detail::ints(p.at("hand"));
        for (const auto& c : p.at("wounds")) if (!c.is_null()) out.push_back(c.get<int>());
        return out;
    }
    void play(const std::vector<int>& cards) {
        const int who = *actor(); Json e = evaluate(cards, s_.at("flower_level")); Json origins = Json::array();
        auto& p = s_["players"][who];
        for (int c : cards) {
            auto h = std::find(p["hand"].begin(), p["hand"].end(), Json(c));
            if (h != p["hand"].end()) { p["hand"].erase(h); origins.push_back({{"zone", "hand"}}); }
            else {
                const auto it = std::find(p["wounds"].begin(), p["wounds"].end(), Json(c));
                detail::require(it != p["wounds"].end(), "Unavailable card");
                const auto i = static_cast<std::size_t>(std::distance(p["wounds"].begin(), it));
                p["wounds"][i] = nullptr; origins.push_back({{"zone", "wounds"}, {"index", i}});
                s_["round_uses"][who] = s_["round_uses"][who].get<int>() + 1;
            }
        }
        e["cards"] = cards; e["origins"] = origins; s_["active"][who] = e;
        s_["cards_played"][who] = s_["cards_played"][who].get<int>() + static_cast<int>(cards.size());
        if (s_["phase"] == "attack") { s_["phase"] = "defend"; return; }
        const int attack = s_.at("attacker"); const Json moves = s_.at("active");
        Json result = outcome(moves[attack], moves[1 - attack]); result["attacker"] = attack; result["moves"] = moves;
        const int d = result.at("effective_delta"); s_["last_combat"] = result;
        for (const auto& m : moves) for (const auto& c : m.at("cards")) s_["discard"].push_back(c);
        s_["active"] = Json::array({nullptr, nullptr});
        for (int actor : {attack, 1 - attack}) {
            std::vector<std::size_t> indices;
            for (const auto& o : moves[actor]["origins"]) if (o.at("zone") == "wounds") indices.push_back(o.at("index"));
            std::sort(indices.begin(), indices.end());
            for (auto i : indices) { const int c = draw(); s_["players"][actor]["wounds"][i] = c; }
        }
        if (d > 0) {
            for (int i = 0; i < d; ++i) { const int c = draw(); s_["players"][1 - attack]["wounds"].push_back(c); }
            finish_combat();
        } else if (d < 0) {
            s_["pending"] = {{"actor", 1 - attack}, {"total", -d}, {"remaining", -d}}; s_["phase"] = "refresh";
            if (legal_actions().size() == 1) { s_["pending"] = nullptr; finish_combat(); }
        } else finish_combat();
    }
    int get_card(int who, const std::string& zone, std::size_t i) const { return s_.at("players").at(who).at(zone).at(i); }
    void put_card(int who, const std::string& zone, std::size_t i, int c) { s_["players"][who][zone][i] = c; }
    void swap(const Json& a) {
        const int who = *actor(); const auto zone = a.at("source").at("zone").get<std::string>();
        const auto i = a.at("source").at("index").get<std::size_t>(); const int old = get_card(who, zone, i);
        const auto& t = a.at("target"); const std::string z = t.at("zone");
        if (z == "deck") { s_["discard"].push_back(old); const int c = draw(); put_card(who, zone, i, c); }
        else {
            const int other = z == "blind" ? 1 - who : t.at("who").get<int>();
            const std::string target_zone = z == "blind" ? "hand" : z;
            const auto j = z == "blind" ? static_cast<std::size_t>(random() * s_["players"][other]["hand"].size()) : t.at("index").get<std::size_t>();
            const int incoming = get_card(other, target_zone, j); put_card(who, zone, i, incoming); put_card(other, target_zone, j, old);
        }
        s_["pending"]["remaining"] = s_["pending"]["remaining"].get<int>() - 1;
        if (s_["pending"]["remaining"] == 0) { s_["pending"] = nullptr; finish_combat(); }
    }
    void finish_combat() {
        int loser = -1;
        for (int i = 0; i < 2; ++i) if (s_["players"][i]["wounds"].size() >= 5) { loser = i; break; }
        if (loser < 0) { s_["phase"] = "resolved"; return; }
        const int winner = 1 - loser, old = s_["players"][winner]["level"];
        const int gain = static_cast<int>(s_["players"][loser]["wounds"].size()) - static_cast<int>(s_["players"][winner]["wounds"].size());
        const int level = std::min(14, old + gain); s_["players"][winner]["level"] = level; s_["next_first"] = winner;
        const int challenger=s_.at("flower_level")==14?s_.at("level_owner").get<int>():-1;
        const bool match_won=old==14&&challenger==winner;
        s_["phase"] = match_won ? "match_over" : "game_over"; Json reset = nullptr;
        if (s_["players"][loser]["level"] == 14 && challenger == loser) {
            s_["a_losses"][loser] = s_["a_losses"][loser].get<int>() + 1;
            if (s_["a_losses"][loser] == 3) {
                s_["players"][loser]["level"] = 2; s_["a_losses"][loser] = 0;
                reset = {{"who", loser}, {"from", 14}, {"to", 2}, {"failures", 3}};
            }
        }
        if (old < 14 && level == 14) s_["a_losses"][winner] = 0;
        s_["results"].push_back({{"game", s_.at("game")}, {"rounds", s_.at("round")}, {"winner", winner},
                                {"damage", {s_["players"][0]["wounds"].size(), s_["players"][1]["wounds"].size()}},
                                {"gain", gain}, {"from", old}, {"to", level}, {"match_won", match_won}, {"level_owner", s_.at("level_owner")}, {"ace_challenger", challenger<0?Json(nullptr):Json(challenger)}, {"aLosses", s_.at("a_losses")}, {"a_reset", reset}});
    }
    void advance() {
        if (s_["battle_index"] == 0) { s_["battle_index"] = 1; s_["attacker"] = 1 - s_.at("first").get<int>(); s_["phase"] = "attack"; s_["last_combat"] = nullptr; }
        else {
            const int next = 1 - s_.at("first").get<int>();
            for (int who : {next, 1 - next}) while (s_["players"][who]["hand"].size() < 8) { const int c = draw(); s_["players"][who]["hand"].push_back(c); }
            s_["first"] = next; s_["attacker"] = next; s_["battle_index"] = 0; s_["round"] = s_.at("round").get<int>() + 1;
            s_["round_uses"] = {0, 0}; s_["cards_played"] = {0, 0}; s_["last_combat"] = nullptr; s_["phase"] = "attack";
        }
    }
};
} // namespace threecard_royale
