import React, { useState } from 'react';
import { Users, CheckCircle2, AlertTriangle, XCircle, ChevronRight, Search, Download, ArrowUpDown } from 'lucide-react';

export default function Leaderboard({
  candidates,
  filteredCandidates,
  selectedCandidate,
  setSelectedCandidate,
  activeFilter,
  setActiveFilter,
  searchQuery,
  setSearchQuery
}) {
  const [sortBy, setSortBy] = useState('score-desc');

  const filterCounts = {
    ALL: candidates.length,
    CLEAN: candidates.filter(c => c.riskLevel === 'CLEAN').length,
    SUSPICIOUS: candidates.filter(c => c.riskLevel === 'SUSPICIOUS').length,
    'RED FLAG': candidates.filter(c => c.riskLevel === 'RED FLAG').length,
  };

  // Sort candidates
  const sortedCandidates = [...filteredCandidates].sort((a, b) => {
    if (sortBy === 'score-desc') return (b.overallScore || 0) - (a.overallScore || 0);
    if (sortBy === 'score-asc') return (a.overallScore || 0) - (b.overallScore || 0);
    if (sortBy === 'commits-desc') return (b.totalCommits || 0) - (a.totalCommits || 0);
    if (sortBy === 'name-asc') return a.name.localeCompare(b.name);
    return 0;
  });

  const exportCSV = () => {
    const headers = ["ID", "Name", "Username", "Source", "SIFT_Score", "Percentile", "Verdict", "Risk_Level", "Total_Commits", "Code_Volume"];
    const rows = sortedCandidates.map(c => [
      `"${c.id}"`,
      `"${c.name.replace(/"/g, '""')}"`,
      `"${c.username}"`,
      `"${c.source}"`,
      c.overallScore,
      `"${c.percentile}"`,
      `"${c.verdict}"`,
      `"${c.riskLevel}"`,
      c.totalCommits,
      `"${c.codeVolume}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `sift_jury_leaderboard_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <section className="bg-[#121824] border border-slate-800 rounded-2xl p-6 shadow-md">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-cyan-400" />
            Audited Candidate Leaderboard
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real Open-Source Profiles from Redrob AI Benchmark & Live GitHub API
          </p>
        </div>

        {/* Filter Tabs & Export */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Tabs */}
          <div className="flex items-center gap-1 bg-[#090D14] p-1 rounded-xl border border-slate-800 text-xs overflow-x-auto">
            {['ALL', 'CLEAN', 'SUSPICIOUS', 'RED FLAG'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveFilter(tab)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  activeFilter === tab 
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>{tab}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  activeFilter === tab ? 'bg-cyan-500/30 text-cyan-200' : 'bg-slate-800 text-slate-400'
                }`}>
                  {filterCounts[tab] ?? 0}
                </span>
              </button>
            ))}
          </div>

          {/* Export CSV */}
          <button
            onClick={exportCSV}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            title="Export ranked candidates as CSV"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Export</span> CSV
          </button>
        </div>
      </div>

      {/* Search and Sort Sub-bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4 bg-[#090D14] p-2.5 rounded-xl border border-slate-800">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by name, ID, repo, or skills..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto text-xs text-slate-400">
          <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-[11px] text-slate-500 hidden sm:inline">Sort:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-[#121824] border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-300 focus:outline-none cursor-pointer"
          >
            <option value="score-desc">Highest SIFT Score</option>
            <option value="score-asc">Lowest Score</option>
            <option value="commits-desc">Most Commits</option>
            <option value="name-asc">Candidate Name (A-Z)</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 pb-3">
              <th className="pb-3 font-semibold">CANDIDATE</th>
              <th className="pb-3 font-semibold">DATASET SOURCE</th>
              <th className="pb-3 font-semibold">SIFT SCORE</th>
              <th className="pb-3 font-semibold">VERDICT</th>
              <th className="pb-3 font-semibold">ANTI-CHEAT RISK</th>
              <th className="pb-3 font-semibold text-right">ACTION</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {sortedCandidates.length === 0 ? (
              <tr>
                <td colSpan="6" className="py-8 text-center text-slate-500">
                  No candidates match the current filter or search criteria.
                </td>
              </tr>
            ) : (
              sortedCandidates.map(cand => {
                const isSelected = selectedCandidate?.id === cand.id;
                return (
                  <tr 
                    key={cand.id} 
                    onClick={() => setSelectedCandidate(cand)}
                    className={`hover:bg-slate-800/40 cursor-pointer transition ${
                      isSelected ? 'bg-cyan-950/25 border-l-2 border-cyan-400' : ''
                    }`}
                  >
                    <td className="py-4 pr-4">
                      <div className="flex items-center gap-3">
                        <img 
                          src={cand.avatar} 
                          alt={cand.name} 
                          className="w-9 h-9 rounded-xl object-cover border border-slate-700 shrink-0" 
                        />
                        <div>
                          <span className="font-bold text-slate-200 block truncate max-w-[220px]">
                            {cand.name}
                          </span>
                          <span className="text-[11px] text-slate-500 font-mono">
                            ID: {cand.id}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 pr-4 text-slate-400">
                      <span className="inline-block max-w-[200px] truncate">
                        {cand.source}
                      </span>
                    </td>
                    <td className="py-4 pr-4">
                      <div className="flex items-baseline">
                        <span className="font-extrabold text-sm text-white">{cand.overallScore}</span>
                        <span className="text-[10px] text-slate-500 ml-1">({cand.percentile})</span>
                      </div>
                    </td>
                    <td className="py-4 pr-4">
                      <span className="font-semibold text-slate-200">{cand.verdict}</span>
                    </td>
                    <td className="py-4 pr-4">
                      {cand.riskLevel === 'CLEAN' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" /> CLEAN
                        </span>
                      )}
                      {cand.riskLevel === 'SUSPICIOUS' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <AlertTriangle className="w-3 h-3" /> SUSPICIOUS
                        </span>
                      )}
                      {cand.riskLevel === 'RED FLAG' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          <XCircle className="w-3 h-3" /> HONEYPOT
                        </span>
                      )}
                    </td>
                    <td className="py-4 text-right">
                      <button 
                        type="button"
                        className="text-cyan-400 hover:text-cyan-300 font-semibold inline-flex items-center gap-1 transition cursor-pointer"
                      >
                        Inspect <ChevronRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
