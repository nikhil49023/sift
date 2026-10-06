import React from 'react';
import { Award, CheckCircle2, Shield, Code, Cpu, GitCommit } from 'lucide-react';

export default function RubricMatrix({ metrics }) {
  if (!metrics) return null;

  const rubricPillars = [
    {
      title: "Systems Rigor (30% Weight)",
      score: metrics.systemsRigor,
      icon: Cpu,
      desc: "Architectural soundess, concurrency handling, error boundaries, memory safety, and boundary validation.",
      criteria: ["Non-blocking async pipelines", "Defensive validation schemas", "Production runtime reliability"]
    },
    {
      title: "Algorithmic Depth (25% Weight)",
      score: metrics.algorithmicDepth,
      icon: Code,
      desc: "Non-trivial computational logic, search & ranking algorithms, vector representations, and data structures.",
      criteria: ["High cyclomatic logic density", "Custom optimization routines", "Zero hollow mock returns"]
    },
    {
      title: "Testing & Verification (25% Weight)",
      score: metrics.testingVerification,
      icon: Shield,
      desc: "Automated test suites, end-to-end integration assertions, adversarial fuzz testing, and deterministic assertions.",
      criteria: ["Unit coverage on core path", "Mock-free integration tests", "Continuous regression gates"]
    },
    {
      title: "Git Hygiene & Attribution (20% Weight)",
      score: metrics.collaborationHygiene,
      icon: GitCommit,
      desc: "Conventional commit hygiene, atomicity of pull requests, granular diff velocity, and verified authorship.",
      criteria: ["Zero bulk zip-drop starter dumps", "Clear feature-oriented diffs", "100% individual blame attribution"]
    }
  ];

  return (
    <div className="bg-[#121824] border border-slate-800 rounded-2xl p-6 shadow-md">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="font-bold text-base text-white flex items-center gap-2">
          <Award className="w-4 h-4 text-cyan-400" />
          JEV-4 Multi-Dimensional Rubric Breakdown
        </h3>
        <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/30">
          MATHEMATICAL JEV EVALUATION
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        {rubricPillars.map((pillar, idx) => {
          const Icon = pillar.icon;
          return (
            <div key={idx} className="bg-[#0D121D] border border-slate-800 p-4 rounded-xl flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-cyan-400" />
                  <span className="font-semibold text-slate-200">{pillar.title}</span>
                </div>
                <span className="font-black text-cyan-300 text-sm">{pillar.score} <span className="text-[10px] text-slate-500 font-normal">/ 100</span></span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">{pillar.desc}</p>
              
              <div className="pt-2 border-t border-slate-800/80 flex flex-col gap-1">
                {pillar.criteria.map((c, cIdx) => (
                  <div key={cIdx} className="flex items-center gap-1.5 text-[10px] text-slate-400">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span>{c}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
