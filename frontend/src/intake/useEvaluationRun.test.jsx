// @vitest-environment jsdom
import React, { useState } from "react";
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import useEvaluationRun from "./useEvaluationRun";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
const entry = (name, fields = {}) => ({
  id: name,
  input: { candidateName: name, repositories: ["sift/" + name], team: [] },
  idempotencyKey: "stable-key-" + name,
  status: "pending",
  ...fields,
});
const makeRun = (items) => ({
  id: "run",
  workflow: "recruiting",
  brief: { title: "Frontend", jobDescription: "Build thoughtful interfaces." },
  cohortId: "cohort",
  items,
  status: "processing",
  execution: 0,
});
function harness(initial, api, mode = "live") {
  const complete = vi.fn();
  const hook = renderHook(() => {
    const [run, setRun] = useState(initial);
    useEvaluationRun({ run, setRun, api, mode, onComplete: complete });
    return {
      run,
      retry: () =>
        setRun((current) => ({
          ...current,
          status: "processing",
          execution: current.execution + 1,
        })),
    };
  });
  return { ...hook, complete };
}
const flush = () => act(async () => {});
describe("evaluation API orchestration", () => {
  it.each([true, false])(
    "uses backend ranks only when calibration is enabled (%s)",
    async (rankingsEnabled) => {
      const api = vi.fn(async (path, options) => {
        if (path === "/api/audits")
          return { id: "audit", candidateId: "candidate" };
        if (path === "/api/audits/audit")
          return {
            status: "completed",
            candidate_id: "candidate",
            assessment: { overallScore: 88 },
            stages: { scout: { status: "completed" } },
          };
        if (path === "/api/candidates/candidate")
          return {
            decisions: [
              {
                audit_id: "audit",
                decision: "advance",
                rationale: "Verified useful contributions.",
              },
            ],
          };
        if (path.includes("?cohortId="))
          return {
            rankingsEnabled,
            candidates: [{ id: "candidate", rank: 2 }],
          };
        throw new Error("Unexpected request: " + path);
      });
      const { result, complete } = harness(makeRun([entry("Alex")]), api);
      await flush();
      expect(result.current.run.status).toBe("results");
      expect(result.current.run.items[0]).toMatchObject({
        assessment: { overallScore: 88 },
        rank: rankingsEnabled ? 2 : null,
        decision: "advance",
      });
      expect(api).toHaveBeenCalledWith(
        "/api/audits",
        expect.objectContaining({
          idempotencyKey: "stable-key-Alex",
          body: {
            candidateName: "Alex",
            repositories: ["sift/Alex"],
            team: [],
            workflow: "recruiting",
            cohortId: "cohort",
            jobDescription: "Build thoughtful interfaces.",
          },
        }),
      );
      expect(complete).toHaveBeenCalledOnce();
    },
  );
  it("waits for the first audit to finish before queuing the next and cancels polls on unmount", async () => {
    vi.useFakeTimers();
    let finished = false;
    const api = vi.fn(async (path) => {
      if (path === "/api/audits")
        return { id: "audit", candidateId: "candidate" };
      if (path === "/api/audits/audit")
        return {
          status: finished ? "completed" : "running",
          candidate_id: "candidate",
          stages: {},
        };
      if (path === "/api/candidates/candidate") return { decisions: [] };
      return { rankingsEnabled: false, candidates: [] };
    });
    const view = harness(makeRun([entry("Alex"), entry("Noor")]), api);
    await flush();
    expect(
      api.mock.calls.filter(([path]) => path === "/api/audits"),
    ).toHaveLength(1);
    finished = true;
    await act(() => vi.advanceTimersByTimeAsync(1800));
    expect(
      api.mock.calls.filter(([path]) => path === "/api/audits"),
    ).toHaveLength(2);
    view.unmount();
    const calls = api.mock.calls.length;
    await act(() => vi.advanceTimersByTimeAsync(6000));
    expect(api).toHaveBeenCalledTimes(calls);
  });
  it("backs off on a full audit queue using the same idempotency key", async () => {
    vi.useFakeTimers();
    let attempts = 0;
    const api = vi.fn(async (path) => {
      if (path === "/api/audits") {
        if (++attempts === 1)
          throw Object.assign(new Error("Full queue"), { status: 429 });
        return { id: "audit", candidateId: "candidate" };
      }
      if (path === "/api/audits/audit")
        return {
          status: "completed",
          candidate_id: "candidate",
          assessment: { overallScore: null },
        };
      if (path === "/api/candidates/candidate") return { decisions: [] };
      return { rankingsEnabled: false, candidates: [] };
    });
    const { result } = harness(makeRun([entry("Alex")]), api);
    await flush();
    expect(result.current.run.items[0].error).toMatch(/available audit slot/);
    await act(() => vi.advanceTimersByTimeAsync(5000));
    expect(result.current.run.status).toBe("results");
    const calls = api.mock.calls.filter(([path]) => path === "/api/audits");
    expect(calls.map(([, options]) => options.idempotencyKey)).toEqual([
      "stable-key-Alex",
      "stable-key-Alex",
    ]);
  });
  it("retries a failed backend audit rather than creating another candidate", async () => {
    let reads = 0;
    const api = vi.fn(async (path) => {
      if (path === "/api/audits/audit")
        return {
          status: ++reads === 1 ? "failed" : "completed",
          candidate_id: "candidate",
          assessment: { overallScore: 70 },
        };
      if (path === "/api/audits/audit/retry") return { id: "audit" };
      if (path === "/api/candidates/candidate") return { decisions: [] };
      return { rankingsEnabled: false, candidates: [] };
    });
    const { result } = harness(
      makeRun([entry("Alex", { auditId: "audit", status: "failed" })]),
      api,
    );
    await flush();
    expect(api).toHaveBeenCalledWith(
      "/api/audits/audit/retry",
      expect.objectContaining({ body: {} }),
    );
    expect(api.mock.calls.some(([path]) => path === "/api/audits")).toBe(false);
    expect(result.current.run.items[0].status).toBe("completed");
  });
  it("keeps completed assessments when prior-decision synchronization fails", async () => {
    const api = vi.fn(async (path) => {
      if (path === "/api/audits")
        return { id: "audit", candidateId: "candidate" };
      if (path === "/api/audits/audit")
        return {
          status: "completed",
          candidate_id: "candidate",
          assessment: { overallScore: 70 },
        };
      if (path === "/api/candidates/candidate")
        throw new Error("Connection lost");
      return { rankingsEnabled: false, candidates: [] };
    });
    const { result } = harness(makeRun([entry("Alex")]), api);
    await flush();
    expect(result.current.run.items[0]).toMatchObject({
      status: "completed",
      assessment: { overallScore: 70 },
    });
    expect(result.current.run.items[0].decisionError).toMatch(
      /could not be refreshed/,
    );
  });
  it("never assigns a fabricated score or calls live APIs for uploaded demo data", async () => {
    vi.useFakeTimers();
    const api = vi.fn();
    const { result } = harness(
      makeRun([entry("Alex", { sample: false })]),
      api,
      "demo",
    );
    await act(() => vi.advanceTimersByTimeAsync(700));
    expect(result.current.run.items[0].assessment.overallScore).toBeNull();
    expect(result.current.run.rankingsEnabled).toBe(false);
    expect(api).not.toHaveBeenCalled();
  });
});
