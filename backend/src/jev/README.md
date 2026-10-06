# Harika's backend handoff

Review owner: **Harika Reddy (`@Harika-reddy2628`)**. External attribution: **The SIFT Core Team**.

`rubric.ts` defines 0–4 anchors and the judge instructions. `index.ts` exports:

- `judge(snapshots, findings, input)`: bounded model evaluation and one correction attempt.
- `validateJudgment(value, evidence)`: schema, citation correspondence, and source-kind checks.
- `incompleteJudgment(reason)`: explicit unscored fallback.
- `synthesize(snapshots, findings, judgment)`: deterministic weighted aggregation, coverage, review flags, and retained source manifests.

Jev means TypeSafe AI's separate decision model. The SIFT rubric is not Jev. `typesafe.ts` implements its Noul API and `review.ts` applies probabilistic support checks. `DECISION_PROVIDER=none` uses Groq and makes no TypeSafe calls. Setting `DECISION_PROVIDER=typesafe` requires a separate TypeSafe key and credits; unavailable or unsupported verification withholds proposed scores. The worker checkpoints `proposeJudgment` before `reviewProposal` so a Jev retry does not regenerate the Groq proposal. See [DECISION_PROVIDERS.md](../../../DECISION_PROVIDERS.md) for configuration, calibration, and the Laya alternative.

The module consumes immutable captured evidence. It must not fetch arbitrary URLs, execute candidate code, rewrite forensic findings, or make the final hiring/award decision. Null means insufficient evidence, while zero requires affirmative support. Shared contract/version changes require both owners' review.

Run `DECISION_PROVIDER=none GROQ_API_KEY= TYPESAFE_API_KEY= npm run test -w backend` from the repository root. Review `backend/test/jev.test.ts`, `groq.test.ts`, `typesafe.test.ts`, and `decision.test.ts` when changing anchors or validator behavior. Do not configure Git with another person's identity.

The next review task is staging calibration with a Groq key: compare judgments against human-scored examples of a small complete implementation, an empty stub project, missing tests, a solo project, an active team, and credited template reuse. Inspect semantic support as well as excerpt matches. Add regression fixtures for disagreements, record accepted anchors/model/prompt versions, and jointly approve ranking rollout. No live model calibration is claimed by the current implementation.
