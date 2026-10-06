import { test, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { app } from "../src/app.ts";
import { pool } from "../src/db.ts";
import { config } from "../src/config.ts";

after(() => pool.end());
test("large cohorts use bounded, stable pages and filters across the whole cohort", { skip: process.env.INTEGRATION_TESTS !== "true" }, async () => {
  const cohort = randomUUID();
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}/api/candidates?cohortId=${cohort}`;
  const read = async (query: string) => {
    const response = await fetch(base + query);
    assert.equal(response.status, 200);
    return response.json();
  };
  try {
    await pool.query("INSERT INTO cohorts(id,org_id,name,workflow) VALUES($1,$2,'Synthetic large cohort','hackathon')", [cohort, config.LOCAL_ORG_ID]);
    await pool.query(`INSERT INTO candidates(id,org_id,cohort_id,name,claims)
      SELECT gen_random_uuid(),$1,$2,'Applicant '||lpad(n::text,4,'0'),jsonb_build_object('privateNote',repeat('x',10000))
      FROM generate_series(1,1000) n`, [config.LOCAL_ORG_ID, cohort]);
    await pool.query(`INSERT INTO audits(id,org_id,candidate_id,input,created_by,status,assessment)
      SELECT gen_random_uuid(),org_id,id,'{}',$3,
        CASE WHEN name LIKE '%0' THEN 'partial' ELSE 'completed' END,
        jsonb_build_object('riskLevel',CASE WHEN name LIKE '%0' THEN 'FLAGGED' ELSE 'NO_FLAGS_OBSERVED' END,
          'overallScore',50,'rankable',false,'summary',repeat('x',10000))
      FROM candidates WHERE org_id=$1 AND cohort_id=$2`, [config.LOCAL_ORG_ID, cohort, config.LOCAL_USER_ID]);
    const first = await read("&pageSize=25");
    const second = await read("&pageSize=25&page=2");
    const again = await read("&pageSize=25");
    assert.equal(first.total, 1000);
    assert.equal(first.pageCount, 40);
    assert.equal(first.candidates.length, 25);
    assert.deepEqual(first.candidates.map((c: any) => c.id), again.candidates.map((c: any) => c.id));
    assert.equal(new Set([...first.candidates, ...second.candidates].map((c: any) => c.id)).size, 50);
    assert.ok(JSON.stringify(first).length < 20000, "List payload must omit claims and full assessments");
    const filtered = await read("&pageSize=25&risk=FLAGGED&state=partial&sort=name&page=4");
    assert.equal(filtered.total, 100);
    assert.equal(filtered.cohortTotal, 1000);
    assert.equal(filtered.candidates[0].name, "Applicant 0760");
    assert.ok(filtered.candidates.every((c: any) => c.assessment.riskLevel === "FLAGGED"));
    assert.equal((await read("&search=Applicant%20%25")).total, 0, "Search percent signs are literal");
    assert.equal((await read("&search=Applicant%200999")).total, 1);
    assert.equal((await fetch(base + "&pageSize=10000")).status, 400);
    assert.equal((await fetch(base + "&sort=malicious")).status, 400);
  } finally {
    await pool.query("DELETE FROM cohorts WHERE id=$1 AND org_id=$2", [cohort, config.LOCAL_ORG_ID]);
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});
