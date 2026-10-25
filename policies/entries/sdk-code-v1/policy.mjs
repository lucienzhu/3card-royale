export function createPolicy({code}) {
  return {act: o => {
    const action = JSON.stringify(code.chooseAction(o));
    return o.legal_actions.findIndex(a => JSON.stringify(a) === action);
  }};
}
