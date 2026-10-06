import React from 'react';
import { X, Printer, ShieldCheck, AlertTriangle, XCircle, FileText, CheckCircle2 } from 'lucide-react';

export default function AuditDossierModal({ candidate, isOpen, onClose }) {
  if (!isOpen || !candidate) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-[#0E1420] border border-slate-700 w-full max-w-3xl max-h-[90vh] rounded-2xl flex flex-col shadow-2xl overflow-hidden print:border-none print:shadow-none print:max-h-none print:w-full print:bg-white print:text-black"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="border-b border-slate-800 p-5 flex items-center justify-between bg-[#121824] print:bg-transparent print:border-b-2 print:border-black">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 print:text-black">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white print:text-black">
                Official SIFT Forensic Jury Dossier
              </h2>
              <p className="text-xs text-slate-400 print:text-gray-600 font-mono">
                Verification ID: SIFT-AUDIT-{candidate.id}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 print:hidden">
            <button
              onClick={handlePrint}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition"
            >
              <Printer className="w-3.5 h-3.5" />
              Print / Save PDF
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto flex flex-col gap-6 text-xs text-slate-300 print:text-black">
          {/* Candidate Snapshot */}
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-4 flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <img 
                src={candidate.avatar} 
                alt={candidate.name} 
                className="w-14 h-14 rounded-xl object-cover border border-slate-700"
              />
              <div>
                <h3 className="text-lg font-bold text-white print:text-black">{candidate.name}</h3>
                <p className="text-slate-400 font-mono">@{candidate.username} • {candidate.source}</p>
                <p className="text-cyan-400 font-mono mt-0.5">{candidate.repoName}</p>
              </div>
            </div>

            <div className="text-right">
              <div className="text-2xl font-black text-white print:text-black">
                {candidate.overallScore} <span className="text-xs font-normal text-slate-500">/ 100</span>
              </div>
              <span className="text-xs font-semibold text-cyan-400 block">{candidate.percentile}</span>
              <span className="text-[11px] font-bold text-slate-300 block mt-0.5">{candidate.verdict}</span>
            </div>
          </div>

          {/* JEV Verdict Summary */}
          <div>
            <h4 className="font-bold text-slate-200 print:text-black mb-1.5 uppercase tracking-wider text-[11px]">
              JEV Council Executive Summary
            </h4>
            <div className="bg-[#090D14] border border-slate-800 p-3.5 rounded-xl text-slate-300 print:bg-gray-100 print:text-black leading-relaxed">
              {candidate.summary}
            </div>
          </div>

          {/* 4-Pillar Rubric Breakdown */}
          <div>
            <h4 className="font-bold text-slate-200 print:text-black mb-2 uppercase tracking-wider text-[11px]">
              JEV 4-Pillar Evaluation Rubric
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="bg-[#090D14] border border-slate-800 p-3 rounded-xl print:bg-gray-100 print:text-black">
                <span className="text-[10px] text-slate-500 block">SYSTEMS RIGOR</span>
                <span className="text-sm font-bold text-white print:text-black">{candidate.metrics?.systemsRigor}/100</span>
              </div>
              <div className="bg-[#090D14] border border-slate-800 p-3 rounded-xl print:bg-gray-100 print:text-black">
                <span className="text-[10px] text-slate-500 block">ALGORITHMIC DEPTH</span>
                <span className="text-sm font-bold text-white print:text-black">{candidate.metrics?.algorithmicDepth}/100</span>
              </div>
              <div className="bg-[#090D14] border border-slate-800 p-3 rounded-xl print:bg-gray-100 print:text-black">
                <span className="text-[10px] text-slate-500 block">TESTING & VERIFY</span>
                <span className="text-sm font-bold text-white print:text-black">{candidate.metrics?.testingVerification}/100</span>
              </div>
              <div className="bg-[#090D14] border border-slate-800 p-3 rounded-xl print:bg-gray-100 print:text-black">
                <span className="text-[10px] text-slate-500 block">GIT HYGIENE</span>
                <span className="text-sm font-bold text-white print:text-black">{candidate.metrics?.collaborationHygiene}/100</span>
              </div>
            </div>
          </div>

          {/* 5-Pillar Forensics Checks */}
          <div>
            <h4 className="font-bold text-slate-200 print:text-black mb-2 uppercase tracking-wider text-[11px]">
              5-Pillar Anti-Cheat Forensics Attestation
            </h4>
            <div className="space-y-2">
              <div className="bg-[#090D14] border border-slate-800 p-3 rounded-xl flex items-start justify-between gap-3 print:bg-gray-100 print:text-black">
                <div>
                  <span className="font-semibold text-slate-200 print:text-black">1. Timeline & Sprint Window:</span>
                  <p className="text-slate-400 print:text-gray-700 text-[11px] mt-0.5">{candidate.antiCheat?.timelineDetail}</p>
                </div>
                <span className="font-bold font-mono text-[10px] px-2 py-0.5 rounded bg-slate-800">{candidate.antiCheat?.timelineStatus}</span>
              </div>

              <div className="bg-[#090D14] border border-slate-800 p-3 rounded-xl flex items-start justify-between gap-3 print:bg-gray-100 print:text-black">
                <div>
                  <span className="font-semibold text-slate-200 print:text-black">2. Diff Velocity & Zip-Drop:</span>
                  <p className="text-slate-400 print:text-gray-700 text-[11px] mt-0.5">{candidate.antiCheat?.diffVelocityDetail}</p>
                </div>
                <span className="font-bold font-mono text-[10px] px-2 py-0.5 rounded bg-slate-800">{candidate.antiCheat?.diffVelocityStatus}</span>
              </div>

              <div className="bg-[#090D14] border border-slate-800 p-3 rounded-xl flex items-start justify-between gap-3 print:bg-gray-100 print:text-black">
                <div>
                  <span className="font-semibold text-slate-200 print:text-black">3. Passenger / Ghost Filter:</span>
                  <p className="text-slate-400 print:text-gray-700 text-[11px] mt-0.5">{candidate.antiCheat?.contributorDetail}</p>
                </div>
                <span className="font-bold font-mono text-[10px] px-2 py-0.5 rounded bg-slate-800">{candidate.antiCheat?.contributorStatus}</span>
              </div>

              <div className="bg-[#090D14] border border-slate-800 p-3 rounded-xl flex items-start justify-between gap-3 print:bg-gray-100 print:text-black">
                <div>
                  <span className="font-semibold text-slate-200 print:text-black">4. Hollow AI-Slop & Mock Stubs:</span>
                  <p className="text-slate-400 print:text-gray-700 text-[11px] mt-0.5">{candidate.antiCheat?.codeAuthenticityDetail}</p>
                </div>
                <span className="font-bold font-mono text-[10px] px-2 py-0.5 rounded bg-slate-800">{candidate.antiCheat?.codeAuthenticityStatus}</span>
              </div>

              <div className="bg-[#090D14] border border-slate-800 p-3 rounded-xl flex items-start justify-between gap-3 print:bg-gray-100 print:text-black">
                <div>
                  <span className="font-semibold text-slate-200 print:text-black">5. Plagiarism & License Stripping:</span>
                  <p className="text-slate-400 print:text-gray-700 text-[11px] mt-0.5">{candidate.antiCheat?.plagiarismDetail}</p>
                </div>
                <span className="font-bold font-mono text-[10px] px-2 py-0.5 rounded bg-slate-800">{candidate.antiCheat?.plagiarismStatus}</span>
              </div>
            </div>
          </div>

          {/* Citations */}
          {candidate.citations && candidate.citations.length > 0 && (
            <div>
              <h4 className="font-bold text-slate-200 print:text-black mb-2 uppercase tracking-wider text-[11px]">
                Ground-Truth File Citations
              </h4>
              <div className="space-y-1.5">
                {candidate.citations.map((cite, i) => (
                  <div key={i} className="bg-[#090D14] border border-slate-800 p-2.5 rounded-lg text-[11px] font-mono print:bg-gray-100 print:text-black">
                    <span className="text-cyan-300 print:text-blue-700 font-semibold">{cite.file}</span>
                    <p className="text-slate-400 print:text-gray-700 font-sans mt-0.5">{cite.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Attestation Stamp */}
          <div className="border-t border-slate-800 pt-4 flex items-center justify-between text-[11px] text-slate-500 print:text-gray-600">
            <div>
              <span className="block font-semibold text-slate-400 print:text-black">Autonomous JEV Council Verification</span>
              <span>Cryptographically Sealed by SIFT Sentinel Engine</span>
            </div>
            <div className="text-right">
              <span className="block font-mono">TIMESTAMP: {new Date().toISOString()}</span>
              <span>Attributed to: The SIFT Core Team</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
