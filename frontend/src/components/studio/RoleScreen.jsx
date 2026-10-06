import React, { useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BriefcaseBusiness,
  Trophy,
  Check,
  Users,
  GitBranch,
  ShieldCheck,
} from "lucide-react";
import { StudioHeader, StudioFooter, StepRail } from "./StudioChrome";

export default function RoleScreen({ identity, onSelect, onSignOut, onHome }) {
  const [selected, setSelected] = useState("");
  return (
    <div className="studio role-screen">
      <StudioHeader identity={identity} onSignOut={onSignOut} onHome={onHome} />
      <main className="studio-container">
        <StepRail current={0} />
        <div className="role-heading">
          <span className="studio-kicker">
            ONE PLATFORM. TWO WAYS TO SEE POTENTIAL.
          </span>
          <h1>
            Choose your <em>lens.</em>
          </h1>
          <p>
            Hi {identity?.name?.split(" ")[0] || "there"}. What brings you to
            SIFT today?
          </p>
        </div>
        <div
          className="role-options"
          role="radiogroup"
          aria-label="Choose your workspace"
        >
          {[
            {
              id: "recruiting",
              label: "Recruiter",
              line: "Your next great hire has a story.",
              description:
                "Go beyond the résumé. Bring candidate submissions together and find the builders who belong on your team.",
              Icon: BriefcaseBusiness,
              features: [
                "Candidate intake & role context",
                "Evidence-backed assessments",
                "Shortlists & reviewer decisions",
              ],
              art: Users,
            },
            {
              id: "hackathon",
              label: "Hackathon organizer",
              line: "Good ideas deserve a closer look.",
              description:
                "Bring clarity to your judging. Review project submissions, inspect contributions, and celebrate work that stands up to scrutiny.",
              Icon: Trophy,
              features: [
                "Team submissions & sprint windows",
                "Code forensics & contribution signals",
                "Judging results & award decisions",
              ],
              art: GitBranch,
            },
          ].map(
            ({ id, label, line, description, Icon, features, art: Art }) => (
              <label
                className={"role-option " + (selected === id ? "selected" : "")}
                key={id}
              >
                <input
                  type="radio"
                  name="workspace-role"
                  value={id}
                  checked={selected === id}
                  onChange={() => setSelected(id)}
                />
                <span className="role-radio">
                  {selected === id && <Check size={13} />}
                </span>
                <div className="role-icon">
                  <Icon size={27} strokeWidth={1.4} />
                </div>
                <span className="studio-kicker">
                  {id === "recruiting"
                    ? "01 / FIND YOUR PEOPLE"
                    : "02 / FIND THE BREAKTHROUGH"}
                </span>
                <h2>{label}</h2>
                <h3>{line}</h3>
                <p>{description}</p>
                <ul>
                  {features.map((feature) => (
                    <li key={feature}>
                      <Check size={13} />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Art className="role-art" size={130} strokeWidth={0.65} />
              </label>
            ),
          )}
        </div>
        <div className="role-continue">
          <p>
            <ShieldCheck size={16} />
            You can start a different workspace later.
          </p>
          <button
            className="studio-button primary"
            disabled={!selected}
            onClick={() => onSelect(selected)}
          >
            Continue to{" "}
            {selected === "hackathon"
              ? "hackathon"
              : selected === "recruiting"
                ? "recruiting"
                : "your workspace"}
            <ArrowRight size={17} />
          </button>
        </div>
        <div className="role-note">
          <span>YOUR EXPERIENCE, FROM START TO SHORTLIST</span>
          <p>
            Add your data <ArrowRight size={13} /> Connect the evidence{" "}
            <ArrowRight size={13} /> Make the decision{" "}
            <ArrowUpRight size={13} />
          </p>
        </div>
      </main>
      <StudioFooter />
    </div>
  );
}
