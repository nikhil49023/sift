import React, { useState } from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  XCircle, 
  Search, 
  GitBranch, 
  FileCode2, 
  CheckCircle2, 
  Terminal, 
  Cpu, 
  Scale, 
  ExternalLink,
  ChevronRight,
  Filter,
  Download,
  Users,
  Clock,
  Sparkles
} from 'lucide-react';
import { 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  ResponsiveContainer 
} from 'recharts';
import { mockCandidates } from './data/mockCandidates';

export default function App() {
  const [candidates, setCandidates] = useState(mockCandidates);
  const [selectedCandidate, setSelectedCandidate] = useState(mockCandidates[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [isAuditing, setIsAuditing] = useState(false);
  const [inputUrl, setInputUrl] = useState('');
  const [auditStep, setAuditStep] = useState(0);

  const steps = [
    { title: "Agent 1: Ingestion Scout", desc: "Fetching GitHub commits, AST & diffs..." },
    { title: "Agent 2: Anti-Cheat Forensics", desc: "Running 5-pillar fraud & boilerplate checks..." },
    { title: "Agent 3: JEV Verification Judge", desc: "Evaluating code against 4-pillar rubric..." },
    { title: "Agent 4: Decision Synthesizer", desc: "Normalizing scores & building audit dossier..." }
  ];

  const handleAudit = (e) => {
    e.preventDefault();
    if (!inputUrl) return;

    setIsAuditing(true);
    setAuditStep(0);

    const interval = setInterval(() => {
      setAuditStep((prev) => {
        if (prev >= 3) {
          clearInterval(interval);
          setIsAuditing(false);
          // Create new audited candidate
          const newCand = {
            id: `cand-${Date.now()}`,
            username: inputUrl.replace('https://github.com/', '').split('/')[0] || inputUrl,
            name: inputUrl.replace('https://github.com/', '').split('/')[0] || "Audit Candidate",
            avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
            repoName: inputUrl.split('/')[1] || "project-core",
            repoUrl: inputUrl.startsWith('http') ? inputUrl : `https://github.com/${inputUrl}`,
            overallScore: 88,
            percentile: "Top 8%",
            verdict: "STRONG ADVANCE",
            riskLevel: "CLEAN",
            summary: "Verified genuine multi-threaded architecture with clean commit cadence and robust test suite assertions.",
            metrics: {
              systemsRigor: 89,
              algorithmicDepth: 86,
              testingVerification: 90,
              collaborationHygiene: 87
            },
            antiCheat: {
              timelineStatus: "PASS",
              timelineDetail: "Commits evenly distributed over active development sprint.",
              diffVelocityStatus: "PASS",
              diffVelocityDetail: "Iterative commits with organic diff distribution.",
              contributorStatus: "PASS",
              contributorDetail: "Core authorship verified across 94% of business logic.",
              codeAuthenticityStatus: "PASS",
              codeAuthenticityDetail: "Bespoke algorithmic control flow. Zero template cloning.",
              plagiarismStatus: "PASS",
              plagiarismDetail: "Original codebase with zero upstream license stripping."
            },
            citations: [
              { file: "src/core/dispatcher.ts#L45", desc: "Bespoke asynchronous queue scheduler with backpressure handling." },
              { file: "tests/dispatcher.test.ts#L18", desc: "100% test coverage on concurrency race condition edges." }
            ],
            primaryLanguages: ["TypeScript", "Go"],
            totalCommits: 28,
            codeVolume: "3,480 LOC"
          };
          setCandidates([newCand, ...candidates]);
          setSelectedCandidate(newCand);
          setInputUrl('');
          return 0;
        }
        return prev + 1;
      });
    }, 900);
  };

  const filteredCandidates = candidates.filter(cand => {
    const matchesSearch = cand.username.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          cand.repoName.toLowerCase().includes(searchQuery.toLowerCase());
    if (activeFilter === 'CLEAN') return matchesSearch && cand.riskLevel === 'CLEAN';
    if (activeFilter === 'SUSPICIOUS') return matchesSearch && cand.riskLevel === 'SUSPICIOUS';
    if (activeFilter === 'RED FLAG') return matchesSearch && cand.riskLevel === 'RED FLAG';
    return matchesSearch;
  });

  const radarData = [
    { subject: 'Systems Rigor', score: selectedCandidate.metrics.systemsRigor, fullMark: 100 },
    { subject: 'Algorithmic Depth', score: selectedCandidate.metrics.algorithmicDepth, fullMark: 100 },
    { subject: 'Testing & Verify', score: selectedCandidate.metrics.testingVerification, fullMark: 100 },
    { subject: 'Git Hygiene', score: selectedCandidate.metrics.collaborationHygiene, fullMark: 100 }
  ];

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
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
            <p className="text-xs text-slate-400">Autonomous Code Forensics & Anti-Cheat Jury</p>
          </div>
        </div>

        {/* Telemetry Stats */}
        <div className="hidden md:flex items-center gap-6 text-xs text-slate-400">
          <div>
            <span className="text-slate-500 block">AUDITED REPOS</span>
            <span className="font-bold text-slate-200 text-sm">{candidates.length} Candidate Repos</span>
          </div>
          <div className="h-6 w-px bg-slate-800" />
          <div>
            <span className="text-slate-500 block">CHEATING DETECTED</span>
            <span className="font-bold text-rose-400 text-sm">33.3% Flagged</span>
          </div>
          <div className="h-6 w-px bg-slate-800" />
          <div>
            <span className="text-slate-500 block">ENGINEERING VERDICT</span>
            <span className="font-bold text-emerald-400 text-sm">100% Unforgeable</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 flex flex-col gap-8">
        
        {/* Ingestion & Audit Form */}
        <section className="bg-gradient-to-b from-[#121824] to-[#0E1420] border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="max-w-3xl mx-auto flex flex-col gap-4 text-center mb-6">
            <h1 className="text-2xl md:text-3xl font-extrabold text-white">
              Screen Real Code. <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">Expose the Fakes.</span>
            </h1>
            <p className="text-sm text-slate-400">
              Input any GitHub username or repository URL. The 4-Agent JEV council inspects commit velocity, AST depth, hollow boilerplate, and uncredited templates in seconds.
            </p>
          </div>

          <form onSubmit={handleAudit} className="max-w-2xl mx-auto flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-5 h-5 text-slate-500 absolute left-3 top-3.5" />
              <input 
                type="text"
                placeholder="Enter GitHub Username or Repo URL (e.g. torvalds/linux or username)..."
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                disabled={isAuditing}
                className="w-full bg-[#090D14] border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
              />
            </div>
            <button 
              type="submit"
              disabled={isAuditing || !inputUrl}
              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold px-6 py-3 rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 disabled:opacity-50 transition"
            >
              <Cpu className="w-4 h-4" />
              {isAuditing ? "Auditing Pipeline..." : "SIFT Candidate"}
            </button>
          </form>

          {/* Animated Agent Stepper when running */}
          {isAuditing && (
            <div className="max-w-2xl mx-auto mt-6 bg-[#090D14] border border-cyan-500/30 rounded-xl p-4 animate-pulse">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-semibold text-cyan-400 flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5" />
                  {steps[auditStep].title}
                </span>
                <span className="text-slate-500">Step {auditStep + 1} of 4</span>
              </div>
              <p className="text-xs text-slate-300">{steps[auditStep].desc}</p>
              <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
                <div 
                  className="bg-cyan-500 h-full transition-all duration-500 rounded-full" 
                  style={{ width: `${((auditStep + 1) / 4) * 100}%` }}
                />
              </div>
            </div>
          )}
        </section>

        {/* Selected Candidate Detailed Dossier */}
        {selectedCandidate && (
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Column: Candidate Summary & Anti-Cheat Grid */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              
              {/* Profile Header Card */}
              <div className="bg-[#121824] border border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <img 
                    src={selectedCandidate.avatar} 
                    alt={selectedCandidate.name} 
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-slate-700"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold text-white">{selectedCandidate.name}</h2>
                      <span className="text-xs text-slate-400 font-mono">@{selectedCandidate.username}</span>
                    </div>
                    <a 
                      href={selectedCandidate.repoUrl} 
                      target="_blank" 
                      rel="noreferrer"
                      className="text-xs text-cyan-400 hover:underline flex items-center gap-1 mt-1 font-mono"
                    >
                      <GitBranch className="w-3.5 h-3.5" />
                      {selectedCandidate.repoName}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-2">
                      <span>{selectedCandidate.codeVolume}</span>
                      <span>•</span>
                      <span>{selectedCandidate.totalCommits} Commits</span>
                      <span>•</span>
                      <span>{selectedCandidate.primaryLanguages.join(', ')}</span>
                    </div>
                  </div>
                </div>

                {/* Score & Verdict Badge */}
                <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto border-t sm:border-t-0 pt-4 sm:pt-0 border-slate-800">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-white">{selectedCandidate.overallScore}</span>
                    <span className="text-xs text-slate-500 font-semibold">/100</span>
                  </div>
                  <div className="text-xs font-semibold text-slate-400 mb-2">Percentile: {selectedCandidate.percentile}</div>
                  
                  {selectedCandidate.riskLevel === 'CLEAN' && (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5" /> VERIFIED AUTHENTIC
                    </span>
                  )}
                  {selectedCandidate.riskLevel === 'SUSPICIOUS' && (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" /> SUSPICIOUS REPO
                    </span>
                  )}
                  {selectedCandidate.riskLevel === 'RED FLAG' && (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30 flex items-center gap-1.5">
                      <XCircle className="w-3.5 h-3.5" /> HOLLOW / RED FLAG
                    </span>
                  )}
                </div>
              </div>

              {/* 5-Pillar Anti-Cheat Forensics Suite Card */}
              <div className="bg-[#121824] border border-slate-800 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-base text-white flex items-center gap-2">
                    <Scale className="w-4 h-4 text-cyan-400" />
                    5-Pillar Anti-Cheat Forensics Audit
                  </h3>
                  <span className="text-xs text-slate-400 font-mono">Automated AST & Git Blame Verification</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  
                  {/* Check 1 */}
                  <div className="bg-[#0D121D] border border-slate-800 p-3 rounded-xl flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-300">1. Timeline & Sprint Window</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${selectedCandidate.antiCheat.timelineStatus === 'PASS' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                        {selectedCandidate.antiCheat.timelineStatus}
                      </span>
                    </div>
                    <p className="text-slate-400 text-[11px] leading-relaxed">{selectedCandidate.antiCheat.timelineDetail}</p>
                  </div>

                  {/* Check 2 */}
                  <div className="bg-[#0D121D] border border-slate-800 p-3 rounded-xl flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-300">2. Diff Velocity & Zip-Drop</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${selectedCandidate.antiCheat.diffVelocityStatus === 'PASS' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                        {selectedCandidate.antiCheat.diffVelocityStatus}
                      </span>
                    </div>
                    <p className="text-slate-400 text-[11px] leading-relaxed">{selectedCandidate.antiCheat.diffVelocityDetail}</p>
                  </div>

                  {/* Check 3 */}
                  <div className="bg-[#0D121D] border border-slate-800 p-3 rounded-xl flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-300">3. Passenger / Ghost Filter</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${selectedCandidate.antiCheat.contributorStatus === 'PASS' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                        {selectedCandidate.antiCheat.contributorStatus}
                      </span>
                    </div>
                    <p className="text-slate-400 text-[11px] leading-relaxed">{selectedCandidate.antiCheat.contributorDetail}</p>
                  </div>

                  {/* Check 4 */}
                  <div className="bg-[#0D121D] border border-slate-800 p-3 rounded-xl flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-300">4. Hollow AI-Slop & Mock Stubs</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${selectedCandidate.antiCheat.codeAuthenticityStatus === 'PASS' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                        {selectedCandidate.antiCheat.codeAuthenticityStatus}
                      </span>
                    </div>
                    <p className="text-slate-400 text-[11px] leading-relaxed">{selectedCandidate.antiCheat.codeAuthenticityDetail}</p>
                  </div>

                  {/* Check 5 */}
                  <div className="bg-[#0D121D] border border-slate-800 p-3 rounded-xl md:col-span-2 flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-300">5. Plagiarism & Upstream License Stripping</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${selectedCandidate.antiCheat.plagiarismStatus === 'PASS' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                        {selectedCandidate.antiCheat.plagiarismStatus}
                      </span>
                    </div>
                    <p className="text-slate-400 text-[11px] leading-relaxed">{selectedCandidate.antiCheat.plagiarismDetail}</p>
                  </div>
                </div>
              </div>

              {/* Verified Code Citations Card */}
              <div className="bg-[#121824] border border-slate-800 rounded-2xl p-6">
                <h3 className="font-bold text-base text-white mb-3 flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-cyan-400" />
                  Verified Code Citations (Ground Truth)
                </h3>
                <div className="flex flex-col gap-2.5">
                  {selectedCandidate.citations.map((cite, i) => (
                    <div key={i} className="bg-[#090D14] border border-slate-800 rounded-xl p-3 flex items-start gap-3 text-xs">
                      <FileCode2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-mono text-cyan-300 font-semibold block">{cite.file}</span>
                        <p className="text-slate-400 mt-0.5">{cite.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Right Column: JEV Radar Chart & Decision Verdict */}
            <div className="flex flex-col gap-6">
              
              {/* Radar Chart Card */}
              <div className="bg-[#121824] border border-slate-800 rounded-2xl p-6 flex flex-col items-center">
                <h3 className="font-bold text-base text-white self-start mb-2">JEV Dimensional Radar</h3>
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
                    <span className="font-bold text-white text-sm">{selectedCandidate.metrics.systemsRigor} / 100</span>
                  </div>
                  <div className="bg-[#0D121D] p-2.5 rounded-xl border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">ALGORITHMIC DEPTH</span>
                    <span className="font-bold text-white text-sm">{selectedCandidate.metrics.algorithmicDepth} / 100</span>
                  </div>
                  <div className="bg-[#0D121D] p-2.5 rounded-xl border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">TESTING & VERIFY</span>
                    <span className="font-bold text-white text-sm">{selectedCandidate.metrics.testingVerification} / 100</span>
                  </div>
                  <div className="bg-[#0D121D] p-2.5 rounded-xl border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">GIT HYGIENE</span>
                    <span className="font-bold text-white text-sm">{selectedCandidate.metrics.collaborationHygiene} / 100</span>
                  </div>
                </div>
              </div>

              {/* JEV Executive Decision Card */}
              <div className="bg-[#121824] border border-slate-800 rounded-2xl p-6 flex flex-col gap-4">
                <h3 className="font-bold text-base text-white">JEV Council Verdict</h3>
                <p className="text-xs text-slate-300 leading-relaxed bg-[#0D121D] p-3 rounded-xl border border-slate-800">
                  {selectedCandidate.summary}
                </p>

                <button 
                  onClick={() => alert(`Exporting verified PDF audit dossier for @${selectedCandidate.username}...`)}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition"
                >
                  <Download className="w-4 h-4 text-cyan-400" />
                  Download Verified Jury Dossier (PDF)
                </button>
              </div>

            </div>
          </section>
        )}

        {/* Candidate Leaderboard Table */}
        <section className="bg-[#121824] border border-slate-800 rounded-2xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-cyan-400" />
                Audited Candidate Leaderboard
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Click any candidate to inspect their forensic audit breakdown</p>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2 bg-[#090D14] p-1 rounded-xl border border-slate-800 text-xs">
              {['ALL', 'CLEAN', 'SUSPICIOUS', 'RED FLAG'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveFilter(tab)}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition ${activeFilter === tab ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 pb-3">
                  <th className="pb-3 font-semibold">CANDIDATE</th>
                  <th className="pb-3 font-semibold">REPOSITORY</th>
                  <th className="pb-3 font-semibold">SIFT SCORE</th>
                  <th className="pb-3 font-semibold">VERDICT</th>
                  <th className="pb-3 font-semibold">ANTI-CHEAT RISK</th>
                  <th className="pb-3 font-semibold text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredCandidates.map(cand => (
                  <tr 
                    key={cand.id} 
                    onClick={() => setSelectedCandidate(cand)}
                    className={`hover:bg-slate-800/40 cursor-pointer transition ${selectedCandidate?.id === cand.id ? 'bg-cyan-950/20' : ''}`}
                  >
                    <td className="py-4 pr-4">
                      <div className="flex items-center gap-3">
                        <img src={cand.avatar} alt={cand.name} className="w-9 h-9 rounded-xl object-cover border border-slate-700" />
                        <div>
                          <span className="font-bold text-slate-200 block">{cand.name}</span>
                          <span className="text-[11px] text-slate-500 font-mono">@{cand.username}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 pr-4 font-mono text-slate-300">
                      {cand.repoName}
                    </td>
                    <td className="py-4 pr-4">
                      <span className="font-extrabold text-sm text-white">{cand.overallScore}</span>
                      <span className="text-[10px] text-slate-500 ml-1">({cand.percentile})</span>
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
                          <XCircle className="w-3 h-3" /> RED FLAG
                        </span>
                      )}
                    </td>
                    <td className="py-4 text-right">
                      <span className="text-cyan-400 hover:text-cyan-300 font-semibold inline-flex items-center gap-1">
                        Inspect <ChevronRight className="w-3 h-3" />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-4 px-6 text-center text-xs text-slate-500 bg-[#090D14]">
        SIFT Decision Intelligence Engine • Hackathon Jury & Recruiter Forensic Council • Engineered by The SIFT Core Team
      </footer>
    </div>
  );
}
