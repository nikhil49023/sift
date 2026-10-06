import React from 'react';
import { Scale, Database, ShieldAlert, Users, BookOpen } from 'lucide-react';

export default function Navbar({ candidateCount = 0, flaggedCount = 0, onOpenJuryPlaybook }) {

  return (
    <header className="border-b border-slate-800 bg-[#0E131F]/90 backdrop-blur sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
          <Scale className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-xl tracking-wider text-white">SIFT</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              JEV Engine v1.0
            </span>
          </div>
          <p className="text-xs text-slate-400">Code forensics & evidence-backed review</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Telemetry Stats with Real Data Source Badge */}
        <div className="hidden lg:flex items-center gap-6 text-xs text-slate-400">
          <div className="flex items-center gap-2 bg-[#121824] px-3 py-1.5 rounded-xl border border-slate-800">
            <Database className="w-4 h-4 text-cyan-400" />
            <div>
              <span className="text-slate-500 block text-[10px]">EVIDENCE SOURCE</span>
              <span className="font-bold text-slate-200">Pinned GitHub snapshots</span>
            </div>
          </div>
          <div className="h-6 w-px bg-slate-800" />
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-500" />
            <div>
              <span className="text-slate-500 block text-[10px]">COHORT SUBMISSIONS</span>
              <span className="font-bold text-slate-200 text-sm">{candidateCount}</span>
            </div>
          </div>
          <div className="h-6 w-px bg-slate-800" />
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            <div>
              <span className="text-slate-500 block text-[10px]">ON THIS PAGE</span>
              <span className="font-bold text-amber-300 text-sm">{flaggedCount} require review</span>
            </div>
          </div>
        </div>

        {/* Jury Defense Playbook Button */}
        <button
          onClick={onOpenJuryPlaybook}
          className="bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 hover:text-cyan-300 border border-cyan-500/30 px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer shadow-sm shadow-cyan-500/10"
        >
          <BookOpen className="w-4 h-4" />
          <span className="hidden sm:inline">Review</span> Playbook
        </button>
      </div>
    </header>
  );
}
