import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { randomUUID,createHash } from 'node:crypto';
import { z } from 'zod';
import { AuditInput, Repository, RUBRIC_VERSION } from '@sift/contracts';
import { pool,transaction } from './db.ts';
import { config,local } from './config.ts';
import { authenticate,tenant,writable,admin,HttpError,supabase } from './auth.ts';
import { pages,githubRequest } from './github.ts';
import { reportDownload } from './reports.ts';
import {openapi} from './openapi.ts';

const uuid=(value:unknown)=>z.uuid().parse(value);
const safeAudit=(row:any)=>{const {snapshots,...rest}=row;return {...rest,snapshots:snapshots?.map((s:any)=>({repository:s.repository,sha:s.sha,coverage:s.coverage})),input:{...row.input,jobDescription:row.input?.jobDescription}};};
async function ownedAudit(orgId:string,id:string){const r=await pool.query('SELECT * FROM audits WHERE org_id=$1 AND id=$2',[orgId,uuid(id)]);if(!r.rowCount)throw new HttpError(404,'Audit not found');return r.rows[0];}
export const app=express();
app.disable('x-powered-by');app.set('trust proxy',config.NODE_ENV==='production'?1:false);
app.use(helmet());app.use(cors({origin:config.CORS_ORIGIN.split(','),allowedHeaders:['Authorization','Content-Type','X-Organization-ID','Idempotency-Key']}));
app.use(express.json({limit:'2mb'}));app.use(rateLimit({windowMs:60000,limit:120,standardHeaders:'draft-8',legacyHeaders:false}));
app.get('/health',async(_req,res)=>{try{await pool.query('SELECT 1');res.json({status:'ok'});}catch{res.status(503).json({status:'unavailable'});}});
app.get('/api/config',(_req,res)=>res.json({authMode:config.AUTH_MODE,supabaseUrl:config.SUPABASE_URL||null,supabaseAnonKey:config.SUPABASE_ANON_KEY||null,rankingsEnabled:config.RANKINGS_ENABLED==='true',rubricVersion:RUBRIC_VERSION}));
app.use('/api',authenticate);
app.get('/api/openapi.json',(_req,res)=>res.json(openapi));
app.get('/api/organizations',async(req,res)=>res.json((await pool.query('SELECT o.*,m.role FROM organizations o JOIN memberships m ON m.org_id=o.id WHERE m.user_id=$1 ORDER BY o.created_at',[req.userId])).rows));
app.post('/api/organizations',async(req,res)=>{
  if(local)throw new HttpError(400,'Local mode already provides a development organization');
  const name=z.string().trim().min(1).max(120).parse(req.body.name);const id=randomUUID();
  await transaction(async c=>{await c.query('INSERT INTO organizations(id,name) VALUES($1,$2)',[id,name]);await c.query('INSERT INTO memberships(org_id,user_id,role) VALUES($1,$2,\'admin\')',[id,req.userId]);});
  res.status(201).json({id,name,role:'admin'});
});
app.use('/api',tenant);
app.get('/api/memberships',async(req,res)=>{admin(req.context);res.json((await pool.query('SELECT user_id,role FROM memberships WHERE org_id=$1',[req.context.orgId])).rows);});
app.post('/api/memberships',async(req,res)=>{
  admin(req.context);const input=z.object({userId:z.uuid(),role:z.enum(['admin','reviewer','viewer'])}).strict().parse(req.body);
  if(!local){const {data,error}=await supabase!.auth.admin.getUserById(input.userId);if(error||!data.user)throw new HttpError(400,'User must sign in before membership can be assigned');}
  await transaction(async c=>{
    await c.query('SELECT id FROM organizations WHERE id=$1 FOR UPDATE',[req.context.orgId]);
    const rows=(await c.query('SELECT * FROM memberships WHERE org_id=$1',[req.context.orgId])).rows;
    if(input.role!=='admin'&&rows.filter(m=>m.role==='admin').length===1&&rows.some(m=>m.user_id===input.userId&&m.role==='admin'))throw new HttpError(409,'The organization needs at least one administrator');
    await c.query('INSERT INTO memberships(org_id,user_id,role) VALUES($1,$2,$3) ON CONFLICT(org_id,user_id) DO UPDATE SET role=EXCLUDED.role',[req.context.orgId,input.userId,input.role]);
  });res.status(201).json({userId:input.userId,role:input.role});
});
app.delete('/api/organization',async(req,res)=>{admin(req.context);await pool.query('DELETE FROM organizations WHERE id=$1',[req.context.orgId]);res.status(204).end();});
app.get('/api/cohorts',async(req,res)=>res.json((await pool.query('SELECT * FROM cohorts WHERE org_id=$1 ORDER BY created_at DESC',[req.context.orgId])).rows));
app.post('/api/cohorts',async(req,res)=>{writable(req.context);const input=z.object({name:z.string().trim().min(1).max(120),workflow:z.enum(['hackathon','recruiting'])}).strict().parse(req.body);const id=randomUUID();await pool.query('INSERT INTO cohorts(id,org_id,name,workflow) VALUES($1,$2,$3,$4)',[id,req.context.orgId,input.name,input.workflow]);res.status(201).json({id,...input});});
app.get('/api/github/profiles/:username/repositories',async(req,res)=>{
  const username=z.string().regex(/^[A-Za-z0-9-]{1,39}$/).parse(req.params.username);
  const result=await pages('GET /users/{username}/repos',{username,type:'owner',sort:'updated'},2);
  res.json({repositories:result.data.filter(r=>!r.private).map(r=>({name:r.full_name,description:r.description,fork:r.fork})),complete:result.complete});
});
app.post('/api/audits',async(req,res)=>{
  writable(req.context);const input=AuditInput.parse(req.body);const hash=createHash('sha256').update(JSON.stringify(input)).digest('hex');
  const key=z.string().min(1).max(200).parse(req.get('Idempotency-Key'));const org=req.context.orgId;
  const result=await transaction(async c=>{
    await c.query('SELECT id FROM organizations WHERE id=$1 FOR UPDATE',[org]);
    const prior=await c.query('SELECT request_hash,audit_id FROM idempotency WHERE org_id=$1 AND key=$2',[org,key]);
    if(prior.rowCount){if(prior.rows[0].request_hash!==hash)throw new HttpError(409,'Idempotency key already used for a different submission');return {id:prior.rows[0].audit_id,reused:true};}
    const cohort=await c.query('SELECT workflow FROM cohorts WHERE id=$1 AND org_id=$2',[input.cohortId,org]);if(!cohort.rowCount)throw new HttpError(404,'Cohort not found');if(cohort.rows[0].workflow!==input.workflow)throw new HttpError(400,'Submission workflow must match its cohort');
    const active=await c.query('SELECT count(*) FROM audits WHERE org_id=$1 AND status IN (\'queued\',\'running\')',[org]);if(Number(active.rows[0].count)>=2)throw new HttpError(429,'Organization already has two active audits');
    const candidateId=input.candidateId||randomUUID(),id=randomUUID();
    if(input.candidateId){const candidate=await c.query('SELECT 1 FROM candidates WHERE id=$1 AND org_id=$2 AND cohort_id=$3',[candidateId,org,input.cohortId]);if(!candidate.rowCount)throw new HttpError(404,'Candidate not found in this cohort');}
    else await c.query('INSERT INTO candidates(id,org_id,cohort_id,name,username) VALUES($1,$2,$3,$4,$5)',[candidateId,org,input.cohortId,input.candidateName,input.githubUsername||null]);
    await c.query('INSERT INTO audits(id,org_id,candidate_id,input,created_by) VALUES($1,$2,$3,$4,$5)',[id,org,candidateId,input,req.userId]);
    await c.query('INSERT INTO idempotency(org_id,key,request_hash,audit_id) VALUES($1,$2,$3,$4)',[org,key,hash,id]);
    await c.query('INSERT INTO outbox(id,org_id,kind,payload) VALUES($1,$2,\'audit\',$3)',[randomUUID(),org,{auditId:id,orgId:org}]);
    return {id,candidateId,reused:false};
  });res.status(202).json(result);
});
app.get('/api/audits/:id',async(req,res)=>res.json(safeAudit(await ownedAudit(req.context.orgId,String(req.params.id)))));
app.post('/api/audits/:id/retry',async(req,res)=>{
  writable(req.context);const id=uuid(req.params.id),org=req.context.orgId;
  await transaction(async c=>{
    await c.query('SELECT id FROM organizations WHERE id=$1 FOR UPDATE',[org]);
    const audit=(await c.query('SELECT * FROM audits WHERE id=$1 AND org_id=$2 FOR UPDATE',[id,org])).rows[0];if(!audit)throw new HttpError(404,'Audit not found');
    if(!['failed','partial','cancelled'].includes(audit.status))throw new HttpError(409,'Only failed, partial or cancelled audits can retry');
    const active=(await c.query('SELECT count(*) FROM audits WHERE org_id=$1 AND status IN (\'queued\',\'running\')',[org])).rows[0].count;if(Number(active)>=2)throw new HttpError(429,'Organization already has two active audits');
    if(audit.snapshots.length&&!(await c.query('SELECT 1 FROM evidence WHERE audit_id=$1 AND org_id=$2 AND expires_at>now() LIMIT 1',[id,org])).rowCount)throw new HttpError(409,'Evidence retention expired; create a new audit');
    const stages={...audit.stages};delete stages.judge;delete stages.synthesizer;
    await c.query('UPDATE audits SET status=\'queued\',cancelled=false,error=NULL,judgment=NULL,assessment=NULL,stages=$3,updated_at=now() WHERE id=$1 AND org_id=$2',[id,org,stages]);
    await c.query('INSERT INTO outbox(id,org_id,kind,payload) VALUES($1,$2,\'audit\',$3)',[randomUUID(),org,{auditId:id,orgId:org}]);
  });res.status(202).json({id,status:'queued'});
});
app.post('/api/audits/:id/cancel',async(req,res)=>{writable(req.context);const row=await ownedAudit(req.context.orgId,String(req.params.id));const active=['queued','running'].includes(row.status);if(active)await pool.query('UPDATE audits SET cancelled=true,status=\'cancelled\',updated_at=now() WHERE id=$1 AND org_id=$2',[row.id,req.context.orgId]);res.json({id:row.id,status:active?'cancelled':row.status});});
app.get('/api/audits/:id/evidence',async(req,res)=>{
  await ownedAudit(req.context.orgId,String(req.params.id));
  const r=await pool.query('SELECT payload FROM evidence WHERE org_id=$1 AND audit_id=$2 AND expires_at>now() ORDER BY id',[req.context.orgId,req.params.id]);
  res.json(r.rows.map(r=>{const {content,...rest}=r.payload;return rest;}));
});
app.get('/api/audits/:id/evidence/:evidenceId',async(req,res)=>{
  const r=await pool.query('SELECT payload FROM evidence WHERE org_id=$1 AND audit_id=$2 AND id=$3 AND expires_at>now()',[req.context.orgId,uuid(req.params.id),req.params.evidenceId]);if(!r.rowCount)throw new HttpError(404,'Evidence unavailable or retention expired');res.json(r.rows[0].payload);
});
app.get('/api/candidates',async(req,res)=>{
  const cohort=uuid(req.query.cohortId);const page=z.coerce.number().int().min(1).default(1).parse(req.query.page);const search=z.string().max(200).default('').parse(req.query.search);const org=req.context.orgId;
  const r=await pool.query(`SELECT c.*,a.id AS audit_id,a.status,a.assessment FROM candidates c LEFT JOIN LATERAL(SELECT * FROM audits WHERE candidate_id=c.id AND org_id=c.org_id ORDER BY created_at DESC LIMIT 1) a ON true WHERE c.org_id=$1 AND c.cohort_id=$2 AND (c.name ILIKE $3 OR COALESCE(c.username,'') ILIKE $3) ORDER BY c.created_at DESC LIMIT 50 OFFSET $4`,[org,cohort,`%${search}%`,(page-1)*50]);
  const count=(await pool.query('SELECT count(*) FROM candidates WHERE org_id=$1 AND cohort_id=$2 AND (name ILIKE $3 OR COALESCE(username,\'\') ILIKE $3)',[org,cohort,`%${search}%`])).rows[0].count;
  const ranked=(await pool.query(`SELECT c.id,a.assessment FROM candidates c JOIN audits a ON a.candidate_id=c.id AND a.org_id=c.org_id WHERE c.org_id=$1 AND c.cohort_id=$2 AND a.assessment->>'rankable'='true' AND a.assessment->'versions'->>'rubric'=$3 ORDER BY (a.assessment->>'overallScore')::numeric DESC,c.id`,[org,cohort,RUBRIC_VERSION])).rows;
  res.json({candidates:r.rows.map(row=>({...row,rank:ranked.findIndex(c=>c.id===row.id)>=0?ranked.findIndex(c=>c.id===row.id)+1:null})),total:Number(count),rankedCohortSize:ranked.length,page,rankingsEnabled:config.RANKINGS_ENABLED==='true'});
});
app.get('/api/candidates/:id',async(req,res)=>{
  const result=await pool.query('SELECT * FROM candidates WHERE id=$1 AND org_id=$2',[uuid(req.params.id),req.context.orgId]);if(!result.rowCount)throw new HttpError(404,'Candidate not found');
  const audits=(await pool.query('SELECT * FROM audits WHERE candidate_id=$1 AND org_id=$2 ORDER BY created_at DESC',[req.params.id,req.context.orgId])).rows.map(safeAudit);
  const decisions=(await pool.query('SELECT * FROM decisions WHERE candidate_id=$1 AND org_id=$2 ORDER BY created_at DESC',[req.params.id,req.context.orgId])).rows;
  res.json({...result.rows[0],audits,decisions});
});
app.post('/api/candidates/:id/decisions',async(req,res)=>{
  writable(req.context);const input=z.object({auditId:z.uuid(),decision:z.enum(['advance','review','decline','award','no-award']),rationale:z.string().trim().min(10).max(5000)}).strict().parse(req.body);
  const row=await ownedAudit(req.context.orgId,input.auditId);if(row.candidate_id!==uuid(req.params.id))throw new HttpError(404,'Candidate audit not found');
  if(!['completed','partial'].includes(row.status))throw new HttpError(409,'Audit must finish before recording a decision');
  if(row.input.workflow==='hackathon'&&!['award','review','no-award'].includes(input.decision)||row.input.workflow==='recruiting'&&!['advance','review','decline'].includes(input.decision))throw new HttpError(400,'Decision does not match the workflow');
  const id=randomUUID();await pool.query('INSERT INTO decisions(id,candidate_id,org_id,reviewer_id,decision,rationale,audit_id) VALUES($1,$2,$3,$4,$5,$6,$7)',[id,req.params.id,req.context.orgId,req.userId,input.decision,input.rationale,input.auditId]);res.status(201).json({id,...input});
});
app.post('/api/audits/:id/reports',async(req,res)=>{
  writable(req.context);const audit=await ownedAudit(req.context.orgId,String(req.params.id));if(!['completed','partial'].includes(audit.status))throw new HttpError(409,'Audit must finish before exporting');
  const id=randomUUID();await transaction(async c=>{await c.query('INSERT INTO reports(id,audit_id,org_id) VALUES($1,$2,$3)',[id,audit.id,req.context.orgId]);await c.query('INSERT INTO outbox(id,org_id,kind,payload) VALUES($1,$2,\'report\',$3)',[randomUUID(),req.context.orgId,{reportId:id,orgId:req.context.orgId}]);});res.status(202).json({id,status:'queued'});
});
app.get('/api/reports/:id',async(req,res)=>{const r=await pool.query('SELECT * FROM reports WHERE id=$1 AND org_id=$2',[uuid(req.params.id),req.context.orgId]);if(!r.rowCount)throw new HttpError(404,'Report not found');res.json({...r.rows[0],downloadUrl:r.rows[0].status==='completed'?await reportDownload(r.rows[0]):null});});
app.get('/api/reports/:id/download',async(req,res)=>{if(!local)throw new HttpError(404,'Use the private signed download URL');const r=await pool.query('SELECT * FROM reports WHERE id=$1 AND org_id=$2 AND status=\'completed\'',[uuid(req.params.id),req.context.orgId]);if(!r.rowCount)throw new HttpError(404,'Report not found');const {localReportPath}=await import('./reports.ts');res.download(localReportPath(r.rows[0].object_path),'sift-dossier.pdf',{dotfiles:'allow'});});
app.post('/api/template-corpus',async(req,res)=>{
  admin(req.context);const input=z.object({version:z.string().min(1).max(100),repository:Repository,sha:z.string().regex(/^[a-f0-9]{40}$/),license:z.string().min(1).max(200)}).strict().parse(req.body);
  const [owner,repo]=input.repository.split('/');const tree=await githubRequest('GET /repos/{owner}/{repo}/git/trees/{tree_sha}',{owner,repo,tree_sha:input.sha,recursive:'1'});if(tree.data.truncated)throw new HttpError(400,'Template tree is truncated');
  const entries=tree.data.tree.filter((entry:any)=>entry.type==='blob').map((entry:any)=>({path:entry.path,sha:entry.sha}));const id=randomUUID();await pool.query('INSERT INTO template_corpus(id,org_id,version,repository,sha,entries,source_license) VALUES($1,$2,$3,$4,$5,$6,$7)',[id,req.context.orgId,input.version,input.repository,input.sha,JSON.stringify(entries),input.license]);res.status(201).json({id,...input,files:entries.length});
});
app.get('/api/dataset-imports',async(req,res)=>{admin(req.context);res.json((await pool.query('SELECT * FROM dataset_imports WHERE org_id=$1 ORDER BY created_at DESC',[req.context.orgId])).rows);});
app.post('/api/dataset-imports',async(req,res)=>{
  admin(req.context);if(config.DATASET_LICENSE_APPROVED!=='true')throw new HttpError(409,'Dataset import disabled until usage rights are verified');
  const input=z.object({revision:z.string().regex(/^[a-f0-9]{40}$/),cohortId:z.uuid()}).strict().parse(req.body);const cohort=await pool.query('SELECT 1 FROM cohorts WHERE id=$1 AND org_id=$2 AND workflow=\'recruiting\'',[input.cohortId,req.context.orgId]);if(!cohort.rowCount)throw new HttpError(404,'Recruiting cohort not found');
  const id=randomUUID();await transaction(async c=>{await c.query('INSERT INTO dataset_imports(id,org_id,revision,manifest) VALUES($1,$2,$3,$4)',[id,req.context.orgId,input.revision,{...input,source:'sarajain123/Redrob-Dataset'}]);await c.query('INSERT INTO outbox(id,org_id,kind,payload) VALUES($1,$2,\'dataset\',$3)',[randomUUID(),req.context.orgId,{importId:id,orgId:req.context.orgId}]);});res.status(202).json({id,status:'queued'});
});
app.use((error:any,_req:express.Request,res:express.Response,_next:express.NextFunction)=>{
  if(error instanceof z.ZodError)return res.status(400).json({error:'Invalid request',details:error.issues.map(i=>({path:i.path,message:i.message}))});
  const status=error instanceof HttpError?error.status:error.type==='entity.too.large'?413:error.status===400?400:500;
  if(status===500)console.error(JSON.stringify({event:'request_failed',type:error.name,message:error.message}));
  res.status(status).json({error:status===500?'Request failed; try again or contact your administrator':error.message});
});
