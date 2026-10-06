import { test } from "node:test";
import assert from "node:assert/strict";
import { STAGES } from "@sift/contracts";
import { runAuditGraph, type AuditStage } from "../src/workflow.ts";

test("LangGraph cancellation stops before judging or synthesizing", async () => {
  const visited: AuditStage[] = [];
  const result = await runAuditGraph("audit", "tenant", async stage => {
    visited.push(stage);
    return stage !== "forensics";
  });
  assert.deepEqual(visited, ["scout", "forensics"]);
  assert.equal(result.proceed, false);
});

test("LangGraph bubbles failures once and can resume with persisted stage checkpoints", async () => {
  const completed = new Set<AuditStage>();
  const runs: AuditStage[] = [];
  let fail = true;
  const execute = async (stage: AuditStage) => {
    if (completed.has(stage)) return true;
    runs.push(stage);
    if (stage === "judge" && fail) throw new Error("Transient provider failure");
    completed.add(stage);
    return true;
  };
  await assert.rejects(runAuditGraph("audit", "tenant", execute), /Transient provider failure/);
  assert.deepEqual(runs, ["scout", "forensics", "judge"]);
  fail = false;
  await runAuditGraph("audit", "tenant", execute);
  assert.deepEqual([...completed], STAGES);
  assert.deepEqual(runs, ["scout", "forensics", "judge", "judge", "synthesizer"]);
});
