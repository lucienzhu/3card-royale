//! Native portable rules 0.3.8. Full State is trusted-host data; send observation to players.
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::HashSet;
pub const RULES: &str = "0.3.8";
type R<T> = Result<T, String>;
fn need(b: bool, s: &str) -> R<()> {
    if b {
        Ok(())
    } else {
        Err(s.into())
    }
}
fn rank(c: u8) -> u8 {
    c % 13 + 2
}
fn wild(c: u8, l: u8) -> bool {
    c / 13 == 1 && rank(c) == l
}
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct Wild {
    physical: u8,
    r#as: u8,
}
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct Evaluation {
    pub score: u8,
    pub kind: u8,
    pub rank_key: Vec<u8>,
    pub wild: Option<Wild>,
}
fn plain(cs: &[u8]) -> Evaluation {
    let mut rs: Vec<u8> = cs.iter().map(|c| rank(*c)).collect();
    rs.sort_by(|a, b| b.cmp(a));
    let n = rs.iter().collect::<HashSet<_>>().len();
    let straight = n == 3 && (rs[0] - rs[2] == 2 || rs == [14, 3, 2]);
    let flush = cs.iter().all(|c| c / 13 == cs[0] / 13);
    let kind = if straight && flush {
        5
    } else if n == 1 {
        4
    } else if flush {
        3
    } else if straight {
        2
    } else if n == 2 {
        1
    } else {
        0
    };
    let key = match kind {
        2 | 5 => vec![if rs == [14, 3, 2] { 3 } else { rs[0] }],
        4 => vec![rs[0]],
        1 => vec![
            *rs.iter()
                .find(|r| rs.iter().filter(|x| *x == *r).count() == 2)
                .unwrap(),
            *rs.iter()
                .find(|r| rs.iter().filter(|x| *x == *r).count() == 1)
                .unwrap(),
        ],
        _ => rs,
    };
    Evaluation {
        score: if kind == 4 {
            5
        } else if kind == 5 {
            4
        } else {
            kind
        },
        kind,
        rank_key: key,
        wild: None,
    }
}
pub fn evaluate(cards: &[u8], level: u8) -> R<Evaluation> {
    need(
        (2..=14).contains(&level)
            && [3, 4].contains(&cards.len())
            && cards.iter().all(|c| *c < 52)
            && cards.iter().collect::<HashSet<_>>().len() == cards.len(),
        "Invalid cards or flower level",
    )?;
    let mut ids = cards.to_vec();
    ids.sort();
    let wc = ids.iter().find(|c| wild(**c, level)).copied();
    let others: Vec<u8> = ids.iter().copied().filter(|c| Some(*c) != wc).collect();
    if ids.len() == 4 {
        let target = rank(others[0]);
        need(
            others.iter().all(|c| rank(*c) == target),
            "Four cards must be one rank",
        )?;
        return Ok(Evaluation {
            score: 6,
            kind: 6,
            rank_key: vec![target],
            wild: wc.map(|physical| Wild {
                physical,
                r#as: (0..52)
                    .find(|c| rank(*c) == target && !others.contains(c))
                    .unwrap(),
            }),
        });
    }
    let mut best = plain(&ids);
    if let Some(physical) = wc {
        let mut virtual_card = physical;
        for c in 0..52 {
            if !others.contains(&c) {
                let mut hand = others.clone();
                hand.push(c);
                let e = plain(&hand);
                if (e.score, &e.rank_key) > (best.score, &best.rank_key) {
                    best = e;
                    virtual_card = c;
                }
            }
        }
        best.wild = Some(Wild {
            physical,
            r#as: virtual_card,
        });
    }
    Ok(best)
}
pub fn outcome(a: &Evaluation, b: &Evaluation) -> Value {
    let delta = a.score as i32 - b.score as i32;
    let r = match a.rank_key.cmp(&b.rank_key) {
        std::cmp::Ordering::Less => -1,
        std::cmp::Ordering::Equal => 0,
        _ => 1,
    };
    json!({"delta":delta,"effective_delta":if delta!=0{delta}else{r},"reason":if delta!=0{"type"}else if r>0{"rank_attack"}else if r<0{"rank_defend"}else{"exact_tie"}})
}
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Player {
    pub level: u8,
    pub hand: Vec<u8>,
    pub wounds: Vec<Option<u8>>,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Origin {
    zone: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    index: Option<usize>,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Move {
    #[serde(flatten)]
    e: Evaluation,
    cards: Vec<u8>,
    origins: Vec<Origin>,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Pending {
    actor: usize,
    total: u8,
    remaining: u8,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct State {
    schema: u8,
    rules: String,
    seed: u32,
    rng: u32,
    players: [Player; 2],
    a_losses: [u8; 2],
    game: u32,
    round: u32,
    results: Vec<Value>,
    next_first: Option<usize>,
    last_combat: Option<Value>,
    first: usize,
    attacker: usize,
    battle_index: u8,
    flower_level: u8,
    stock: Vec<u8>,
    discard: Vec<u8>,
    active: [Option<Move>; 2],
    pending: Option<Pending>,
    round_uses: [u8; 2],
    cards_played: [u8; 2],
    phase: String,
}
#[derive(Clone)]
pub struct Game {
    s: State,
}
impl Game {
    pub fn new(seed: u32, first: Option<usize>) -> R<Self> {
        need(
            first.is_none() || first.unwrap() < 2,
            "Invalid first player",
        )?;
        let p = Player {
            level: 2,
            hand: vec![],
            wounds: vec![],
        };
        let mut g = Self {
            s: State {
                schema: 1,
                rules: RULES.into(),
                seed,
                rng: if seed == 0 { 0x6d2b79f5 } else { seed },
                players: [p.clone(), p],
                a_losses: [0, 0],
                game: 0,
                round: 0,
                results: vec![],
                next_first: None,
                last_combat: None,
                first: 0,
                attacker: 0,
                battle_index: 0,
                flower_level: 2,
                stock: vec![],
                discard: vec![],
                active: [None, None],
                pending: None,
                round_uses: [0, 0],
                cards_played: [0, 0],
                phase: "attack".into(),
            },
        };
        let f = first.unwrap_or_else(|| if g.random() < 0.5 { 0 } else { 1 });
        g.start_game(f);
        g.check()?;
        Ok(g)
    }
    fn random(&mut self) -> f64 {
        let mut x = self.s.rng;
        x ^= x << 13;
        x ^= x >> 17;
        x ^= x << 5;
        self.s.rng = x;
        x as f64 / 4294967296.0
    }
    fn shuffle_stock(&mut self) {
        for i in (1..self.s.stock.len()).rev() {
            let j = (self.random() * (i + 1) as f64) as usize;
            self.s.stock.swap(i, j);
        }
    }
    fn draw(&mut self) -> u8 {
        if self.s.stock.is_empty() {
            self.s.stock = std::mem::take(&mut self.s.discard);
            self.shuffle_stock();
        }
        self.s.stock.pop().expect("valid state has drawable cards")
    }
    fn start_game(&mut self, first: usize) {
        self.s.game += 1;
        self.s.round = 1;
        self.s.first = first;
        self.s.attacker = first;
        self.s.battle_index = 0;
        self.s.flower_level = self.s.players[first].level;
        self.s.stock = (0..52).collect();
        self.shuffle_stock();
        self.s.discard.clear();
        self.s.active = [None, None];
        self.s.pending = None;
        self.s.round_uses = [0, 0];
        self.s.cards_played = [0, 0];
        self.s.phase = "attack".into();
        self.s.last_combat = None;
        for p in &mut self.s.players {
            p.hand.clear();
            p.wounds.clear();
        }
        for _ in 0..8 {
            for who in [first, 1 - first] {
                let c = self.draw();
                self.s.players[who].hand.push(c);
            }
        }
    }
    pub fn actor(&self) -> Option<usize> {
        match self.s.phase.as_str() {
            "attack" => Some(self.s.attacker),
            "defend" => Some(1 - self.s.attacker),
            "refresh" => self.s.pending.as_ref().map(|p| p.actor),
            _ => None,
        }
    }
    fn available(&self, who: usize) -> Vec<u8> {
        let p = &self.s.players[who];
        p.hand
            .iter()
            .copied()
            .chain(p.wounds.iter().flatten().copied())
            .collect()
    }
    pub fn legal_actions(&self) -> Vec<Value> {
        let mut out = vec![];
        match self.s.phase.as_str() {
            "attack" | "defend" => {
                let mut cs = self.available(self.actor().unwrap());
                cs.sort();
                let n = cs.len();
                for a in 0..n {
                    for b in a + 1..n {
                        for c in b + 1..n {
                            out.push(json!({"type":"play","cards":[cs[a],cs[b],cs[c]]}));
                        }
                    }
                }
                for a in 0..n {
                    for b in a + 1..n {
                        for c in b + 1..n {
                            for d in c + 1..n {
                                let cards = vec![cs[a], cs[b], cs[c], cs[d]];
                                let rs: Vec<u8> = cards
                                    .iter()
                                    .filter(|c| !wild(**c, self.s.flower_level))
                                    .map(|c| rank(*c))
                                    .collect();
                                if rs.iter().all(|r| *r == rs[0]) {
                                    out.push(json!({"type":"play","cards":cards}));
                                }
                            }
                        }
                    }
                }
            }
            "refresh" => {
                let who = self.actor().unwrap();
                let p = &self.s.players[who];
                let q = &self.s.players[1 - who];
                for zone in ["hand", "wounds"] {
                    let len = if zone == "hand" {
                        p.hand.len()
                    } else {
                        p.wounds.len()
                    };
                    for i in 0..len {
                        if zone == "wounds" && p.wounds[i].is_none() {
                            continue;
                        }
                        let source = json!({"zone":zone,"index":i});
                        out.push(json!({"type":"swap","source":source,"target":{"zone":"deck"}}));
                        if !q.hand.is_empty() {
                            out.push(
                                json!({"type":"swap","source":source,"target":{"zone":"blind"}}),
                            );
                        }
                        for (j, c) in q.wounds.iter().enumerate() {
                            if c.is_some() {
                                out.push(json!({"type":"swap","source":source,"target":{"zone":"wounds","who":1-who,"index":j}}));
                            }
                        }
                        let other = if zone == "hand" { "wounds" } else { "hand" };
                        let len = if other == "hand" {
                            p.hand.len()
                        } else {
                            p.wounds.len()
                        };
                        for j in 0..len {
                            if other == "hand" || p.wounds[j].is_some() {
                                out.push(json!({"type":"swap","source":source,"target":{"zone":other,"who":who,"index":j}}));
                            }
                        }
                    }
                }
                out.push(json!({"type":"stop_swaps"}));
            }
            "resolved" => out.push(json!({"type":"advance"})),
            "game_over" => out.push(json!({"type":"next_game"})),
            _ => {}
        }
        out
    }
    pub fn step(&mut self, a: &Value) -> R<Value> {
        need(self.legal_actions().contains(a), "Illegal action")?;
        let before = self.s.clone();
        let r = self.apply(a).and_then(|_| self.check());
        if let Err(e) = r {
            self.s = before;
            return Err(e);
        }
        self.observation(self.actor().unwrap_or(0))
    }
    fn apply(&mut self, a: &Value) -> R<()> {
        match a["type"].as_str().unwrap() {
            "play" => {
                let cards: Vec<u8> =
                    serde_json::from_value(a["cards"].clone()).map_err(|e| e.to_string())?;
                self.play(cards)?;
            }
            "swap" => self.swap(a),
            "stop_swaps" => {
                self.s.pending = None;
                self.finish_combat();
            }
            "advance" => self.advance(),
            "next_game" => self.start_game(self.s.next_first.unwrap()),
            _ => unreachable!(),
        }
        Ok(())
    }
    fn play(&mut self, cards: Vec<u8>) -> R<()> {
        let who = self.actor().unwrap();
        let e = evaluate(&cards, self.s.flower_level)?;
        let mut origins = vec![];
        for c in &cards {
            if let Some(i) = self.s.players[who].hand.iter().position(|x| x == c) {
                self.s.players[who].hand.remove(i);
                origins.push(Origin {
                    zone: "hand".into(),
                    index: None,
                });
            } else {
                let i = self.s.players[who]
                    .wounds
                    .iter()
                    .position(|x| *x == Some(*c))
                    .unwrap();
                self.s.players[who].wounds[i] = None;
                origins.push(Origin {
                    zone: "wounds".into(),
                    index: Some(i),
                });
                self.s.round_uses[who] += 1;
            }
        }
        self.s.cards_played[who] += cards.len() as u8;
        self.s.active[who] = Some(Move { e, cards, origins });
        if self.s.phase == "attack" {
            self.s.phase = "defend".into();
            return Ok(());
        }
        let attack = self.s.attacker;
        let moves = self.s.active.clone();
        let mut result = outcome(
            &moves[attack].as_ref().unwrap().e,
            &moves[1 - attack].as_ref().unwrap().e,
        );
        result["attacker"] = json!(attack);
        result["moves"] = json!(moves);
        let d = result["effective_delta"].as_i64().unwrap();
        self.s.last_combat = Some(result);
        for m in moves.iter().flatten() {
            self.s.discard.extend(&m.cards);
        }
        self.s.active = [None, None];
        for who in [attack, 1 - attack] {
            let mut indices: Vec<usize> = moves[who]
                .as_ref()
                .unwrap()
                .origins
                .iter()
                .filter_map(|o| o.index)
                .collect();
            indices.sort();
            for i in indices {
                let c = self.draw();
                self.s.players[who].wounds[i] = Some(c);
            }
        }
        if d > 0 {
            for _ in 0..d {
                let c = self.draw();
                self.s.players[1 - attack].wounds.push(Some(c));
            }
            self.finish_combat();
        } else if d < 0 {
            self.s.pending = Some(Pending {
                actor: 1 - attack,
                total: (-d) as u8,
                remaining: (-d) as u8,
            });
            self.s.phase = "refresh".into();
            if self.legal_actions().len() == 1 {
                self.s.pending = None;
                self.finish_combat();
            }
        } else {
            self.finish_combat();
        }
        Ok(())
    }
    fn get(&self, who: usize, zone: &str, i: usize) -> u8 {
        if zone == "hand" {
            self.s.players[who].hand[i]
        } else {
            self.s.players[who].wounds[i].unwrap()
        }
    }
    fn put(&mut self, who: usize, zone: &str, i: usize, c: u8) {
        if zone == "hand" {
            self.s.players[who].hand[i] = c;
        } else {
            self.s.players[who].wounds[i] = Some(c);
        }
    }
    fn swap(&mut self, a: &Value) {
        let who = self.actor().unwrap();
        let zone = a["source"]["zone"].as_str().unwrap();
        let i = a["source"]["index"].as_u64().unwrap() as usize;
        let old = self.get(who, zone, i);
        let target = &a["target"];
        let z = target["zone"].as_str().unwrap();
        if z == "deck" {
            self.s.discard.push(old);
            let c = self.draw();
            self.put(who, zone, i, c);
        } else {
            let (other, dz, j) = if z == "blind" {
                (
                    1 - who,
                    "hand",
                    (self.random() * self.s.players[1 - who].hand.len() as f64) as usize,
                )
            } else {
                (
                    target["who"].as_u64().unwrap() as usize,
                    z,
                    target["index"].as_u64().unwrap() as usize,
                )
            };
            let c = self.get(other, dz, j);
            self.put(who, zone, i, c);
            self.put(other, dz, j, old);
        }
        let pending = self.s.pending.as_mut().unwrap();
        pending.remaining -= 1;
        if pending.remaining == 0 {
            self.s.pending = None;
            self.finish_combat();
        }
    }
    fn finish_combat(&mut self) {
        if let Some(loser) = self.s.players.iter().position(|p| p.wounds.len() >= 5) {
            let winner = 1 - loser;
            let old = self.s.players[winner].level;
            let gain = self.s.players[loser].wounds.len() - self.s.players[winner].wounds.len();
            self.s.players[winner].level = (old as usize + gain).min(14) as u8;
            self.s.next_first = Some(winner);
            self.s.phase = if old == 14 { "match_over" } else { "game_over" }.into();
            let mut reset = Value::Null;
            if self.s.players[loser].level == 14 && old != 14 {
                self.s.a_losses[loser] += 1;
                if self.s.a_losses[loser] == 3 {
                    self.s.players[loser].level = 2;
                    self.s.a_losses[loser] = 0;
                    reset = json!({"who":loser,"from":14,"to":2,"failures":3});
                }
            }
            if old < 14 && self.s.players[winner].level == 14 {
                self.s.a_losses[winner] = 0;
            }
            self.s.results.push(json!({"game":self.s.game,"rounds":self.s.round,"winner":winner,"damage":[self.s.players[0].wounds.len(),self.s.players[1].wounds.len()],"gain":gain,"from":old,"to":self.s.players[winner].level,"match_won":old==14,"aLosses":self.s.a_losses,"a_reset":reset}));
        } else {
            self.s.phase = "resolved".into();
        }
    }
    fn advance(&mut self) {
        if self.s.battle_index == 0 {
            self.s.battle_index = 1;
            self.s.attacker = 1 - self.s.first;
            self.s.phase = "attack".into();
            self.s.last_combat = None;
        } else {
            let next = 1 - self.s.first;
            for who in [next, 1 - next] {
                while self.s.players[who].hand.len() < 8 {
                    let c = self.draw();
                    self.s.players[who].hand.push(c);
                }
            }
            self.s.first = next;
            self.s.attacker = next;
            self.s.battle_index = 0;
            self.s.round += 1;
            self.s.round_uses = [0, 0];
            self.s.cards_played = [0, 0];
            self.s.last_combat = None;
            self.s.phase = "attack".into();
        }
    }
    pub fn save(&self) -> Value {
        serde_json::to_value(&self.s).unwrap()
    }
    pub fn restore(state: Value) -> R<Self> {
        let s: State = serde_json::from_value(state).map_err(|e| e.to_string())?;
        let g = Self { s };
        g.check()?;
        Ok(g)
    }
    pub fn observation(&self, who: usize) -> R<Value> {
        need(who < 2, "Invalid player")?;
        let s = &self.s;
        let p = &s.players[who];
        let q = &s.players[1 - who];
        Ok(
            json!({"rules":RULES,"player":who,"actor":self.actor(),"phase":s.phase,"game":s.game,"round":s.round,"first":s.first,"attacker":s.attacker,"battle_index":s.battle_index,"levels":[p.level,q.level],"a_losses":[s.a_losses[who],s.a_losses[1-who]],"flower_level":s.flower_level,"hand":p.hand,"wounds":p.wounds,"enemy_wounds":q.wounds,"enemy_hand_count":q.hand.len(),"deck_count":s.stock.len(),"discard":s.discard,"active":s.active,"pending":s.pending,"last_combat":s.last_combat,"results":s.results,"legal_actions":if self.actor()==Some(who){self.legal_actions()}else{vec![]}}),
        )
    }
    pub fn check(&self) -> R<()> {
        let s = &self.s;
        need(
            s.schema == 1
                && s.rules == RULES
                && s.rng > 0
                && s.first < 2
                && s.attacker < 2
                && s.battle_index < 2
                && s.next_first.map(|x| x < 2).unwrap_or(true)
                && [
                    "attack",
                    "defend",
                    "refresh",
                    "resolved",
                    "game_over",
                    "match_over",
                ]
                .contains(&s.phase.as_str()),
            "Unsupported SDK state",
        )?;
        need(
            (2..=14).contains(&s.flower_level)
                && s.players
                    .iter()
                    .all(|p| (2..=14).contains(&p.level) && p.hand.len() <= 8),
            "Invalid players",
        )?;
        let mut ids = s.stock.clone();
        ids.extend(&s.discard);
        for p in &s.players {
            ids.extend(&p.hand);
            ids.extend(p.wounds.iter().flatten());
        }
        for m in s.active.iter().flatten() {
            ids.extend(&m.cards);
        }
        need(
            ids.len() == 52
                && ids.iter().all(|c| *c < 52)
                && ids.iter().collect::<HashSet<_>>().len() == 52,
            "52-card conservation failed",
        )?;
        for (who, p) in s.players.iter().enumerate() {
            for (i, c) in p.wounds.iter().enumerate() {
                if c.is_none() {
                    need(
                        s.active[who]
                            .as_ref()
                            .map(|m| {
                                m.origins
                                    .iter()
                                    .any(|o| o.zone == "wounds" && o.index == Some(i))
                            })
                            .unwrap_or(false),
                        "Untracked wound slot",
                    )?;
                }
            }
        }
        if s.phase == "refresh" {
            need(
                s.pending
                    .as_ref()
                    .map(|p| p.actor < 2 && p.remaining > 0 && p.remaining <= p.total)
                    .unwrap_or(false),
                "Invalid pending swaps",
            )?;
        }
        Ok(())
    }
}

mod policy;
pub use policy::choose_action;
