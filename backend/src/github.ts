import { Octokit } from '@octokit/rest';
import { pool } from './db.ts';
import { config } from './config.ts';
export class ProviderError extends Error { constructor(message:string, public retryAfterMs=60000) { super(message); } }
const github = new Octokit({ auth: config.GITHUB_TOKEN || undefined, request: { timeout: 30000 }, userAgent: 'SIFT/1.0' });
export async function githubRequest(route:string, parameters:Record<string,any>={}, ttl=60000):Promise<any> {
  const key=JSON.stringify([route,parameters,config.GITHUB_API_VERSION]);
  const cached=await pool.query('SELECT response FROM api_cache WHERE key=$1 AND expires_at>now()',[key]);
  if(cached.rowCount) return cached.rows[0].response;
  try {
    const response=await github.request(route,{...parameters,headers:{'X-GitHub-Api-Version':config.GITHUB_API_VERSION}});
    const result={data:response.data,hasNext:!!response.headers.link?.includes('rel="next"'),observedAt:new Date().toISOString()};
    await pool.query('INSERT INTO api_cache(key,response,expires_at) VALUES($1,$2,now()+($3*interval \'1 millisecond\')) ON CONFLICT(key) DO UPDATE SET response=EXCLUDED.response,expires_at=EXCLUDED.expires_at',[key,result,ttl]);
    return result;
  } catch(error:any) {
    const h=error.response?.headers||{};
    if(error.status===429 || (error.status===403 && (h['x-ratelimit-remaining']==='0'||h['retry-after']||/rate limit/i.test(error.message)))) {
      const delay=h['retry-after']?Number(h['retry-after'])*1000:h['x-ratelimit-reset']?Math.max(60000,Number(h['x-ratelimit-reset'])*1000-Date.now()):60000;
      throw new ProviderError('GitHub rate limit reached; audit will retry',delay);
    }
    if(error.status===404) throw new Error('Public GitHub repository or profile not found');
    throw new Error(`GitHub request failed (${error.status||'network error'})`);
  }
}
export async function pages(route:string,params:Record<string,any>,max=3) {
  const data:any[]=[]; let complete=true;
  for(let page=1;page<=max;page++) {
    const response=await githubRequest(route,{...params,per_page:100,page});
    data.push(...response.data);
    if(!response.hasNext) break;
    if(page===max) complete=false;
  }
  return {data,complete};
}
