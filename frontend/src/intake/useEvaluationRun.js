import { useEffect } from "react";
import { demoAssessment } from "./demo";
export const stageNames = ["scout", "forensics", "judge", "synthesizer"];
export const terminal = (status) =>
  ["completed", "partial", "failed", "cancelled"].includes(status);
export function waitForNextPoll(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal.aborted)
      return reject(new DOMException("Stopped", "AbortError"));
    const cancel = () => {
      clearTimeout(timer);
      signal.removeEventListener("abort", cancel);
      reject(new DOMException("Stopped", "AbortError"));
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", cancel);
      resolve();
    }, ms);
    signal.addEventListener("abort", cancel, { once: true });
  });
}

export default function useEvaluationRun({
  run,
  setRun,
  api,
  mode,
  onComplete,
}) {
  useEffect(() => {
    if (!run || run.status !== "processing") return;
    const controller = new AbortController();
    const signal = controller.signal;
    const update = (id, fields) => {
      if (!signal.aborted)
        setRun((current) =>
          current?.id === run.id
            ? {
                ...current,
                items: current.items.map((item) =>
                  item.id === id ? { ...item, ...fields } : item,
                ),
              }
            : current,
        );
    };
    const process = async () => {
      for (const item of run.items) {
        if (signal.aborted) return;
        if (terminal(item.status) && item.status !== "failed") continue;
        try {
          if (mode === "demo") {
            for (const stage of stageNames) {
              update(item.id, {
                status: "running",
                stage,
                stageCount: stageNames.indexOf(stage),
              });
              await waitForNextPoll(160, signal);
            }
            const assessment = item.sample
              ? demoAssessment(item.input)
              : {
                  overallScore: null,
                  riskLevel: "INSUFFICIENT_EVIDENCE",
                  summary:
                    "Preview only. This submission has not been audited; connect a live workspace to collect evidence.",
                  dimensions: {},
                };
            update(item.id, { status: "completed", stageCount: 4, assessment });
            continue;
          }
          let auditId = item.auditId,
            candidateId = item.candidateId;
          if (auditId && item.status === "failed") {
            const existing = await api("/api/audits/" + auditId, { signal });
            if (["failed", "partial", "cancelled"].includes(existing.status)) {
              await api("/api/audits/" + auditId + "/retry", {
                body: {},
                signal,
              });
              update(item.id, {
                status: "queued",
                error: "",
                assessment: null,
              });
            }
          }
          if (!auditId) {
            let attempts = 0;
            while (!auditId) {
              try {
                const input = {
                  ...item.input,
                  workflow: run.workflow,
                  cohortId: run.cohortId,
                  ...(run.workflow === "recruiting" && run.brief.jobDescription
                    ? { jobDescription: run.brief.jobDescription }
                    : {}),
                  ...(run.workflow === "hackathon" && run.brief.sprintStart
                    ? {
                        sprint: {
                          start: new Date(run.brief.sprintStart).toISOString(),
                          end: new Date(run.brief.sprintEnd).toISOString(),
                        },
                      }
                    : {}),
                };
                const response = await api("/api/audits", {
                  body: input,
                  idempotencyKey: item.idempotencyKey,
                  signal,
                });
                auditId = response.id;
                candidateId = response.candidateId;
                update(item.id, {
                  auditId,
                  candidateId,
                  status: "queued",
                  error: "",
                });
              } catch (error) {
                if (error.status !== 429 || ++attempts > 4) throw error;
                update(item.id, {
                  status: "queued",
                  error: "Waiting for an available audit slot…",
                });
                await waitForNextPoll(5000, signal);
              }
            }
          }
          while (!signal.aborted) {
            const audit = await api("/api/audits/" + auditId, { signal });
            candidateId = audit.candidate_id || candidateId;
            update(item.id, {
              auditId,
              candidateId,
              status: audit.status,
              stage: audit.stage,
              stageCount: Object.values(audit.stages || {}).filter(
                (stage) => stage.status === "completed",
              ).length,
              assessment: audit.assessment,
              error: audit.error || "",
            });
            if (terminal(audit.status)) {
              if (["completed", "partial"].includes(audit.status)) {
                try {
                  const detail = await api("/api/candidates/" + candidateId, {
                    signal,
                  });
                  const decision = detail.decisions?.find(
                    (entry) => entry.audit_id === auditId,
                  );
                  update(item.id, {
                    decision: decision?.decision || null,
                    rationale: decision?.rationale || "",
                  });
                } catch (error) {
                  if (signal.aborted) return;
                  update(item.id, {
                    decisionError:
                      "Prior review decisions could not be refreshed: " +
                      error.message,
                  });
                }
              }
              break;
            }
            await waitForNextPoll(1800, signal);
          }
        } catch (error) {
          if (signal.aborted) return;
          update(item.id, { status: "failed", error: error.message });
        }
      }
      if (signal.aborted) return;
      let rankingsEnabled = false,
        ranks = {},
        rankError = "";
      if (mode !== "demo") {
        try {
          const cohort = await api(
            "/api/candidates?cohortId=" + run.cohortId + "&page=1",
            { signal },
          );
          rankingsEnabled = cohort.rankingsEnabled === true;
          ranks = Object.fromEntries(
            cohort.candidates.map((candidate) => [
              candidate.id,
              candidate.rank,
            ]),
          );
        } catch (error) {
          if (signal.aborted) return;
          rankError =
            "Assessments are available, but cohort rankings could not be refreshed. " +
            error.message;
        }
      }
      setRun((current) =>
        current?.id === run.id
          ? {
              ...current,
              status: "results",
              rankingsEnabled,
              rankError,
              items: current.items.map((item) => ({
                ...item,
                rank: rankingsEnabled
                  ? (ranks[item.candidateId] ?? null)
                  : null,
              })),
            }
          : current,
      );
      onComplete();
    };
    process();
    return () => controller.abort();
  }, [run?.id, run?.execution, api, mode, onComplete]);
}
