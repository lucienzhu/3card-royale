# Port Python / another language to browser JavaScript

Use Codex or Claude Code with the following brief, plus your source code:

> Port this policy to a single self-contained ES module implementing the
> `royale-policy-v1` contract in `policies/README.md`. Export
> `createPolicy({sdk, random})` returning `{act(observation)}`. Return the current
> legal-action index; use only the public observation. Preserve score ordering,
> tie-breaking, swap/decline behavior, null wound slots and per-game memory. Use
> the supplied seeded random generator. Do not access network, disk, storage,
> clocks, private game state or remote imports. Retain the original license.
> Compare the original and JS outputs on saved observations before declaring parity.

Generate a corpus with `node arena/fixtures.mjs --output /tmp/observations.json`.
Run your original policy on the exact action order and add `expectedIndex` to each
case, saving `{ "cases": [{"observation": ..., "expectedIndex": 0}, ...] }`.
Run `node arena/parity.mjs --policy your-policy-v1 --fixtures /tmp/reference.json`.
This command rejects action mismatches rather than silently choosing another move.
For stochastic or stateful policies, also align RNG and episode resets in your
own sequence tests; the built-in fixture check covers independent deterministic
observations only. Review float comparisons, integer overflow and collection order.
Keep the reference outputs with your submission and explain intentional differences.

The web does not execute Python. Source language is unrestricted; the submitted
runtime artifact is JavaScript or a compatible ONNX model.
