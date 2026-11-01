import {Game as LegacyGame} from './index';
import type {PlayerId, State, Observation as LegacyObservation} from './index';
import type {Action, Observation, Grammar} from './actions';
export * from './index';
export * as actions from './actions';
export const actionSchema: 'actions-v2';
export class Game extends LegacyGame {
  structuredObservation(player?: PlayerId): Observation;
  grammar(): Grammar;
  stepStructured(action: Action): LegacyObservation;
  stepTokens(tokens: number[]): LegacyObservation;
  static restore(saved: State): Game;
}
