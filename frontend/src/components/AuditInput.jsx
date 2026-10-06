import React from 'react';
import { Search, Cpu, Database, Sparkles, CheckCircle2 } from 'lucide-react';

export default function AuditInput({
  inputUrl,
  setInputUrl,
  handleAudit,
  isAuditing,
  auditStep,
  steps
}) {
  return (
    <section className="bg-gradient-to-b from-[#121824] to-[#0E1420] border border-slate-800 rounded-2xl p-6 shadow-xl">
      <div className="max-w-3xl mx-auto flex flex-col gap-3 text-center mb-6">
        <div className="inline-flex items-center justify-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold w-fit mx-auto">
          <Database className="w-3.5 h-3.5" />
          Powered by Open-Source Redrob Challenge & Live GitHub API
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-white">
          Screen Real Code. <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">Catch Honeypots & Fakes.</span>
        </h1>
        <p className="text-xs md:text-sm text-slate-400 leading-relaxed">
          Audit candidates from the <strong>Redrob AI Challenge</strong> or enter any live GitHub repo (e.g. <code className="text-cyan-300 bg-slate-900/80 px-1.5 py-0.5 rounded">pallets/flask</code> or <code className="text-cyan-300 bg-slate-900/80 px-1.5 py-0.5 rounded">expressjs/express</code>) for instant 5-pillar Anti-Cheat forensics.
        </p>
      </div>

      <form onSubmit={handleAudit} className="max-w-2xl mx-auto flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-5 h-5 text-slate-500 absolute left-3 top-3.5" />
          <input 
            type="text"
            placeholder="Enter GitHub Repo (e.g. pallets/flask) or Redrob ID (e.g. CAND_0039754)..."
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            disabled={isAuditing}
            className="w-full bg-[#090D14] border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition font-mono"
          />
        </div>
        <button 
          type="submit"
          disabled={isAuditing || !inputUrl}
          className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold px-6 py-3 rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 disabled:opacity-50 transition shrink-0 cursor-pointer"
        >
          <Cpu className="w-4 h-4" />
          {isAuditing ? "Auditing Ground Truth..." : "SIFT Candidate"}
        </button>
      </form>

      {/* Quick Example Chips */}
      <div className="max-w-2xl mx-auto mt-3 flex flex-wrap items-center justify-center gap-2 text-[11px] text-slate-400">
        <span className="text-slate-500">Quick Try:</span>
        <button
          type="button"
          onClick={() => setInputUrl('pallets/flask')}
          className="hover:text-cyan-300 hover:border-cyan-500/40 border border-slate-800 bg-[#0A0E17] px-2 py-0.5 rounded text-slate-400 transition font-mono"
        >
          pallets/flask
        </button>
        <button
          type="button"
          onClick={() => setInputUrl('expressjs/express')}
          className="hover:text-cyan-300 hover:border-cyan-500/40 border border-slate-800 bg-[#0A0E17] px-2 py-0.5 rounded text-slate-400 transition font-mono"
        >
          expressjs/express
        </button>
        <button
          type="button"
          onClick={() => setInputUrl('CAND_0039754')}
          className="hover:text-cyan-300 hover:border-cyan-500/40 border border-slate-800 bg-[#0A0E17] px-2 py-0.5 rounded text-slate-400 transition font-mono"
        >
          CAND_0039754 (Clean)
        </button>
        <button
          type="button"
          onClick={() => setInputUrl('CAND_0010943')}
          className="hover:text-rose-300 hover:border-rose-500/40 border border-slate-800 bg-[#0A0E17] px-2 py-0.5 rounded text-slate-400 transition font-mono"
        >
          CAND_0010943 (Decoy)
        </button>
      </div>

      {/* Animated 4-Agent Stepper when running */}
      {isAuditing && steps && (
        <div className="max-w-2xl mx-auto mt-6 bg-[#090D14] border border-cyan-500/30 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-semibold text-cyan-400 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 animate-spin" />
              {steps[auditStep]?.title || 'Auditing...'}
            </span>
            <span className="text-slate-500">Step {auditStep + 1} of {steps.length}</span>
          </div>
          <p className="text-xs text-slate-300">{steps[auditStep]?.desc}</p>
          
          {/* Progress bar */}
          <div className="w-full bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full transition-all duration-500 rounded-full" 
              style={{ width: `${((auditStep + 1) / steps.length) * 100}%` }}
            />
          </div>

          {/* Stepper pills */}
          <div className="grid grid-cols-4 gap-2 mt-4">
            {steps.map((st, idx) => (
              <div 
                key={idx}
                className={`p-2 rounded-lg text-[10px] border transition ${
                  idx === auditStep 
                    ? 'border-cyan-500/50 bg-cyan-950/30 text-cyan-200' 
                    : idx < auditStep 
                    ? 'border-emerald-500/30 bg-emerald-950/20 text-emerald-400' 
                    : 'border-slate-800/80 bg-slate-900/40 text-slate-600'
                }`}
              >
                <div className="font-bold flex items-center gap-1">
                  {idx < auditStep ? (
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <span>#{idx + 1}</span>
                  )}
                  <span className="truncate">{st.title.split(':')[0]}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
