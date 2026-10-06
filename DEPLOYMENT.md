# Free hackathon deployment

Prepared for **The SIFT Core Team**. The default `render.yaml` now uses free compute. The previous paid configuration is preserved in `render.production.yaml` and is not required for the hackathon.

## Current account status — 6 October 2026

- Render CLI authentication works and the workspace is selected.
- Render account-backed validation accepts the free blueprint without requesting payment information.
- The free `sift-queue` has been provisioned in Singapore with `noeviction`, no disk persistence, and an empty external IP allow list. Its status is available.
- The supplied Supabase URL and publishable key are saved only in the ignored root `.env`. Its public Auth settings endpoint returned HTTP 200.
- Supabase MCP is configured for the supplied project with `read_only=true`, and OAuth login succeeded. MCP access is for development; it is not a runtime database credential.
- The Supabase server key now passes live Admin Auth and Storage checks. The private `sift-private` report bucket has been created with a 10 MiB file limit and PDF-only uploads.
- The API is not published yet. `DATABASE_URL` and `GROQ_API_KEY` are missing. `DATABASE_CA_BASE64` is also absent; a live database TLS probe will determine whether trusted system roots suffice or the project's CA is needed. The existing Groq MCP credential has failed upstream checks and was not copied into SIFT.

## Free layout and limits

| Resource | Configuration |
| --- | --- |
| Render free web service | Express API, embedded audit worker, and retention cleanup in one Node process |
| Render free Key Value | Private Redis job queue; missing active jobs recover from PostgreSQL |
| Supabase free project | PostgreSQL, Auth, and private report storage within its free quotas |
| Groq free account | GPT-OSS 120B evaluations within the account's rate and token limits |
| Vercel Hobby | React/Vite frontend, subject to Hobby eligibility and limits |

The web service has 512 MB RAM. The demo profile runs one job at a time, caps Node's old-space heap at 256 MB, and limits each repository to 25 MiB, 300 files, 1,500 commits, and five minutes of acquisition. Reaching a limit is recorded as incomplete coverage, not a clean forensic result. Model evidence is bounded to 8,000 characters and output to 2,048 tokens.

