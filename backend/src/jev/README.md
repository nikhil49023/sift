# Harika's backend handoff

Review owner: **Harika Reddy (`@Harika-reddy2628`)**. External attribution: **The SIFT Core Team**.

`rubric.ts` defines 0–4 anchors and the judge instructions. `index.ts` exports:

- `judge(snapshots, findings, input)`: bounded model evaluation and one correction attempt.
- `validateJudgment(value, evidence)`: schema, citation correspondence, and source-kind checks.
- `incompleteJudgment(reason)`: explicit unscored fallback.
- `synthesize(snapshots, findings, judgment)`: deterministic weighted aggregation, coverage, review flags, and retained source manifests.

The module consumes immutable captured evidence. It must not fetch arbitrary URLs, execute candidate code, rewrite forensic findings, or make the final hiring/award decision. Null means insufficient evidence, while zero requires affirmative support. Shared contract/version changes require both owners' review.

Run `npm run test -w backend` from the repository root. The primary fixtures are `backend/test/jev.test.ts`; update these when changing anchors or validator behavior. Do not configure Git with another person's identity.

The next review task is staging calibration with a Gemini key: compare judgments against human-scored examples of a small complete implementation, an empty stub project, missing tests, a solo project, an active team, and credited template reuse. Inspect semantic support as well as excerpt matches. Add regression fixtures for disagreements, record accepted anchors/model/prompt versions, and jointly approve ranking rollout. No live model calibration is claimed by the current implementation.
