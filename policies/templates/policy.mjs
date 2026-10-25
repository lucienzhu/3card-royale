// Copy into policies/entries/<your-policy-v1>/policy.mjs; no remote imports.
export function createPolicy({sdk, random}) {
  return {act(o) {
    // Replace with your own logic. Return a current legal-action index.
    const plays=o.legal_actions.map((action,index)=>({action,index})).filter(x=>x.action.type==='play');
    if(!plays.length)return Math.floor(random()*o.legal_actions.length);
    plays.sort((a,b)=>sdk.evaluate(b.action.cards,o.flower_level).score-sdk.evaluate(a.action.cards,o.flower_level).score);
    return plays[0].index;
  }};
}
