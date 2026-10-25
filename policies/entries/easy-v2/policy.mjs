export function createPolicy({easy}) {
  return {act: o => {
    const action = JSON.stringify(easy.chooseAction(o));
    return o.legal_actions.findIndex(a => JSON.stringify(a) === action);
  }};
}
