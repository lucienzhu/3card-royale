//! Deterministic baseline using only the caller's player observation.
use crate::{evaluate, outcome, rank, wild, Evaluation};
use serde_json::Value;

pub fn choose_action(o: &Value) -> Result<Value, String> {
    let actions = o["legal_actions"]
        .as_array()
        .ok_or("Missing legal actions")?;
    if actions.is_empty() {
        return Err("No legal decision".into());
    }
    let phase = o["phase"].as_str().ok_or("Missing phase")?;
    if !["attack", "defend", "refresh"].contains(&phase) {
        return Ok(actions[0].clone());
    }
    let flower = o["flower_level"]
        .as_u64()
        .filter(|x| (2..=14).contains(x))
        .ok_or("Invalid flower")? as u8;
    let mut best: Option<(Value, [i64; 6])> = None;
    for a in actions {
        let mut key = [0; 6];
        if phase != "refresh" {
            let cards: Vec<u8> =
                serde_json::from_value(a["cards"].clone()).map_err(|e| e.to_string())?;
            let e = evaluate(&cards, flower)?;
            let wounds = o["wounds"].as_array().ok_or("Missing wounds")?;
            let uses = cards
                .iter()
                .filter(|c| wounds.contains(&Value::from(**c)))
                .count() as i64;
            let wc = cards.iter().filter(|c| wild(**c, flower)).count() as i64;
            if phase == "attack" {
                key[0] = e.score as i64;
                for (i, r) in e.rank_key.iter().enumerate() {
                    key[1 + i] = *r as i64;
                }
                key[4] = uses;
                key[5] = -wc;
            } else {
                let attacker = o["attacker"]
                    .as_u64()
                    .filter(|x| *x < 2)
                    .ok_or("Invalid attacker")? as usize;
                let attack: Evaluation = serde_json::from_value(o["active"][attacker].clone())
                    .map_err(|e| e.to_string())?;
                let d = outcome(&attack, &e)["effective_delta"].as_i64().unwrap();
                key[0] = -d.max(0);
                key[1] = (-d).max(0);
                key[2] = uses;
                key[3] = -wc;
            }
        } else if a["type"] == "stop_swaps" {
            key[0] = -1000;
        } else {
            let source = &a["source"];
            let z = source["zone"].as_str().ok_or("Missing source")?;
            let i = source["index"].as_u64().ok_or("Missing source index")? as usize;
            let c = o[z][i]
                .as_u64()
                .filter(|x| *x < 52)
                .ok_or("Invalid source card")? as u8;
            let target = &a["target"];
            let zone = target["zone"].as_str().ok_or("Missing target")?;
            if zone == "deck" || zone == "blind" {
                key[0] = 0;
                key[1] = -(wild(c, flower) as i64);
                key[2] = -(rank(c) as i64);
                key[3] = (zone == "deck") as i64;
            } else if target["who"] == o["player"] {
                key[0] = -100;
            } else {
                let i = target["index"].as_u64().ok_or("Missing target index")? as usize;
                let take = o["enemy_wounds"][i]
                    .as_u64()
                    .filter(|x| *x < 52)
                    .ok_or("Invalid target card")? as u8;
                let diff = wild(take, flower) as i64 - wild(c, flower) as i64;
                let improves = diff > 0 || diff == 0 && rank(take) > rank(c);
                key[0] = if improves { 1 } else { -1 };
                key[1] = diff;
                key[2] = rank(take) as i64 - rank(c) as i64;
                key[3] = -1;
            }
        }
        if best.as_ref().map(|x| key > x.1).unwrap_or(true) {
            best = Some((a.clone(), key));
        }
    }
    Ok(best.unwrap().0)
}
