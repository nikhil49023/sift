import React from 'react';
import { GitBranch, ExternalLink, ShieldCheck, AlertTriangle, XCircle } from 'lucide-react';

export default function CandidateProfileCard({ candidate }) {
  if (!candidate) return null;

  return (
    <div className="bg-[#121824] border border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <img 
          src={candidate.avatar} 
          alt={candidate.name} 
          className="w-16 h-16 rounded-2xl object-cover border-2 border-slate-700 shadow-md"
        />
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-bold text-white">{candidate.name}</h2>
            <span className="text-xs text-slate-400 font-mono">@{candidate.username}</span>
          </div>
          <div className="text-[11px] text-cyan-400 font-medium mt-0.5">
            {candidate.source}
          </div>
          <a 
            href={candidate.repoUrl} 
            target="_blank" 
            rel="noreferrer"
            className="text-xs text-slate-300 hover:text-cyan-400 flex items-center gap-1 mt-1 font-mono transition"
          >
            <GitBranch className="w-3.5 h-3.5" />
            {candidate.repoName}
            <ExternalLink className="w-3 h-3" />
          </a>
          <div className="flex items-center gap-3 text-xs text-slate-400 mt-2 flex-wrap">
            <span className="bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800">{candidate.codeVolume}</span>
            <span>•</span>
            <span className="bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800">{candidate.totalCommits} Commits</span>
            <span>•</span>
            <span className="text-slate-300">{candidate.primaryLanguages?.join(', ') || 'N/A'}</span>
          </div>
        </div>
      </div>

      {/* Score & Verdict Badge */}
      <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto border-t sm:border-t-0 pt-4 sm:pt-0 border-slate-800">
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-black text-white">{candidate.overallScore}</span>
          <span className="text-xs text-slate-500 font-semibold">/100</span>
        </div>
        <div className="text-xs font-semibold text-slate-400 mb-2">Percentile: {candidate.percentile}</div>
        
        {candidate.riskLevel === 'CLEAN' && (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 shadow-sm shadow-emerald-500/10">
            <ShieldCheck className="w-3.5 h-3.5" /> VERIFIED AUTHENTIC
          </span>
        )}
        {candidate.riskLevel === 'SUSPICIOUS' && (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1.5 shadow-sm shadow-amber-500/10">
            <AlertTriangle className="w-3.5 h-3.5" /> SUSPICIOUS REPO
          </span>
        )}
        {candidate.riskLevel === 'RED FLAG' && (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30 flex items-center gap-1.5 shadow-sm shadow-rose-500/10">
            <XCircle className="w-3.5 h-3.5" /> HONEYPOT / RED FLAG
          </span>
        )}
      </div>
    </div>
  );
}
