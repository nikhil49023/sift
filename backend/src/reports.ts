import PDFDocument from 'pdfkit';
import {createHash} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {config,local} from './config.ts';
import {pool} from './db.ts';
import {supabase} from './auth.ts';
export function localReportPath(path:string){if(!/^[a-f0-9-]{36}\/[a-f0-9-]{36}\.pdf$/.test(path))throw new Error('Invalid report path');return resolve('.data/reports',path);}
export async function reportDownload(report:any){
  if(local)return `/api/reports/${report.id}/download`;
  const {data,error}=await supabase!.storage.from(config.STORAGE_BUCKET).createSignedUrl(report.object_path,60);if(error)throw new Error('Report download unavailable');return data.signedUrl;
}
export function createPdf(manifest:any):Promise<Buffer> {
  return new Promise((resolve,reject)=>{
    const document=new PDFDocument({margin:48,info:{Title:'SIFT evidence dossier',Author:'The SIFT Core Team'}});const chunks:Buffer[]=[];
    document.on('data',chunk=>chunks.push(chunk));document.on('end',()=>resolve(Buffer.concat(chunks)));document.on('error',reject);
    const heading=(text:string)=>document.moveDown().font('Helvetica-Bold').fontSize(14).text(text).font('Helvetica').fontSize(10);
    document.fontSize(24).text('SIFT / Evidence Dossier');document.fontSize(10).text('The SIFT Core Team');
    document.moveDown().text(`Candidate: ${manifest.candidate.name}`).text(`Audit: ${manifest.auditId}`).text(`Generated: ${manifest.generatedAt}`);
    heading('Assessment');document.text(manifest.assessment?.summary||'Evaluation unavailable.');document.text(`Score: ${manifest.assessment?.overallScore??'Unscored'}`);document.text(`Review status: ${manifest.assessment?.riskLevel||'INSUFFICIENT_EVIDENCE'}`);
    heading('Snapshot coverage');for(const coverage of manifest.assessment?.coverage||[])document.text(`${coverage.repository} @ ${coverage.sha}\n${coverage.filesAnalyzed} files / ${coverage.commitsAnalyzed} commits\n${coverage.limitations.join('\n')}`);
    heading('Forensic observations');for(const finding of manifest.findings){document.font('Helvetica-Bold').text(`${finding.pillar}: ${finding.status}`).font('Helvetica');finding.observations.forEach((line:string)=>document.text(line));document.text(`Coverage: ${finding.coverage}`).moveDown();}
    heading('JEV dimensions');for(const [name,value] of Object.entries(manifest.assessment?.dimensions||{}) as [string,any][]){document.font('Helvetica-Bold').text(`${name}: ${value.level===null?'Unscored':`${value.level}/4`}`).font('Helvetica').text(value.rationale);for(const citation of value.citations||[])document.text(`[${citation.evidenceId}] ${citation.startLine?`lines ${citation.startLine}-${citation.endLine}`:''}\n${citation.excerpt}`);document.moveDown();}
    if(manifest.assessment?.roleFit){heading('Role fit');document.text(manifest.assessment.roleFit.rationale);}
    heading('Source references');for(const source of manifest.sources){document.text(`${source.repository} / ${source.path}\nSHA: ${source.sha}\nContent hash: ${source.hash}`);document.fillColor('#056b8c').text(source.sourceUrl,{link:source.sourceUrl}).fillColor('black').moveDown();}
    heading('Human decisions');if(!manifest.decisions.length)document.text('No reviewer decision recorded.');for(const decision of manifest.decisions)document.text(`${decision.decision} — ${decision.created_at}\nReviewer ${decision.reviewer_id}\n${decision.rationale}`).moveDown();
    heading('Integrity and limitations');document.text(`Manifest SHA-256: ${manifest.manifestHash}`);document.text('Hashes support integrity checking; they do not prove original authorship. No submitted code was executed. CI outcomes are reported evidence. Scores support human review.');
    if(manifest.evidenceExpired)document.text('Raw evidence retention has expired for some references. Saved citations and source manifests remain; source correspondence was checked at evaluation time.');
    document.end();
  });
}
export async function generateReport(reportId:string,orgId:string){
  const row=(await pool.query('SELECT r.*,a.assessment,a.findings,a.candidate_id FROM reports r JOIN audits a ON a.id=r.audit_id AND a.org_id=r.org_id WHERE r.id=$1 AND r.org_id=$2',[reportId,orgId])).rows[0];if(!row||row.status==='completed')return;
  await pool.query('UPDATE reports SET status=\'running\',error=NULL WHERE id=$1 AND org_id=$2',[reportId,orgId]);
  const candidate=(await pool.query('SELECT name,username,source FROM candidates WHERE id=$1 AND org_id=$2',[row.candidate_id,orgId])).rows[0];
  const decisions=(await pool.query('SELECT * FROM decisions WHERE audit_id=$1 AND org_id=$2 ORDER BY created_at',[row.audit_id,orgId])).rows;
  const wanted=new Set<string>([...(row.assessment?.citations||[]).map((c:any)=>c.id),...row.findings.flatMap((f:any)=>f.evidenceIds)]);
  const evidence=(await pool.query('SELECT payload FROM evidence WHERE audit_id=$1 AND org_id=$2 AND expires_at>now()',[row.audit_id,orgId])).rows.map(r=>r.payload);
  const sources=evidence.filter(e=>wanted.has(e.id)).map(({content,...rest}:any)=>rest);
  for(const source of row.assessment?.citations||[])if(!sources.some(s=>s.id===source.id))sources.push(source);
  const base={auditId:row.audit_id,candidate,assessment:row.assessment,findings:row.findings,decisions,sources,generatedAt:new Date().toISOString(),evidenceExpired:wanted.size>evidence.filter(e=>wanted.has(e.id)).length};
  const manifest={...base,manifestHash:createHash('sha256').update(JSON.stringify(base)).digest('hex')};const pdf=await createPdf(manifest);const path=`${orgId}/${reportId}.pdf`;
  if(local){await mkdir(resolve('.data/reports',orgId),{recursive:true});await writeFile(localReportPath(path),pdf);}
  else{const {error}=await supabase!.storage.from(config.STORAGE_BUCKET).upload(path,pdf,{contentType:'application/pdf',upsert:true});if(error)throw new Error('Report storage failed');}
  await pool.query('UPDATE reports SET status=\'completed\',manifest=$3,object_path=$4 WHERE id=$1 AND org_id=$2',[reportId,orgId,manifest,path]);
}
