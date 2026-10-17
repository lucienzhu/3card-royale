//! JSON-lines bridge for integration and cross-language conformance.
use serde_json::{json, Value};
use std::io::{self, BufRead, Write};
use threecard_royale::{choose_action, evaluate, Game};
fn main() {
    let mut game: Option<Game> = None;
    for line in io::stdin().lock().lines() {
        let response = (|| -> Result<Value, String> {
            let v: Value = serde_json::from_str(&line.map_err(|e| e.to_string())?)
                .map_err(|e| e.to_string())?;
            let op = v["op"].as_str().ok_or("Missing op")?;
            match op {
                "init" => {
                    let seed = v["seed"]
                        .as_u64()
                        .filter(|x| *x <= u32::MAX as u64)
                        .ok_or("Invalid seed")? as u32;
                    let first = if v["first"].is_null() {
                        None
                    } else {
                        Some(v["first"].as_u64().ok_or("Invalid first")? as usize)
                    };
                    game = Some(Game::new(seed, first)?);
                }
                "restore" => {
                    game = Some(Game::restore(v["state"].clone())?);
                }
                "step" => {
                    game.as_mut().ok_or("Not initialized")?.step(&v["action"])?;
                }
                "evaluate" => {
                    let mut result = vec![];
                    for x in v["cases"].as_array().ok_or("Missing cases")? {
                        let cards: Vec<u8> = serde_json::from_value(x["cards"].clone())
                            .map_err(|e| e.to_string())?;
                        let level = x["level"]
                            .as_u64()
                            .filter(|x| *x <= u8::MAX as u64)
                            .ok_or("Invalid level")? as u8;
                        result.push(evaluate(&cards, level)?);
                    }
                    return Ok(json!({"evaluations":result}));
                }
                "inspect" => {}
                _ => return Err("Unknown op".into()),
            }
            let g = game.as_ref().ok_or("Not initialized")?;
            let mut out = json!({"state":g.save(),"actions":g.legal_actions(),"observations":[g.observation(0)?,g.observation(1)?]});
            if v["policy"] == true {
                if let Some(actor) = g.actor() {
                    out["policy"] = choose_action(&g.observation(actor)?)?;
                }
            }
            Ok(out)
        })();
        println!(
            "{}",
            match response {
                Ok(v) => v,
                Err(e) => json!({"error":e}),
            }
        );
        io::stdout().flush().unwrap();
    }
}
