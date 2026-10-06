import React from "react";
const names = {
  systemsRigor: "Systems",
  algorithmicDepth: "Logic",
  testingVerification: "Testing",
  collaborationHygiene: "Collaboration",
  summary: "Summary",
  roleFit: "Role fit",
};
export default function DecisionReview({ verification }) {
  if (!verification)
    return (
      <p className="text-xs text-slate-500 mt-3">
        Decision-model review was not recorded for this audit.
      </p>
    );
  if (verification.status === "disabled")
    return (
      <p className="text-xs text-slate-400 mt-3">
        Groq assessment · citations checked. TypeSafe Jev review was not
        requested.
      </p>
    );
  return (
    <div className="border-t border-slate-800 mt-4 pt-3">
      <h3 className="text-sm font-semibold">TypeSafe Jev evidence review</h3>
      <p className="text-xs text-slate-400 mt-1">
        {verification.status.replaceAll("_", " ")}
        {verification.model ? ` · ${verification.model}` : ""}
      </p>
      {verification.reason && (
        <p className="text-xs text-amber-200/80 mt-2">{verification.reason}</p>
      )}
      {Object.keys(verification.checks || {}).length > 0 && (
        <>
          <p className="text-xs text-slate-500 mt-2">
            Model support probabilities · provisional threshold{" "}
            {Math.round(verification.threshold * 100)}%. These are model
            estimates; your review remains the final decision.
          </p>
          <dl className="space-y-1 mt-2 text-xs">
            {Object.entries(verification.checks).map(([key, probability]) => {
              const [name, kind] = key.split("_");
              return (
                <div key={key} className="flex justify-between gap-3">
                  <dt className="text-slate-400">
                    {names[name] || name}{" "}
                    {kind === "anchor" ? "anchor" : "support"}
                  </dt>
                  <dd>{(probability * 100).toFixed(1)}%</dd>
                </div>
              );
            })}
          </dl>
        </>
      )}
    </div>
  );
}
