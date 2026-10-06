import { createHash } from "node:crypto";
import { DIMENSIONS, WEIGHTS, PROMPT_VERSION, RUBRIC_VERSION, RULE_VERSION, type Evidence, type Snapshot } from "@sift/contracts";
import { config } from "./config.ts";

export function isTestPath(path: string) {
  return /(^|\/)(tests?|__tests__)(\/|$)|\.(test|spec)\.|(^|\/)test_[^/]+\.py$|_test\.(py|go|rs)$/.test(path);
}
export function isSourcePath(path: string) {
  return /\.(?:[cm]?js|jsx|ts|tsx|py|go|rs|java|kt|cpp|c|h|cs|rb|php|swift|dart|scala|ex|exs|r|lua|m|mm|zig|sql|sh)$/i.test(path);
}
export function isVerificationPath(path: string) {
  return isTestPath(path) || /(^|\/)\.github\/workflows\/|(^|\/)(Jenkinsfile|\.travis\.yml|\.gitlab-ci\.yml)$/.test(path);
}
export function evaluationFingerprint() {
  return createHash("sha256").update(JSON.stringify({
    version: "sift-evaluation-v2", rubric: RUBRIC_VERSION, prompt: PROMPT_VERSION,
    rules: RULE_VERSION, model: config.GROQ_MODEL,
    evidenceBudget: config.JUDGE_MAX_EVIDENCE_CHARS,
    outputBudget: config.JUDGE_MAX_OUTPUT_TOKENS,
    reasoningEffort: config.GROQ_REASONING_EFFORT,
  })).digest("hex");
}

export function selectEvidence(snapshots: Snapshot[], budget = config.JUDGE_MAX_EVIDENCE_CHARS) {
  const selected: Evidence[] = [];
  const ids = new Set<string>();
  let used = 0;
  const groups = snapshots.map(snapshot => ({
    repository: snapshot.repository,
    evidence: snapshot.evidence,
    selected: 0,
  }));
  const categories = [
    (e: Evidence) => e.kind === "code" && isSourcePath(e.path) && !isTestPath(e.path),
    (e: Evidence) => e.kind === "code" && isSourcePath(e.path) && isTestPath(e.path),
    (e: Evidence) => e.kind === "commit",
    (e: Evidence) => e.kind === "ci",
    (e: Evidence) => e.kind === "review",
    (e: Evidence) => e.path === "source-index.json",
  ];
  const add = (group: typeof groups[number], predicate: (e: Evidence) => boolean, quota: number) => {
    const evidence = group.evidence.find(e => predicate(e) && !ids.has(e.id)
      && e.content.length <= 20000 && used + e.content.length <= budget
      && group.selected + e.content.length <= quota);
    if (!evidence || selected.length >= 80) return false;
    selected.push(evidence); ids.add(evidence.id);
    used += evidence.content.length; group.selected += evidence.content.length;
    return true;
  };
  // Reserve representation for each repository before spending leftover space.
  const share = Math.floor(budget / Math.max(1, groups.length));
  for (const category of categories)
    for (const group of groups) add(group, category, share);
  let added = true;
  while (added && selected.length < 80) {
    added = false;
    for (const group of groups) added = add(group, () => true, budget) || added;
  }
  return {
    evidence: selected,
    coverage: {
      selected: selected.length,
      total: snapshots.reduce((n, snapshot) => n + snapshot.evidence.length, 0),
      repositories: groups.map(group => ({
        repository: group.repository,
        selected: selected.filter(e => e.repository === group.repository).length,
        total: group.evidence.length,
        code: selected.filter(e => e.repository === group.repository && e.kind === "code" && isSourcePath(e.path)).length,
      })),
    },
  };
}

export function weightedScore(dimensions: Record<string, { level: number | null }>) {
  if (!DIMENSIONS.every(key => Number.isInteger(dimensions?.[key]?.level)
    && dimensions[key].level! >= 0 && dimensions[key].level! <= 4)) return null;
  return Math.round(DIMENSIONS.reduce((n, key) => n + dimensions[key].level! * 25 * WEIGHTS[key], 0) * 10) / 10;
}

export function rankCandidates(rows: { id: string; assessment: any }[]) {
  const eligible = rows.filter(({ assessment: a }) => a?.rankable === true
    && a.versions?.evaluation === evaluationFingerprint()
    && Array.isArray(a.coverage) && a.coverage.length > 0 && a.coverage.every((c: any) => c.complete === true)
    && Array.isArray(a.evaluationCoverage?.repositories)
    && a.coverage.every((c: any) => a.evaluationCoverage.repositories.some((r: any) => r.repository === c.repository && r.code > 0))
    && a.riskLevel !== "FLAGGED"
    && DIMENSIONS.every(key => a.dimensions?.[key]?.citations?.length > 0)
    && typeof a.overallScore === "number" && weightedScore(a.dimensions) === a.overallScore);
  eligible.sort((a, b) => b.assessment.overallScore - a.assessment.overallScore || a.id.localeCompare(b.id));
  const ranks = new Map<string, number>();
  let previous: number | undefined, rank = 0;
  eligible.forEach((row, index) => {
    if (row.assessment.overallScore !== previous) rank = index + 1;
    previous = row.assessment.overallScore;
    ranks.set(row.id, rank);
  });
  return ranks;
}
