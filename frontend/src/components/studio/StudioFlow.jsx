import React, { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../../auth/AuthProvider";
import { request } from "../../api";
import { normalizeSubmission, validateBrief } from "../../intake/import";
import useEvaluationRun from "../../intake/useEvaluationRun";
import { StudioHeader, StudioFooter, StepRail } from "./StudioChrome";
import IntakeScreen from "./IntakeScreen";
import ProcessingScreen from "./ProcessingScreen";
import ResultsScreen from "./ResultsScreen";

export default function StudioFlow({ workflow, screen, navigate, onSignOut }) {
  const auth = useAuth();
  const mode = auth.identity.mode;
  const [organizations, setOrganizations] = useState(
    mode === "demo" ? [{ id: "demo", name: "Demo studio", role: "admin" }] : [],
  );
  const [orgId, setOrgId] = useState(mode === "demo" ? "demo" : "");
  const [orgLoading, setOrgLoading] = useState(mode !== "demo");
  const [orgError, setOrgError] = useState("");
  const [orgAttempt, setOrgAttempt] = useState(0);
  const [brief, setBrief] = useState({
    title: "",
    jobDescription: "",
    sprintStart: "",
    sprintEnd: "",
  });
  const [records, setRecords] = useState([]);
  const [run, setRun] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const starting = useRef(false);
  const restored = useRef("");
  const org = organizations.find((entry) => entry.id === orgId);
  const canWrite = org && org.role !== "viewer";
  const api = useCallback(
    (path, options = {}) =>
      request(path, { token: auth.session?.access_token, orgId, ...options }),
    [auth.session?.access_token, orgId],
  );
  const storageKey = orgId
    ? "sift.studio.run:" +
      (auth.session?.user?.id || mode) +
      ":" +
      orgId +
      ":" +
      workflow
    : "";
  useEffect(() => {
    if (mode === "demo") return;
    let alive = true;
    const controller = new AbortController();
    setOrgLoading(true);
    setOrgError("");
    request("/api/organizations", {
      token: auth.session?.access_token,
      signal: controller.signal,
    })
      .then((rows) => {
        if (!alive) return;
        setOrganizations(rows);
        setOrgId((current) =>
          rows.some((entry) => entry.id === current)
            ? current
            : rows[0]?.id || "",
        );
      })
      .catch((reason) => {
        if (alive) setOrgError(reason.message);
      })
      .finally(() => {
        if (alive) setOrgLoading(false);
      });
    return () => {
      alive = false;
      controller.abort();
    };
  }, [mode, auth.session?.access_token, orgAttempt]);
  useEffect(() => {
    if (!storageKey || restored.current === storageKey) return;
    restored.current = storageKey;
    try {
      const stored = JSON.parse(sessionStorage.getItem(storageKey));
      if (
        !stored ||
        stored.workflow !== workflow ||
        !Array.isArray(stored.items) ||
        !stored.items.length ||
        stored.items.length > 20 ||
        typeof stored.id !== "string" ||
        !stored.brief ||
        typeof stored.brief.title !== "string"
      )
        return;
      validateBrief(stored.brief, workflow);
      if (
        typeof stored.cohortId !== "string" ||
        stored.items.some(
          (item) =>
            typeof item.id !== "string" ||
            typeof item.idempotencyKey !== "string",
        )
      )
        return;
      const items = stored.items.map((item) => ({
        ...item,
        input: normalizeSubmission(item.input, workflow),
        ...(mode !== "demo"
          ? { status: "pending", assessment: null, decision: null, rank: null }
          : {}),
      }));
      setRun({
        ...stored,
        items,
        ...(mode !== "demo"
          ? { status: "processing", execution: (stored.execution || 0) + 1 }
          : {}),
      });
      setBrief(stored.brief);
      if (screen === "intake")
        navigate(
          mode !== "demo" || stored.status === "processing"
            ? "processing"
            : "results",
        );
    } catch {
      /* A malformed browser draft never blocks a new evaluation. */
    }
  }, [storageKey, workflow, mode, navigate, screen]);
  useEffect(() => {
    if (!run || !storageKey) return;
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(run));
    } catch {
      /* Live audits remain saved by the backend. */
    }
  }, [run, storageKey]);
  const complete = useCallback(() => navigate("results"), [navigate]);
  useEvaluationRun({ run, setRun, api, mode, onComplete: complete });
  const createOrg = async (name) => {
    setBusy(true);
    try {
      const created = await request("/api/organizations", {
        token: auth.session?.access_token,
        body: { name },
      });
      setOrganizations((current) => [...current, created]);
      setOrgId(created.id);
    } finally {
      setBusy(false);
    }
  };
  const begin = async () => {
    if (starting.current) return;
    starting.current = true;
    setBusy(true);
    setError("");
    try {
      if (!canWrite)
        throw new Error("Choose a workspace with reviewer access.");
      if (run?.status === "processing")
        throw new Error(
          "An evaluation is already processing. Open its progress to continue.",
        );
      validateBrief(brief, workflow);
      if (!records.length)
        throw new Error("Add at least one submission first.");
      const cohort =
        mode === "demo"
          ? { id: "demo-" + crypto.randomUUID() }
          : await api("/api/cohorts", {
              body: { name: brief.title.trim(), workflow },
            });
      const next = {
        id: crypto.randomUUID(),
        workflow,
        brief: { ...brief, title: brief.title.trim() },
        cohortId: cohort.id,
        items: records.map((record) => ({
          ...record,
          status: "pending",
          assessment: null,
        })),
        status: "processing",
        execution: 0,
        rankingsEnabled: false,
      };
      setRun(next);
      navigate("processing");
    } catch (reason) {
      setError(reason.message);
    } finally {
      starting.current = false;
      setBusy(false);
    }
  };
  const saveDecision = async (item, decision, rationale) => {
    if (!canWrite) throw new Error("Reviewer access is required.");
    if (rationale.trim().length < 10)
      throw new Error("Add at least 10 characters of review rationale.");
    if (mode !== "demo")
      await api("/api/candidates/" + item.candidateId + "/decisions", {
        body: { auditId: item.auditId, decision, rationale },
      });
    setRun((current) => ({
      ...current,
      items: current.items.map((row) =>
        row.id === item.id ? { ...row, decision, rationale } : row,
      ),
    }));
  };
  const newEvaluation = () => {
    if (run?.status === "processing") {
      setError(
        "Wait for the active evaluation to finish before starting another.",
      );
      return;
    }
    setRun(null);
    setRecords([]);
    setError("");
    try {
      sessionStorage.removeItem(storageKey);
    } catch {
      /* Nothing else to clear. */
    }
    navigate("intake");
  };
  const contentScreen = !run ? "intake" : screen;
  return (
    <div className="studio flow-screen">
      <StudioHeader
        identity={auth.identity}
        onSignOut={onSignOut}
        onHome={() => navigate("roles")}
      />
      <main className="studio-container flow-container">
        <StepRail
          current={
            contentScreen === "processing"
              ? 2
              : contentScreen === "results"
                ? 3
                : 1
          }
        />
        {error && (
          <p className="studio-error" role="alert">
            {error}
          </p>
        )}
        {contentScreen === "processing" ? (
          <ProcessingScreen
            run={run}
            identity={auth.identity}
            onResults={() => navigate("results")}
          />
        ) : contentScreen === "results" ? (
          <ResultsScreen
            run={run}
            identity={auth.identity}
            canWrite={canWrite}
            onDecision={saveDecision}
            onRetry={() => {
              setRun((current) => ({
                ...current,
                status: "processing",
                execution: current.execution + 1,
              }));
              navigate("processing");
            }}
            onNew={newEvaluation}
            onProcessing={() => navigate("processing")}
            onOpenReview={() => navigate("review")}
          />
        ) : (
          <IntakeScreen
            workflow={workflow}
            identity={auth.identity}
            organizations={organizations}
            orgId={orgId}
            onOrgChange={(id) => {
              setRun(null);
              setRecords([]);
              setOrgId(id);
            }}
            orgError={orgError}
            orgLoading={orgLoading}
            onRetryOrgs={() => setOrgAttempt((current) => current + 1)}
            onCreateOrg={createOrg}
            brief={brief}
            setBrief={setBrief}
            records={records}
            setRecords={setRecords}
            onBegin={begin}
            busy={busy}
            onBack={() => navigate("roles")}
          />
        )}
      </main>
      <StudioFooter />
    </div>
  );
}