Render sleeps after 15 minutes without incoming traffic; waking takes about a minute. Free Redis can lose all jobs on restart. Every minute while the demo is awake, missing jobs for queued/running audits, reports, and imports are restored from the durable outbox. Existing jobs keep their bounded retries, and final or cancelled work is not automatically retried. Recovery examines up to 1,000 active messages per pass. Audit stages already saved in PostgreSQL are reused. [Render free limits](https://render.com/docs/free), [Render compute plans](https://render.com/docs/compute-plans).

Cleanup runs on startup and hourly while the service is awake, so its timing is best effort. This configuration supports a small hackathon demo, not continuous production processing. Stay on the Hobby workspace with free resource plans and within the providers' free quotas. Render can suspend services/builds when allowances are exhausted without a payment method. [Render billing behavior](https://render.com/docs/faq), [Supabase free quotas](https://supabase.com/pricing), [Groq limits](https://console.groq.com/docs/rate-limits).

Koyeb also offers a 512 MB free web service, with account verification requirements; Railway offers $1/month of free credit, which is not an always-on allowance for this backend. The existing authenticated Render account is the simplest route for SIFT. [Koyeb limits](https://www.koyeb.com/docs/reference/instances), [Koyeb account verification](https://www.koyeb.com/docs/faqs/pricing), [Railway plans](https://docs.railway.com/pricing/plans).

## Supabase settings

SIFT already uses `@supabase/supabase-js` in React/Vite and Express. Next.js server components, `NEXT_PUBLIC_` variables, and `@supabase/ssr` middleware are not part of this application. The browser obtains its public configuration from `/api/config`; its Supabase client refreshes sessions, and Express verifies bearer tokens with Supabase. `SUPABASE_ANON_KEY` accepts a new publishable key or a legacy anon key. [Supabase React authentication](https://supabase.com/docs/guides/auth/quickstarts/react).

Set these in the ignored root `.env` for local deployment preparation and in Render's service environment for runtime:

| Setting | Source |
| --- | --- |
| `SUPABASE_URL` | Project URL, already supplied |
| `SUPABASE_ANON_KEY` | Publishable key, already supplied |
| `SUPABASE_SECRET_KEY` | Server secret/service-role key; never a browser variable |
| `DATABASE_URL` | Connect panel's session pooler string on port 5432, with a percent-encoded database password |
| `DATABASE_CA_BASE64` | Base64 PEM database root certificate, if required for verified TLS; system trust is allowed when the live probe succeeds |
| `GROQ_API_KEY` | Valid Groq key with access/quota for the configured model |
| `CORS_ORIGIN` | Exact frontend origin; localhost 5173 can be used until frontend publishing |
| `GITHUB_TOKEN` | Optional token suitable for public repository metadata, to increase GitHub API allowance |

Remove SSL query parameters from `DATABASE_URL`; SIFT configures certificate verification explicitly. Transaction pooling on port 6543 is unsuitable because audit execution uses session advisory locks. [Supabase connections and TLS](https://supabase.com/docs/guides/database/connecting-to-postgres).

Run `npm run check:secrets -w backend` to verify saved runtime settings without printing them. It performs read-only Auth, private bucket, Groq model availability, and PostgreSQL TLS/login checks. It does not run model inference, apply migrations, upload reports, or create accounts. The Supabase MCP login and publishable key cannot supply an existing database password. [Supabase integration credentials](https://supabase.com/docs/guides/integrations/build-a-supabase-oauth-integration).

Enable email sign-in and allow the actual frontend URL in Supabase's Site URL/redirect configuration. Keep local `AUTH_MODE=local` until the production database/server settings are available; Render always sets `NODE_ENV=production` and `AUTH_MODE=supabase`. Local bypass authentication cannot run in production. [Supabase redirects](https://supabase.com/docs/guides/auth/redirect-urls).

## Render creation

For a fresh workspace, create a Blueprint from `nikhil49023/sift`, branch `main`, using root `render.yaml`. Fill the prompted values and verify both resource plans say Free.

This workspace already has its one permitted free queue. Create only the web service against that existing queue rather than provisioning a second free queue:

1. Use repository root, Docker runtime, `backend/Dockerfile`, and Singapore region.
2. Select Free, health path `/health`, and automatic deployment after CI checks pass.
3. Apply the public limits/mode settings and required environment values listed in `render.yaml`.
4. Set `REDIS_URL` to the existing queue's internal connection URL; keep its external IP allow list empty.
5. Set the Docker command to:

```sh
sh backend/scripts/start.sh
```

Free services do not use a paid pre-deploy task. This command applies tracked, serialized migrations before accepting requests. Migrations create the application tables, RLS read policies, and private `sift-private` storage bucket in Supabase. The process then starts the API, worker, recovery loop, and cleanup.

Check `/health` returns `{"status":"ok"}` and logs show `server_started` with demo mode and `worker_started` with concurrency 1. The health endpoint checks PostgreSQL only; complete an authenticated audit and PDF export to verify queue, model, and storage.

## Frontend and acceptance

Import the repository into Vercel, keep Root Directory at the repository root, use Node 22, and set only `VITE_API_URL` to the Render HTTPS API origin. Root `vercel.json` builds `frontend/dist`. Update Render `CORS_ORIGIN` and Supabase redirects to the actual frontend origin. Never put database/server/provider keys into `VITE_` variables.

Before sharing the demo, sign in, create an organization/cohort, audit a small public repository, inspect exact citations and coverage, record a human decision, and export a private PDF. Verify viewer writes and cross-organization reads fail. Test interruption/retry and a Redis restart, then confirm saved stages resume and final jobs do not rerun.

Rankings remain disabled until human calibration of anchors, model/prompt versions, and comparability is approved. Dataset imports remain disabled until processing rights are approved. `DECISION_PROVIDER=none` uses Groq only; Jev/Laya are not needed for this deployment. Backend decisions support human review and do not prove cheating, authorship, or hiring suitability.

## Recovery and optional production layout

Raw evidence expires after 30 days; eligible reports/decisions and summary records after one year. Organization deletion cascades tenant records and leaves durable storage cleanup tombstones. Demo cleanup catches up after the next wake; an urgent purge can run `npm run retention -w backend` using the service's production environment.

For a regression, redeploy a known-good commit compatible with the current database schema. Do not flush Redis as a retry mechanism or blindly reverse migrations. Back up PostgreSQL and Storage objects separately; a database backup does not contain PDF object contents. [Supabase backup scope](https://supabase.com/docs/guides/platform/backups).

If continuous processing is later required, `render.production.yaml` retains separate paid API, worker, persistent queue, and daily cron resources. It defaults to split mode. That layout requires billing and a `sift-production` environment group containing the production settings. Review prices before choosing it; it is outside this free hackathon deployment.

## Verification

The free profile passes Render's account-backed validation. Verification includes PostgreSQL recovery/RLS, LangGraph cancellation/resume, evidence selection, citation gates, ranking eligibility, and tied ranks. Live Supabase database TLS/login/storage and Groq evaluation still require the remaining runtime settings; no live backend URL is claimed yet.
