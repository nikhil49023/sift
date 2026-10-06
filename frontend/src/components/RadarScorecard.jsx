import React from 'react';
import { 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  ResponsiveContainer 
} from 'recharts';
import { Download, ShieldCheck, Award } from 'lucide-react';

export default function RadarScorecard({ candidate, onExportDossier }) {
  if (!candidate || !candidate.metrics) return null;

  const radarData = [
    { subject: 'Systems Rigor', score: candidate.metrics.systemsRigor ?? 0, fullMark: 100 },
    { subject: 'Algorithmic Depth', score: candidate.metrics.algorithmicDepth ?? 0, fullMark: 100 },
    { subject: 'Testing & Verify', score: candidate.metrics.testingVerification ?? 0, fullMark: 100 },
    { subject: 'Git Hygiene', score: candidate.metrics.collaborationHygiene ?? 0, fullMark: 100 }
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Radar Chart Card */}
      <div className="bg-[#121824] border border-slate-800 rounded-2xl p-6 flex flex-col items-center shadow-md">
        <div className="self-start w-full flex items-center justify-between mb-1">
          <h3 className="font-bold text-base text-white flex items-center gap-2">
            <Award className="w-4 h-4 text-cyan-400" />
            JEV Dimensional Radar
          </h3>
          <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/20">
            JEV-4 RUBRIC
          </span>
        </div>
        <p className="text-xs text-slate-400 self-start mb-4">4-Pillar Evaluation Matrix</p>
        
        <div className="w-full h-64">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
              <PolarGrid stroke="#243044" />
              <PolarAngleAxis dataKey="subject" stroke="#94A3B8" tick={{ fontSize: 10 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#334155" />
              <Radar 
                name="Candidate" 
                dataKey="score" 
                stroke="#06B6D4" 
                fill="#06B6D4" 
                fillOpacity={0.4} 
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Score Breakdown List */}
        <div className="w-full grid grid-cols-2 gap-2 mt-4 text-xs">
          <div className="bg-[#0D121D] p-2.5 rounded-xl border border-slate-800">
            <span className="text-slate-500 block text-[10px]">SYSTEMS RIGOR</span>
            <span className="font-bold text-white text-sm">{candidate.metrics.systemsRigor} / 100</span>
          </div>
          <div className="bg-[#0D121D] p-2.5 rounded-xl border border-slate-800">
            <span className="text-slate-500 block text-[10px]">ALGORITHMIC DEPTH</span>
            <span className="font-bold text-white text-sm">{candidate.metrics.algorithmicDepth} / 100</span>
          </div>
          <div className="bg-[#0D121D] p-2.5 rounded-xl border border-slate-800">
            <span className="text-slate-500 block text-[10px]">TESTING & VERIFY</span>
            <span className="font-bold text-white text-sm">{candidate.metrics.testingVerification} / 100</span>
          </div>
          <div className="bg-[#0D121D] p-2.5 rounded-xl border border-slate-800">
            <span className="text-slate-500 block text-[10px]">GIT HYGIENE</span>
            <span className="font-bold text-white text-sm">{candidate.metrics.collaborationHygiene} / 100</span>
          </div>
        </div>
      </div>

      {/* JEV Executive Decision Card */}
      <div className="bg-[#121824] border border-slate-800 rounded-2xl p-6 flex flex-col gap-4 shadow-md">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-base text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            JEV Council Verdict
          </h3>
          <span className="text-xs font-bold text-cyan-300 font-mono">
            {candidate.verdict}
          </span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed bg-[#0D121D] p-3 rounded-xl border border-slate-800">
          {candidate.summary}
        </p>

        <button 
          onClick={() => onExportDossier ? onExportDossier(candidate) : alert(`Exporting verified PDF audit dossier for ${candidate.name}...`)}
          className="w-full bg-gradient-to-r from-slate-800 to-slate-700 hover:from-cyan-900/60 hover:to-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition cursor-pointer shadow-sm"
        >
          <Download className="w-4 h-4 text-cyan-400" />
          Download Verified Jury Dossier (PDF)
        </button>
      </div>
    </div>
  );
}
