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
- [ ] Fixed reference decisions agree with original implementation (if ported)

Maintainer: review before executing. Evaluate in an isolated environment, rerun
all season pairs and attach raw results. Do not substitute local smoke-test scores
for official Elo. Godlike / privileged-information policies do not enter the ladder.
