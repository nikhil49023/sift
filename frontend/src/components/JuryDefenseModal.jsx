import React from 'react';
import { X, ShieldCheck, Scale, AlertOctagon, Terminal, Cpu, Users, Award, ExternalLink } from 'lucide-react';

export default function JuryDefenseModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-[#0E1420] border border-cyan-500/30 w-full max-w-4xl max-h-[90vh] rounded-2xl flex flex-col shadow-2xl shadow-cyan-950/50 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b border-slate-800 p-5 flex items-center justify-between bg-gradient-to-r from-[#121824] to-[#0D1424]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-white">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">SIFT Jury Defense & Pitch Playbook</h2>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  DECISION INTELLIGENCE
                </span>
              </div>
              <p className="text-xs text-slate-400">Why SIFT Solves the Trust Crisis in Hackathons & Technical Hiring</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex flex-col gap-6 text-xs text-slate-300">
          
          {/* Pillar 1: The Problem */}
          <div className="bg-[#090D14] border border-slate-800 rounded-xl p-4">
            <h3 className="text-sm font-bold text-rose-400 flex items-center gap-2 mb-2">
              <AlertOctagon className="w-4 h-4" />
              The Crisis: Resumes and Hackathon Demos Are Broken
            </h3>
            <p className="text-slate-300 leading-relaxed mb-3">
              Modern AI tools allow any candidate to generate polished portfolios, resume keywords, and UI prototypes in minutes. Juries and recruiters face three fatal vulnerabilities:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-[#121824] p-3 rounded-lg border border-slate-800">
                <span className="font-semibold text-rose-300 block mb-1">1. Template Bluffing</span>
                <p className="text-slate-400 text-[11px]">Downloading 10,000 LOC boilerplate starter kits, committing once, and claiming complete system design.</p>
              </div>
              <div className="bg-[#121824] p-3 rounded-lg border border-slate-800">
                <span className="font-semibold text-rose-300 block mb-1">2. Ghost Passengers</span>
                <p className="text-slate-400 text-[11px]">Free-riders who contributed zero code or docs getting equal attribution on winning hackathon projects.</p>
              </div>
              <div className="bg-[#121824] p-3 rounded-lg border border-slate-800">
                <span className="font-semibold text-rose-300 block mb-1">3. Hollow AI-Slop</span>
                <p className="text-slate-400 text-[11px]">Mock returns, empty stubs, and synthetic hype without algorithmic depth or genuine unit tests.</p>
              </div>
            </div>
          </div>

          {/* Pillar 2: The SIFT Solution */}
          <div className="bg-[#090D14] border border-slate-800 rounded-xl p-4">
            <h3 className="text-sm font-bold text-cyan-400 flex items-center gap-2 mb-2">
              <ShieldCheck className="w-4 h-4" />
              The SIFT Architecture: Autonomous 4-Agent JEV DAG
            </h3>
            <p className="text-slate-300 leading-relaxed mb-3">
              SIFT bypasses human claims and inspects the ground truth: git trees, commit timelines, AST structures, and real pull request churn.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="bg-[#121824] p-3 rounded-lg border border-cyan-500/20">
                <div className="flex items-center gap-1.5 text-cyan-300 font-bold mb-1">
                  <Terminal className="w-3.5 h-3.5" />
                  <span>Agent 1</span>
                </div>
                <span className="text-[11px] font-semibold text-white block">Ingestion Scout</span>
                <p className="text-slate-400 text-[10px] mt-1">Fetches commit diffs, tree hashes, issue timelines, and language breakdowns.</p>
              </div>

              <div className="bg-[#121824] p-3 rounded-lg border border-cyan-500/20">
                <div className="flex items-center gap-1.5 text-cyan-300 font-bold mb-1">
                  <Scale className="w-3.5 h-3.5" />
                  <span>Agent 2</span>
                </div>
                <span className="text-[11px] font-semibold text-white block">Forensics Suite</span>
                <p className="text-slate-400 text-[10px] mt-1">Executes the 5-pillar Anti-Cheat rules engine: timelines, diff velocity & ghost blame.</p>
              </div>

              <div className="bg-[#121824] p-3 rounded-lg border border-cyan-500/20">
                <div className="flex items-center gap-1.5 text-cyan-300 font-bold mb-1">
                  <Cpu className="w-3.5 h-3.5" />
                  <span>Agent 3</span>
                </div>
                <span className="text-[11px] font-semibold text-white block">JEV Judge</span>
                <p className="text-slate-400 text-[10px] mt-1">Evaluates code with Gemini 2.5 against mathematical rubrics with mandatory citations.</p>
              </div>

              <div className="bg-[#121824] p-3 rounded-lg border border-cyan-500/20">
                <div className="flex items-center gap-1.5 text-cyan-300 font-bold mb-1">
                  <Award className="w-3.5 h-3.5" />
                  <span>Agent 4</span>
                </div>
                <span className="text-[11px] font-semibold text-white block">Synthesizer</span>
                <p className="text-slate-400 text-[10px] mt-1">Assembles percentile rankings, unforgeable audit dossiers, and jury decision cards.</p>
              </div>
            </div>
          </div>

          {/* Pillar 3: Ground Truth Data & Zero Mock Policy */}
          <div className="bg-[#090D14] border border-slate-800 rounded-xl p-4">
            <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-2 mb-2">
              <Award className="w-4 h-4" />
              100% Real Benchmark Data (Zero Mock Policy)
            </h3>
            <p className="text-slate-300 leading-relaxed">
              SIFT is benchmarked against real developer candidates from the <strong>Redrob AI Challenge (India Runs 2026)</strong> and live repositories on the GitHub REST API. It accurately distinguishes high-output systems engineers (Top 1%) from intentional honeypot decoy candidates (Red Flags).
            </p>
          </div>

          {/* Team Attestation */}
          <div className="border-t border-slate-800 pt-4 flex items-center justify-between text-slate-500 text-[11px]">
            <div>
              <span className="font-semibold text-slate-300 block">SIFT Engineering Integrity</span>
              <span>Systems Over Slop • Equal Attribution • Unforgeable Proof-of-Work</span>
            </div>
            <div className="text-right">
              <span className="font-semibold text-slate-300 block">The SIFT Core Team</span>
              <span>Kilani Sai Nikhil (`[ARCHITECT]`) & Harika Reddy (`[SENTINEL]`)</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
