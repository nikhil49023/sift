import { test, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Queue } from "bullmq";
import { pool } from "../src/db.ts";
import { recoverMissingJobs } from "../src/worker.ts";
import { runRetention } from "../src/retention.ts";

test("lost Redis jobs recover from PostgreSQL without resetting final work or existing retries", {
  skip: process.env.INTEGRATION_TESTS !== "true",
}, async () => {
  const org = randomUUID(), otherOrg = randomUUID(), candidate = randomUUID();
  const cohort = randomUUID(), foreignCohort = randomUUID();
  const jobs = new Map<string, string>();
  const existing = new Set<string>();
  const addOutbox = async (kind: string, payload: unknown, isExisting = false) => {
    const id = randomUUID();
    await pool.query(
      "INSERT INTO outbox(id,org_id,kind,payload,dispatched_at,created_at) VALUES($1,$2,$3,$4,now()-interval '8 days',now()-interval '8 days')",
      [id, org, kind, payload],
    );
    if (isExisting) existing.add(id);
    return id;
  };
  try {
    await pool.query("INSERT INTO organizations(id,name) VALUES($1,'Queue fixture'),($2,'Other tenant')", [org, otherOrg]);
    await pool.query("INSERT INTO cohorts(id,org_id,name,workflow) VALUES($1,$2,'Queue fixture','hackathon'),($3,$4,'Foreign fixture','hackathon')", [cohort, org, foreignCohort, otherOrg]);
    await pool.query("INSERT INTO candidates(id,org_id,cohort_id,name) VALUES($1,$2,$3,'Synthetic queue fixture')", [candidate, org, cohort]);
    for (const [label, status, cancelled] of [
      ["queued", "queued", false], ["running", "running", false],
      ["existing", "running", false], ["failed", "failed", false],
      ["completed", "completed", false], ["cancelled", "queued", true],
    ] as const) {
      const auditId = randomUUID();
      await pool.query(
        "INSERT INTO audits(id,org_id,candidate_id,input,created_by,status,cancelled) VALUES($1,$2,$3,'{}',$4,$5,$6)",
        [auditId, org, candidate, randomUUID(), status, cancelled],
      );
      jobs.set(label, await addOutbox("audit", { auditId, orgId: org }, label === "existing"));
      if (label === "queued") {
        const reportId = randomUUID();
        await pool.query("INSERT INTO reports(id,org_id,audit_id,status) VALUES($1,$2,$3,'running')", [reportId, org, auditId]);
        jobs.set("report", await addOutbox("report", { reportId, orgId: org }));
      }
    }
    const importId = randomUUID();
    await pool.query("INSERT INTO dataset_imports(id,org_id,status,revision,manifest) VALUES($1,$2,'queued','test','{}')", [importId, org]);
    jobs.set("dataset", await addOutbox("dataset", { importId, orgId: org }));
    // Matching IDs from a different tenant must not revive this message.
    const foreignAudit = randomUUID(), foreignCandidate = randomUUID();
    await pool.query("INSERT INTO candidates(id,org_id,cohort_id,name) VALUES($1,$2,$3,'Foreign fixture')", [foreignCandidate, otherOrg, foreignCohort]);
    await pool.query("INSERT INTO audits(id,org_id,candidate_id,input,created_by) VALUES($1,$2,$3,'{}',$4)", [foreignAudit, otherOrg, foreignCandidate, randomUUID()]);
    jobs.set("foreign", await addOutbox("audit", { auditId: foreignAudit, orgId: otherOrg }));
    const checked: string[] = [];
    const targetQueue = { getJob: async (id: string) => {
      checked.push(id);
      return existing.has(id) || ![...jobs.values()].includes(id) ? { id } : undefined;
    }} as Pick<Queue, "getJob">;
    await recoverMissingJobs(targetQueue);
    const pending = (await pool.query("SELECT id FROM outbox WHERE org_id=$1 AND dispatched_at IS NULL", [org])).rows.map(row => row.id).sort();
    assert.deepEqual(pending, ["queued", "running", "report", "dataset"].map(label => jobs.get(label)).sort());
    for (const label of ["failed", "completed", "cancelled", "foreign"])
      assert.ok(!checked.includes(jobs.get(label)!));
    await runRetention();
    const remaining = (await pool.query("SELECT id FROM outbox WHERE org_id=$1", [org])).rows.map(row => row.id);
    assert.ok(remaining.includes(jobs.get("existing")));
    for (const label of ["failed", "completed", "cancelled", "foreign"])
      assert.ok(!remaining.includes(jobs.get(label)!));
  } finally {
    await pool.query("DELETE FROM organizations WHERE id=ANY($1::uuid[])", [[org, otherOrg]]);
  }
});

after(async () => { await pool.end(); });
