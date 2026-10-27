## Policy

- New policy ID:
- Author / license:
- Type: JavaScript / ONNX
- Method and source / training recipe:
- Memory: none / within one small game
- If ported from Python or another language: original source and parity fixtures:

## Validation

- [ ] Self-contained runtime artifact and manifest in `policies/entries/<id>/`
- [ ] Registered, new immutable ID, hash and ≤5 MB artifact checked
- [ ] Public observations only; no network, external imports, clock or hidden state
- [ ] `npm run arena:validate` passes
- [ ] `npm run arena:submit -- --policy <id>` passes; generated `validation.json` committed
- [ ] Fixed reference decisions agree with original implementation (if ported)

Maintainer: review before executing. CI replays local validation; merge triggers
60 reference games per entrant and automatic leaderboard / Pages publication.
At most 3 entrants per PR. Godlike / privileged-information policies are excluded.
