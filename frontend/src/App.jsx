import React, { useCallback, useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { request, downloadReport } from './api';
import Navbar from './components/Navbar';
import AuditInput from './components/AuditInput';
import AntiCheatGrid from './components/AntiCheatGrid';
import RadarScorecard from './components/RadarScorecard';
import CodeCitations from './components/CodeCitations';
import Leaderboard from './components/Leaderboard';
import CandidateProfileCard from './components/CandidateProfileCard';
import CommitVelocityChart from './components/CommitVelocityChart';
import RubricMatrix from './components/RubricMatrix';
import JuryDefenseModal from './components/JuryDefenseModal';

export default function App() {
  const [settings, setSettings] = useState(null), [auth, setAuth] = useState(null), [session, setSession] = useState(null);
  const [organizations, setOrganizations] = useState([]), [orgId, setOrgId] = useState(''), [cohorts, setCohorts] = useState([]), [cohortId, setCohortId] = useState('');
  const [workflow, setWorkflow] = useState('hackathon'), [cohortName, setCohortName] = useState(''), [orgName, setOrgName] = useState('');
  const [candidates, setCandidates] = useState([]), [total, setTotal] = useState(0), [page, setPage] = useState(1), [rankedSize, setRankedSize] = useState(0), [selected, setSelected] = useState(null);
  const [audit, setAudit] = useState(null), [evidence, setEvidence] = useState([]), [search, setSearch] = useState(''), [filter, setFilter] = useState('ALL');
  const [error, setError] = useState(''), [busy, setBusy] = useState(false), [exporting, setExporting] = useState(false), [playbook, setPlaybook] = useState(false), [email, setEmail] = useState(''), [authMessage, setAuthMessage] = useState('');
  const activeOrg = organizations.find(o => o.id === orgId); const canWrite = activeOrg && activeOrg.role !== 'viewer';
  const api = useCallback((path, options = {}) => request(path, { token: session?.access_token, orgId, ...options }), [session?.access_token, orgId]);
  const boot = useCallback(async () => {
    try { const configuration = await request('/api/config'); setSettings(configuration); setError('');
      if (configuration.authMode === 'supabase') { const client = createClient(configuration.supabaseUrl, configuration.supabaseAnonKey); setAuth(client); const { data } = await client.auth.getSession(); setSession(data.session); }
    } catch (e) { setError(`Unable to reach SIFT: ${e.message}`); }
  }, []);
  useEffect(() => { boot(); }, [boot]);
  useEffect(() => { if (!auth) return; const { data } = auth.auth.onAuthStateChange((_event, next) => setSession(next)); return () => data.subscription.unsubscribe(); }, [auth]);
  const ready = settings && (settings.authMode === 'local' || session);
  useEffect(() => { if (!ready) { setOrgId(''); setOrganizations([]); return; } let alive = true;
    request('/api/organizations', { token: session?.access_token }).then(rows => { if (!alive) return; setOrganizations(rows); setOrgId(current => rows.some(o => o.id === current) ? current : rows[0]?.id || ''); }).catch(e => alive && setError(e.message)); return () => { alive = false; };
  }, [!!ready, session?.access_token]);
  useEffect(() => { setCandidates([]); setSelected(null); setEvidence([]); setAudit(null); setCohortId(''); setPage(1); if (!orgId) return; let alive = true;
    api('/api/cohorts').then(rows => { if (!alive) return; setCohorts(rows); setCohortId(rows.find(c => c.workflow === workflow)?.id || ''); }).catch(e => alive && setError(e.message));
    const saved = sessionStorage.getItem(`sift.audit:${orgId}`); if (saved) api(`/api/audits/${saved}`).then(row => alive && setAudit(row)).catch(() => sessionStorage.removeItem(`sift.audit:${orgId}`));
    return () => { alive = false; };
  }, [orgId]);
  const refreshCandidates = useCallback(async () => { if (!orgId || !cohortId) return; const result = await api(`/api/candidates?cohortId=${cohortId}&page=${page}&search=${encodeURIComponent(search)}`); setCandidates(result.candidates); setTotal(result.total); setRankedSize(result.rankedCohortSize); }, [api, orgId, cohortId, page, search]);
  useEffect(() => { let alive = true; const controller = new AbortController(); if (!cohortId || !orgId) { setCandidates([]); setTotal(0); return; }
    api(`/api/candidates?cohortId=${cohortId}&page=${page}&search=${encodeURIComponent(search)}`, { signal: controller.signal }).then(result => { if (!alive) return; setCandidates(result.candidates); setTotal(result.total); setRankedSize(result.rankedCohortSize); }).catch(e => alive && e.name !== 'AbortError' && setError(e.message)); return () => { alive = false; controller.abort(); };
  }, [api, cohortId, page, search, orgId]);
  const loadCandidate = useCallback(async id => { const row = await api(`/api/candidates/${id}`); setSelected(row); const current = row.audits?.[0]; setAudit(current || null); setEvidence(current ? await api(`/api/audits/${current.id}/evidence`) : []); }, [api]);
  useEffect(() => { if (!audit?.id || !['queued', 'running'].includes(audit.status)) return; let alive = true, timer;
    const poll = async () => { try { const next = await api(`/api/audits/${audit.id}`); if (!alive) return; setAudit(next); if (['queued', 'running'].includes(next.status)) timer = setTimeout(poll, 2000); else { await refreshCandidates(); await loadCandidate(next.candidate_id); } } catch (e) { if (alive) { setError(e.message); timer = setTimeout(poll, 5000); } } }; timer = setTimeout(poll, 1000); return () => { alive = false; clearTimeout(timer); };
  }, [audit?.id, audit?.status, api, refreshCandidates, loadCandidate]);
  const perform = async action => { setBusy(true); setError(''); try { await action(); } catch (e) { setError(e.message); } finally { setBusy(false); } };
  const createCohort = () => perform(async () => { const cohort = await api('/api/cohorts', { body: { name: cohortName, workflow } }); setCohorts(current => [cohort, ...current]); setCohortId(cohort.id); setCohortName(''); setPage(1); });
  const submitAudit = input => perform(async () => { const result = await api('/api/audits', { body: { ...input, workflow, cohortId }, idempotencyKey: crypto.randomUUID() }); sessionStorage.setItem(`sift.audit:${orgId}`, result.id); setAudit(await api(`/api/audits/${result.id}`)); setSelected(null); setEvidence([]); await refreshCandidates(); });
  const exportPdf = async () => { setExporting(true); setError(''); try { const report = await api(`/api/audits/${audit.id}/reports`, { body: {} }); for (let i = 0; i < 60; i++) { await new Promise(resolve => setTimeout(resolve, 1000)); const result = await api(`/api/reports/${report.id}`); if (result.status === 'completed') { await downloadReport(result.downloadUrl, session?.access_token, orgId); return; } if (result.status === 'failed') throw new Error(result.error || 'Report generation failed'); } throw new Error(`Report is still processing. Report ID: ${report.id}`); } catch (e) { setError(e.message); } finally { setExporting(false); } };
  const saveDecision = (decision, rationale) => perform(async () => { await api(`/api/candidates/${selected.id}/decisions`, { body: { auditId: audit.id, decision, rationale } }); await loadCandidate(selected.id); });
  const changeWorkflow = next => { setWorkflow(next); setCohortId(cohorts.find(c => c.workflow === next)?.id || ''); setSelected(null); setAudit(null); setEvidence([]); setPage(1); };
  return <div className="min-h-screen flex flex-col">
    <Navbar candidateCount={total} flaggedCount={candidates.filter(c => c.assessment?.riskLevel === 'REVIEW_REQUIRED').length} onOpenJuryPlaybook={() => setPlaybook(true)} />
    <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 flex flex-col gap-6">
      {error && <div role="alert" className="panel border-rose-500/40 text-rose-200 flex justify-between gap-3"><span>{error}</span><button onClick={() => setError('')} aria-label="Dismiss error">×</button></div>}
      {!settings && <div className="panel"><p>Connecting to SIFT…</p><button className="button mt-3" onClick={boot}>Retry connection</button></div>}
      {settings?.authMode === 'supabase' && !session && <form className="panel max-w-lg" onSubmit={e => { e.preventDefault(); perform(async () => { const { error } = await auth.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } }); if (error) throw error; setAuthMessage('Check your email for the sign-in link.'); }); }}><h1 className="text-xl font-bold">Sign in to your SIFT workspace</h1><label className="field mt-4">Email<input required type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" /></label><button className="button mt-3" disabled={busy || !auth}>Send sign-in link</button><p role="status" className="mt-3 text-sm text-cyan-300">{authMessage}</p></form>}
      {ready && <>
        {settings.authMode === 'local' && <p className="text-xs text-amber-300">Local development workspace · production requires sign-in</p>}
        <section className="panel flex flex-wrap items-end gap-4" aria-label="Workspace controls">
          <label className="field">Organization<select value={orgId} onChange={e => setOrgId(e.target.value)}>{organizations.map(o => <option value={o.id} key={o.id}>{o.name} ({o.role})</option>)}</select></label>
          <div className="flex gap-2" role="group" aria-label="Evaluation workflow">{['hackathon', 'recruiting'].map(w => <button key={w} className={`button ${workflow === w ? '' : 'secondary'}`} aria-pressed={workflow === w} onClick={() => changeWorkflow(w)}>{w === 'hackathon' ? 'Hackathon jury' : 'Recruiting'}</button>)}</div>
          <label className="field">Evaluation cohort<select value={cohortId} onChange={e => { setCohortId(e.target.value); setPage(1); setSelected(null); setAudit(null); }}><option value="">Choose a cohort</option>{cohorts.filter(c => c.workflow === workflow).map(c => <option value={c.id} key={c.id}>{c.name}</option>)}</select></label>
          {session && <button className="button secondary" onClick={() => auth.auth.signOut()}>Sign out</button>}
          {canWrite && <form className="flex items-end gap-2" onSubmit={e => { e.preventDefault(); createCohort(); }}><label className="field">New cohort<input required maxLength={120} value={cohortName} onChange={e => setCohortName(e.target.value)} placeholder="October submissions" /></label><button className="button secondary" disabled={busy}>Create</button></form>}
          {!orgId && <form className="flex gap-2" onSubmit={e => { e.preventDefault(); perform(async () => { const org = await request('/api/organizations', { token: session?.access_token, body: { name: orgName } }); setOrganizations(current => [...current, org]); setOrgId(org.id); }); }}><label className="field">Organization name<input required value={orgName} onChange={e => setOrgName(e.target.value)} /></label><button className="button" disabled={busy}>Create workspace</button></form>}
        </section>
        {cohortId && <AuditInput workflow={workflow} onSubmit={submitAudit} disabled={!canWrite || busy} audit={audit} onCancel={() => perform(async () => { await api(`/api/audits/${audit.id}/cancel`, { body: {} }); setAudit(await api(`/api/audits/${audit.id}`)); await refreshCandidates(); })} discoverProfile={username => api(`/api/github/profiles/${encodeURIComponent(username)}/repositories`)} />}
        {!cohortId && <div className="panel text-slate-400">Create or choose a cohort to start collecting evidence. Cohorts keep unrelated submissions out of the same ranking.</div>}
        {selected && <section className="grid grid-cols-1 lg:grid-cols-3 gap-6" aria-label="Candidate dossier"><div className="lg:col-span-2 flex flex-col gap-6"><CandidateProfileCard candidate={selected} audit={audit} /><AntiCheatGrid findings={audit?.findings || []} /><CommitVelocityChart evidence={evidence} loadEvidence={id => api(`/api/audits/${audit.id}/evidence/${id}`)} /><CodeCitations evidence={evidence} dimensions={audit?.assessment?.dimensions} loadEvidence={id => api(`/api/audits/${audit.id}/evidence/${id}`)} /><RubricMatrix dimensions={audit?.assessment?.dimensions} /></div><RadarScorecard assessment={audit?.assessment} audit={audit} decisions={selected.decisions} workflow={workflow} onDecision={saveDecision} canWrite={canWrite} onExportDossier={exportPdf} exporting={exporting} busy={busy} /></section>}
        {cohortId && <Leaderboard candidates={candidates} total={total} page={page} setPage={setPage} selectedId={selected?.id} onSelect={id => perform(() => loadCandidate(id))} search={search} setSearch={value => { setSearch(value); setPage(1); }} filter={filter} setFilter={setFilter} rankedSize={rankedSize} rankingsEnabled={settings.rankingsEnabled} />}
      </>}
    </main><JuryDefenseModal isOpen={playbook} onClose={() => setPlaybook(false)} /><footer className="border-t border-slate-800 p-5 text-center text-xs text-slate-500">SIFT · Evidence for human decisions · The SIFT Core Team</footer>
  </div>;
}
