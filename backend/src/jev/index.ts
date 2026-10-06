import {
  JudgeOutput,
  DIMENSIONS,
  WEIGHTS,
  RULE_VERSION,
  RUBRIC_VERSION,
  PROMPT_VERSION,
  type Evidence,
  type Judgment,
  type Snapshot,
  type Finding,
  type AuditSubmission,
} from "@sift/contracts";
import { config } from "../config.ts";
import { createGroqCompletion, type JudgeCompletion } from "./groq.ts";
import { reviewProposal } from "./review.ts";
import type { JevVerifier } from "./typesafe.ts";

export function validateJudgment(
  value: unknown,
  evidence: Evidence[],
): Judgment {
  const result = JudgeOutput.parse(value);
  const byId = new Map(evidence.map((e) => [e.id, e]));
  const validateCitation = (
    citation: Judgment["dimensions"]["systemsRigor"]["citations"][number],
  ) => {
    const item = byId.get(citation.evidenceId);
    if (!item) throw new Error(`Unknown evidence ID: ${citation.evidenceId}`);
    let content = item.content;
    if (
      item.kind === "code" &&
      (citation.startLine === undefined || citation.endLine === undefined)
    )
      throw new Error("Code citation requires both line bounds");
    if (citation.startLine !== undefined || citation.endLine !== undefined) {
      const lines = content.split("\n");
      const start = citation.startLine,
        end = citation.endLine;
      if (
        start === undefined ||
        end === undefined ||
        end < start ||
        end > lines.length
      )
        throw new Error("Citation line range is invalid");
      content = lines.slice(start - 1, end).join("\n");
    }
    if (!content.includes(citation.excerpt))
      throw new Error("Citation excerpt does not match the captured evidence");
    return item;
  };
  for (const dimension of DIMENSIONS) {
    const item = result.dimensions[dimension];
    if (item.level !== null && item.citations.length === 0)
      throw new Error(`Scored dimension ${dimension} has no citation`);
    const sources = item.citations.map(validateCitation);
    if (
      item.level === 0 &&
      dimension === "testingVerification" &&
      sources.some(
        (e) =>
          e.path === "source-index.json" &&
          JSON.parse(e.content).complete !== true,
      )
    )
      throw new Error(
        "Absence cannot be scored from an incomplete source index",
      );
    if (
      item.level !== null &&
      ["systemsRigor", "algorithmicDepth"].includes(dimension) &&
      !sources.some((e) => e.kind === "code")
    )
      throw new Error(`${dimension} requires source-code evidence`);
    if (
      item.level !== null &&
      dimension === "collaborationHygiene" &&
      !sources.some((e) => ["commit", "review"].includes(e.kind))
    )
      throw new Error("Collaboration score requires commit or review evidence");
    if (
      item.level !== null &&
      dimension === "testingVerification" &&
      !sources.some(
        (e) =>
          e.kind === "ci" ||
          (e.kind === "code" &&
            /(^|\/)(tests?|__tests__)(\/|$)|\.(test|spec)\./.test(e.path)) ||
          (e.path === "source-index.json" && item.level === 0),
      )
    )
      throw new Error(
        "Testing score requires test/CI evidence or complete source index for level zero",
      );
  }
  result.roleFit?.citations.forEach(validateCitation);
  if (result.roleFit && !result.roleFit.citations.length)
    throw new Error("Role-fit explanation requires evidence");
  return result;
}
export function incompleteJudgment(reason: string): Judgment {
  const dimension = () => ({ level: null, rationale: reason, citations: [] });
  return {
    summary: reason,
    roleFit: null,
    dimensions: {
      systemsRigor: dimension(),
      algorithmicDepth: dimension(),
      testingVerification: dimension(),
      collaborationHygiene: dimension(),
    },
  };
}
export async function proposeJudgment(
  snapshots: Snapshot[],
  findings: Finding[],
  input: AuditSubmission,
  completion?: JudgeCompletion,
): Promise<Judgment> {
  if (!completion && !config.GROQ_API_KEY)
    return incompleteJudgment(
      "Groq evaluation is unavailable: GROQ_API_KEY is not configured. Forensic observations remain available.",
    );
  const all = snapshots.flatMap((s) => s.evidence);
  const priority = (e: Evidence) =>
    e.kind === "ci" || e.kind === "commit"
      ? 0
      : e.kind === "code" && /test|spec/i.test(e.path)
        ? 1
        : e.kind === "code"
          ? 2
          : 3;
  let bytes = 0;
  const packet: Evidence[] = [];
  for (const e of [...all].sort((a, b) => priority(a) - priority(b))) {
    // Include whole evidence objects or skip them; excerpt validation always uses the same captured content.
    if (
      e.content.length > 20000 ||
      bytes + e.content.length > config.JUDGE_MAX_EVIDENCE_CHARS
    )
      continue;
    packet.push(e);
    bytes += e.content.length;
    if (packet.length >= 80) break;
  }
  const complete =
    completion || createGroqCompletion(config.GROQ_API_KEY!, config.GROQ_MODEL);
  let correction = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await complete(
      JSON.stringify({
        evidence: packet,
        findings,
        coverage: snapshots.map((s) => ({
          repository: s.repository,
          ...s.coverage,
        })),
        jobDescription: input.jobDescription || null,
        packetCoverage: { selected: packet.length, total: all.length },
        correction,
      }),
    );
    console.log(
      JSON.stringify({
        event: "judge_usage",
        provider: "groq",
        model: response.model,
        attempt: attempt + 1,
        inputTokens: response.inputTokens,
        outputTokens: response.outputTokens,
        totalTokens: response.totalTokens,
      }),
    );
    try {
      const result = validateJudgment(
        JSON.parse(response.text || "", (key, value) =>
          (key === "startLine" || key === "endLine") && value === null
            ? undefined
            : value,
        ),
        packet,
      );
      if (!input.jobDescription && result.roleFit)
        throw new Error("Role fit requires a job description");
      return {
        ...result,
        generation: {
          provider: "groq",
          model: response.model,
          requestedModel: config.GROQ_MODEL,
          prompt: PROMPT_VERSION,
          rubric: RUBRIC_VERSION,
          evidenceBudget: config.JUDGE_MAX_EVIDENCE_CHARS,
          outputBudget: config.JUDGE_MAX_OUTPUT_TOKENS,
        },
      };
    } catch (error) {
      correction = `The previous response was rejected: ${error instanceof Error ? error.message : "invalid output"}. Return a corrected response using only packet evidence.`;
    }
  }
  return incompleteJudgment(
    "Groq output failed evidence/schema verification after one correction attempt. No score was published.",
  );
}
export function isCurrentProposal(
  proposal: Judgment | null,
  evidence: Evidence[],
) {
  const generation = proposal?.generation;
  if (
    !proposal ||
    !generation ||
    generation.provider !== "groq" ||
    generation.requestedModel !== config.GROQ_MODEL ||
    generation.prompt !== PROMPT_VERSION ||
    generation.rubric !== RUBRIC_VERSION ||
    generation.evidenceBudget !== config.JUDGE_MAX_EVIDENCE_CHARS ||
    generation.outputBudget !== config.JUDGE_MAX_OUTPUT_TOKENS
  )
    return false;
  try {
    validateJudgment(
      {
        dimensions: proposal.dimensions,
        summary: proposal.summary,
        roleFit: proposal.roleFit,
      },
      evidence,
    );
    return true;
  } catch {
    return false;
  }
}
export async function judge(
  snapshots: Snapshot[],
  findings: Finding[],
  input: AuditSubmission,
  completion?: JudgeCompletion,
  verifier?: JevVerifier,
) {
  return reviewProposal(
    await proposeJudgment(snapshots, findings, input, completion),
    snapshots,
    findings,
    input,
    verifier,
  );
}
export function synthesize(
  snapshots: Snapshot[],
  findings: Finding[],
  judgment: Judgment,
) {
  const complete =
    snapshots.length > 0 &&
    snapshots.every((s) => s.coverage.complete) &&
    DIMENSIONS.every((k) => judgment.dimensions[k].level !== null) &&
    (!judgment.verification ||
      judgment.verification.status === "disabled" ||
      judgment.verification.engineeringSupported);
  const overallScore = complete
    ? Math.round(
        DIMENSIONS.reduce(
          (n, k) => n + judgment.dimensions[k].level! * 25 * WEIGHTS[k],
          0,
        ) * 10,
      ) / 10
    : null;
  const riskLevel = !snapshots.length
    ? "INSUFFICIENT_EVIDENCE"
    : findings.some((f) => f.status === "FAIL")
      ? "FLAGGED"
      : findings.some((f) => f.status === "WARN")
        ? "REVIEW_REQUIRED"
        : findings.some((f) => f.status === "UNKNOWN")
          ? "INSUFFICIENT_EVIDENCE"
          : "NO_FLAGS_OBSERVED";
  const evidence = snapshots.flatMap((s) => s.evidence);
  const citationIds = new Set([
    ...DIMENSIONS.flatMap((k) =>
      judgment.dimensions[k].citations.map((c) => c.evidenceId),
    ),
    ...(judgment.roleFit?.citations || []).map((c) => c.evidenceId),
  ]);
  return {
    overallScore,
    rankable: complete,
    riskLevel,
    summary: judgment.summary,
    roleFit: judgment.roleFit,
    verification: judgment.verification || null,
    dimensions: judgment.dimensions,
    citations: evidence
      .filter((e) => citationIds.has(e.id))
      .map(({ id, path, repository, sha, sourceUrl, hash, retrievedAt }) => ({
        id,
        path,
        repository,
        sha,
        sourceUrl,
        hash,
        retrievedAt,
      })),
    evidenceManifest: evidence
      .filter(
        (e) =>
          citationIds.has(e.id) ||
          findings.some((f) => f.evidenceIds.includes(e.id)),
      )
      .map(({ id, path, repository, sha, sourceUrl, hash, retrievedAt }) => ({
        id,
        path,
        repository,
        sha,
        sourceUrl,
        hash,
        retrievedAt,
      })),
    coverage: snapshots.map((s) => ({
      repository: s.repository,
      sha: s.sha,
      ...s.coverage,
    })),
    versions: {
      rules: RULE_VERSION,
      rubric: RUBRIC_VERSION,
      prompt: PROMPT_VERSION,
      provider: judgment.generation?.provider || null,
      model: judgment.generation?.model || null,
      decisionProvider:
        judgment.verification?.status === "disabled"
          ? "none"
          : judgment.verification
            ? "typesafe"
            : null,
      decisionModel: judgment.verification?.model || null,
      decisionVersion: judgment.verification?.version || null,
      decisionThreshold: judgment.verification?.threshold ?? null,
    },
    limitations: [
      "No submitted code was executed; CI outcomes are reported evidence.",
      "Scores support human review; they are not hiring or jury decisions.",
      "Citation validation establishes source correspondence, not the truth of every inference.",
    ],
  };
}
