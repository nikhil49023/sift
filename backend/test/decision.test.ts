import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DIMENSIONS,
  RUBRIC_VERSION,
  PROMPT_VERSION,
  type Snapshot,
  type Judgment,
  type AuditSubmission,
} from "@sift/contracts";
import { config } from "../src/config.ts";
import {
  incompleteJudgment,
  isCurrentProposal,
  synthesize,
} from "../src/jev/index.ts";
import { reviewProposal } from "../src/jev/review.ts";
import { makeEvidence } from "../src/ingestion.ts";
import type { JevVerifier } from "../src/jev/typesafe.ts";

const sha = "a".repeat(40);
const code = makeEvidence(
  "test/repo",
  sha,
  "code",
  "tests/app.test.ts",
  "assert.equal(result, 1);",
  "https://github.com/test/repo",
);
const history = makeEvidence(
  "test/repo",
  sha,
  "commit",
  "history.json",
  "incremental commit",
  "https://github.com/test/repo",
);
const unrelated = makeEvidence(
  "test/repo",
  sha,
  "metadata",
  "uncited.txt",
  "Uncited fixture",
  "https://github.com/test/repo",
);
const snapshot: Snapshot = {
  repository: "test/repo",
  sha,
  evidence: [code, history, unrelated],
  coverage: {
    complete: true,
    limitations: [],
    filesAnalyzed: 1,
    commitsAnalyzed: 1,
    excludedFiles: 0,
  },
  commits: [],
  metadata: {},
  blame: {},
};
const input: AuditSubmission = {
  workflow: "recruiting",
  cohortId: "00000000-0000-4000-8000-000000000001",
  candidateName: "Synthetic fixture",
  repositories: ["test/repo"],
  team: [],
  jobDescription: "Synthetic test role",
};
function proposal(): Judgment {
  const result = incompleteJudgment("Synthetic fixture only");
  for (const k of DIMENSIONS)
    result.dimensions[k] = {
      level: 2,
      rationale: "Synthetic rationale",
      citations:
        k === "collaborationHygiene"
          ? [{ evidenceId: history.id, excerpt: history.content }]
          : [
              {
                evidenceId: code.id,
                startLine: 1,
                endLine: 1,
                excerpt: code.content,
              },
            ],
    };
  result.generation = {
    provider: "groq",
    model: config.GROQ_MODEL,
    requestedModel: config.GROQ_MODEL,
    prompt: PROMPT_VERSION,
    rubric: RUBRIC_VERSION,
    evidenceBudget: config.JUDGE_MAX_EVIDENCE_CHARS,
    outputBudget: config.JUDGE_MAX_OUTPUT_TOKENS,
  };
  return result;
}
const verifier =
  (overrides: Record<string, number> = {}): JevVerifier =>
  async ({ state, questions }) => {
    assert.ok(!JSON.stringify(state.evidence).includes("Uncited fixture"));
    assert.ok(
      Object.values(questions).every(
        (q) => q.type === "noul" && q.instructions.includes("untrusted"),
      ),
    );
    return {
      model: "jev-synthetic-version",
      answers: Object.fromEntries(
        Object.keys(questions).map((k) => [
          k,
          { type: "noul" as const, noul: overrides[k] ?? 0.95 },
        ]),
      ),
      usage: { input_tokens: 100, output_tokens: 9 },
    };
  };

