# SIFT

Evidence for human hiring and hackathon decisions. Built by **The SIFT Core Team**.

SIFT collects public GitHub repository snapshots, inspects code and history, validates JEV (*Judgement, Evaluation & Verification*) judgments against captured evidence, and exports a PDF dossier. Reviewers record the final decision with a rationale. Hashes and citations make evidence inspectable; they do not establish original authorship or eliminate model errors.

## Current implementation

- Hackathon submissions use one repository, optional sprint boundaries, and a declared team. Recruiting supports profile discovery, explicit selection of up to five repositories, and an optional job description.
- Organization membership scopes cohorts, candidates, audits, evidence, decisions, and private reports. Roles are administrator, reviewer, and viewer.
- Four persisted stages collect evidence, run forensic rules, evaluate JEV, and assemble an assessment. PostgreSQL checkpoints, BullMQ jobs, cancellation, bounded retries, and an outbox support recovery.
- Five forensic pillars inspect timeline anomalies, concentrated initial commits, contribution history, hollow implementations, and configured template/upstream matches. Missing inputs or coverage are shown as unknown. Observations are prompts for review, not automatic misconduct findings.
- JEV checks structured output, evidence IDs, excerpts, line ranges, and dimension-specific sources. Missing evidence is **unscored**, rather than zero. An overall score requires all four dimensions and complete acquisition coverage.
- The dashboard displays saved evidence and real progress, separate reviewer decisions, and downloadable PDF reports. No seeded candidate or score data drives the application.

The backend performs static inspection of Git objects and ASTs. It never installs dependencies or runs submitted code. CI results are reported from GitHub. JavaScript/TypeScript and Python have AST checks; other languages have limited inspection. Large repositories, capped API history, and unavailable upstreams produce explicit limitations. JEV receives a bounded evidence packet, so reviewers must inspect whether its citations support its reasoning.

Rankings remain disabled until calibration is approved. Dataset imports remain disabled until usage rights are verified. Without a Gemini key, forensics still runs and the result remains unscored.

## Run locally

Requires Node.js 22+, Docker Compose, Git, and Python 3.

```bash
npm ci
cp .env.example .env
docker compose up -d
npm run migrate
```

Set `GITHUB_TOKEN` and `GEMINI_API_KEY` in the ignored root `.env` for authenticated ingestion and model evaluation. Never put provider secrets in `VITE_` variables. The development server and worker load the root `.env`.

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
INTEGRATION_TESTS=true npm test
npm audit --audit-level=high
```

Integration checks cover tenant isolation, role enforcement, idempotency, stage recovery, report downloads, storage cleanup, and Supabase-style SQL policies. Unit checks cover contracts, safe parsing, coverage states, and citation rejection. See [DEPLOYMENT.md](DEPLOYMENT.md) for cloud setup and the remaining staging gates.

## Project map

| Directory | Purpose |
| --- | --- |
| `backend/src/` | Express API, ingestion, forensic rules, worker, PDFs, retention |
| `backend/src/jev/` | Rubric, judge harness, citation validation, deterministic aggregation |
| `shared/src/` | Validated submission and evidence contracts, version identifiers |
| `frontend/src/` | Authenticated reviewer dashboard |
| `migrations/` | PostgreSQL schema, tenant policies, private storage setup |

See [ARCHITECTURE.md](ARCHITECTURE.md) and [OWNERSHIP.md](OWNERSHIP.md). Harika owns JEV backend review; Nikhil owns ingestion, orchestration, API, and infrastructure. Git authorship follows who actually performs the work. `INSTRUCTIONS.md` and `FRONTEND_SPRINT_BRIEF.md` are earlier design briefs; this README describes the implemented behavior.

MIT license. The SIFT Core Team.
