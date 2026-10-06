import Papa from 'papaparse';
import { randomUUID,createHash } from 'node:crypto';
import {pool,transaction} from './db.ts';
import {config} from './config.ts';
export async function importDataset(importId:string,orgId:string){
  if(config.DATASET_LICENSE_APPROVED!=='true')throw new Error('Dataset usage rights have not been approved');
  const row=(await pool.query('SELECT * FROM dataset_imports WHERE id=$1 AND org_id=$2',[importId,orgId])).rows[0];if(!row||row.status==='completed')return;
  await pool.query('UPDATE dataset_imports SET status=\'running\',error=NULL WHERE id=$1 AND org_id=$2',[importId,orgId]);
  const files=['candidate_text_df.csv','final_df.csv','sample_candidates.csv'];const records=new Map<string,Record<string,unknown>>();const hashes:Record<string,string>={};const limits:string[]=[];
  for(const file of files){
    const url=`https://huggingface.co/datasets/sarajain123/Redrob-Dataset/resolve/${row.revision}/${file}`;
    const response=await fetch(url,{signal:AbortSignal.timeout(120000)});if(!response.ok||!response.body)throw new Error(`Dataset file unavailable: ${file}`);
    const chunks:Uint8Array[]=[];let size=0;const reader=response.body.getReader();
    while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>50*1024*1024){await reader.cancel();throw new Error(`Dataset file exceeds 50 MiB import budget: ${file}`);}chunks.push(value);}
    const content=Buffer.concat(chunks);hashes[file]=createHash('sha256').update(content).digest('hex');
    const parsed=Papa.parse<Record<string,string>>(content.toString('utf8'),{header:true,skipEmptyLines:true});if(parsed.errors.length)throw new Error(`Dataset CSV schema could not be parsed: ${file}`);
    if(!parsed.meta.fields?.includes('candidate_id'))throw new Error(`Dataset file has no candidate_id: ${file}`);
    for(const record of parsed.data){const id=record.candidate_id;if(!/^CAND_\d+$/.test(id))continue;if(!records.has(id)&&records.size>=50000){if(!limits.includes('Records capped at 50000'))limits.push('Records capped at 50000');continue;}const prior=records.get(id)||{candidate_id:id};records.set(id,{...prior,[file]:record});}
  }
  await transaction(async c=>{
    await c.query('SELECT id FROM dataset_imports WHERE id=$1 AND org_id=$2 FOR UPDATE',[importId,orgId]);
    const exists=await c.query('SELECT status FROM dataset_imports WHERE id=$1 AND org_id=$2',[importId,orgId]);if(!exists.rowCount||exists.rows[0].status==='completed')return;
    for(const [candidateId,claims] of records)await c.query('INSERT INTO candidates(id,org_id,cohort_id,name,source,claims) VALUES($1,$2,$3,$4,\'dataset\',$5)',[randomUUID(),orgId,row.manifest.cohortId,candidateId,{...claims,revision:row.revision,importId,verification:'unverified-profile-claims'}]);
    await c.query('UPDATE dataset_imports SET status=\'completed\',manifest=$3 WHERE id=$1 AND org_id=$2',[importId,orgId,{...row.manifest,hashes,records:records.size,limits,verification:'profile claims only; no forensic scores assigned'}]);
  });
}
