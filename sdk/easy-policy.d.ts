import type { Observation, Action } from './index';
export const version: 'easy-v1';
export const budget: number;
/** Limited-attention policy. Same public observation gives the same move. */
export function chooseAction(observation: Observation, actions?: Action[], budget?: number): Action;
