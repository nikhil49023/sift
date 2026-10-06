import {Queue,Worker,UnrecoverableError} from 'bullmq';
import {pool,transaction} from './db.ts';
import {config} from './config.ts';
import {STAGES,type Snapshot,type Evidence} from '@sift/contracts';
import {ingest,makeEvidence,excludedPath} from './ingestion.ts';
import {inspect} from './forensics.ts';
import {judge,synthesize,incompleteJudgment} from './jev/index.ts';
import {generateReport} from './reports.ts';
import {importDataset} from './datasets.ts';
import {ProviderError} from './github.ts';
export const connection={url:config.REDIS_URL};
const queue=new Queue('sift',{connection});
async function saveSnapshots(id:string,orgId:string,snapshots:Snapshot[]){
  await transaction(async c=>{
    for(const snapshot of snapshots) {
      for(let start=0;start<snapshot.evidence.length;start+=100){const batch=snapshot.evidence.slice(start,start+100);await c.query('INSERT INTO evidence(id,audit_id,org_id,payload) SELECT item->>\'id\',$1,$2,item FROM jsonb_array_elements($3::jsonb) item ON CONFLICT(audit_id,id) DO NOTHING',[id,orgId,JSON.stringify(batch)]);}
    }
    await c.query('UPDATE audits SET snapshots=$3,updated_at=now() WHERE id=$1 AND org_id=$2 AND cancelled=false',[id,orgId,JSON.stringify(snapshots.map(({evidence,...rest})=>rest))]);
  });
}
export async function runAudit(id:string,orgId:string){
  const lock=await pool.connect();
  const acquired=(await lock.query('SELECT pg_try_advisory_lock(hashtext($1)) locked',[id])).rows[0].locked;
  if(!acquired){lock.release();throw new ProviderError('Audit is already processing',30000);}
  try {
    let row=(await pool.query('SELECT * FROM audits WHERE id=$1 AND org_id=$2',[id,orgId])).rows[0];if(!row||['completed','partial','cancelled'].includes(row.status))return;
    const cancelled=async()=>{const r=await pool.query('SELECT cancelled FROM audits WHERE id=$1 AND org_id=$2',[id,orgId]);return !r.rowCount||r.rows[0].cancelled;};
    const loadSnapshots=async():Promise<Snapshot[]>=>{
      const r=(await pool.query('SELECT snapshots FROM audits WHERE id=$1 AND org_id=$2',[id,orgId])).rows[0];
      const evidence=(await pool.query('SELECT payload FROM evidence WHERE audit_id=$1 AND org_id=$2 AND expires_at>now()',[id,orgId])).rows.map(r=>r.payload as Evidence);
      return (r?.snapshots||[]).map((s:any)=>({...s,evidence:evidence.filter(e=>e.repository===s.repository)}));
    };
    await pool.query('UPDATE audits SET status=\'running\',error=NULL,updated_at=now() WHERE id=$1 AND org_id=$2 AND cancelled=false',[id,orgId]);
    for(const stage of STAGES){
      if(await cancelled())return;
      row=(await pool.query('SELECT * FROM audits WHERE id=$1 AND org_id=$2',[id,orgId])).rows[0];
      if(row.stages[stage]?.status==='completed')continue;
      const attempt=(await pool.query('INSERT INTO stage_attempts(org_id,audit_id,stage,status) VALUES($1,$2,$3,\'running\') RETURNING id',[orgId,id,stage])).rows[0].id;
      await pool.query('UPDATE audits SET stage=$3,stages=jsonb_set(stages,ARRAY[$3],$4::jsonb),updated_at=now() WHERE id=$1 AND org_id=$2 AND cancelled=false',[id,orgId,stage,JSON.stringify({status:'running',startedAt:new Date().toISOString()})]);
      try {
        if(stage==='scout') {
          const snapshots=await loadSnapshots();
          for(const repository of row.input.repositories){if(snapshots.some(s=>s.repository===repository))continue;const snapshot=await ingest(repository,cancelled);snapshot.evidence.push(makeEvidence(repository,snapshot.sha,'metadata','source-index.json',JSON.stringify({complete:snapshot.coverage.complete,files:snapshot.evidence.filter(e=>e.kind==='code').map(e=>e.path)},null,2),`https://github.com/${repository}/tree/${snapshot.sha}`));snapshots.push(snapshot);await saveSnapshots(id,orgId,snapshots);}
        } else if(stage==='forensics') {
          const snapshots=await loadSnapshots();const findings=[];
          const corpus=(await pool.query('SELECT * FROM template_corpus WHERE org_id=$1 ORDER BY version,repository',[orgId])).rows;
          for(const snapshot of snapshots){
            findings.push(...await inspect(snapshot,row.input));
            if(corpus.length){const matches=corpus.flatMap(template=>template.entries.filter((e:any)=>!excludedPath(e.path)&&Object.values(snapshot.metadata.blobHashes||{}).includes(e.sha)).map((e:any)=>({template:template.repository,version:template.version,templateSha:template.sha,templatePath:e.path,blob:e.sha,sourceUrl:`https://github.com/${template.repository}/blob/${template.sha}/${e.path}`})));
              const evidence=makeEvidence(snapshot.repository,snapshot.sha,'comparison','template-comparison.json',JSON.stringify({templates:corpus.map(c=>({repository:c.repository,version:c.version,sha:c.sha,license:c.source_license})),matches},null,2),`https://github.com/${snapshot.repository}/tree/${snapshot.sha}`);snapshot.evidence.push(evidence);
              const index=findings.findIndex(f=>f.pillar==='similarity'&&f.status==='UNKNOWN');
              const finding={pillar:'similarity',status:matches.length?'WARN' as const:'PASS' as const,observations:[`${matches.length} blobs match the approved template corpus. Reuse is not itself misconduct.`,'Comparison coverage is limited to configured templates and declared upstream.'],evidenceIds:[evidence.id],coverage:`${corpus.length} revision-pinned templates`,ruleVersion:'forensics-v1'};
              if(index>=0)findings[index]=finding;else findings.push(finding);
            }
          }
          await saveSnapshots(id,orgId,snapshots);await pool.query('UPDATE audits SET findings=$3 WHERE id=$1 AND org_id=$2 AND cancelled=false',[id,orgId,JSON.stringify(findings)]);
        } else if(stage==='judge') {
          const judgment=await judge(await loadSnapshots(),row.findings,row.input);await pool.query('UPDATE audits SET judgment=$3 WHERE id=$1 AND org_id=$2 AND cancelled=false',[id,orgId,judgment]);
        } else {
          const assessment=synthesize(await loadSnapshots(),row.findings,row.judgment||incompleteJudgment('Evaluation unavailable'));
          await pool.query('UPDATE audits SET assessment=$3,status=$4 WHERE id=$1 AND org_id=$2 AND cancelled=false',[id,orgId,assessment,assessment.overallScore===null?'partial':'completed']);
        }
        await pool.query('UPDATE stage_attempts SET status=\'completed\',finished_at=now() WHERE id=$1',[attempt]);
        await pool.query('UPDATE audits SET stages=jsonb_set(stages,ARRAY[$3],$4::jsonb),updated_at=now() WHERE id=$1 AND org_id=$2 AND cancelled=false',[id,orgId,stage,JSON.stringify({status:'completed',finishedAt:new Date().toISOString()})]);
      } catch(error){
        await pool.query('UPDATE stage_attempts SET status=\'failed\',error=$2,finished_at=now() WHERE id=$1',[attempt,error instanceof Error?error.message:'Stage failed']);
        if(await cancelled())return;
        await pool.query('UPDATE audits SET error=$3,stages=jsonb_set(stages,ARRAY[$4],$5::jsonb),updated_at=now() WHERE id=$1 AND org_id=$2',[id,orgId,error instanceof Error?error.message:'Stage failed',stage,JSON.stringify({status:'retrying'})]);throw error;
      }
    }
  } finally {await lock.query('SELECT pg_advisory_unlock(hashtext($1))',[id]);lock.release();}
}
export async function dispatchOutbox(){
  await transaction(async c=>{
    const rows=(await c.query('SELECT * FROM outbox WHERE dispatched_at IS NULL ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 20')).rows;
    for(const row of rows){await queue.add(row.kind,row.payload,{jobId:row.id,attempts:3,backoff:{type:'provider'},removeOnComplete:{age:86400},removeOnFail:{age:604800}});await c.query('UPDATE outbox SET dispatched_at=now() WHERE id=$1',[row.id]);}
  });
}
const worker=new Worker('sift',async job=>{
  if(job.name==='audit')return runAudit(job.data.auditId,job.data.orgId);
  if(job.name==='report')return generateReport(job.data.reportId,job.data.orgId);
  if(job.name==='dataset')return importDataset(job.data.importId,job.data.orgId);
  throw new UnrecoverableError('Unknown job type');
},{connection,concurrency:config.WORKER_CONCURRENCY,settings:{backoffStrategy:(attempts,_type,error)=>error instanceof ProviderError?error.retryAfterMs:Math.min(300000,1000*2**attempts)}});
worker.on('failed',async(job,error)=>{
  if(!job)return;console.error(JSON.stringify({event:'job_failed',jobId:job.id,kind:job.name,attempt:job.attemptsMade,error:error.message}));
  if(job.attemptsMade<(job.opts.attempts||1))return;
  if(job.name==='audit')await pool.query('UPDATE audits SET status=\'failed\',error=$3,updated_at=now() WHERE id=$1 AND org_id=$2 AND cancelled=false',[job.data.auditId,job.data.orgId,error.message]);
  if(job.name==='report')await pool.query('UPDATE reports SET status=\'failed\',error=$3 WHERE id=$1 AND org_id=$2',[job.data.reportId,job.data.orgId,error.message]);
  if(job.name==='dataset')await pool.query('UPDATE dataset_imports SET status=\'failed\',error=$3 WHERE id=$1 AND org_id=$2',[job.data.importId,job.data.orgId,error.message]);
});
worker.on('error',error=>console.error(JSON.stringify({event:'worker_error',message:error.message})));
let dispatching=false;
const interval=setInterval(async()=>{if(dispatching)return;dispatching=true;try{await dispatchOutbox();}catch(error){console.error(JSON.stringify({event:'dispatch_failed',message:error instanceof Error?error.message:'Error'}));}finally{dispatching=false;}},1000);
console.log(JSON.stringify({event:'worker_started',concurrency:config.WORKER_CONCURRENCY}));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{clearInterval(interval);await worker.close();await queue.close();await pool.end();process.exit(0);});
