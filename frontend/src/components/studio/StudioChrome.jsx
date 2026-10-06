import React from "react";
import { ArrowUpRight, LogOut, Check, Fingerprint } from "lucide-react";
import { Wordmark } from "../editorial/HomeScreen";

export function StudioHeader({ identity, onSignOut, onHome }) {
  return (
    <header className="studio-header">
      <button className="studio-brand" onClick={onHome} aria-label="SIFT home">
        <Wordmark />
        <span>DECISION STUDIO</span>
      </button>
      <div className="studio-header-right">
        <span className="studio-mode">
          <i />
          {identity?.mode === "demo"
            ? "Interactive demo"
            : identity?.mode === "local"
              ? "Local workspace"
              : "Your private workspace"}
        </span>
        {identity ? (
          <button className="studio-signout" onClick={onSignOut}>
            <LogOut size={14} />
            <span>Sign out</span>
          </button>
        ) : (
          <a href="#home">
            Meet SIFT <ArrowUpRight size={14} />
          </a>
        )}
      </div>
    </header>
  );
}

export function StudioFooter() {
  return (
    <footer className="studio-footer">
      <span>
        <Fingerprint size={14} /> Evidence first. People always.
      </span>
      <span>The SIFT Core Team</span>
    </footer>
  );
}

export function StepRail({ current }) {
  return (
    <nav className="studio-step-rail" aria-label="Evaluation progress">
      {[
        "Choose workspace",
        "Bring your data",
        "Process evidence",
        "Make a decision",
      ].map((label, index) => (
        <div
          key={label}
          className={
            index === current ? "current" : index < current ? "complete" : ""
          }
          aria-current={index === current ? "step" : undefined}
        >
          <span>
            {index < current ? (
              <Check size={12} />
            ) : (
              String(index + 1).padStart(2, "0")
            )}
          </span>
          <p>{label}</p>
        </div>
      ))}
    </nav>
  );
}
