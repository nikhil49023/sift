# New-project deployment guide

Prepared for **The SIFT Core Team**. No cloud projects have been created or published by this session. The repository includes deployable configuration; account creation, billing, secrets, and staging verification happen in the provider dashboards.

## Deployment layout

| Provider | Project/resource | Configuration |
| --- | --- | --- |
| Vercel | `sift-web` | root `vercel.json` |
| Render | `sift-api`, `sift-worker`, `sift-queue`, `sift-retention` | root `render.yaml` and `backend/Dockerfile` |
| Supabase | `sift-production` | Auth, PostgreSQL, private `sift-private` bucket |

Create staging resources first with separate credentials and data. The blueprint uses Singapore, paid API/worker/queue resources, queue persistence, and `noeviction`. Review the provider's displayed charges before creation. The worker performs persistent Git operations, so it is deployed as a background service. [Render Blueprint reference](https://render.com/docs/blueprint-spec).

## 1. Create Supabase

1. Create a project near the Render region. Save its database password securely.
2. Copy the project URL, browser-safe anon/publishable key, and server secret/service-role key. SIFT calls these `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SECRET_KEY`. The server key belongs only in Render.
3. From **Connect**, copy the **session pooler** connection string on port 5432, replacing and percent-encoding the database password. SIFT uses session advisory locks, so transaction mode on 6543 is unsuitable. Download the database root certificate and base64-encode its PEM into `DATABASE_CA_BASE64`. Remove SSL query parameters from `DATABASE_URL`; the backend configures certificate verification explicitly. [Supabase connection and TLS guide](https://supabase.com/docs/guides/database/connecting-to-postgres).
4. Enable email sign-in. Configure the eventual Vercel/custom-domain URL as Site URL and an allowed redirect URL. Add the exact staging origin separately. Configure production email delivery and test magic-link delivery. [Supabase redirect configuration](https://supabase.com/docs/guides/auth/redirect-urls).

The API pre-deploy migration creates the application schema, read policies, and private PDF bucket. Confirm all migrations exist in `schema_migrations`, RLS is enabled, and `sift-private` is private with no browser upload/read policies. Keep `STORAGE_BUCKET=sift-private` unless you create another equivalent bucket yourself.

## 2. Prepare Render secrets, then create the Blueprint

In Render, create an environment group named **sift-production** before starting the Blueprint. Add these values through the dashboard:

| Variable | Value/source |
| --- | --- |
| `DATABASE_URL` | Supabase session connection string, with no SSL query parameters |
| `DATABASE_CA_BASE64` | Base64 PEM database root certificate |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase public browser key |
| `SUPABASE_SECRET_KEY` | Supabase server secret/service-role key |
| `GITHUB_TOKEN` | Token with access to public GitHub repository metadata |
| `GROQ_API_KEY` | GroqCloud API key with access and quota for `openai/gpt-oss-120b` |
| `CORS_ORIGIN` | Exact frontend origin, e.g. `https://sift-web.vercel.app` |

The blueprint supplies non-secret defaults, `GROQ_MODEL=openai/gpt-oss-120b`, and the internal queue URL. There is no separate JEV service or key. Strict JSON output provides structural constraints; SIFT still verifies citations and withholds unsupported scores. [Groq structured-output support](https://console.groq.com/docs/structured-outputs). `sync: false` secrets cannot be defined inside blueprint environment groups; existing dashboard values are preserved when omitted from YAML. [Render environment configuration](https://render.com/docs/blueprint-spec#setting-environment-variables).

Choose **New → Blueprint**, connect `nikhil49023/sift`, select `main`, and use root `render.yaml`. Confirm the existing environment group is reused. The API pre-deploy command is `npm run migrate`; migrations are tracked and serialized. Verify the API migration completes before accepting work. If the worker starts first and reports a missing table, redeploy it after the API migration.

Check API `/health` returns `{"status":"ok"}` and worker logs contain `worker_started`. `/health` checks PostgreSQL only; it does not prove the worker, queue, model, or storage works. Keep rankings and dataset imports disabled initially. Automatic API/worker deployments wait for CI checks; migrations must remain compatible with the previous worker during a rolling release.

## 3. Create Vercel

Import the same GitHub repository as `sift-web`. Choose Vite and Node.js 22, and keep **Root Directory at the repository root** (leave the field empty). The checked-in config runs `npm ci` at the workspace root, builds only the frontend workspace, and publishes `frontend/dist`. The root `package-lock.json` is the only dependency lockfile. [Vercel build settings](https://vercel.com/docs/builds/configure-a-build#root-directory).

Set `VITE_API_URL` to the Render API HTTPS origin, without a trailing slash. Deploy. Update Render `CORS_ORIGIN` and Supabase auth redirect settings to the actual frontend origin, then redeploy affected services. The frontend gets only public Supabase configuration from `/api/config`; never place a database URL, GitHub token, Groq key, or server key in Vercel's `VITE_` variables.

For previews, use a separate staging API and Supabase project. Allow only the preview origins you intentionally use.

## 4. Staging acceptance before launch

- Sign in, create a workspace and both workflow cohorts, and add another signed-in user through the membership API. Confirm viewer writes fail and cross-organization audit, evidence, decision, and report reads fail.
- Run a real public repository audit with a Groq key. Inspect pinned SHAs, parser exclusions, coverage limits, all cited excerpts/ranges, and whether each explanation actually supports its score. Repeat with missing history, an unsupported language, a fork, a known template, and a repository without tests.
- Cancel and retry an audit. Restart the worker during collection/evaluation and confirm saved stages resume without duplicate candidate creation. Confirm provider quota/rate-limit failures leave understandable partial or failed results.
- Record a human decision, export a PDF, and check its snapshot links, citations, decision, and manifest hash. Confirm unsigned bucket access fails and expired signed downloads fail.
- Delete a disposable workspace, run `npm run retention -w backend` from the retention service shell, and confirm both tenant records and PDF objects disappear. Previously issued signed URLs may remain usable for their 60-second lifetime.
- Have both owners review known rubric fixtures. Keep `RANKINGS_ENABLED=false` until rubric calibration and comparability are approved. Keep `DATASET_LICENSE_APPROVED=false` until the dataset's redistribution/processing rights are documented. Change blueprint defaults as part of approving either rollout, so a later sync does not reset them.

## Operations and recovery

Use Render service logs for `job_failed`, `worker_error`, `dispatch_failed`, `judge_usage`, and `retention_completed`. Alert on failed jobs, sustained old queued/running audits, missed daily retention, database connection saturation, Redis memory, and provider token/quota usage. PostgreSQL `stage_attempts` records start/end times for stage duration analysis. Evidence packets default to 16,000 source-content characters and model output to 4,096 tokens. These character limits are not exact token estimates; findings, metadata, and instructions add input tokens. Set `JEV_MAX_EVIDENCE_CHARS` and `JEV_MAX_OUTPUT_TOKENS` to match your account limits. Credential/model errors finish as a partial audit; quota and temporary service failures use bounded retries and honor `Retry-After`. Groq limits apply across your provider organization. [Groq rate limits](https://console.groq.com/docs/rate-limits). Start with worker concurrency 2 and two active audits per organization; raise limits only after observing memory and provider quotas.

Daily retention runs at 02:17 UTC. Raw evidence lasts 30 days; reports/decisions and eligible audit/candidate records last one year. Workspace deletion removes database records immediately and cleans report storage on the next retention run, with repeated cleanup for seven days. Run the retention command immediately for an urgent deletion request.

Back up PostgreSQL and PDF objects separately; database backups do not include Storage object contents. Choose backup/PITR coverage appropriate to the launch and prove a restore into an isolated staging project, including RLS, memberships, evidence, and PDF downloads. [Supabase backup scope](https://supabase.com/docs/guides/platform/backups).

For an application regression, redeploy the last known good API/worker commit and roll back the Vercel deployment. Do not roll the database schema backward blindly. For a queue loss, inspect the outbox and audits first; retry interrupted audits through the API, or requeue only verified missing jobs using their original outbox IDs. Do not flush Redis to retry jobs. Rotate a compromised provider key in the shared group, then redeploy API/worker/retention.

## Verification performed locally

Both builds and 20 tests pass, including API isolation, stage recovery, private-download behavior in local mode, cleanup, and SQL policy checks. npm reports no vulnerabilities. A real GitHub audit and a real PDF export were exercised. The Render blueprint passes Render's published JSON schema and the Docker image builds.

Live Supabase login/storage/TLS, Render and Vercel provisioning, real Groq evaluation, rubric calibration, restore drills, and production load checks remain staging work because provider projects and secrets are not supplied.
