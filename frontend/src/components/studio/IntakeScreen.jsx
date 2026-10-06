import React, { useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  FileUp,
  FileText,
  X,
  Check,
  Download,
  Link2,
  Users,
  FolderOpen,
  LoaderCircle,
  RefreshCw,
} from "lucide-react";
import {
  MAX_ROWS,
  MAX_FILE_BYTES,
  parseImport,
  mapImport,
  normalizeSubmission,
  downloadText,
  validateBrief,
} from "../../intake/import";
import { demoSubmissions } from "../../intake/demo";

export default function IntakeScreen({
  workflow,
  identity,
  organizations,
  orgId,
  onOrgChange,
  orgError,
  orgLoading,
  onRetryOrgs,
  onCreateOrg,
  brief,
  setBrief,
  records,
  setRecords,
  onBegin,
  busy,
  onBack,
}) {
  const [tab, setTab] = useState("form");
  const [draft, setDraft] = useState({
    candidateName: "",
    repositories: "",
    githubUsername: "",
    team: "",
  });
  const [parsed, setParsed] = useState(null);
  const [mapping, setMapping] = useState({});
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [fileBusy, setFileBusy] = useState(false);
  const [orgName, setOrgName] = useState("");
  const inputRef = useRef(null);
  const fileRead = useRef(0);
  const isHackathon = workflow === "hackathon";
  const currentOrg = organizations.find((org) => org.id === orgId);
  const mapped = parsed
    ? (() => {
        try {
          return mapImport(parsed, mapping, workflow);
        } catch {
          return [];
        }
      })()
    : [];
  const addRecords = (inputs, sample = false) => {
    if (inputs.length + records.length > MAX_ROWS)
      throw new Error("Use up to 20 submissions per evaluation.");
    const keys = new Set(
      records.map(
        (record) =>
          record.input.candidateName.toLowerCase() +
          ":" +
          [...record.input.repositories].sort().join(",").toLowerCase(),
      ),
    );
    const additions = inputs.map((input) => {
      const key =
        input.candidateName.toLowerCase() +
        ":" +
        [...input.repositories].sort().join(",").toLowerCase();
      if (keys.has(key))
        throw new Error(
          "This batch already contains " +
            input.candidateName +
            " with the same repositories.",
        );
      keys.add(key);
      return {
        id: crypto.randomUUID(),
        input,
        sample,
        status: "pending",
        idempotencyKey: crypto.randomUUID(),
      };
    });
    setRecords((current) => [...current, ...additions]);
  };
  const readFile = async (file) => {
    if (!file) return;
    const attempt = ++fileRead.current;
    setError("");
    setFileBusy(true);
    setParsed(null);
    try {
      if (file.size > MAX_FILE_BYTES)
        throw new Error("Choose a file smaller than 5 MB.");
      const imported = parseImport(await file.text(), file.name, file.size);
      if (attempt !== fileRead.current) return;
      setParsed(imported);
      setMapping(imported.mapping);
    } catch (reason) {
      if (attempt === fileRead.current) setError(reason.message);
    } finally {
      if (attempt === fileRead.current) {
        setFileBusy(false);
        if (inputRef.current) inputRef.current.value = "";
      }
    }
  };
  const begin = () => {
    setError("");
    try {
      validateBrief(brief, workflow);
      if (!records.length)
        throw new Error("Add at least one submission first.");
      onBegin();
    } catch (reason) {
      setError(reason.message);
    }
  };
  return (
    <div className="intake-content">
      <div className="studio-page-title">
        <span className="studio-kicker">
          {isHackathon
            ? "GOOD IDEAS START WITH GOOD CONTEXT"
            : "YOUR NEXT TEAM STARTS HERE"}
        </span>
        <h1>
          Bring the <em>possibilities.</em>
        </h1>
        <p>
          {isHackathon
            ? "A project, a team, and the work that connects them."
            : "A name, a body of work, and room for potential."}{" "}
          Add entries or import responses from your forms.
        </p>
      </div>
      {identity.mode !== "demo" && (
        <div className="organization-picker">
          {orgLoading ? (
            <p>
              <LoaderCircle className="studio-spin" size={14} />
              Finding your workspaces…
            </p>
          ) : orgError ? (
            <div className="studio-error" role="alert">
              {orgError}
              <button className="studio-button secondary" onClick={onRetryOrgs}>
                <RefreshCw size={13} />
                Retry
              </button>
            </div>
          ) : organizations.length ? (
            <label className="studio-field">
              Organization
              <select
                value={orgId}
                onChange={(event) => onOrgChange(event.target.value)}
              >
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name} · {org.role}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                onCreateOrg(orgName.trim()).catch((reason) =>
                  setError(reason.message),
                );
              }}
            >
              <label className="studio-field">
                Your organization
                <input
                  required
                  maxLength={120}
                  value={orgName}
                  onChange={(event) => setOrgName(event.target.value)}
                  placeholder="Your team or organization"
                />
              </label>
              <button
                className="studio-button secondary"
                disabled={busy || !orgName.trim()}
              >
                Create workspace <Plus size={14} />
              </button>
            </form>
          )}
        </div>
      )}
      <div className="intake-layout">
        <div className="intake-primary">
          <section className="intake-card brief-card">
            <div className="intake-card-heading">
              <span className="card-step">01</span>
              <div>
                <h2>Set the context.</h2>
                <p>
                  {isHackathon
                    ? "Give your judging round a name and a sprint window."
                    : "Tell us what you’re building your team for."}
                </p>
              </div>
              <FolderOpen size={19} />
            </div>
            <label className="studio-field">
              {isHackathon
                ? "Hackathon / judging round"
                : "Role / evaluation name"}
              <input
                required
                maxLength={120}
                value={brief.title}
                onChange={(event) =>
                  setBrief({ ...brief, title: event.target.value })
                }
                placeholder={
                  isHackathon
                    ? "e.g. Build for Tomorrow · Final round"
                    : "e.g. Frontend Engineer · Product team"
                }
              />
            </label>
            {isHackathon ? (
              <div className="sprint-fields">
                <label className="studio-field">
                  Sprint start · optional
                  <input
                    type="datetime-local"
                    value={brief.sprintStart}
                    onChange={(event) =>
                      setBrief({ ...brief, sprintStart: event.target.value })
                    }
                  />
                </label>
                <label className="studio-field">
                  Sprint end · optional
                  <input
                    type="datetime-local"
                    value={brief.sprintEnd}
                    onChange={(event) =>
                      setBrief({ ...brief, sprintEnd: event.target.value })
                    }
                  />
                </label>
              </div>
            ) : (
              <label className="studio-field">
                Job description · optional
                <textarea
                  rows={3}
                  maxLength={12000}
                  value={brief.jobDescription}
                  onChange={(event) =>
                    setBrief({ ...brief, jobDescription: event.target.value })
                  }
                  placeholder="The work, the skills, and the kind of thinking you’re looking for."
                />
              </label>
            )}
          </section>
          <section className="intake-card">
            <div className="intake-card-heading">
              <span className="card-step">02</span>
              <div>
                <h2>Choose how to begin.</h2>
                <p>One submission or a whole collection of possibilities.</p>
              </div>
              <Users size={20} />
            </div>
            <div
              className="intake-tabs"
              role="group"
              aria-label="Data entry method"
            >
              <button
                aria-pressed={tab === "form"}
                onClick={() => {
                  setTab("form");
                  setError("");
                }}
              >
                <FileText size={14} />
                Add with a form
              </button>
              <button
                aria-pressed={tab === "file"}
                onClick={() => {
                  setTab("file");
                  setError("");
                }}
              >
                <FileUp size={14} />
                Upload a file
              </button>
            </div>
            {tab === "form" ? (
              <form
                className="submission-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  setError("");
                  try {
                    addRecords([normalizeSubmission(draft, workflow)]);
                    setDraft({
                      candidateName: "",
                      repositories: "",
                      githubUsername: "",
                      team: "",
                    });
                  } catch (reason) {
                    setError(reason.message);
                  }
                }}
              >
                <div className="form-row">
                  <label className="studio-field">
                    {isHackathon ? "Team / submission name" : "Candidate name"}
                    <input
                      required
                      maxLength={200}
                      value={draft.candidateName}
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          candidateName: event.target.value,
                        })
                      }
                      placeholder={
                        isHackathon
                          ? "Your team’s name"
                          : "The person behind the profile"
                      }
                    />
                  </label>
                  <label className="studio-field">
                    GitHub username · optional
                    <input
                      maxLength={39}
                      value={draft.githubUsername}
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          githubUsername: event.target.value,
                        })
                      }
                      placeholder="GitHub handle"
                    />
                  </label>
                </div>
                <label className="studio-field">
                  {isHackathon ? "Project repository" : "GitHub repositories"}
                  <textarea
                    required
                    rows={2}
                    value={draft.repositories}
                    onChange={(event) =>
                      setDraft({ ...draft, repositories: event.target.value })
                    }
                    placeholder={
                      isHackathon
                        ? "https://github.com/team/project"
                        : "owner/project · one per line, up to five"
                    }
                  />
                </label>
                {isHackathon && (
                  <label className="studio-field">
                    Declared team members
                    <input
                      value={draft.team}
                      onChange={(event) =>
                        setDraft({ ...draft, team: event.target.value })
                      }
                      placeholder="GitHub handles or names, separated by commas"
                    />
                  </label>
                )}
                <button
                  className="studio-button secondary add-entry"
                  disabled={records.length >= MAX_ROWS}
                >
                  <Plus size={15} />
                  Add {isHackathon ? "submission" : "candidate"}
                </button>
              </form>
            ) : (
              <div className="file-import">
                <div
                  className={"upload-zone " + (dragging ? "dragging" : "")}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(event) => {
                    event.preventDefault();
                    setDragging(false);
                    if (event.dataTransfer.files.length !== 1) {
                      setError("Upload one file at a time.");
                      return;
                    }
                    readFile(event.dataTransfer.files[0]);
                  }}
                >
                  <input
                    ref={inputRef}
                    type="file"
                    id="studio-upload"
                    accept=".csv,.json,.tsv"
                    aria-label="Upload submissions file"
                    onChange={(event) => readFile(event.target.files[0])}
                  />
                  <FileUp size={31} strokeWidth={1.2} />
                  <h3>
                    {fileBusy
                      ? "Reading your file…"
                      : "Drop your possibilities here."}
                  </h3>
                  <p>CSV, JSON, or TSV · up to 5 MB · 20 entries</p>
                  <button
                    className="studio-button secondary"
                    disabled={fileBusy}
                    onClick={() => inputRef.current?.click()}
                  >
                    Choose a file <ArrowRight size={14} />
                  </button>
                </div>
                <div className="forms-import-hint">
                  <Link2 size={17} />
                  <p>
                    Using Google Forms or Microsoft Forms?
                    <br />
                    <strong>
                      Export your responses as CSV and upload them here.
                    </strong>
                  </p>
                  <button
                    onClick={() =>
                      downloadText(
                        "sift-submission-template.csv",
                        "candidateName,repositories,githubUsername,team\nExample Candidate,owner/project,github-handle,\n",
                      )
                    }
                  >
                    <Download size={14} />
                    Template
                  </button>
                </div>
                {parsed && (
                  <div className="import-preview">
                    <div>
                      <h3>{parsed.fileName}</h3>
                      <span>
                        {parsed.rows.length}{" "}
                        {parsed.rows.length === 1 ? "entry" : "entries"} found
                      </span>
                    </div>
                    <p>
                      Match your columns. Other columns are kept out of the
                      assessment input.
                    </p>
                    <div className="column-mapping">
                      {[
                        [
                          "candidateName",
                          isHackathon ? "Team name" : "Candidate name",
                        ],
                        ["repositories", "Repositories"],
                        ["githubUsername", "GitHub username"],
                        ...(isHackathon ? [["team", "Team members"]] : []),
                      ].map(([key, label]) => (
                        <label className="studio-field" key={key}>
                          {label}
                          {["candidateName", "repositories"].includes(key)
                            ? " *"
                            : ""}
                          <select
                            value={mapping[key] || ""}
                            onChange={(event) =>
                              setMapping({
                                ...mapping,
                                [key]: event.target.value,
                              })
                            }
                          >
                            <option value="">Choose a column</option>
                            {parsed.headers.map((header) => (
                              <option key={header}>{header}</option>
                            ))}
                          </select>
                        </label>
                      ))}
                    </div>
                    <div className="import-preview-rows">
                      {mapped.map((row) => (
                        <div
                          key={row.row}
                          className={row.error ? "invalid" : ""}
                        >
                          {row.error ? <X size={13} /> : <Check size={13} />}
                          <span>
                            Row {row.row}:{" "}
                            {row.error || row.input.candidateName}
                          </span>
                        </div>
                      ))}
                    </div>
                    <button
                      className="studio-button secondary"
                      disabled={
                        !mapped.length || mapped.some((row) => row.error)
                      }
                      onClick={() => {
                        setError("");
                        try {
                          addRecords(mapped.map((row) => row.input));
                          setParsed(null);
                        } catch (reason) {
                          setError(reason.message);
                        }
                      }}
                    >
                      Add {mapped.length || parsed.rows.length} validated
                      entries <Plus size={14} />
                    </button>
                  </div>
                )}
              </div>
            )}
            {error && (
              <p className="studio-error" role="alert">
                {error}
              </p>
            )}
          </section>
        </div>
        <aside className="intake-summary">
          <div className="summary-masthead">
            <span className="studio-kicker">THE POSSIBILITIES SO FAR</span>
            <span>{String(records.length).padStart(2, "0")}</span>
          </div>
          <h2>Your submissions.</h2>
          <p>A little context. A closer look.</p>
          <div className="staged-entries">
            {records.map((record, index) => (
              <article key={record.id}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <h3>{record.input.candidateName}</h3>
                  <p>{record.input.repositories.join(", ")}</p>
                  {record.sample && <small>Sample submission</small>}
                </div>
                <button
                  aria-label={"Remove " + record.input.candidateName}
                  onClick={() =>
                    setRecords((current) =>
                      current.filter((entry) => entry.id !== record.id),
                    )
                  }
                >
                  <X size={14} />
                </button>
              </article>
            ))}
          </div>
          {!records.length && (
            <div className="submission-empty">
              <FileText size={29} strokeWidth={1.2} />
              <h3>Room for great potential.</h3>
              <p>
                Add an entry or upload your responses.
                <br />
                We’ll bring the evidence together next.
              </p>
            </div>
          )}
          {identity.mode === "demo" && (
            <button
              className="sample-data-button"
              onClick={() => {
                setError("");
                try {
                  addRecords(
                    demoSubmissions.map((row) =>
                      normalizeSubmission(row, workflow),
                    ),
                    true,
                  );
                  if (!brief.title.trim())
                    setBrief({
                      ...brief,
                      title: isHackathon
                        ? "Build for Tomorrow · Demo"
                        : "Frontend Engineer · Demo",
                    });
                } catch (reason) {
                  setError(reason.message);
                }
              }}
            >
              <Plus size={13} />
              Try four sample submissions
            </button>
          )}
          <div className="summary-bottom">
            <p>
              <Check size={13} />
              {identity.mode === "demo"
                ? "Demo scores are illustrative. Uploaded entries stay unscored."
                : "Repository evidence is collected after submission."}
            </p>
            <button
              className="studio-button primary"
              disabled={
                busy ||
                !records.length ||
                !brief.title.trim() ||
                (identity.mode !== "demo" &&
                  (!orgId || !currentOrg || currentOrg.role === "viewer"))
              }
              onClick={begin}
            >
              {busy
                ? "Starting…"
                : "Process " +
                  records.length +
                  " " +
                  (records.length === 1 ? "submission" : "submissions")}
              <ArrowRight size={16} />
            </button>
            {currentOrg?.role === "viewer" && (
              <p>Reviewer access is required to submit an evaluation.</p>
            )}
          </div>
        </aside>
      </div>
      <button className="studio-back" onClick={onBack}>
        <ArrowLeft size={14} />
        Change workspace type
      </button>
    </div>
  );
}
