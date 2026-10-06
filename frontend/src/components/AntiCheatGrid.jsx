import React from 'react';
import { Scale, Clock, Activity, UserX, Cpu, FileWarning, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

export default function AntiCheatGrid({ antiCheat }) {
  if (!antiCheat) return null;

  const getStatusBadge = (status) => {
    if (status === 'PASS') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" /> PASS
        </span>
      );
    }
    if (status === 'WARN') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" /> WARN
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center gap-1">
        <XCircle className="w-3 h-3" /> FAIL
      </span>
    );
  };

  const pillars = [
    {
      id: 1,
      title: "1. Timeline & Sprint Window",
      icon: Clock,
      status: antiCheat.timelineStatus,
      detail: antiCheat.timelineDetail,
      tooltip: "Detects pre-built repositories, backdated commit timestamps, and sprint-window anomalies."
    },
    {
      id: 2,
      title: "2. Diff Velocity & Zip-Drop",
      icon: Activity,
      status: antiCheat.diffVelocityStatus,
      detail: antiCheat.diffVelocityDetail,
      tooltip: "Identifies instant thousands-LOC starter kit dumps vs organic iterative git commits."
    },
    {
      id: 3,
      title: "3. Passenger / Ghost Filter",
      icon: UserX,
      status: antiCheat.contributorStatus,
      detail: antiCheat.contributorDetail,
      tooltip: "Filters token contributors using per-author git churn, line attribution, and AST blame."
    },
    {
      id: 4,
      title: "4. Hollow AI-Slop & Mock Stubs",
      icon: Cpu,
      status: antiCheat.codeAuthenticityStatus,
      detail: antiCheat.codeAuthenticityDetail,
      tooltip: "Flags empty function bodies, dummy mock returns, and high boilerplate-to-logic ratios."
    },
    {
      id: 5,
      title: "5. Plagiarism & Upstream License Stripping",
      icon: FileWarning,
      status: antiCheat.plagiarismStatus,
      detail: antiCheat.plagiarismDetail,
      fullWidth: true,
      tooltip: "Checks upstream open-source fingerprinting and MIT/Apache license stripping fraud."
    }
  ];

  return (
    <div className="bg-[#121824] border border-slate-800 rounded-2xl p-6 shadow-md">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="font-bold text-base text-white flex items-center gap-2">
          <Scale className="w-4 h-4 text-cyan-400" />
          5-Pillar Anti-Cheat Forensics Audit
        </h3>
        <span className="text-xs text-slate-400 font-mono bg-slate-900/60 px-2.5 py-1 rounded-md border border-slate-800">
          AST & Git Telemetry Integrity
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        {pillars.map((pillar) => {
          const Icon = pillar.icon;
          return (
            <div
              key={pillar.id}
              className={`bg-[#0D121D] border border-slate-800 p-3.5 rounded-xl flex flex-col gap-2 transition hover:border-slate-700 ${
                pillar.fullWidth ? 'md:col-span-2' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span className="font-semibold text-slate-200">{pillar.title}</span>
                </div>
                {getStatusBadge(pillar.status)}
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                {pillar.detail}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
