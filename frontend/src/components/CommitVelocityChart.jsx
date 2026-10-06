import React, { useEffect, useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
export function cadence(commits) {
  const days = new Map(); for (const commit of commits) { const date = commit.commitDate?.slice(0, 10); if (!date) continue; days.set(date, (days.get(date) || 0) + 1); }
  return [...days].sort(([a], [b]) => a.localeCompare(b)).map(([day, commits]) => ({ day, commits }));
}
export default function CommitVelocityChart({ evidence, loadEvidence }) {
  const [data, setData] = useState([]), [error, setError] = useState(''); const ids = evidence.filter(e => e.path === 'history.json').map(e => e.id).join(',');
  useEffect(() => { let alive = true; setData([]); setError(''); if (!ids) return; Promise.all(ids.split(',').map(id => loadEvidence(id))).then(rows => { if (alive) setData(cadence(rows.flatMap(r => JSON.parse(r.content)))); }).catch(e => alive && setError(e.message)); return () => { alive = false; }; }, [ids]);
  return <section className="panel"><h2 className="font-bold">Observed commit cadence</h2><p className="text-xs text-slate-400 mt-1">Committer dates from captured history. Dates alone do not establish when code was written.</p>{data.length ? <div className="h-48 mt-4"><ResponsiveContainer width="100%" height="100%"><BarChart data={data}><XAxis dataKey="day" stroke="#64748b" fontSize={10} /><YAxis stroke="#64748b" allowDecimals={false} /><Tooltip contentStyle={{ background: '#121824', borderColor: '#243044' }} /><Bar dataKey="commits" fill="#06b6d4" isAnimationActive={false} /></BarChart></ResponsiveContainer></div> : <p className="text-sm text-slate-500 mt-4">{error || 'No retained commit history is available.'}</p>}</section>;
}
