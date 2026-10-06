import React, { useMemo, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Search,
  Download,
  Check,
  Users,
  BarChart3,
  Bookmark,
  RefreshCw,
  X,
  ShieldCheck,
  FileText,
  LoaderCircle,
} from "lucide-react";
import EditorialDialog from "../editorial/EditorialDialog";
import { downloadText, safeCsvCell } from "../../intake/import";

const selectedDecision = (item) => ["advance", "award"].includes(item.decision);
const dimensionLabels = {
  systemsRigor: "Systems rigor",
  algorithmicDepth: "Algorithmic depth",
  testingVerification: "Testing & verification",
  collaborationHygiene: "Collaboration",
};

export default function ResultsScreen({
  run,
  identity,
  canWrite,
  onDecision,
  onRetry,
  onNew,
  onProcessing,
  onOpenReview,
}) {
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [decision, setDecision] = useState("review");
  const [rationale, setRationale] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const isHackathon = run.workflow === "hackathon";
  const isDemo = identity.mode === "demo";
  const selectedCount = run.items.filter(selectedDecision).length;
  const selectedItem = selected
    ? run.items.find((item) => item.id === selected.id) || selected
    : null;
  const scored = run.items.filter(
    (item) => item.assessment?.overallScore != null,
  ).length;
  const needsReview = (item) =>
    item.status === "failed" ||
    item.assessment?.overallScore == null ||
    ["REVIEW_REQUIRED", "FLAGGED"].includes(item.assessment?.riskLevel);
  const filtered = useMemo(
    () =>
      run.items
        .filter(
          (item) =>
            item.input.candidateName
              .toLowerCase()
              .includes(search.toLowerCase()) &&
            (tab === "all" ||
              (tab === "selected"
                ? selectedDecision(item)
                : needsReview(item))),
        )
        .sort((a, b) =>
          isDemo
            ? (b.assessment?.overallScore ?? -1) -
              (a.assessment?.overallScore ?? -1)
            : (a.rank ?? Infinity) - (b.rank ?? Infinity),
        ),
    [run.items, tab, search, isDemo],
  );
  const openDossier = (item) => {
    setSelected(item);
    setDecision(item.decision || "review");
    setRationale(item.rationale || "");
    setError("");
  };
  const exportResults = () => {
    const rows = [
      [
        "name",
        "repositories",
        "assessment_score",
        "rank",
        "status",
        "reviewer_decision",
        "rationale",
        "mode",
      ],
      ...run.items.map((item) => [
        item.input.candidateName,
        item.input.repositories.join("; "),
        item.assessment?.overallScore ?? "Unscored",
        isDemo || !run.rankingsEnabled ? "" : (item.rank ?? ""),
        item.status,
        item.decision || "Not reviewed",
        item.rationale || "",
        identity.mode,
      ]),
    ];
    downloadText(
      "sift-evaluation-results.csv",
      rows.map((row) => row.map(safeCsvCell).join(",")).join("\r\n"),
    );
  };
  return (
    <section className="results-screen">
      <div className="results-title">
        <div className="studio-page-title">
          <span className="studio-kicker">
            {run.status === "processing"
              ? "THE FIRST SIGNALS ARE COMING IN"
              : "THE EVIDENCE IS IN. YOUR PERSPECTIVE MATTERS."}
          </span>
          <h1>
            A clearer <em>shortlist.</em>
          </h1>
          <p>
            {run.brief.title} <span>·</span>{" "}
            {isHackathon ? "Hackathon evaluation" : "Recruiting evaluation"}
          </p>
        </div>
        <button className="studio-button secondary" onClick={exportResults}>
          <Download size={15} />
          Export CSV
        </button>
      </div>
      {run.status === "processing" && (
        <div className="result-processing-banner" role="status">
          <LoaderCircle className="studio-spin" size={16} />
          <p>
            Evidence processing is still running. Results will update as
            assessments finish.
          </p>
          <button onClick={onProcessing}>
            View progress <ArrowRight size={14} />
          </button>
        </div>
      )}
      <div className="result-metrics">
        {[
          [
            Users,
            isHackathon ? "Submissions" : "Candidates",
            run.items.length,
            "Different stories. New possibilities.",
          ],
          [
            BarChart3,
            isDemo ? "Illustrative scores" : "Scored assessments",
            scored,
            "Unknown evidence remains unscored.",
          ],
          [
            Bookmark,
            "Selected by you",
            selectedCount,
            isHackathon
              ? "Your recorded award decisions."
              : "Your recorded advance decisions.",
          ],
        ].map(([Icon, label, value, description]) => (
          <article key={label}>
            <div>
              <span>{label}</span>
              <Icon size={17} />
            </div>
            <strong>{String(value).padStart(2, "0")}</strong>
            <p>{description}</p>
          </article>
        ))}
      </div>
      <div className="ranking-note">
        <ShieldCheck size={18} />
        <div>
          <strong>
            {isDemo
              ? "Demo scores, human decisions."
              : run.rankingsEnabled
                ? "Ranks supplied by the calibrated backend."
                : "Rankings await calibration."}
          </strong>
          <p>
            {isDemo
              ? "Only the sample submissions have illustrative scores. Imported entries are unscored. Selection is always your review decision."
              : run.rankingsEnabled
                ? "Only comparable, eligible assessments receive ranks. A high score does not automatically select a submission."
                : "You can inspect scores and record selections now. SIFT will show ranks when backend calibration is enabled."}
          </p>
        </div>
      </div>
      {run.rankError && (
        <p className="studio-error" role="alert">
          {run.rankError}
        </p>
      )}
      <div className="results-toolbar">
        <div role="group" aria-label="Result filter">
          {[
            ["all", isHackathon ? "All submissions" : "All candidates"],
            ["selected", "Selected"],
            ["review", "Needs review"],
          ].map(([id, label]) => (
            <button
              aria-pressed={tab === id}
              key={id}
              onClick={() => setTab(id)}
            >
              {label}
              {id === "selected" && <span>{selectedCount}</span>}
            </button>
          ))}
        </div>
        <label className="result-search">
          <Search size={15} />
          <input
            type="search"
            aria-label="Search results"
            placeholder="Find a person or team…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
      </div>
      <div className="results-table-wrap">
        <table className="results-table">
          <thead>
            <tr>
              <th>{isDemo ? "Preview order" : "Rank"}</th>
              <th>{isHackathon ? "Team / project" : "Candidate / work"}</th>
              <th>{isDemo ? "Demo score" : "Assessment"}</th>
              <th>Evidence status</th>
              <th>Decision</th>
              <th>
                <span className="sr-only">Review</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item, index) => (
              <tr key={item.id}>
                <td>
                  {isDemo
                    ? String(index + 1).padStart(2, "0")
                    : run.rankingsEnabled && item.rank
                      ? String(item.rank).padStart(2, "0")
                      : "—"}
                </td>
                <td>
                  <button
                    className="result-name"
                    onClick={() => openDossier(item)}
                  >
                    <span className="result-avatar">
                      {item.input.candidateName
                        .split(" ")
                        .slice(0, 2)
                        .map((part) => part[0])
                        .join("")}
                    </span>
                    <span>
                      <strong>{item.input.candidateName}</strong>
                      <small>{item.input.repositories.join(" · ")}</small>
                    </span>
                  </button>
                </td>
                <td>
                  <span
                    className={
                      "result-score " +
                      (item.assessment?.overallScore == null ? "unscored" : "")
                    }
                  >
                    {item.assessment?.overallScore ?? "Unscored"}
                    {item.assessment?.overallScore != null && (
                      <small>/100</small>
                    )}
                  </span>
                </td>
                <td>
                  <span
                    className={
                      "evidence-chip " +
                      (needsReview(item) ? "review" : "ready")
                    }
                  >
                    {item.status === "failed"
                      ? "Processing failed"
                      : ["pending", "queued", "running"].includes(item.status)
                        ? "Processing"
                        : isDemo
                          ? item.sample
                            ? "Illustrative"
                            : "Preview only"
                          : item.assessment?.riskLevel
                              ?.replaceAll("_", " ")
                              .toLowerCase() || item.status}
                  </span>
                </td>
                <td>
                  <span
                    className={
                      "decision-chip " +
                      (selectedDecision(item) ? "selected" : "")
                    }
                  >
                    {selectedDecision(item) && <Check size={11} />}
                    {item.decision
                      ? {
                          advance: "Selected",
                          award: "Awarded",
                          decline: "Declined",
                          "no-award": "No award",
                          review: "Review",
                        }[item.decision]
                      : "Not reviewed"}
                  </span>
                </td>
                <td>
                  <button
                    className="result-review"
                    aria-label={"Review " + item.input.candidateName}
                    onClick={() => openDossier(item)}
                  >
                    Review <ArrowUpRight size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!filtered.length && (
        <div className="studio-empty">
          <Search size={26} />
          <h2>
            {tab === "selected"
              ? "Your next yes starts with a review."
              : "No submissions match this view."}
          </h2>
          <p>
            {tab === "selected"
              ? "Open a dossier and record an advance or award decision to add it here."
              : "Try a different name or filter."}
          </p>
        </div>
      )}
      <div className="results-footer">
        <p>
          {filtered.length} of {run.items.length} shown <span>·</span> Your
          judgment makes the final call.
        </p>
        <div>
          {run.items.some((item) => item.status === "failed") && (
            <button
              className="studio-button secondary"
              disabled={run.status === "processing"}
              onClick={onRetry}
            >
              <RefreshCw size={14} />
              Retry failed entries
            </button>
          )}
          <button className="studio-button secondary" onClick={onNew}>
            Start a new evaluation <ArrowRight size={14} />
          </button>
          {!isDemo && (
            <button className="studio-button primary" onClick={onOpenReview}>
              Full evidence workspace <ArrowUpRight size={14} />
            </button>
          )}
        </div>
      </div>
      <EditorialDialog
        isOpen={!!selected}
        onClose={() => {
          if (!busy) setSelected(null);
        }}
        title={selectedItem?.input.candidateName || ""}
        description={
          isDemo
            ? "Interactive demo dossier. Scores are illustrative; imported data is not verified."
            : "An assessment for your review. Your decision is recorded separately."
        }
        className="studio studio-decision-dialog"
      >
        {selectedItem && (
          <div className="decision-dossier">
            <p className="decision-repositories">
              <FileText size={15} />
              {selectedItem.input.repositories.join(", ")}
            </p>
            <p>
              {selectedItem.assessment?.summary ||
                selectedItem.error ||
                "Evidence processing has not finished for this submission."}
            </p>
            <div className="decision-dimensions">
              {Object.entries(dimensionLabels).map(([key, label]) => (
                <article key={key}>
                  <span>{label}</span>
                  <strong>
                    {selectedItem.assessment?.dimensions?.[key]?.level == null
                      ? "Unscored"
                      : selectedItem.assessment.dimensions[key].level + "/4"}
                  </strong>
                </article>
              ))}
            </div>
            {selectedItem.decisionError && (
              <p className="studio-error" role="alert">
                {selectedItem.decisionError}
              </p>
            )}
            <form
              onSubmit={async (event) => {
                event.preventDefault();
                setBusy(true);
                setError("");
                try {
                  await onDecision(selectedItem, decision, rationale.trim());
                  setSelected(null);
                } catch (reason) {
                  setError(reason.message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <label className="studio-field">
                Your decision
                <select
                  value={decision}
                  onChange={(event) => setDecision(event.target.value)}
                  disabled={busy}
                >
                  <option value="review">Keep under review</option>
                  {isHackathon ? (
                    <>
                      <option value="award">Select for an award</option>
                      <option value="no-award">No award</option>
                    </>
                  ) : (
                    <>
                      <option value="advance">Select / advance</option>
                      <option value="decline">Decline</option>
                    </>
                  )}
                </select>
              </label>
              <label className="studio-field">
                Why this decision?
                <textarea
                  required
                  minLength={10}
                  maxLength={5000}
                  rows={3}
                  value={rationale}
                  onChange={(event) => setRationale(event.target.value)}
                  placeholder="The evidence that informed your decision…"
                  disabled={busy}
                />
              </label>
              {error && (
                <p className="studio-error" role="alert">
                  {error}
                </p>
              )}
              <button
                className="studio-button primary"
                disabled={
                  busy ||
                  !canWrite ||
                  !["completed", "partial"].includes(selectedItem.status) ||
                  rationale.trim().length < 10
                }
              >
                {busy
                  ? "Saving…"
                  : isDemo
                    ? "Save demo decision"
                    : "Record reviewer decision"}
                <Check size={15} />
              </button>
              <p className="decision-save-note">
                {isDemo
                  ? "Saved in this demo browser session."
                  : "Saved to your organization with your reviewer identity and audit reference."}
              </p>
            </form>
          </div>
        )}
      </EditorialDialog>
    </section>
  );
}
