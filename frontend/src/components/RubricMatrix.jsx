import React from 'react';
const labels = { systemsRigor: 'Systems rigor · 30%', algorithmicDepth: 'Algorithmic depth · 25%', testingVerification: 'Testing & verification · 25%', collaborationHygiene: 'Collaboration · 20%' };
export default function RubricMatrix({ dimensions }) {
  if (!dimensions) return null;
  return <section className="panel"><h2 className="font-bold">Rubric reasoning · JEV v1</h2><div className="grid md:grid-cols-2 gap-3 mt-4">{Object.entries(labels).map(([key, label]) => <article className="border border-slate-800 rounded-xl p-4" key={key}><h3 className="text-sm font-semibold">{label}</h3><p className="text-cyan-300 text-sm mt-2">{dimensions[key].level == null ? 'Insufficient evidence' : `Level ${dimensions[key].level} of 4`}</p><p className="text-xs text-slate-400 mt-2">{dimensions[key].rationale}</p></article>)}</div></section>;
}
