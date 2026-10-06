# SIFT

Evidence for human hiring and hackathon decisions. Built by **The SIFT Core Team**.

SIFT collects public GitHub repository snapshots, inspects code and history, validates SIFT rubric judgments against captured evidence, and exports a PDF dossier. Reviewers record the final decision with a rationale. Hashes and citations make evidence inspectable; they do not establish original authorship or eliminate model errors.

## Current implementation

- Hackathon submissions use one repository, optional sprint boundaries, and a declared team. Recruiting supports profile discovery, explicit selection of up to five repositories, and an optional job description.
- Organization membership scopes cohorts, candidates, audits, evidence, decisions, and private reports. Roles are administrator, reviewer, and viewer.
- A LangGraph workflow coordinates four persisted stages to collect evidence, run forensic rules, evaluate the rubric, and assemble an assessment. PostgreSQL owns evidence/stage checkpoints; BullMQ owns bounded retries. Cancellation stops the graph, and the outbox supports recovery.
- Five forensic pillars inspect timeline anomalies, concentrated initial commits, contribution history, hollow implementations, and configured template/upstream matches. Missing inputs or coverage are shown as unknown. Observations are prompts for review, not automatic misconduct findings.
- SIFT checks structured output, evidence IDs, excerpts, line ranges, and dimension-specific sources. Missing evidence is **unscored**, rather than zero. An overall score requires all four dimensions and complete acquisition coverage.
- **Live review** displays saved evidence and real progress, separate reviewer decisions, and downloadable PDF reports. Its candidate data comes from the backend.
- The frontend opens with the editorial loading screen, then email / Google account access and a Recruiter or Hackathon organizer choice. The Decision Studio supports direct submission forms, CSV / JSON / TSV imports with column mapping, processing progress, assessments, and reviewer selections with rationale. Forms response exports can be uploaded as CSV. Real ranks are shown only when backend calibration is enabled. Follow [frontend/AUTH_SETUP.md](frontend/AUTH_SETUP.md) to enable authentication.
- **Explore the interactive demo** previews the complete workflow without credentials. Four optional fixtures have clearly labeled illustrative scores; your own imports remain unscored in demo mode. Live submissions create cohorts and repository audits through the existing API. The earlier editorial sample workspace remains available at `#workspace`.

The backend performs static inspection of Git objects and ASTs. It never installs dependencies or runs submitted code. CI results are reported from GitHub. JavaScript/TypeScript and Python have AST checks; other languages have limited inspection. Large repositories, capped API history, and unavailable upstreams produce explicit limitations. Groq receives a bounded evidence packet, so reviewers must inspect whether its citations support its reasoning.

Rankings remain disabled until calibration is approved. Dataset imports remain disabled until usage rights are verified. The judge uses Groq with `openai/gpt-oss-120b` and strict JSON output. Without a Groq key, forensics still runs and the result remains unscored. TypeSafe AI's Jev is a separate, opt-in verification API; `DECISION_PROVIDER=none` makes no TypeSafe calls. Laya is a researched self-hosting option, not an installed dependency. See [DECISION_PROVIDERS.md](DECISION_PROVIDERS.md).

## Run locally

Requires Node.js 22+, Docker Compose, Git, and Python 3.

```bash
npm ci
cp .env.example .env
docker compose up -d
npm run migrate
```

Set `GITHUB_TOKEN` and `GROQ_API_KEY` in the ignored root `.env` for authenticated ingestion and model evaluation. Never put provider secrets in `VITE_` variables. The development server and worker load the root `.env`.

Start these in separate terminals from the repository root:

```bash
npm run dev
npm run worker
npm run dev:ui
```

Open http://localhost:5173. Local mode supplies a development organization and binds the API to loopback. Production rejects local authentication.

For integration checks, stop the development worker first so it cannot consume synthetic test jobs:

```bash
npm run build
DECISION_PROVIDER=none GROQ_API_KEY= TYPESAFE_API_KEY= INTEGRATION_TESTS=true npm test
npm audit --audit-level=high
```

Integration checks cover tenant isolation, role enforcement, idempotency, stage recovery, Redis job recovery, report downloads, storage cleanup, and Supabase-style SQL policies. Unit checks cover contracts, safe parsing, coverage states, and citation rejection. See [DEPLOYMENT.md](DEPLOYMENT.md) for cloud setup and the remaining staging gates.

The default Render blueprint uses free web and Redis resources. `DEPLOYMENT_MODE=demo` runs the API, one audit worker, queue recovery, and best-effort cleanup in one process. Free services sleep, and repository limits are lower to fit 512 MB. The separate paid layout is retained in `render.production.yaml`; it is optional for the hackathon.

## Project map

| Directory | Purpose |
| --- | --- |
| `backend/src/` | Express API, ingestion, forensic rules, worker, PDFs, retention |
| `backend/src/jev/` | Rubric, judge harness, citation validation, deterministic aggregation |
| `shared/src/` | Validated submission and evidence contracts, version identifiers |
| `frontend/src/` | Account access, role selection, data intake, evaluation studio, and evidence dashboard |
| `migrations/` | PostgreSQL schema, tenant policies, private storage setup |

See [ARCHITECTURE.md](ARCHITECTURE.md) and [OWNERSHIP.md](OWNERSHIP.md). Harika owns rubric and decision-provider backend review; Nikhil owns ingestion, orchestration, API, and infrastructure. Git authorship follows who actually performs the work. `INSTRUCTIONS.md` and `FRONTEND_SPRINT_BRIEF.md` are earlier design briefs; this README describes the implemented behavior.

MIT license. The SIFT Core Team.