test("Groq is the default and an installed TypeSafe key does not opt in to spending credits", async () => {
  const before = {
    provider: config.DECISION_PROVIDER,
    key: config.TYPESAFE_API_KEY,
  };
  config.DECISION_PROVIDER = "none";
  config.TYPESAFE_API_KEY = "synthetic-unused-key";
  try {
    const result = await reviewProposal(proposal(), [snapshot], [], input);
    assert.equal(result.verification?.status, "disabled");
    assert.equal(result.verification?.model, null);
    assert.equal(synthesize([snapshot], [], result).overallScore, 50);
    assert.equal(
      synthesize([snapshot], [], result).versions.decisionProvider,
      "none",
    );
  } finally {
    config.DECISION_PROVIDER = before.provider;
    config.TYPESAFE_API_KEY = before.key;
  }
});
test("required Jev with a missing key withholds scores and retains proposal citations", async () => {
  const before = {
    provider: config.DECISION_PROVIDER,
    key: config.TYPESAFE_API_KEY,
  };
  config.DECISION_PROVIDER = "typesafe";
  config.TYPESAFE_API_KEY = "";
  try {
    const result = await reviewProposal(proposal(), [snapshot], [], input);
    assert.equal(result.verification?.status, "unavailable");
    assert.equal(result.verification?.proposedLevels.systemsRigor, 2);
    assert.equal(
      result.dimensions.systemsRigor.citations[0].evidenceId,
      code.id,
    );
    assert.ok(DIMENSIONS.every((k) => result.dimensions[k].level === null));
    assert.equal(synthesize([snapshot], [], result).rankable, false);
  } finally {
    config.DECISION_PROVIDER = before.provider;
    config.TYPESAFE_API_KEY = before.key;
  }
});
test("Jev checks rationale and anchor separately and records actual probabilities and model", async () => {
  const result = await reviewProposal(
    proposal(),
    [snapshot],
    [],
    input,
    verifier(),
  );
  assert.equal(Object.keys(result.verification!.checks).length, 9);
  assert.equal(result.verification?.checks.systemsRigor_anchor, 0.95);
  assert.equal(result.verification?.status, "passed");
  const assessment = synthesize([snapshot], [], result);
  assert.equal(assessment.overallScore, 50);
  assert.equal(assessment.versions.decisionModel, "jev-synthetic-version");
});
test("uncertain Jev anchor decisions withhold only the affected dimension without declaring cheating", async () => {
  const result = await reviewProposal(
    proposal(),
    [snapshot],
    [],
    input,
    verifier({ systemsRigor_anchor: config.JEV_SUPPORT_THRESHOLD - 0.01 }),
  );
  assert.equal(result.dimensions.systemsRigor.level, null);
  assert.equal(result.dimensions.algorithmicDepth.level, 2);
  assert.equal(result.verification?.status, "review_required");
  const assessment = synthesize([snapshot], [], result);
  assert.equal(assessment.overallScore, null);
  assert.equal(assessment.riskLevel, "NO_FLAGS_OBSERVED");
});
test("role-fit support is separate from engineering score aggregation", async () => {
  const draft = proposal();
  draft.roleFit = {
    rationale: "Synthetic role fit",
    citations: [
      { evidenceId: code.id, excerpt: code.content, startLine: 1, endLine: 1 },
    ],
  };
  const result = await reviewProposal(
    draft,
    [snapshot],
    [],
    input,
    verifier({ roleFit_support: 0.1 }),
  );
  assert.equal(result.roleFit, null);
  assert.equal(result.verification?.status, "review_required");
  assert.equal(result.verification?.engineeringSupported, true);
  assert.equal(synthesize([snapshot], [], result).overallScore, 50);
});
test("an unsupported summary cannot publish a scored assessment", async () => {
  const result = await reviewProposal(
    proposal(),
    [snapshot],
    [],
    input,
    verifier({ summary_support: 0.1 }),
  );
  assert.ok(DIMENSIONS.every((k) => result.dimensions[k].level === null));
  assert.match(result.summary, /withheld/);
  assert.equal(synthesize([snapshot], [], result).rankable, false);
});
test("proposal checkpoints cannot be reused after model, rubric, prompt or evidence changes", () => {
  const draft = proposal();
  assert.equal(isCurrentProposal(draft, snapshot.evidence), true);
  assert.equal(isCurrentProposal(draft, []), false);
  for (const field of ["requestedModel", "rubric", "prompt"] as const) {
    assert.equal(
      isCurrentProposal(
        { ...draft, generation: { ...draft.generation!, [field]: "obsolete" } },
        snapshot.evidence,
      ),
      false,
    );
  }
});
