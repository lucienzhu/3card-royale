export type PlayerId = 0 | 1;
export type Zone = "hand" | "wounds";
export type Action =
  | { type: "play"; cards: number[] }
  | {
      type: "swap";
      source: { zone: Zone; index: number };
      target:
        | { zone: "deck" | "blind" }
        | { zone: Zone; who: PlayerId; index: number };
    }
  | { type: "skip_swap" | "stop_swaps" | "advance" | "next_game" };
export interface Evaluation {
  score: number;
  kind: number;
  rank_key: number[];
  wild: null | { physical: number; as: number };
}
export interface Move extends Evaluation {
  cards: number[];
  origins: ({ zone: "hand" } | { zone: "wounds"; index: number })[];
}
export interface Pending {
  actor: PlayerId;
  remaining: number;
  total: number;
}
export interface Combat {
  attacker: PlayerId;
  moves: [Move, Move];
  delta: number;
  effective_delta: number;
  reason: string;
}
export type Phase =
  | "attack"
  | "defend"
  | "refresh"
  | "resolved"
  | "game_over"
  | "match_over";
export interface GameResult {
  game: number;
  rounds: number;
  winner: PlayerId;
  damage: [number, number];
  gain: number;
  from: number;
  to: number;
  match_won: boolean;
  level_owner: PlayerId;
  ace_challenger: PlayerId | null;
  aLosses: [number, number];
  a_reset: null | { who: PlayerId; from: 14; to: 2; failures: 3 };
}
/** Private trusted-host state: never send to an agent or untrusted client. */
export interface State {
  schema: 2;
  rules: "1.0.0";
  seed: number;
  rng: number;
  players: [
    { level: number; hand: number[]; wounds: (number | null)[] },
    { level: number; hand: number[]; wounds: (number | null)[] },
  ];
  a_losses: [number, number];
  game: number;
  round: number;
  results: GameResult[];
  next_first: PlayerId | null;
  last_combat: Combat | null;
  first: PlayerId;
  attacker: PlayerId;
  battle_index: number;
  flower_level: number;
  level_owner: PlayerId;
  stock: number[];
  discard: number[];
  active: [Move | null, Move | null];
  pending: Pending | null;
  round_uses: [number, number];
  cards_played: [number, number];
  phase: Phase;
}
export interface Observation {
  rules: "1.0.0";
  player: PlayerId;
  actor: PlayerId | null;
  phase: Phase;
  game: number;
  round: number;
  first: PlayerId;
  attacker: PlayerId;
  battle_index: number;
  levels: [number, number];
  a_losses: [number, number];
  flower_level: number;
  level_owner: PlayerId;
  hand: number[];
  wounds: (number | null)[];
  enemy_wounds: (number | null)[];
  enemy_hand_count: number;
  deck_count: number;
  discard: number[];
  active: [Move | null, Move | null];
  pending: Pending | null;
  last_combat: Combat | null;
  results: GameResult[];
  legal_actions: Action[];
}
export const RULES: "1.0.0";
export class Game {
  constructor(seed?: number, first?: PlayerId);
  readonly actor: PlayerId | null;
  legalActions(): Action[];
  step(action: Action): Observation;
  observation(player: PlayerId): Observation;
  save(): State;
  static restore(state: State): Game;
}
export function evaluate(cards: number[], level?: number): Evaluation;
export function outcome(
  attack: Evaluation,
  defend: Evaluation,
): { delta: number; effective_delta: number; reason: string };
export function plays(cards: number[], level: number): number[][];
