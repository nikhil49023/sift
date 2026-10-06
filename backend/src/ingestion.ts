import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, rm, readdir, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { config } from './config.ts';
import { githubRequest, pages, ProviderError } from './github.ts';
import { Repository, type Evidence, type Snapshot } from '@sift/contracts';
const execute=promisify(execFile);
export const excludedPath=(path:string)=>/(^|\/)(node_modules|vendor|dist|build|\.venv|venv|coverage|\.next)(\/|$)|(^|\/)(package-lock\.json|pnpm-lock\.yaml|yarn\.lock)|\.(min\.js|map|svg|png|jpg|jpeg|pdf|woff2?|lock)$/i.test(path);
const substantive=(path:string)=>!excludedPath(path)&&!/\.(md|txt|rst)$/i.test(path);
export function makeEvidence(repository:string,sha:string,kind:Evidence['kind'],path:string,content:string,sourceUrl:string,observedAt?:string):Evidence {
  const hash=createHash('sha256').update(content).digest('hex');
  return {id:createHash('sha256').update(`${repository}:${sha}:${kind}:${path}:${hash}`).digest('hex'),repository,sha,kind,path,content,hash,sourceUrl,retrievedAt:observedAt||new Date().toISOString()};
}
async function folderBytes(directory:string):Promise<number> {
  let size=0;
  for(const entry of await readdir(directory,{withFileTypes:true})) {const path=join(directory,entry.name);size+=entry.isDirectory()?await folderBytes(path):(await stat(path)).size;}
  return size;
}
export function parseLog(raw:string):Snapshot['commits'] {
  return raw.split('\x1e').filter(Boolean).flatMap(block=> {
    const [header,...lines]=block.trim().split('\n'); const [sha,author,email,authorDate,commitDate]=header.split('\x1f');
    if(!/^[a-f0-9]{40,64}$/.test(sha||'')) return [];
    let additions=0,deletions=0,meaningfulAdditions=0,meaningfulDeletions=0;
    for(const line of lines){const [a,d,path]=line.split('\t');if(!path||excludedPath(path)||a==='-')continue;const add=Number(a)||0,del=Number(d)||0;additions+=add;deletions+=del;if(substantive(path)){meaningfulAdditions+=add;meaningfulDeletions+=del;}}
    return [{sha,author,email,authorDate,commitDate,additions,deletions,meaningfulAdditions,meaningfulDeletions}];
  });
}
export async function ingest(repository:string,cancelled:()=>Promise<boolean>):Promise<Snapshot> {
  repository=Repository.parse(repository);
  const [owner,repo]=repository.split('/');
  const metadataResponse=await githubRequest('GET /repos/{owner}/{repo}',{owner,repo});
  const metadata=metadataResponse.data;
  if(metadata.private) throw new Error('Private repositories are outside this release');
  const head=await githubRequest('GET /repos/{owner}/{repo}/commits/{ref}',{owner,repo,ref:metadata.default_branch});
  const sha=head.data.sha; if(!/^[a-f0-9]{40,64}$/.test(sha))throw new Error('Invalid upstream snapshot SHA');
  const snapshot:Snapshot={repository,sha,evidence:[],coverage:{complete:true,limitations:[],filesAnalyzed:0,commitsAnalyzed:0,excludedFiles:0},commits:[],blame:{},metadata:{...metadata,observedAt:metadataResponse.observedAt}};
  const add=(kind:Evidence['kind'],path:string,content:string,url:string,at?:string)=>snapshot.evidence.push(makeEvidence(repository,sha,kind,path,content,url,at));
  const limit=(message:string)=>{snapshot.coverage.complete=false;snapshot.coverage.limitations.push(message);};
  add('metadata','repository.json',JSON.stringify(metadata,null,2),metadata.html_url,metadataResponse.observedAt);
  for(const [label,route,params] of [
    ['events','GET /repos/{owner}/{repo}/events',{owner,repo}],
    ['pullRequests','GET /repos/{owner}/{repo}/pulls',{owner,repo,state:'all',sort:'updated',direction:'desc'}],
  ] as const) {
    try {const result=await pages(route,params,1);snapshot.metadata[label]=result.data;if(!result.complete)limit(`${label} sampled to the most recent 100 entries`);add(label==='events'?'metadata':'review',`${label}.json`,JSON.stringify(result.data,null,2),`${metadata.html_url}/${label==='events'?'activity':'pulls'}`);}
    catch(error){if(error instanceof ProviderError)throw error;limit(`${label} unavailable`);}
  }
  snapshot.coverage.limitations.push('Push observations are limited to GitHub event history; commit dates do not prove original authorship.');
  try {
    const result=await githubRequest('GET /repos/{owner}/{repo}/commits/{ref}/check-runs',{owner,repo,ref:sha,per_page:100});
    snapshot.metadata.checkRuns=result.data.check_runs;
    if(result.data.total_count>100)limit('CI check runs truncated to 100');
    add('ci','check-runs.json',JSON.stringify(result.data,null,2),`${metadata.html_url}/commit/${sha}/checks`,result.observedAt);
  } catch(error){if(error instanceof ProviderError)throw error;limit('CI check results unavailable');}
  snapshot.metadata.reviews=[];
  for(const pr of (snapshot.metadata.pullRequests||[]).slice(0,10)) {
    if(await cancelled())throw new Error('Audit cancelled');
    try {const reviews=await pages('GET /repos/{owner}/{repo}/pulls/{pull_number}/reviews',{owner,repo,pull_number:pr.number},1);snapshot.metadata.reviews.push(...reviews.data);add('review',`pr-${pr.number}-reviews.json`,JSON.stringify(reviews.data,null,2),pr.html_url);if(!reviews.complete)limit(`PR ${pr.number} reviews truncated`);}
    catch(error){if(error instanceof ProviderError)throw error;limit(`PR ${pr.number} reviews unavailable`);}
  }
  if((snapshot.metadata.pullRequests||[]).length>10)limit('Review content sampled from the 10 most recently updated pull requests');
  const directory=await mkdtemp(join(tmpdir(),'sift-'));
  snapshot.metadata.blobHashes={};
  const started=Date.now();
  const git=async(args:string[],maxBuffer=32*1024*1024)=> {
    if(await cancelled())throw new Error('Audit cancelled');
    const remaining=config.MAX_REPO_MS-(Date.now()-started);if(remaining<=0)throw new Error('Repository time budget exceeded');
    const child=execute('git',['-c','core.hooksPath=/dev/null','-c','credential.helper=','-c','protocol.file.allow=never',...args],{cwd:directory,timeout:remaining,maxBuffer,env:{...process.env,GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:'/dev/null',GIT_TERMINAL_PROMPT:'0',GIT_LFS_SKIP_SMUDGE:'1'}});
    let monitoring=false,breached=false;
    const monitor=setInterval(async()=>{if(monitoring)return;monitoring=true;try{if(await cancelled()||await folderBytes(directory)>config.MAX_REPO_BYTES){breached=true;child.child.kill('SIGKILL');}}catch{}finally{monitoring=false;}},1000);
    try {const {stdout}=await child;if(breached)throw new Error('Download budget exceeded or audit cancelled');return stdout;}
    finally{clearInterval(monitor);}
  };
  try {
    await git(['init','--bare']);
    // Bare object fetch: no checkout, hooks, LFS execution, or submodule traversal.
    await git(['fetch','--no-tags','--no-recurse-submodules',`https://github.com/${repository}.git`,sha]);
    if(await folderBytes(directory)>config.MAX_REPO_BYTES)throw new Error('Repository download exceeds 100 MiB budget');
    const log=await git(['log',sha,`--max-count=${config.MAX_COMMITS+1}`,'--reverse','--format=%x1e%H%x1f%an%x1f%ae%x1f%aI%x1f%cI','--numstat']);
    snapshot.commits=parseLog(log);
    if(snapshot.commits.length>config.MAX_COMMITS){snapshot.commits=snapshot.commits.slice(0,config.MAX_COMMITS);limit(`Commit history capped at ${config.MAX_COMMITS}; initial-commit analysis unavailable`);}
    snapshot.coverage.commitsAnalyzed=snapshot.commits.length;
    add('commit','history.json',JSON.stringify(snapshot.commits,null,2),`${metadata.html_url}/commits/${sha}`);
    const entries=(await git(['ls-tree','-rz',sha])).split('\0').filter(Boolean);
    for(const entry of entries) {
      const split=entry.indexOf('\t');const [mode,,blob]=entry.slice(0,split).split(' ');const path=entry.slice(split+1);
      if(!['100644','100755'].includes(mode)||excludedPath(path)){snapshot.coverage.excludedFiles++;continue;}
      if(snapshot.coverage.filesAnalyzed>=config.MAX_FILES){limit(`Source file limit (${config.MAX_FILES}) reached`);break;}
      const size=Number((await git(['cat-file','-s',blob])).trim());
      if(size>1048576){snapshot.coverage.excludedFiles++;limit(`File larger than 1 MiB skipped: ${path}`);continue;}
      const content=await git(['show',`${sha}:${path}`],2*1024*1024);
      if(content.includes('\0')){snapshot.coverage.excludedFiles++;continue;}
      add('code',path,content,`${metadata.html_url}/blob/${sha}/${path.split('/').map(encodeURIComponent).join('/')}`);
      snapshot.metadata.blobHashes[path]=blob;
      snapshot.coverage.filesAnalyzed++;
      if(/\.(js|jsx|ts|tsx|py)$/.test(path)) {
        const blame=await git(['blame','--line-porcelain',sha,'--',path]);
        for(const line of blame.split('\n'))if(line.startsWith('author-mail ')){const identity=line.slice(12).replace(/[<>]/g,'');snapshot.blame[identity]=(snapshot.blame[identity]||0)+1;}
      }
    }
    add('metadata','blame.json',JSON.stringify(snapshot.blame,null,2),`${metadata.html_url}/tree/${sha}`);
  } catch(error) {
    if(await cancelled())throw new Error('Audit cancelled');
    limit(error instanceof Error?error.message:'Git ingestion failed');
  } finally {await rm(directory,{recursive:true,force:true});}
  return snapshot;
}
