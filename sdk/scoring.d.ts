import type {Observation as LegacyObservation} from './index';
import type {Action, Observation} from './actions';
export const version: 'scoring-v2';
export function encode(observation: LegacyObservation | Observation, episode?: 'game' | 'match'): {
  state: Float32Array; candidates: Float32Array; count: number; actions: Action[];
};
export function choose(observation: LegacyObservation | Observation, scores: ArrayLike<number>): Action;
