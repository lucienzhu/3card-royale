import type { Observation, Action } from "./index";
/** Pure visible-information heuristic, not a trained or optimal agent. */
export function chooseAction(
  observation: Observation,
  actions?: Action[],
): Action;
