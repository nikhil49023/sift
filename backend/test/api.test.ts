import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { app } from "../src/app.ts";
import { pool } from "../src/db.ts";
import { config } from "../src/config.ts";
import { createPdf, generateReport, localReportPath } from "../src/reports.ts";
import { rm, mkdir, writeFile, access } from "node:fs/promises";
import { dirname } from "node:path";
import { runAudit, recordJobFailure } from "../src/worker.ts";
import { UnrecoverableError } from "bullmq";
import {
  RUBRIC_VERSION,
  PROMPT_VERSION,
  JEV_VERIFICATION_VERSION,
  DIMENSIONS,
  AuditInput,
  type Snapshot,
} from "@sift/contracts";
import { makeEvidence } from "../src/ingestion.ts";
import { proposeJudgment, incompleteJudgment } from "../src/jev/index.ts";
import { ProviderError } from "../src/github.ts";
import { purgeDeletedOrganizations } from "../src/retention.ts";
test("dossier is a real PDF with a provenance section", async () => {
  const pdf = await createPdf({
    candidate: { name: "Synthetic fixture" },
    auditId: randomUUID(),
    generatedAt: "2026-01-01",
    findings: [],
    sources: [],
    decisions: [],
    manifestHash: "test hash",
  });
  assert.equal(pdf.subarray(0, 4).toString(), "%PDF");
  assert.ok(pdf.length > 1000);
});
test(
  "tenant isolation, idempotency, role enforcement and persistent audit state",
  { skip: process.env.INTEGRATION_TESTS !== "true" },
  async () => {
    const server = app.listen(0, "127.0.0.1");
    await once(server, "listening");
    const address = server.address() as { port: number };
    const base = `http://127.0.0.1:${address.port}`;
    const foreign = randomUUID(),
      foreignCandidate = randomUUID(),
      foreignAudit = randomUUID(),
      foreignCohort = randomUUID();
    let cohortId: string | undefined, reportId: string | undefined;
    const audits: string[] = [];
    const previousRankingFlag = config.RANKINGS_ENABLED;
    const previousDecisionProvider = config.DECISION_PROVIDER;
    const previousTypesafeKey = config.TYPESAFE_API_KEY;
    const originalFetch = globalThis.fetch;
    const request = async (
      path: string,
      body?: unknown,
      method = body ? "POST" : "GET",
      key?: string,
    ) =>
      fetch(base + path, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(key ? { "Idempotency-Key": key } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
    try {
      await pool.query(
        "INSERT INTO organizations(id,name) VALUES($1,'Synthetic tenant fixture')",
        [foreign],
      );
      await pool.query(
        "INSERT INTO cohorts(id,org_id,name,workflow) VALUES($1,$2,'Synthetic','hackathon')",
        [foreignCohort, foreign],
      );
      await pool.query(
        "INSERT INTO candidates(id,org_id,cohort_id,name) VALUES($1,$2,$3,'Synthetic')",
        [foreignCandidate, foreign, foreignCohort],
      );
      await pool.query(
        "INSERT INTO audits(id,org_id,candidate_id,input,created_by) VALUES($1,$2,$3,$4,$5)",
        [foreignAudit, foreign, foreignCandidate, {}, config.LOCAL_USER_ID],
      );
      assert.equal((await request(`/api/audits/${foreignAudit}`)).status, 404);
      assert.equal(
        (await request(`/api/candidates/${foreignCandidate}`)).status,
        404,
      );
      assert.equal(
        (await request(`/api/audits/${foreignAudit}/cancel`, {})).status,
        404,
      );
      const foreignReport = localReportPath(`${foreign}/${randomUUID()}.pdf`);
      await mkdir(dirname(foreignReport), { recursive: true });
      await writeFile(foreignReport, "Synthetic storage fixture");
      await pool.query("INSERT INTO storage_deletions(org_id) VALUES($1)", [
        foreign,
      ]);
      await pool.query("DELETE FROM organizations WHERE id=$1", [foreign]);
      await purgeDeletedOrganizations();
      assert.equal(
        (await pool.query("SELECT 1 FROM audits WHERE id=$1", [foreignAudit]))
          .rowCount,
        0,
      );
      await assert.rejects(access(foreignReport));
      const cohort = await request("/api/cohorts", {
        name: "Synthetic integration cohort",
        workflow: "hackathon",
      });
      assert.equal(cohort.status, 201);
      cohortId = (await cohort.json()).id;
      const input = {
        workflow: "hackathon",
        cohortId,
        candidateName: "Synthetic fixture",
        repositories: ["test/repo"],
      };
      const key = randomUUID();
      const response = await request("/api/audits", input, "POST", key);
      assert.equal(response.status, 202);
      const job = await response.json();
      audits.push(job.id);
      const replay = await request("/api/audits", input, "POST", key);
      assert.equal((await replay.json()).id, job.id);
      assert.equal(
        (
          await request(
            "/api/audits",
            { ...input, candidateName: "Changed" },
            "POST",
            key,
          )
        ).status,
        409,
      );
      assert.equal((await request(`/api/audits/${job.id}`)).status, 200);
      config.RANKINGS_ENABLED = "true";
      const currentVersions = {
        rubric: RUBRIC_VERSION,
        prompt: PROMPT_VERSION,
        provider: "groq",
        model: config.GROQ_MODEL,
        decisionProvider: config.DECISION_PROVIDER,
      };
      for (const [versions, expectedRank] of [
        [currentVersions, 1],
        [{ ...currentVersions, provider: "gemini" }, null],
        [{ ...currentVersions, model: "other-model" }, null],
        [{ ...currentVersions, prompt: "older-prompt" }, null],
        [{ ...currentVersions, decisionProvider: "typesafe" }, null],
      ] as const) {
        await pool.query("UPDATE audits SET assessment=$2 WHERE id=$1", [
          job.id,
          { rankable: true, overallScore: 50, versions },
        ]);
        const listing = await (
          await request(`/api/candidates?cohortId=${cohortId}`)
        ).json();
        assert.equal(listing.candidates[0].rank, expectedRank);
        assert.equal(listing.rankedCohortSize, expectedRank === 1 ? 1 : 0);
      }
      config.RANKINGS_ENABLED = previousRankingFlag;
      config.DECISION_PROVIDER = "typesafe";
      const decisionVersions = {
        ...currentVersions,
        decisionProvider: "typesafe",
        decisionModel: config.TYPESAFE_MODEL,
        decisionVersion: JEV_VERIFICATION_VERSION,
        decisionThreshold: config.JEV_SUPPORT_THRESHOLD,
      };
      for (const [versions, supported, expectedRank] of [
        [decisionVersions, true, 1],
        [
          { ...decisionVersions, decisionModel: "different-resolved-version" },
          true,
          null,
        ],
        [{ ...decisionVersions, decisionVersion: "obsolete" }, true, null],
        [{ ...decisionVersions, decisionThreshold: 0.99 }, true, null],
        [decisionVersions, false, null],
      ] as const) {
        await pool.query("UPDATE audits SET assessment=$2 WHERE id=$1", [
          job.id,
          {
            rankable: true,
            overallScore: 50,
            versions,
            verification: { engineeringSupported: supported },
          },
        ]);
        config.RANKINGS_ENABLED = "true";
        const listing = await (
          await request(`/api/candidates?cohortId=${cohortId}`)
        ).json();
        assert.equal(listing.candidates[0].rank, expectedRank);
      }
      config.RANKINGS_ENABLED = previousRankingFlag;
      config.DECISION_PROVIDER = previousDecisionProvider;
      await pool.query(
        "UPDATE memberships SET role='viewer' WHERE org_id=$1 AND user_id=$2",
        [config.LOCAL_ORG_ID, config.LOCAL_USER_ID],
      );
      assert.equal(
        (
          await request("/api/cohorts", {
            name: "Forbidden",
            workflow: "hackathon",
          })
        ).status,
        403,
      );
      await pool.query(
        "UPDATE memberships SET role='admin' WHERE org_id=$1 AND user_id=$2",
        [config.LOCAL_ORG_ID, config.LOCAL_USER_ID],
      );
      await pool.query(
        "UPDATE audits SET status='partial',assessment=$2 WHERE id=$1",
        [
          job.id,
          {
            summary: "Synthetic report fixture",
            overallScore: null,
            dimensions: {},
            coverage: [],
          },
        ],
      );
      const reportResponse = await request(`/api/audits/${job.id}/reports`, {});
      assert.equal(reportResponse.status, 202);
      reportId = (await reportResponse.json()).id;
      await generateReport(reportId!, config.LOCAL_ORG_ID);
      const download = await request(`/api/reports/${reportId}/download`);
      assert.equal(download.status, 200);
      assert.equal(download.headers.get("content-type"), "application/pdf");
      assert.equal(
        Buffer.from(await download.arrayBuffer())
          .subarray(0, 4)
          .toString(),
        "%PDF",
      );
      await pool.query(
        "UPDATE audits SET status='running',stages=$2 WHERE id=$1",
        [
          job.id,
          {
            scout: { status: "completed" },
            forensics: { status: "completed" },
          },
        ],
      );
      await runAudit(job.id, config.LOCAL_ORG_ID);
      const attempts = (
        await pool.query(
          "SELECT stage FROM stage_attempts WHERE audit_id=$1 ORDER BY id",
          [job.id],
        )
      ).rows.map((r) => r.stage);
      assert.deepEqual(attempts, ["judge", "synthesizer"]);
      await runAudit(job.id, config.LOCAL_ORG_ID);
      assert.equal(
        (
          await pool.query("SELECT 1 FROM stage_attempts WHERE audit_id=$1", [
            job.id,
          ])
        ).rowCount,
        2,
      );
      const sha = "b".repeat(40);
      const code = makeEvidence(
        "test/repo",
        sha,
        "code",
        "tests/app.test.ts",
        "assert.equal(1, 1);",
        "https://github.com/test/repo",
      );
      const history = makeEvidence(
        "test/repo",
        sha,
        "commit",
        "history.json",
        "Synthetic incremental history",
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
      const raw = incompleteJudgment("Synthetic checkpoint fixture");
      for (const k of DIMENSIONS)
        raw.dimensions[k] = {
          level: 2,
          rationale: "Synthetic rationale",
          citations:
            k === "collaborationHygiene"
              ? [{ evidenceId: history.id, excerpt: history.content }]
              : [
                  {
                    evidenceId: code.id,
                    excerpt: code.content,
                    startLine: 1,
                    endLine: 1,
                  },
                ],
        };
      const proposal = await proposeJudgment(
        [snapshot],
        [],
        AuditInput.parse(input),
        async () => ({ text: JSON.stringify(raw), model: config.GROQ_MODEL }),
      );
      const { evidence, ...savedSnapshot } = snapshot;
      for (const item of evidence)
        await pool.query(
          "INSERT INTO evidence(id,audit_id,org_id,payload) VALUES($1,$2,$3,$4)",
          [item.id, job.id, config.LOCAL_ORG_ID, item],
        );
      await pool.query(
        "UPDATE audits SET status='running',judgment=$2,snapshots=$3,stages=$4 WHERE id=$1",
        [
          job.id,
          proposal,
          JSON.stringify([savedSnapshot]),
          {
            scout: { status: "completed" },
            forensics: { status: "completed" },
          },
        ],
      );
      config.DECISION_PROVIDER = "typesafe";
      config.TYPESAFE_API_KEY = "synthetic-key";
      let jevCalls = 0;
      globalThis.fetch = async (url, options) => {
        if (String(url).startsWith("https://api.")) {
          assert.equal(
            url,
            "https://api.typesafe.ai/v1/systemone",
            "Groq must not regenerate a valid checkpoint",
          );
          jevCalls++;
          if (jevCalls === 1)
            return new Response("synthetic quota", {
              status: 429,
              headers: { "retry-after": "1" },
            });
          const body = JSON.parse(String(options?.body));
          return new Response(
            JSON.stringify({
              model: "jev-synthetic-version",
              answers: Object.fromEntries(
                Object.keys(body.questions).map((k) => [
                  k,
                  { type: "noul", noul: 0.95 },
                ]),
              ),
              usage: { input_tokens: 100, output_tokens: 9 },
            }),
          );
        }
        return originalFetch(url, options);
      };
      await assert.rejects(
        runAudit(job.id, config.LOCAL_ORG_ID),
        ProviderError,
      );
      assert.equal(
        (await pool.query("SELECT judgment FROM audits WHERE id=$1", [job.id]))
          .rows[0].judgment.generation.model,
        config.GROQ_MODEL,
      );
      await runAudit(job.id, config.LOCAL_ORG_ID);
      const verified = (
        await pool.query("SELECT status,assessment FROM audits WHERE id=$1", [
          job.id,
        ])
      ).rows[0];
      assert.equal(jevCalls, 2);
      assert.equal(verified.status, "completed");
      assert.equal(verified.assessment.overallScore, 50);
      assert.equal(
        verified.assessment.versions.decisionModel,
        "jev-synthetic-version",
      );
      globalThis.fetch = originalFetch;
      config.DECISION_PROVIDER = previousDecisionProvider;
      config.TYPESAFE_API_KEY = previousTypesafeKey;
      await pool.query(
        "UPDATE audits SET status='running',stage='judge' WHERE id=$1",
        [job.id],
      );
      await recordJobFailure(
        {
          id: "synthetic-job",
          name: "audit",
          data: { auditId: job.id, orgId: config.LOCAL_ORG_ID },
          attemptsMade: 1,
          opts: { attempts: 3 },
        },
        new UnrecoverableError("Synthetic invalid model credential"),
      );
      assert.equal(
        (await (await request(`/api/audits/${job.id}`)).json()).status,
        "partial",
      );
      assert.equal(
        (await (await request(`/api/audits/${job.id}`)).json()).stages.judge
          .status,
        "failed",
      );
      await pool.query("UPDATE audits SET status='running' WHERE id=$1", [
        job.id,
      ]);
      assert.equal(
        (await request(`/api/audits/${job.id}/cancel`, {})).status,
        200,
      );
      assert.equal(
        (await (await request(`/api/audits/${job.id}`)).json()).status,
        "cancelled",
      );
    } finally {
      globalThis.fetch = originalFetch;
      config.DECISION_PROVIDER = previousDecisionProvider;
      config.TYPESAFE_API_KEY = previousTypesafeKey;
      config.RANKINGS_ENABLED = previousRankingFlag;
      await pool.query(
        "UPDATE memberships SET role='admin' WHERE org_id=$1 AND user_id=$2",
        [config.LOCAL_ORG_ID, config.LOCAL_USER_ID],
      );
      for (const id of audits)
        await pool.query("DELETE FROM outbox WHERE payload->>'auditId'=$1", [
          id,
        ]);
      if (reportId) {
        await pool.query("DELETE FROM outbox WHERE payload->>'reportId'=$1", [
          reportId,
        ]);
        await rm(localReportPath(`${config.LOCAL_ORG_ID}/${reportId}.pdf`), {
          force: true,
        });
      }
      if (cohortId)
        await pool.query("DELETE FROM cohorts WHERE id=$1 AND org_id=$2", [
          cohortId,
          config.LOCAL_ORG_ID,
        ]);
      await pool.query("DELETE FROM organizations WHERE id=$1", [foreign]);
      await pool.query("DELETE FROM storage_deletions WHERE org_id=$1", [
        foreign,
      ]);
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  },
);
test.after(async () => {
  await pool.end();
});
