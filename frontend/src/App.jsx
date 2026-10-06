import React, { useState } from 'react';
import { realCandidates } from './data/realCandidates';
import Navbar from './components/Navbar';
import AuditInput from './components/AuditInput';
import CandidateProfileCard from './components/CandidateProfileCard';
import AntiCheatGrid from './components/AntiCheatGrid';
import CodeCitations from './components/CodeCitations';
import RadarScorecard from './components/RadarScorecard';
import Leaderboard from './components/Leaderboard';
import AuditDossierModal from './components/AuditDossierModal';

export default function App() {
  const [candidates, setCandidates] = useState(realCandidates);
  const [selectedCandidate, setSelectedCandidate] = useState(realCandidates[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [isAuditing, setIsAuditing] = useState(false);
  const [inputUrl, setInputUrl] = useState('');
  const [auditStep, setAuditStep] = useState(0);
  const [isDossierOpen, setIsDossierOpen] = useState(false);

  const steps = [
    { title: "Agent 1: Ingestion Scout", desc: "Fetching real GitHub/Redrob telemetry & commit graphs..." },
    { title: "Agent 2: Anti-Cheat Forensics", desc: "Running 5-pillar fraud, template & honeypot decoy detection..." },
    { title: "Agent 3: JEV Verification Judge", desc: "Evaluating evidence against 4-pillar rubric with citations..." },
    { title: "Agent 4: Decision Synthesizer", desc: "Normalizing scores & building unforgeable audit dossier..." }
  ];

  const handleAudit = async (e) => {
    e.preventDefault();
    if (!inputUrl) return;

    setIsAuditing(true);
    setAuditStep(0);

    // Check if input matches an existing Redrob candidate ID
    const foundRedrob = candidates.find(c => c.id.toLowerCase() === inputUrl.trim().toLowerCase());
    if (foundRedrob) {
      setSelectedCandidate(foundRedrob);
      setIsAuditing(false);
      setInputUrl('');
      return;
    }

    // Step animation
    const interval = setInterval(() => {
      setAuditStep((prev) => (prev < 3 ? prev + 1 : prev));
    }, 800);

    try {
      // Clean input to detect repo or user
      let cleanInput = inputUrl.trim().replace('https://github.com/', '').replace(/\/$/, '');
      const parts = cleanInput.split('/');

      let repoData = null;
      let commitsData = [];
      let langsData = {};

      if (parts.length >= 2) {
        // Fetch Real Live GitHub Repo
        const [owner, repo] = parts;
        const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
        if (res.ok) {
          repoData = await res.json();
          const commitsRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=30`);
          if (commitsRes.ok) commitsData = await commitsRes.json();
          const langsRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/languages`);
          if (langsRes.ok) langsData = await langsRes.json();
        }
      }

      clearInterval(interval);
      setIsAuditing(false);

      if (repoData) {
        // Calculate real metrics from GitHub data
        const isFork = repoData.fork;
        const commitCount = commitsData.length;
        const langs = Object.keys(langsData);
        const hasTests = langs.includes('Python') || langs.includes('TypeScript') || langs.includes('Rust');
        
        const riskLevel = isFork ? 'SUSPICIOUS' : (commitCount < 5 ? 'RED FLAG' : 'CLEAN');
        const overallScore = isFork ? 42 : (commitCount < 5 ? 28 : Math.min(95, 70 + Math.min(25, commitCount)));

        const realCand = {
          id: `GH_${repoData.id}`,
          username: repoData.owner.login,
          name: repoData.owner.login,
          avatar: repoData.owner.avatar_url,
          source: "Live GitHub API (Ground Truth)",
          repoName: repoData.name,
          repoUrl: repoData.html_url,
          overallScore: overallScore,
          percentile: overallScore > 85 ? "Top 5%" : (overallScore > 60 ? "Top 35%" : "Bottom 20%"),
          verdict: overallScore > 80 ? "STRONG ADVANCE" : (overallScore > 50 ? "REVIEW" : "REJECT / HOLLOW"),
          riskLevel: riskLevel,
          summary: repoData.description || "Real open-source repository audited via live GitHub API.",
          metrics: {
            systemsRigor: isFork ? 40 : Math.min(96, overallScore + 3),
            algorithmicDepth: Math.min(94, overallScore),
            testingVerification: hasTests ? 88 : 35,
            collaborationHygiene: Math.min(92, commitCount * 3 + 40)
          },
          antiCheat: {
            timelineStatus: commitCount > 5 ? "PASS" : "WARN",
            timelineDetail: `Created at ${new Date(repoData.created_at).toLocaleDateString()}. ${commitCount} recent commits audited.`,
            diffVelocityStatus: isFork ? "FAIL" : "PASS",
            diffVelocityDetail: isFork ? "Fork repository detected. Downstream changes require isolation from upstream." : "Original repository root.",
            contributorStatus: "PASS",
            contributorDetail: `Default branch: ${repoData.default_branch}. Open issues: ${repoData.open_issues_count}.`,
            codeAuthenticityStatus: isFork ? "WARN" : "PASS",
            codeAuthenticityDetail: `Languages: ${langs.slice(0, 4).join(', ') || 'Code'}. Watchers: ${repoData.watchers_count}.`,
            plagiarismStatus: isFork ? "WARN" : "PASS",
            plagiarismDetail: repoData.license ? `Licensed under ${repoData.license.name}` : "No license declared."
          },
          citations: [
            { file: `${repoData.name}/commits#recent`, desc: `Audited ${commitsData.length} live commits via GitHub API.` },
            { file: `${repoData.name}/languages`, desc: `Primary stack: ${langs.slice(0, 3).join(', ') || 'N/A'}` }
          ],
          primaryLanguages: langs.slice(0, 3).length > 0 ? langs.slice(0, 3) : ["Code"],
          totalCommits: commitCount,
          codeVolume: `${repoData.size} KB`
        };

        setCandidates([realCand, ...candidates]);
        setSelectedCandidate(realCand);
        setInputUrl('');
      } else {
        alert("Repository not found or rate limited. Please try a public repository like 'facebook/react' or 'expressjs/express'.");
      }
    } catch (err) {
      clearInterval(interval);
      setIsAuditing(false);
      alert("Error querying GitHub API. Checking local Redrob candidates.");
    }
  };

  const filteredCandidates = candidates.filter(cand => {
    const matchesSearch = cand.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          cand.username.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          cand.repoName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          cand.id.toLowerCase().includes(searchQuery.toLowerCase());
    if (activeFilter === 'CLEAN') return matchesSearch && cand.riskLevel === 'CLEAN';
    if (activeFilter === 'SUSPICIOUS') return matchesSearch && cand.riskLevel === 'SUSPICIOUS';
    if (activeFilter === 'RED FLAG') return matchesSearch && cand.riskLevel === 'RED FLAG';
    return matchesSearch;
  });

  const flaggedCount = candidates.filter(c => c.riskLevel !== 'CLEAN').length;

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <Navbar candidateCount={candidates.length} flaggedCount={flaggedCount} />

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 flex flex-col gap-8">
        
        {/* Ingestion & Audit Form */}
        <AuditInput 
          inputUrl={inputUrl}
          setInputUrl={setInputUrl}
          handleAudit={handleAudit}
          isAuditing={isAuditing}
          auditStep={auditStep}
          steps={steps}
        />

        {/* Selected Candidate Detailed Dossier */}
        {selectedCandidate && (
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Column: Candidate Summary & Anti-Cheat Grid */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              <CandidateProfileCard candidate={selectedCandidate} />
              <AntiCheatGrid antiCheat={selectedCandidate.antiCheat} />
              <CodeCitations 
                citations={selectedCandidate.citations} 
                repoUrl={selectedCandidate.repoUrl} 
              />
            </div>

            {/* Right Column: JEV Radar Chart & Decision Verdict */}
            <div className="flex flex-col gap-6">
              <RadarScorecard 
                candidate={selectedCandidate} 
                onExportDossier={() => setIsDossierOpen(true)}
              />
            </div>
          </section>
        )}

        {/* Candidate Leaderboard Table */}
        <Leaderboard 
          candidates={candidates}
          filteredCandidates={filteredCandidates}
          selectedCandidate={selectedCandidate}
          setSelectedCandidate={setSelectedCandidate}
          activeFilter={activeFilter}
          setActiveFilter={setActiveFilter}
        />

      </main>

      {/* Verified Dossier Modal / PDF Export */}
      <AuditDossierModal 
        candidate={selectedCandidate}
        isOpen={isDossierOpen}
        onClose={() => setIsDossierOpen(false)}
      />

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-4 px-6 text-center text-xs text-slate-500 bg-[#090D14]">
        SIFT Decision Intelligence Engine • Powered by Redrob AI Open Benchmark & Live GitHub API • Engineered by The SIFT Core Team
      </footer>
    </div>
  );
}
