# 📋 SIFT — Master Collaboration & Execution Instructions

> **Official Sprint Guide for Nikhil (`[ARCHITECT]`) & Harika (`[SENTINEL]`)**  
> **Repository:** `https://github.com/nikhil49023/sift`  
> **Target:** **12:00 PM Sharp Delivery for Frontend & Dashboard Core**

---

## 🎯 1. Mission Overview

**SIFT** is an Autonomous Code Forensics, Anti-Cheat Verification, and JEV (Judgement, Evaluation & Verification) Decision Intelligence platform designed for hackathon juries and technical recruiters.

### Zero Mock Data Policy (Strict Invariant)
* All candidate profiling uses **100% Real Data**:
  1. **Redrob AI Benchmark Dataset:** Real developer profiles from the official India Runs 2026 challenge (hosted on Hugging Face), featuring authentic production evidence, career histories, and actual honeypot decoys.
  2. **Live GitHub API Telemetry:** Live parsing of public repositories (`commits`, `languages`, `diffs`, `watchers`).
* **Active Data File:** [`frontend/src/data/realCandidates.js`](frontend/src/data/realCandidates.js).

---

## 🛡️ 2. Work Split & Sprint Deadlines

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        SIFT: SUB-SYSTEM ROLES & DEADLINES                              │
├───────────────────────────────────────────┬────────────────────────────────────────────┤
│ 🛡️ HARIKA REDDY ([SENTINEL])               │ 🤖 KILANI SAI NIKHIL ([ARCHITECT])        │
│ Frontend, Dashboard UI/UX & Rubric Lead   │ Backend, Git Forensics & Agentic Eng.      │
│ ⏰ DEADLINE: 12:00 PM SHARP               │ ⏰ CONTINUOUS BACKEND PIPELINE             │
├───────────────────────────────────────────┼────────────────────────────────────────────┤
│ • Modularize components into              │ • Express.js REST API & Ingestion          │
│   src/components/ (Navbar, AuditInput,    │ • 5-Pillar Anti-Cheat Forensics Suite      │
│   AntiCheatGrid, RadarScorecard,          │ • AST Code Depth & Git Blame Parser        │
│   CodeCitations, Leaderboard)             │ • Gemini 2.5 JEV Evaluation Prompts        │
│ • Polish dark-mode obsidian styling & UX  │ • Supabase / PostgreSQL Persistence        │
│ • Verify mobile responsiveness & badges   │ • Automated unit test suite & CI gates     │
│ • Commit atomically under Harika-reddy2628│ • Commit atomically under nikhil49023      │
└───────────────────────────────────────────┴────────────────────────────────────────────┘
```

---

## 💻 3. Step-by-Step Instructions for Harika (`Harika-reddy2628`)

### Step 1: Clone or Pull the Latest Repository
```bash
git clone https://github.com/nikhil49023/sift.git
cd sift
git pull origin main
```

### Step 2: Configure Git Author (Crucial for GitHub Profile Credit)
```bash
git config user.name "Harika-reddy2628"
git config user.email "<YOUR_VERIFIED_GITHUB_EMAIL>"
```

### Step 3: Run the Frontend Locally
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` to see the live dashboard running with real Redrob candidates and live GitHub API search!

### Step 4: Decompose `App.jsx` into Modular Components
Create individual files inside `frontend/src/components/`:
* `Navbar.jsx`: Brand + glowing telemetry stats.
* `AuditInput.jsx`: GitHub URL / Redrob candidate ID input bar + 4-agent progress stepper.
* `AntiCheatGrid.jsx`: 5-Pillar fraud detection cards (Timeline, Diff Velocity, Ghost Passenger, Hollow AI-Slop, Plagiarism).
* `RadarScorecard.jsx`: Recharts polygon radar + dimensional score blocks.
* `CodeCitations.jsx`: Ground-truth evidence citations with file and commit links.
* `Leaderboard.jsx`: Filterable candidate comparison table (`ALL`, `CLEAN`, `SUSPICIOUS`, `RED FLAG`).

### Step 5: Commit Atomically & Push by 12:00 PM
Commit after each component so your GitHub profile reflects continuous engineering commits:
```bash
git add src/components/
git commit -m "feat(ui): modularize dashboard into dedicated components with 5-pillar anti-cheat grid"
git push origin main
```

---

## 🤖 4. Step-by-Step Instructions for Nikhil (`nikhil49023`)

### Step 1: Ensure Git Author Configuration
```bash
git config user.name "nikhil49023"
git config user.email "kilanisainikhil@gmail.com"
```

### Step 2: Backend & Forensics Engine Buildout
* Build the `/backend` directory with Express.js.
* Implement the 5-Pillar Anti-Cheat rules engine:
  1. `timeline_audit.js`: Detects pre-built repository timeline anomalies.
  2. `diff_velocity.js`: Identifies bulk zip-drop starter kit imports.
  3. `passenger_filter.js`: Per-author Git blame and churn analysis.
  4. `ast_depth_parser.js`: Detects hollow functions and AI-slop stubs.
  5. `plagiarism_fingerprint.js`: Checks upstream license stripping.
* Implement the Gemini 2.5 JEV structured output judge.
* Expose REST endpoints:
  * `POST /api/audit` (Ingest repo/profile and run JEV council).
  * `GET /api/candidates` (Retrieve ranked leaderboard).
  * `GET /api/candidates/:id` (Retrieve full forensic dossier).

---

## ⚡ 5. Strict Governance Rules for AI Coding Assistants (Cursor / Antigravity)

1. **Never Hoard Commits:** Commit after every single working component or function. Never work for hours without pushing.
2. **Preserve Team Parity:** Both `nikhil49023` and `Harika-reddy2628` must show equal, balanced, and verified commit activity on GitHub.
3. **No Slop:** Always run `npm run build` or automated test scripts before pushing. Zero broken builds on `origin/main`.
