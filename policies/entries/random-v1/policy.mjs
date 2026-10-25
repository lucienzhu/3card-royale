export function createPolicy({random}) {
  return {act: observation => Math.floor(random() * observation.legal_actions.length)};
}
