import { test } from "node:test";
import assert from "node:assert/strict";
import { UnrecoverableError } from "bullmq";
import {
  DIMENSIONS,
  type Snapshot,
  type AuditSubmission,
} from "@sift/contracts";
import { createGroqCompletion } from "../src/jev/groq.ts";
import { judge, incompleteJudgment, synthesize } from "../src/jev/index.ts";
import { makeEvidence } from "../src/ingestion.ts";
import { ProviderError } from "../src/github.ts";
import { config } from "../src/config.ts";
const model = "openai/gpt-oss-120b",
  sha = "a".repeat(40);
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
  "one incremental commit",
  "https://github.com/test/repo",
);
const snapshot: Snapshot = {
  repository: "test/repo",
  sha,
  evidence: [code, history],
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
  workflow: "hackathon",
  cohortId: "00000000-0000-4000-8000-000000000001",
  candidateName: "Synthetic fixture",
  repositories: ["test/repo"],
  team: [],
};
function validWireJudgment() {
  const judgment = incompleteJudgment("Synthetic fixture");
  for (const name of DIMENSIONS)
    judgment.dimensions[name] = {
      level: 2,
      rationale: "Synthetic evidence fixture",
      citations:
        name === "collaborationHygiene"
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
  return JSON.parse(
    JSON.stringify(judgment, (key, value) =>
      key === "citations"
        ? value.map((c: any) => ({
            ...c,
            startLine: c.startLine ?? null,
            endLine: c.endLine ?? null,
          }))
        : value,
    ),
  );
}
function responder(
  handler: (body: any) => Response | Promise<Response>,
): typeof fetch {
  return async (url, options) => {
    assert.equal(url, "https://api.groq.com/openai/v1/chat/completions");
    assert.equal(options?.redirect, "error");
    return handler(JSON.parse(String(options?.body)));
  };
}
function success(content: unknown, finish = "stop") {
  return new Response(
    JSON.stringify({
      model,
      choices: [
        {
          message: {
            content:
              typeof content === "string" ? content : JSON.stringify(content),
          },
          finish_reason: finish,
        },
      ],
      usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
    }),
  );
}

test("Groq strict response preserves required nullable citation bounds and existing citation validation", async () => {
  let calls = 0;
  const completion = createGroqCompletion(
    "synthetic-secret",
    model,
    responder((body) => {
      calls++;
      assert.equal(body.model, model);
      assert.equal(body.response_format.json_schema.strict, true);
      assert.equal(body.max_completion_tokens, config.JUDGE_MAX_OUTPUT_TOKENS);
      assert.equal(body.tools, undefined);
      assert.equal(body.stream, undefined);
      const schema = body.response_format.json_schema.schema;
      assert.deepEqual(
        schema.properties.dimensions.properties.systemsRigor.properties
          .citations.items.required,
        ["evidenceId", "startLine", "endLine", "excerpt"],
      );
      return success(validWireJudgment());
    }),
  );
  const result = await judge([snapshot], [], input, completion);
  assert.equal(calls, 1);
  assert.equal(
    result.dimensions.collaborationHygiene.citations[0].startLine,
    undefined,
  );
  assert.equal(synthesize([snapshot], [], result).overallScore, 50);
});
test("fabricated Groq citations require correction before publishing", async () => {
  let calls = 0;
  const result = await judge(
    [snapshot],
    [],
    input,
    createGroqCompletion(
      "synthetic",
      model,
      responder((body) => {
        const packet = JSON.parse(body.messages[1].content);
        calls++;
        if (calls === 1) {
          const bad = validWireJudgment();
          bad.dimensions.systemsRigor.citations[0].evidenceId = "fabricated";
          return success(bad);
        }
        assert.match(packet.correction, /Unknown evidence ID/);
        return success(validWireJudgment());
      }),
    ),
  );
  assert.equal(calls, 2);
  assert.equal(result.dimensions.systemsRigor.level, 2);
});
test("invalid output is bounded to one correction and never becomes a score", async () => {
  let calls = 0;
  const result = await judge(
    [snapshot],
    [],
    input,
    createGroqCompletion(
      "synthetic",
      model,
      responder(() => {
        calls++;
        return success("invalid json");
      }),
    ),
  );
  assert.equal(calls, 2);
  assert.ok(DIMENSIONS.every((k) => result.dimensions[k].level === null));
  assert.equal(synthesize([snapshot], [], result).overallScore, null);
});
test("Groq distinguishes transient quota failures from permanent auth and request failures without exposing response bodies", async () => {
  for (const [status, expectedDelay] of [
    [429, 2000],
    [503, 30000],
  ]) {
    const completion = createGroqCompletion(
      "synthetic-secret",
      model,
      responder(
        () =>
          new Response("sensitive upstream detail", {
            status,
            headers: status === 429 ? { "retry-after": "2" } : {},
          }),
      ),
    );
    await assert.rejects(
      completion("{}"),
      (error) =>
        error instanceof ProviderError && error.retryAfterMs === expectedDelay,
    );
  }
  for (const status of [400, 401, 403]) {
    const completion = createGroqCompletion(
      "synthetic-secret",
      model,
      responder(() => new Response("sensitive upstream detail", { status })),
    );
    await assert.rejects(
      completion("{}"),
      (error) =>
        error instanceof UnrecoverableError &&
        !error.message.includes("sensitive"),
    );
  }
});
test("truncated Groq output cannot publish a partial score", async () => {
  const completion = createGroqCompletion(
    "synthetic",
    model,
    responder(() => success(validWireJudgment(), "length")),
  );
  await assert.rejects(completion("{}"), /output was truncated/);
});
test("model evidence packets stay within configured bounds and validate only supplied evidence", async () => {
  const oversized = makeEvidence(
    "test/repo",
    sha,
    "code",
    "large.ts",
    "x".repeat(80001),
    "https://github.com/test/repo",
  );
  await judge(
    [{ ...snapshot, evidence: [oversized, ...snapshot.evidence] }],
    [],
    input,
    createGroqCompletion(
      "synthetic",
      model,
      responder((body) => {
        const packet = JSON.parse(body.messages[1].content);
        assert.ok(
          packet.evidence.reduce(
            (n: number, e: any) => n + e.content.length,
            0,
          ) <= config.JUDGE_MAX_EVIDENCE_CHARS,
        );
        assert.ok(!packet.evidence.some((e: any) => e.id === oversized.id));
        assert.deepEqual(packet.packetCoverage, { selected: 2, total: 3 });
        return success(validWireJudgment());
      }),
    ),
  );
});
