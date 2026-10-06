import { test } from "node:test";
import assert from "node:assert/strict";
import { DIMENSIONS, PROMPT_VERSION, RUBRIC_VERSION, type Snapshot } from "@sift/contracts";
import { config } from "../src/config.ts";
import { evaluationFingerprint, rankCandidates, selectEvidence } from "../src/evaluation.ts";
import { makeEvidence } from "../src/ingestion.ts";
import { incompleteJudgment, synthesize, validateJudgment } from "../src/jev/index.ts";

const sha = "a".repeat(40);
function snapshot(repository: string): Snapshot {
  return { repository, sha, commits: [], metadata: {}, blame: {},
    coverage: { complete: true, limitations: [], filesAnalyzed: 2, commitsAnalyzed: 1, excludedFiles: 0 },
    evidence: [
      makeEvidence(repository, sha, "code", "README.md", "Claims are not implementation evidence.", "https://github.com/" + repository),
      makeEvidence(repository, sha, "code", "app.ts", "export const run = () => 1;", "https://github.com/" + repository),
      makeEvidence(repository, sha, "code", "test_app.py", "assert run() == 1", "https://github.com/" + repository),
      makeEvidence(repository, sha, "commit", "history.json", "one commit", "https://github.com/" + repository),
    ],
  };
}
test("evidence budget reserves source from each repository and reports missing code", () => {
  const snapshots = [snapshot("test/one"), snapshot("test/two")];
  snapshots[0].evidence.unshift(makeEvidence("test/one", sha, "code", "large.ts", "x".repeat(1000), "https://github.com/test/one"));
  const packet = selectEvidence(snapshots, 100);
  assert.ok(packet.evidence.reduce((n, e) => n + e.content.length, 0) <= 100);
  assert.deepEqual(packet.coverage.repositories.map(r => r.code), [2, 2]);
  assert.ok(!packet.evidence.some(e => e.path === "large.ts"));
  snapshots[1].evidence = snapshots[1].evidence.filter(e => e.path === "README.md");
  assert.equal(selectEvidence(snapshots, 100).coverage.repositories[1].code, 0);
});
test("testing scores require test source and captured CI; absence needs a complete artifact-free index", () => {
  const s = snapshot("test/one");
  const code = s.evidence[2];
  const ci = makeEvidence(s.repository, sha, "ci", "check-runs.json", '{"check_runs":[]}', "https://github.com/test/one");
  const judgment = incompleteJudgment("Synthetic fixture");
  judgment.dimensions.testingVerification = { level: 2, rationale: "fixture", citations: [{ evidenceId: ci.id, excerpt: ci.content }] };
  assert.throws(() => validateJudgment(judgment, [ci]), /require cited test source/);
  judgment.dimensions.testingVerification.citations.push({ evidenceId: code.id, excerpt: code.content, startLine: 1, endLine: 1 });
  assert.equal(validateJudgment(judgment, [ci, code]).dimensions.testingVerification.level, 2);
  judgment.dimensions.testingVerification.level = 3;
  assert.throws(() => validateJudgment(judgment, [ci, code]), /captured CI check runs/);
  const populated = makeEvidence(s.repository, sha, "ci", "check-runs.json", '{"check_runs":[{"conclusion":"success"}]}', "https://github.com/test/one");
  judgment.dimensions.testingVerification.citations[0] = { evidenceId: populated.id, excerpt: populated.content };
  assert.equal(validateJudgment(judgment, [populated, code]).dimensions.testingVerification.level, 3);
  for (const index of [{ complete: false, files: [] }, { complete: true, files: ["test_app.py"] }, { complete: true, files: [".github/workflows/test.yml"] }]) {
    const evidence = makeEvidence(s.repository, sha, "metadata", "source-index.json", JSON.stringify(index), "https://github.com/test/one");
    judgment.dimensions.testingVerification = { level: 0, rationale: "fixture", citations: [{ evidenceId: evidence.id, excerpt: evidence.content }] };
    assert.throws(() => validateJudgment(judgment, [evidence]), /complete source index without/);
  }
});
test("equal scores share rank and stale, flagged, corrupted or incomplete assessments are excluded", () => {
  const assessment = {
    rankable: true, overallScore: 50, riskLevel: "NO_FLAGS_OBSERVED", versions: { evaluation: evaluationFingerprint() },
    dimensions: Object.fromEntries(DIMENSIONS.map(key => [key, { level: 2, citations: [{ evidenceId: "synthetic" }] }])),
    coverage: [{ repository: "test/one", complete: true }],
    evaluationCoverage: { repositories: [{ repository: "test/one", code: 1 }] },
  };
  const low = { ...assessment, overallScore: 25, dimensions: Object.fromEntries(DIMENSIONS.map(key => [key, { level: 1, citations: [{ evidenceId: "synthetic" }] }])) };
  const excluded = [
    { ...assessment, riskLevel: "FLAGGED" }, { ...assessment, overallScore: "invalid" },
    { ...assessment, overallScore: 99 }, { ...assessment, versions: { evaluation: "stale" } },
    { ...assessment, coverage: [{ repository: "test/one", complete: false }] },
    { ...assessment, evaluationCoverage: { repositories: [] } },
    { ...assessment, dimensions: {} },
  ];
  const ranks = rankCandidates([{ id: "b", assessment }, { id: "a", assessment }, { id: "c", assessment: low }, ...excluded.map((assessment, i) => ({ id: "excluded" + i, assessment }))]);
  assert.deepEqual([...ranks], [["a", 1], ["b", 1], ["c", 3]]);
});
test("forensic flags and an omitted repository prevent automatic ranking", () => {
  const s = snapshot("test/one");
  const judgment = incompleteJudgment("Synthetic fixture");
  for (const key of DIMENSIONS) {
    const evidence = s.evidence[key === "collaborationHygiene" ? 3 : key === "testingVerification" ? 2 : 1];
    judgment.dimensions[key] = { level: 2, rationale: "fixture", citations: [{ evidenceId: evidence.id, excerpt: evidence.content, ...(evidence.kind === "code" ? { startLine: 1, endLine: 1 } : {}) }] };
  }
  judgment.generation = { provider: "groq", model: config.GROQ_MODEL, requestedModel: config.GROQ_MODEL, prompt: PROMPT_VERSION, rubric: RUBRIC_VERSION, evidenceBudget: config.JUDGE_MAX_EVIDENCE_CHARS, outputBudget: config.JUDGE_MAX_OUTPUT_TOKENS, evaluation: evaluationFingerprint(), packetCoverage: selectEvidence([s]).coverage };
  assert.equal(synthesize([s], [], judgment).rankable, true);
  assert.equal(synthesize([s, snapshot("test/two")], [], judgment).rankable, false);
  assert.equal(synthesize([s], [{ repository: s.repository, pillar: "synthetic", status: "FAIL", observations: ["fixture"], evidenceIds: [], coverage: "fixture", ruleVersion: "synthetic" }], judgment).rankable, false);
});
