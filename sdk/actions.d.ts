import type {Action as LegacyAction, Observation as LegacyObservation} from './index';
export type Action =
  | { type: 'play'; cards: number[] }
  | { type: 'swap'; source: number; target: {zone: 'deck' | 'blind'} | {zone: 'own_hand' | 'own_wounds' | 'rival_wounds'; card: number} }
  | { type: 'skip_swap' | 'stop_swaps' | 'advance' | 'next_game' };
export type Observation = Omit<LegacyObservation, 'legal_actions'> & { action_schema: 'actions-v2'; legal_actions: Action[] };
export interface Row { action: Action; legacy: LegacyAction | Action; index: number; tokens: number[] }
export interface Grammar {
  rows: Row[];
  next(prefix?: number[]): {mask: Uint8Array; complete: boolean};
  resolve(tokens: number[]): Row;
  validate(action: Action): Row;
}
export const VERSION: 'actions-v2';
export const VOCAB: 65;
export const PAD: 65;
export const LENGTH: 6;
export const T: Readonly<Record<'PLAY_3'|'PLAY_4'|'PLAY_5'|'SWAP'|'SKIP'|'STOP'|'ADVANCE'|'NEXT_GAME'|'DECK'|'BLIND'|'OWN_HAND'|'OWN_WOUNDS'|'RIVAL_WOUNDS',number>>;
export function fromLegacy(observation: LegacyObservation, action: LegacyAction): Action;
export function tokens(action: Action): number[];
export function build(observation: LegacyObservation | Observation): Grammar;
export function state(observation: LegacyObservation | Observation, episode?: 'game' | 'match'): Float32Array;
export function prefixFeatures(prefix: number[]): Float32Array;
export function best(logits: ArrayLike<number>, mask: ArrayLike<number>): number;
export function observation(observation: LegacyObservation): Observation;
export function decode(observation: LegacyObservation | Observation, predict: (state: Float32Array, prefix: Float32Array) => Promise<ArrayLike<number>> | ArrayLike<number>): Promise<Row>;
