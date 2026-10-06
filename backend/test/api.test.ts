import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {once} from 'node:events';
import {app} from '../src/app.ts';
import {pool} from '../src/db.ts';
import {config} from '../src/config.ts';
import {createPdf} from '../src/reports.ts';
test('dossier is a real PDF with a provenance section',async()=>{
  const pdf=await createPdf({candidate:{name:'Synthetic fixture'},auditId:randomUUID(),generatedAt:'2026-01-01',findings:[],sources:[],decisions:[],manifestHash:'test hash'});
  assert.equal(pdf.subarray(0,4).toString(),'%PDF');assert.ok(pdf.length>1000);
});
test('tenant isolation, idempotency, role enforcement and persistent audit state',{skip:process.env.INTEGRATION_TESTS!=='true'},async()=>{
  const server=app.listen(0,'127.0.0.1');await once(server,'listening');const address=server.address() as {port:number};const base=`http://127.0.0.1:${address.port}`;
  const foreign=randomUUID(),foreignCandidate=randomUUID(),foreignAudit=randomUUID(),foreignCohort=randomUUID();let cohortId:string|undefined;const audits:string[]=[];
  const request=async(path:string,body?:unknown,method=body?'POST':'GET',key?:string)=>fetch(base+path,{method,headers:{'Content-Type':'application/json',...(key?{'Idempotency-Key':key}:{})},body:body?JSON.stringify(body):undefined});
  try {
    await pool.query('INSERT INTO organizations(id,name) VALUES($1,\'Synthetic tenant fixture\')',[foreign]);
    await pool.query('INSERT INTO cohorts(id,org_id,name,workflow) VALUES($1,$2,\'Synthetic\',\'hackathon\')',[foreignCohort,foreign]);
    await pool.query('INSERT INTO candidates(id,org_id,cohort_id,name) VALUES($1,$2,$3,\'Synthetic\')',[foreignCandidate,foreign,foreignCohort]);
    await pool.query('INSERT INTO audits(id,org_id,candidate_id,input,created_by) VALUES($1,$2,$3,$4,$5)',[foreignAudit,foreign,foreignCandidate,{},config.LOCAL_USER_ID]);
    assert.equal((await request(`/api/audits/${foreignAudit}`)).status,404);
    assert.equal((await request(`/api/candidates/${foreignCandidate}`)).status,404);
    assert.equal((await request(`/api/audits/${foreignAudit}/cancel`,{})).status,404);
    const cohort=await request('/api/cohorts',{name:'Synthetic integration cohort',workflow:'hackathon'});assert.equal(cohort.status,201);cohortId=(await cohort.json()).id;
    const input={workflow:'hackathon',cohortId,candidateName:'Synthetic fixture',repositories:['test/repo']};
    const key=randomUUID();const response=await request('/api/audits',input,'POST',key);assert.equal(response.status,202);const job=await response.json();audits.push(job.id);
    const replay=await request('/api/audits',input,'POST',key);assert.equal((await replay.json()).id,job.id);
    assert.equal((await request('/api/audits',{...input,candidateName:'Changed'},'POST',key)).status,409);
    assert.equal((await request(`/api/audits/${job.id}`)).status,200);
    await pool.query('UPDATE memberships SET role=\'viewer\' WHERE org_id=$1 AND user_id=$2',[config.LOCAL_ORG_ID,config.LOCAL_USER_ID]);
    assert.equal((await request('/api/cohorts',{name:'Forbidden',workflow:'hackathon'})).status,403);
    await pool.query('UPDATE memberships SET role=\'admin\' WHERE org_id=$1 AND user_id=$2',[config.LOCAL_ORG_ID,config.LOCAL_USER_ID]);
    assert.equal((await request(`/api/audits/${job.id}/cancel`,{})).status,200);
    assert.equal((await (await request(`/api/audits/${job.id}`)).json()).status,'cancelled');
  } finally {
    await pool.query('UPDATE memberships SET role=\'admin\' WHERE org_id=$1 AND user_id=$2',[config.LOCAL_ORG_ID,config.LOCAL_USER_ID]);
    for(const id of audits)await pool.query('DELETE FROM outbox WHERE payload->>\'auditId\'=$1',[id]);
    if(cohortId)await pool.query('DELETE FROM cohorts WHERE id=$1 AND org_id=$2',[cohortId,config.LOCAL_ORG_ID]);
    await pool.query('DELETE FROM organizations WHERE id=$1',[foreign]);
    await new Promise<void>(resolve=>server.close(()=>resolve()));
  }
});
test.after(async()=>{await pool.end();});
