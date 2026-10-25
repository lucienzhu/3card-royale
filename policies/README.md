# Policy plugins · Arena 1.1

[简体中文](README.zh-CN.md) · [Arena](../arena.html) · [Evaluation protocol](../arena/README.md)

Submit a **policy**, either pure JavaScript or an ONNX network. Both run in the
browser and in the same local evaluator. Training is optional. GitHub Pages serves
static files; inference runs on the visitor's device. Official Elo comes only from
reviewed, locally evaluated results committed by a maintainer.

## One policy, one folder

```
policies/entries/your-policy-v1/
  manifest.json
  policy.mjs        # OR policy.onnx
  README.md         # method, authors, source, license and reproduction
```

Copy a current entry and give it a **new immutable ID**. Add its manifest to
`policies/registry.json`. Do not replace an existing policy's weights/code under
the same ID after it has been rated. The artifact is at most 5,000,000 bytes;
update `artifact.bytes` and `artifact.sha256` with `node arena/stamp.mjs <id>`.
Each manifest declares `royale-policy-v1`, rules `1.0.0`, episode `game`, public
information and whether the policy remembers observations within one game.

The primary extension point is this folder. The old `sdk/policy.js`,
`sdk/easy-policy.js` and `models/nn-policy/` remain frozen compatibility sources
for existing users and historical experiments. Built-in plugins adapt those
sources; the NN entry contains the same hash-verified model blob. GameCore stays
independent of policy selection.

## Pure JavaScript

A **single self-contained ES module** exports a factory:

```js
export function createPolicy({random, sdk}) {
  return {
    act(observation) {
      return Math.floor(random() * observation.legal_actions.length);
    }
  };
}
```

`act` may return a number or a Promise of a number: an index into this observation's
`legal_actions`. This is a dynamic candidate table, not a permanent action ID.
The detached, frozen observation is the [public SDK observation](../docs/SDK.md#state-ownership--observations).
Own hand and both public wound racks are visible; rival hand, deck order, RNG and
deal seed are not. The host applies the chosen legal action and checks it again.
Use injected `random()` for reproducible randomness, never `Math.random`, clock,
network, storage, environment variables or external services. For small games the
factory is called anew at every game boundary: keep optional public-observation
memory inside that instance, not module globals. No remote imports or dependencies.
Injected `sdk`, `core`, `code`, `easy` expose the pinned shared rules/helpers, never
the host's live game. Start with `templates/policy.mjs`.

### Python or another language

Keep original source and its license if useful. **Use Codex or Claude Code to port
the strategy to JavaScript before submission**, so the exact submitted policy can
also be played on the web. See [porting prompt and parity workflow](templates/PORTING.md).
This is a contributor workflow, not a server-side translation service. Verify the
port on saved public observations, including play, defense, swaps and declines;
matching syntax alone is not enough. A Python-only submission is not a playable
Arena entry. A trained network can instead be exported to ONNX.

## ONNX

Use the existing `gym-v1` contract with dynamic candidate count:

| Name | Type | Shape |
| --- | --- | --- |
| `state` | float32 | `[1, 336]` |
| `candidates` | float32 | `[1, N, 72]` |
| `logits` | float32 | `[1, N]` |

N is the number of legal actions (at most 512); padding is removed. The host rejects
non-finite outputs and chooses argmax, first index on ties. Use `memory: "none"`.
The released NN is a behavioral-cloning baseline, not a reward-trained RL agent.
[Features, training and ONNX export](../docs/MODEL.md).

## PR → Elo → play

1. Submit the folder, registry entry and README. Use the policy PR template.
2. Run `npm run arena:validate` (metadata and hashes only; does not execute entries).
3. Maintainer reviews JS and assets, then runs `npm run arena:evaluate` locally.
4. Commit the resulting season report alongside the policy PR. Merge and deploy.
   The Arena reads the registry and report; “Play” opens that policy on the table.

Policy IDs not yet evaluated show **Unrated**, never invented Elo. Current artifacts
must match the report hash to display a rating. Every new opponent requires rerunning
the complete season schedule so all entries face the same opponent pool. Godlike
is excluded from this public-information ladder.

## Execution boundary

Only merged, reviewed registry entries load in the website; no arbitrary JS URL or
user upload is executed. Workers keep the UI responsive and can be terminated on
failure. **A Worker is not a security sandbox:** it can use network APIs; local Node
plugins could access the machine. Review first and evaluate unfamiliar PRs in a
credential-free, network-disabled container ([example](../arena/README.md#reviewing-a-pr)).
Do not run PR code in a privileged `pull_request_target` workflow.

Web inference uses single-thread ONNX Runtime Web / WASM in a Worker. Local rating
limits are 1 s per decision, 30 s to load and 4,096 host steps per small game.
The interactive browser allows 3 s per decision for slower phones, and visibly
falls back to Easy on failure. Official evaluation **does not fall back**: failures
abort the run without publishing partial ratings. See the protocol for latency and
rating limits.
