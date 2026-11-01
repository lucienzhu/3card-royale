// royale-policy-v2. Return the complete semantic action, not a candidate index.
export function createPolicy({random}) {
  return {act(observation) {
    return observation.legal_actions[Math.floor(random()*observation.legal_actions.length)];
  }};
}
