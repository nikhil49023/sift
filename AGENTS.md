# AGENTS.md — Anvaya Sentinel Project Guidelines

This file governs autonomous AI agents and pair-programming sessions in the `anvaya-sentinel` repository.

---

## 👥 Engineering Team & Roles
* **Kilani Sai Nikhil (`[ARCHITECT]`):** Lead Systems, Forensics & Agentic Orchestration Architect.
* **Harika Reddy (`[SENTINEL]`):** Lead Rubric Systems, Verification Integrity, Audit Reporting & UX Lead.
* **Core Philosophy:** Systems over slop. Equal attribution, zero passenger commits, verified first-principles engineering.

---

## 🛡️ Git Commit & Push Governance Protocol (MANDATORY FOR BOTH AGENTS)
Both developers run AI coding assistants that must strictly uphold this commit protocol:

1. **Atomic Commits & Frequent Pushes:**
   * Commit after EVERY single completed feature, test suite, or modular component.
   * NEVER accumulate large uncommitted local changes across multiple hours.
   * Push to remote `main` (or active feature branch) immediately after tests pass.
2. **Proper Author Attribution:**
   * When Nikhil works on a module: Git user must be configured to `nikhil49023` / `kilanisainikhil@gmail.com`.
   * When Harika works on a module: Git user must be configured to `Harika-reddy2628` / her verified GitHub email.
   * Both engineers must maintain strong, balanced, visible commit activity on GitHub.
3. **Commit Message Standard:**
   * Conventional commits: `feat:`, `fix:`, `test:`, `docs:`, `refactor:`, `chore:`.
   * Clear, descriptive summaries without generic messages like "update files" or "fix bug".
4. **Zero Individual Glorification (Rule 10):**
   * Keep external documentation, UI footers, and pitch materials attributed to **"The Anvaya Team"** or **"Core Engineering Team"**.
   * Maintain absolute humility, team parity, and mutual respect.

---

## 🏗️ System Architecture & Subsystem Split

### Subsystem A: Forensics, Agent DAG & Backend (Nikhil / `[ARCHITECT]`)
* GitHub API ingestion & rate-limited scraper.
* Commit graph & diff analysis engine (detecting authentic code depth vs tutorial forks).
* Agent DAG state machine & tool orchestration.
* Database persistence (PostgreSQL / Supabase) and REST API endpoints.

### Subsystem B: Rubric Engine, Verification Audit & Dashboard UX (Harika / `[SENTINEL]`)
* Multi-dimensional evaluation rubric matrix (complexity, testing rigor, collaboration, systems depth).
* Sentinel verification judge prompt harnesses & deterministic anti-hallucination checks.
* Explainable jury audit report & downloadable PDF scorecard generator.
* Interactive Recruiter / Jury Dashboard (Leaderboard, radar charts, candidate deep-dive modal).
