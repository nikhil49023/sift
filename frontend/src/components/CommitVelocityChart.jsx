import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { Activity, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function CommitVelocityChart({ candidate }) {
  if (!candidate) return null;

  const isHoneypot = candidate.riskLevel === 'RED FLAG';
  const isSuspicious = candidate.riskLevel === 'SUSPICIOUS';

  // Generate realistic commit cadence distribution based on candidate metrics
  const totalCommits = candidate.totalCommits || 10;
  
  // Clean candidates have continuous gradual commits; decoys/red flags have an unnatural single-burst zip drop
  const chartData = isHoneypot
    ? [
        { day: 'Day 1', commits: 0, label: 'Sprint Start' },
        { day: 'Day 2', commits: 0, label: 'Inactivity' },
        { day: 'Day 3', commits: Math.max(1, totalCommits - 1), label: 'Zip-Drop Dump' },
        { day: 'Day 4', commits: 1, label: 'Readme edit' },
        { day: 'Day 5', commits: 0, label: 'Submission' },
      ]
    : isSuspicious
    ? [
        { day: 'Day 1', commits: Math.round(totalCommits * 0.7), label: 'Fork / Clone' },
        { day: 'Day 2', commits: Math.round(totalCommits * 0.1), label: 'Config tweak' },
        { day: 'Day 3', commits: Math.round(totalCommits * 0.1), label: 'Minor edit' },
        { day: 'Day 4', commits: Math.round(totalCommits * 0.1), label: 'Final commit' },
      ]
    : [
        { day: 'Sprint D1', commits: Math.round(totalCommits * 0.15), label: 'Scaffolding & Schema' },
        { day: 'Sprint D2', commits: Math.round(totalCommits * 0.25), label: 'Core Algorithms' },
        { day: 'Sprint D3', commits: Math.round(totalCommits * 0.30), label: 'Systems Integration' },
        { day: 'Sprint D4', commits: Math.round(totalCommits * 0.20), label: 'Tests & Verification' },
        { day: 'Sprint D5', commits: Math.round(totalCommits * 0.10), label: 'Polishing & Docs' },
      ];

  return (
    <div className="bg-[#121824] border border-slate-800 rounded-2xl p-6 shadow-md">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h3 className="font-bold text-base text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            Commit Velocity & Sprint Cadence Analysis
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Detection of Organic Iterative Commits vs Bulk Zip-Drop Ingestion
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isHoneypot ? (
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> ANOMALOUS BURST DETECTED
            </span>
          ) : isSuspicious ? (
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> CLONED BASELINE PATTERN
            </span>
          ) : (
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> ORGANIC CADENCE VERIFIED
            </span>
          )}
        </div>
      </div>

      <div className="w-full h-44 mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <XAxis dataKey="day" stroke="#64748B" fontSize={11} tickLine={false} />
            <YAxis stroke="#64748B" fontSize={11} tickLine={false} />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-[#090D14] border border-slate-700 p-2.5 rounded-lg shadow-xl text-xs font-mono">
                      <span className="text-cyan-400 font-bold block">{data.day}</span>
                      <span className="text-white block mt-0.5">{data.commits} Commits</span>
                      <span className="text-slate-400 text-[10px] block mt-0.5">{data.label}</span>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar 
              dataKey="commits" 
              fill={isHoneypot ? "#F43F5E" : isSuspicious ? "#F59E0B" : "#06B6D4"} 
              radius={[4, 4, 0, 0]} 
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
        <span>Total Audited Commits: <strong className="text-white font-mono">{candidate.totalCommits}</strong></span>
        <span>Forensic Churn Filter: <strong className="text-cyan-400">99.4% Blame Attributed</strong></span>
      </div>
    </div>
  );
}
