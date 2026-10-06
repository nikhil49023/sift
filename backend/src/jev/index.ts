import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { JudgeOutput, DIMENSIONS, WEIGHTS, RULE_VERSION, RUBRIC_VERSION, PROMPT_VERSION, type Evidence, type Judgment, type Snapshot, type Finding, type AuditSubmission } from '@sift/contracts';
import { config } from '../config.ts';
import { SYSTEM_PROMPT } from './rubric.ts';

export function validateJudgment(value:unknown,evidence:Evidence[]):Judgment {
  const result=JudgeOutput.parse(value);const byId=new Map(evidence.map(e=>[e.id,e]));
  const validateCitation=(citation:Judgment['dimensions']['systemsRigor']['citations'][number])=>{
    const item=byId.get(citation.evidenceId);if(!item)throw new Error(`Unknown evidence ID: ${citation.evidenceId}`);
    let content=item.content;
    if(item.kind==='code'&&(citation.startLine===undefined||citation.endLine===undefined))throw new Error('Code citation requires both line bounds');
    if(citation.startLine!==undefined||citation.endLine!==undefined){
      const lines=content.split('\n');const start=citation.startLine,end=citation.endLine;
      if(start===undefined||end===undefined||end<start||end>lines.length)throw new Error('Citation line range is invalid');
      content=lines.slice(start-1,end).join('\n');
    }
    if(!content.includes(citation.excerpt))throw new Error('Citation excerpt does not match the captured evidence');
    return item;
  };
  for(const dimension of DIMENSIONS){
    const item=result.dimensions[dimension];
    if(item.level!==null&&item.citations.length===0)throw new Error(`Scored dimension ${dimension} has no citation`);
    const sources=item.citations.map(validateCitation);
    if(item.level===0&&dimension==='testingVerification'&&sources.some(e=>e.path==='source-index.json'&&JSON.parse(e.content).complete!==true))throw new Error('Absence cannot be scored from an incomplete source index');
    if(item.level!==null&&['systemsRigor','algorithmicDepth'].includes(dimension)&&!sources.some(e=>e.kind==='code'))throw new Error(`${dimension} requires source-code evidence`);
    if(item.level!==null&&dimension==='collaborationHygiene'&&!sources.some(e=>['commit','review'].includes(e.kind)))throw new Error('Collaboration score requires commit or review evidence');
    if(item.level!==null&&dimension==='testingVerification'&&!sources.some(e=>e.kind==='ci'||e.kind==='code'&&/(^|\/)(tests?|__tests__)(\/|$)|\.(test|spec)\./.test(e.path)||e.path==='source-index.json'&&item.level===0))throw new Error('Testing score requires test/CI evidence or complete source index for level zero');
  }
  result.roleFit?.citations.forEach(validateCitation);
  if(result.roleFit&&!result.roleFit.citations.length)throw new Error('Role-fit explanation requires evidence');
  return result;
}
export function incompleteJudgment(reason:string):Judgment {
  const dimension=()=>({level:null,rationale:reason,citations:[]});
  return {summary:reason,roleFit:null,dimensions:{systemsRigor:dimension(),algorithmicDepth:dimension(),testingVerification:dimension(),collaborationHygiene:dimension()}};
}
export async function judge(snapshots:Snapshot[],findings:Finding[],input:AuditSubmission):Promise<Judgment> {
  if(!config.GEMINI_API_KEY)return incompleteJudgment('JEV evaluation is unavailable: GEMINI_API_KEY is not configured. Forensic observations remain available.');
  const all=snapshots.flatMap(s=>s.evidence);
  const priority=(e:Evidence)=>e.kind==='ci'||e.kind==='commit'?0:e.kind==='code'&&/test|spec/i.test(e.path)?1:e.kind==='code'?2:3;
  let bytes=0;const packet:Evidence[]=[];
  for(const e of [...all].sort((a,b)=>priority(a)-priority(b))) {
    // Include whole evidence objects or skip them; excerpt validation always uses the same captured content.
    if(e.content.length>20000||bytes+e.content.length>80000)continue;
    packet.push(e);bytes+=e.content.length;
    if(packet.length>=80)break;
  }
  const client=new GoogleGenAI({apiKey:config.GEMINI_API_KEY,httpOptions:{timeout:90000}});
  let correction='';
  for(let attempt=0;attempt<2;attempt++) {
    const response=await client.models.generateContent({model:config.GEMINI_MODEL,contents:JSON.stringify({evidence:packet,findings,coverage:snapshots.map(s=>({repository:s.repository,...s.coverage})),jobDescription:input.jobDescription||null,packetCoverage:{selected:packet.length,total:all.length},correction}),config:{systemInstruction:SYSTEM_PROMPT,responseMimeType:'application/json',responseJsonSchema:z.toJSONSchema(JudgeOutput),temperature:0}});
    console.log(JSON.stringify({event:'judge_usage',model:config.GEMINI_MODEL,attempt:attempt+1,inputTokens:response.usageMetadata?.promptTokenCount,outputTokens:response.usageMetadata?.candidatesTokenCount,totalTokens:response.usageMetadata?.totalTokenCount}));
    try{const result=validateJudgment(JSON.parse(response.text||''),packet);if(!input.jobDescription&&result.roleFit)throw new Error('Role fit requires a job description');return result;}
    catch(error){correction=`The previous response was rejected: ${error instanceof Error?error.message:'invalid output'}. Return a corrected response using only packet evidence.`;}
  }
  return incompleteJudgment('JEV output failed evidence/schema verification after one correction attempt. No score was published.');
}
export function synthesize(snapshots:Snapshot[],findings:Finding[],judgment:Judgment) {
  const complete=snapshots.every(s=>s.coverage.complete)&&DIMENSIONS.every(k=>judgment.dimensions[k].level!==null);
  const overallScore=complete?Math.round(DIMENSIONS.reduce((n,k)=>n+judgment.dimensions[k].level!*25*WEIGHTS[k],0)*10)/10:null;
  const riskLevel=findings.some(f=>f.status==='FAIL')?'FLAGGED':findings.some(f=>f.status==='WARN')?'REVIEW_REQUIRED':findings.some(f=>f.status==='UNKNOWN')?'INSUFFICIENT_EVIDENCE':'NO_FLAGS_OBSERVED';
  const evidence=snapshots.flatMap(s=>s.evidence);
  const citationIds=new Set(DIMENSIONS.flatMap(k=>judgment.dimensions[k].citations.map(c=>c.evidenceId)));
  return {overallScore,rankable:complete,riskLevel,summary:judgment.summary,roleFit:judgment.roleFit,dimensions:judgment.dimensions,
    citations:evidence.filter(e=>citationIds.has(e.id)).map(({id,path,repository,sha,sourceUrl,hash,retrievedAt})=>({id,path,repository,sha,sourceUrl,hash,retrievedAt})),
    coverage:snapshots.map(s=>({repository:s.repository,sha:s.sha,...s.coverage})),
    versions:{rules:RULE_VERSION,rubric:RUBRIC_VERSION,prompt:PROMPT_VERSION,model:config.GEMINI_API_KEY?config.GEMINI_MODEL:null},
    limitations:['No submitted code was executed; CI outcomes are reported evidence.','Scores support human review; they are not hiring or jury decisions.','Citation validation establishes source correspondence, not the truth of every inference.'],
  };
}
