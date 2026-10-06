import { parse } from '@babel/parser';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { RULE_VERSION, type Snapshot, type Finding, type AuditSubmission } from '@sift/contracts';
import { makeEvidence } from './ingestion.ts';
import { githubRequest, ProviderError } from './github.ts';
export type FunctionFact={name:string;line:number;endLine:number;empty:boolean;placeholder:boolean;complexity:number};
export function javascriptFacts(content:string,typescript=false):FunctionFact[] {
  const ast=parse(content,{sourceType:'unambiguous',plugins:typescript?['typescript','jsx']:['jsx']});
  const functions:FunctionFact[]=[];
  function walk(node:any) {
    if(!node||typeof node!=='object')return;
    if(['FunctionDeclaration','FunctionExpression','ArrowFunctionExpression','ObjectMethod','ClassMethod'].includes(node.type)) {
      const body=node.body?.body||[];const block=node.body?.type==='BlockStatement';let branches=0;
      const count=(n:any)=>{if(!n||typeof n!=='object')return;if(['IfStatement','ConditionalExpression','ForStatement','ForOfStatement','ForInStatement','WhileStatement','SwitchCase','CatchClause','LogicalExpression'].includes(n.type))branches++;for(const [k,v] of Object.entries(n)){if(['loc','start','end'].includes(k))continue;if(Array.isArray(v))v.forEach(count);else if(v&&typeof v==='object')count(v);}};
      count(node.body);
      functions.push({name:node.id?.name||node.key?.name||'anonymous',line:node.loc?.start.line||1,endLine:node.loc?.end.line||1,empty:block&&body.length===0,placeholder:body.some((s:any)=>s.type==='ThrowStatement'&&/not implemented|todo/i.test(content.slice(s.start,s.end))),complexity:1+branches});
    }
    for(const [key,value] of Object.entries(node)){if(['loc','start','end'].includes(key))continue;if(Array.isArray(value))value.forEach(walk);else if(value&&typeof value==='object')walk(value);}
  }
  walk(ast);return functions;
}
export function pythonFacts(content:string):Promise<FunctionFact[]> {
  return new Promise((resolve,reject)=>{
    const child=spawn('python3',['-I',fileURLToPath(new URL('../scripts/python_ast.py',import.meta.url))],{stdio:['pipe','pipe','pipe']});
    let output='';const timer=setTimeout(()=>child.kill('SIGKILL'),3000);
    child.stdout.on('data',chunk=>{output+=chunk;if(output.length>2*1024*1024)child.kill('SIGKILL');});
    child.on('error',error=>{clearTimeout(timer);reject(error);});
    child.on('close',code=>{clearTimeout(timer);try{if(code!==0)throw new Error('Python parser failed');const result=JSON.parse(output);if(result.error)throw new Error(result.error);resolve(result.functions);}catch(error){reject(error);}});
    child.stdin.end(JSON.stringify({content}));
  });
}
export async function inspect(snapshot:Snapshot,input:AuditSubmission):Promise<Finding[]> {
  const finding=(pillar:string,status:Finding['status'],observations:string[],evidenceIds:string[],coverage:string):Finding=>({pillar,status,observations,evidenceIds,coverage,ruleVersion:RULE_VERSION});
  const history=snapshot.evidence.find(e=>e.path==='history.json');const commits=snapshot.commits;
  const findings:Finding[]=[];
  const sprint=input.sprint;
  const outside=sprint?commits.filter(c=>Date.parse(c.authorDate)<Date.parse(sprint.start)||Date.parse(c.commitDate)>Date.parse(sprint.end)):[];
  const dateAnomalies=commits.filter(c=>Math.abs(Date.parse(c.authorDate)-Date.parse(c.commitDate))>86400000);
  findings.push(finding('timeline',!commits.length?'UNKNOWN':sprint&&(outside.length||dateAnomalies.length)?'WARN':sprint?'PASS':'UNKNOWN',[
    sprint?`${outside.length} observed commits have dates outside the declared sprint; imported history may be legitimate.`:'No sprint window supplied.',
    `${dateAnomalies.length} commits have author/committer date differences greater than one day.`,
    'Commit timestamps and missing push events cannot prove when code was originally written.',
  ],history?[history.id]:[],'Snapshot history and available public events; no attestation of original creation time.'));
  const total=commits.reduce((n,c)=>n+c.additions,0);const initial=commits.slice(0,2).reduce((n,c)=>n+c.additions,0);const ratio=total?initial/total:0;
  const truncated=snapshot.coverage.limitations.some(l=>l.startsWith('Commit history capped'));
  findings.push(finding('bulk-import',!total||truncated?'UNKNOWN':ratio>=.9?'WARN':'PASS',[`${Math.round(ratio*100)}% of observed additions occur in the first two analyzed commits.`, 'Bulk imports are a review signal; this does not establish misconduct.'],history?[history.id]:[],'Generated/vendor/lock files excluded; additions measure churn, not original engineering effort.'));
  const authors=new Map<string,{name:string;churn:number;commits:number}>();
  for(const commit of commits){const key=commit.email.toLowerCase();const current=authors.get(key)||{name:commit.author,churn:0,commits:0};current.churn+=commit.meaningfulAdditions+commit.meaningfulDeletions;current.commits++;authors.set(key,current);}
  const contributions=Array.from(authors,([email,a])=>({...a,email,survivingLines:snapshot.blame[email]||0}));
  const identityEvidence=makeEvidence(snapshot.repository,snapshot.sha,'metadata','contributions.json',JSON.stringify({authors:contributions,declaredTeam:input.team},null,2),`https://github.com/${snapshot.repository}/commits/${snapshot.sha}`);snapshot.evidence.push(identityEvidence);
  findings.push(finding('contributions',!commits.length?'UNKNOWN':'PASS',[
    `${contributions.length} author email identities observed; aliases, bots, pair programming, and non-code work require reviewer interpretation.`,
    input.team.length?`${input.team.length} team members declared; author emails are not automatically equated with GitHub handles.`:'No team roster supplied.',
    ...contributions.slice(0,10).map(a=>`${a.name}: ${a.churn} substantive changed lines, ${a.survivingLines} surviving parsed-source lines, ${a.commits} commits.`),
  ],[identityEvidence.id],'Descriptive contribution evidence; no automatic passenger verdict.'));
  const facts:{evidenceId:string;path:string;functions:FunctionFact[]}[]=[];let unsupported=0,failed=0;
  for(const evidence of snapshot.evidence.filter(e=>e.kind==='code')) {
    if(/(^|\/)(__tests__|tests?|fixtures|mocks)(\/|$)|\.(test|spec)\./i.test(evidence.path))continue;
    try{if(/\.(js|jsx|ts|tsx)$/.test(evidence.path))facts.push({evidenceId:evidence.id,path:evidence.path,functions:javascriptFacts(evidence.content,/\.tsx?$/.test(evidence.path))});
    else if(evidence.path.endsWith('.py'))facts.push({evidenceId:evidence.id,path:evidence.path,functions:await pythonFacts(evidence.content)});
    else if(!/\.(md|json|yml|yaml|txt|toml|ini|html|css)$/i.test(evidence.path))unsupported++;}
    catch{failed++;snapshot.coverage.complete=false;snapshot.coverage.limitations.push(`AST parser could not analyze ${evidence.path}`);}
  }
  const hollow=facts.flatMap(f=>f.functions.filter(n=>n.empty||n.placeholder).map(n=>({...n,evidenceId:f.evidenceId,path:f.path})));
  findings.push(finding('implementation',!facts.length||failed||unsupported?'UNKNOWN':hollow.length?'WARN':'PASS',[
    `${facts.length} JS/TS/Python source files parsed; ${failed} failed; ${unsupported} files use unsupported languages.`,
    ...hollow.slice(0,20).map(f=>`${f.path}:${f.line} — ${f.empty?'empty function':'explicit unimplemented placeholder'} (${f.name}).`),
    'Static patterns are review signals, not proof of AI authorship. Test artifacts and reported CI outcomes do not establish independently reproduced coverage.',
  ],[...new Set(hollow.length?hollow.map(f=>f.evidenceId):facts.map(f=>f.evidenceId))].slice(0,20),'JS/TS and Python ASTs; submitted projects are never executed.'));
  if(unsupported){snapshot.coverage.complete=false;snapshot.coverage.limitations.push(`${unsupported} source files have unsupported AST languages`);}
  const matches:any[]=[];
  if(snapshot.metadata.parent && snapshot.metadata.blobHashes) {
    const [owner,repo]=snapshot.metadata.parent.full_name.split('/');
    try {
      const parent=await githubRequest('GET /repos/{owner}/{repo}',{owner,repo});
      const head=await githubRequest('GET /repos/{owner}/{repo}/commits/{ref}',{owner,repo,ref:parent.data.default_branch});
      const tree=await githubRequest('GET /repos/{owner}/{repo}/git/trees/{tree_sha}',{owner,repo,tree_sha:head.data.sha,recursive:'1'});
      const hashes=new Set(tree.data.tree.filter((e:any)=>e.type==='blob').map((e:any)=>e.sha));
      for(const [path,hash] of Object.entries(snapshot.metadata.blobHashes))if(hashes.has(hash))matches.push({path,blob:hash});
      const comparison=makeEvidence(snapshot.repository,snapshot.sha,'comparison','upstream-comparison.json',JSON.stringify({upstream:parent.data.full_name,upstreamSha:head.data.sha,matches,truncated:tree.data.truncated},null,2),`${parent.data.html_url}/tree/${head.data.sha}`);snapshot.evidence.push(comparison);
      const hasLicense=snapshot.evidence.some(e=>e.kind==='code'&&/(^|\/)(licen[cs]e|copying)(\.|$)/i.test(e.path));
      findings.push(finding('similarity',tree.data.truncated?'UNKNOWN':parent.data.license&&!hasLicense?'WARN':'PASS',[`${matches.length} files exactly match blobs from declared upstream ${parent.data.full_name}.`,parent.data.license&&!hasLicense?'Upstream declares a license; no license file observed in this snapshot. Review licensing obligations.':'Fork reuse alone is not misconduct.','Curated template corpus is not configured; unrelated public-code matches are outside comparison coverage.'],[comparison.id],'Exact blob comparison against declared fork upstream only; no universal plagiarism claim.'));
    } catch(error){if(error instanceof ProviderError)throw error;findings.push(finding('similarity','UNKNOWN',['Upstream comparison unavailable.'],[],'No upstream evidence acquired.'));}
  } else findings.push(finding('similarity','UNKNOWN',['No declared fork upstream or approved template corpus available.','Repository originality and licensing compliance have not been established.'],[],'No comparison corpus; public-code discovery is not enabled.'));
  snapshot.metadata.astFacts=facts;
  return findings;
}
