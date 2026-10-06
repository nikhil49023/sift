import React from "react";
import {
  ArrowRight,
  Check,
  Fingerprint,
  GitBranch,
  Sparkles,
  ShieldCheck,
  FileText,
  LoaderCircle,
} from "lucide-react";
import { terminal, stageNames } from "../../intake/useEvaluationRun";
export const stageLabels = [
  "Collect the work",
  "Inspect the evidence",
  "Evaluate the signals",
  "Build the assessment",
];

export default function ProcessingScreen({ run, identity, onResults }) {
  const finished = run.items.filter((item) => terminal(item.status)).length;
  const progress = Math.round(
    (run.items.reduce(
      (sum, item) =>
        sum + (terminal(item.status) ? 4 : Math.min(4, item.stageCount || 0)),
      0,
    ) /
      (run.items.length * 4)) *
      100,
  );
  const active = run.items.find(
    (item) => item.status === "running" || item.status === "queued",
  );
  const activeStage = stageNames.indexOf(active?.stage);
  return (
    <section className="processing-screen">
      <span className="studio-kicker">
        {identity.mode === "demo"
          ? "INTERACTIVE DEMO / ILLUSTRATIVE PROCESSING"
          : "FOLLOWING THE EVIDENCE"}
      </span>
      <h1>
        From possibility
        <br />
        to <em>perspective.</em>
      </h1>
      <p>
        {identity.mode === "demo"
          ? "A preview of how your submissions move through the SIFT workflow."
          : "SIFT is collecting repository evidence and building a considered assessment."}
      </p>
      <div className="processing-orbit" aria-hidden="true">
        <span className="processing-ring one" />
        <span className="processing-ring two" />
        <div>
          <Fingerprint size={42} strokeWidth={1.2} />
          <span>SIFT</span>
        </div>
        <i className="orbit-beacon first" />
        <i className="orbit-beacon second" />
      </div>
      <div className="run-progress-info">
        <span>
          {finished} of {run.items.length} submissions finished
        </span>
        <strong>{progress}%</strong>
      </div>
      <div
        className="run-progress"
        role="progressbar"
        aria-label="Evidence processing progress"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <span style={{ width: progress + "%" }} />
      </div>
      <div className="processing-stages">
        {stageLabels.map((label, index) => {
          const Icon = [GitBranch, ShieldCheck, Sparkles, FileText][index];
          return (
            <div
              className={
                activeStage === index
                  ? "active"
                  : activeStage > index
                    ? "finished"
                    : ""
              }
              key={label}
            >
              <span>
                {activeStage > index ? <Check size={17} /> : <Icon size={17} />}
              </span>
              <h3>{label}</h3>
              <p>
                {identity.mode === "demo"
                  ? "Demo preview"
                  : activeStage === index
                    ? "In progress"
                    : activeStage > index
                      ? "Stage complete"
                      : "Waiting"}
              </p>
            </div>
          );
        })}
      </div>
      <div className="processing-list" aria-label="Submission progress">
        {run.items.map((item) => (
          <div key={item.id}>
            {terminal(item.status) ? (
              <Check size={14} />
            ) : item.status === "running" ? (
              <LoaderCircle className="studio-spin" size={14} />
            ) : (
              <span className="pending-dot" />
            )}
            <span>{item.input.candidateName}</span>
            <small>
              {item.error ||
                (item.status === "running"
                  ? stageLabels[stageNames.indexOf(item.stage)] || "Processing"
                  : item.status === "pending"
                    ? "Waiting in line"
                    : item.status)}
            </small>
          </div>
        ))}
      </div>
      <button className="studio-button secondary" onClick={onResults}>
        View available results <ArrowRight size={15} />
      </button>
      <p className="processing-note">
        {identity.mode === "demo"
          ? "Demo fixtures show illustrative scores. Your own imports remain unscored."
          : "Processing continues while you inspect available results. Incomplete evidence stays unscored."}
      </p>
    </section>
  );
}
