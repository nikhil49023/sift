import React from 'react';
import { Terminal, FileCode2, ExternalLink } from 'lucide-react';

export default function CodeCitations({ citations = [], repoUrl }) {
  if (!citations || citations.length === 0) return null;

  return (
    <div className="bg-[#121824] border border-slate-800 rounded-2xl p-6 shadow-md">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h3 className="font-bold text-base text-white flex items-center gap-2">
          <Terminal className="w-4 h-4 text-cyan-400" />
          Verified Evidence Citations (Ground Truth)
        </h3>
        <span className="text-[11px] text-slate-500 font-mono">Anti-Hallucination Sentinel</span>
      </div>

      <div className="flex flex-col gap-2.5">
        {citations.map((cite, i) => (
          <div 
            key={i} 
            className="bg-[#090D14] border border-slate-800 rounded-xl p-3 flex items-start gap-3 text-xs transition hover:border-slate-700"
          >
            <FileCode2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-mono text-cyan-300 font-semibold block">
                  {cite.file}
                </span>
                {repoUrl && (
                  <a
                    href={repoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-slate-500 hover:text-cyan-400 inline-flex items-center gap-1 font-mono"
                  >
                    view <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
              </div>
              <p className="text-slate-400 mt-1 leading-relaxed text-[11px]">{cite.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
