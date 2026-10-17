use threecard_royale::{choose_action, Game};
fn main() -> Result<(), String> {
    let mut game = Game::new(42, None)?;
    for _ in 0..10000 {
        if game.save()["phase"] == "match_over" {
            println!("{}", game.save()["results"]);
            return Ok(());
        }
        let action = match game.actor() {
            Some(actor) => choose_action(&game.observation(actor)?)?,
            None => game.legal_actions()[0].clone(),
        };
        game.step(&action)?;
    }
    Err("Match exceeded the example's decision limit".into())
}
