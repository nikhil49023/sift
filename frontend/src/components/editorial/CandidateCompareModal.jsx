import React from "react";
import { ArrowUpRight, MapPin, BriefcaseBusiness } from "lucide-react";
import EditorialDialog from "./EditorialDialog";

export default function CandidateCompareModal({
  candidates,
  isOpen,
  onClose,
  onSelectCandidate,
}) {
  return (
    <EditorialDialog
      isOpen={isOpen}
      onClose={onClose}
      className="compare-dialog"
      title="Make the differences clear."
      description="Your shortlist, side by side. All scores and profiles in this workspace are illustrative."
    >
      <div
        className="comparison-grid"
        style={{ "--compare-columns": Math.max(1, candidates.length) }}
      >
        {candidates.map((candidate, index) => (
          <article className="comparison-profile" key={candidate.id}>
            <span className="eyebrow">0{index + 1} / THE POSSIBILITY</span>
            <img
              className="comparison-portrait"
              src={candidate.thumb}
              alt={"Illustrated portrait of " + candidate.name}
            />
            <h3>{candidate.name}</h3>
            <p className="comparison-role">{candidate.role}</p>
            <div className="comparison-meta">
              <span>
                <MapPin size={12} />
                {candidate.location}
              </span>
              <span>
                <BriefcaseBusiness size={12} />
                {candidate.experienceYears}
              </span>
            </div>
            <div className="comparison-score">
              <strong>
                {candidate.matchPercentage}
                <small>%</small>
              </strong>
              <span>Illustrative match</span>
            </div>
            <div className="comparison-section">
              <span className="eyebrow">THE SKILLS</span>
              <div className="skill-tags">
                {candidate.skills
                  .filter((skill) => !skill.startsWith("+"))
                  .slice(0, 4)
                  .map((skill) => (
                    <span key={skill}>{skill}</span>
                  ))}
              </div>
            </div>
            <div className="comparison-section">
              <span className="eyebrow">THE SIGNALS</span>
              {candidate.signals.map((signal) => (
                <div className="comparison-signal" key={signal.name}>
                  <span>{signal.name}</span>
                  <strong>
                    {signal.candidate}
                    <small> / 100</small>
                  </strong>
                </div>
              ))}
            </div>
            <div className="comparison-section">
              <span className="eyebrow">A MOMENT THAT MATTERS</span>
              <p>{candidate.achievements[0]}</p>
            </div>
            <button
              className="ed-button outline"
              onClick={() => {
                onSelectCandidate(candidate);
                onClose();
              }}
            >
              Open dossier <ArrowUpRight size={15} />
            </button>
          </article>
        ))}
      </div>
    </EditorialDialog>
  );
}
