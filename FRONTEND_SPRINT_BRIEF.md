# 🎨 SIFT — Frontend & UI/UX Sprint Brief

> **Assignee:** Harika Reddy (`[SENTINEL]` / `Harika-reddy2628`)  
> **Role:** Lead Rubric Systems, Verification Integrity & UX Lead  
> **Sprint Timebox:** **11:15 AM – 12:00 PM Sharp (45-Minute Rapid Sprint)**  
> **Status:** Scaffolding Ready & Compiling Cleanly (`dist/` built with 0 errors)

---

## 🎯 1. The 12:00 PM Sprint Objective

Deliver the complete, responsive **SIFT Recruiter & Jury Decision Intelligence Dashboard** in React + Tailwind CSS. 

The baseline architecture and dependencies are already fully set up and verified:
* **Tech:** React 18, Vite 6, Tailwind CSS 3, Lucide React icons, Recharts.
* **Workspace:** `/home/nikhil/Desktop/sift/frontend` (or cloned from `https://github.com/nikhil49023/sift.git`).
* **Live Test:** Run `npm run dev` inside `frontend/` to view the live dashboard immediately.

---

## 📋 2. Subsystem Ownership & Modular Split

Currently, `frontend/src/App.jsx` contains a fully functional prototype. Your mission before **12:00 PM** is to modularize, polish, and enhance the UI into dedicated components under `frontend/src/components/`:

### 🔹 Component 1: `Navbar.jsx` (`src/components/Navbar.jsx`)
* SIFT brand mark with glowing cyan badge (`JEV Engine v1.0`).
* Live telemetry counters:
  * Audited Repositories
  * Fraud & Cheating Rate Detected
  * Engineering Verdict Ground Truth

### 🔹 Component 2: `AuditInput.jsx` (`src/components/AuditInput.jsx`)
* Candidate input field: GitHub username or Repository URL.
* "SIFT Candidate" CTA button with glowing hover states.
* **Animated 4-Agent Stepper:** When auditing, visual progress bar showing:
  1. *Agent 1: Ingestion Scout* (Fetching Git commits & AST)
  2. *Agent 2: Anti-Cheat Forensics* (Checking 5-pillar fraud metrics)
  3. *Agent 3: JEV Verification Judge* (Scoring against 4-pillar rubric)
  4. *Agent 4: Decision Synthesizer* (Building audit dossier)

### 🔹 Component 3: `AntiCheatGrid.jsx` (`src/components/AntiCheatGrid.jsx`)
* The core intellectual showcase of the product.
* Displays the **5-Pillar Anti-Cheat Audit**:
  1. Timeline & Sprint Window (Pass/Fail)
  2. Diff Velocity & Bulk Zip-Drop (Pass/Fail)
  3. Passenger / Ghost Contributor Filter (Pass/Fail)
  4. Hollow AI-Slop & Mock Stubs (Pass/Fail)
  5. Plagiarism & License Stripping (Pass/Fail)
* Color-coded status pills: `PASS` (Emerald), `WARN` (Amber), `FAIL` (Rose).

### 🔹 Component 4: `RadarScorecard.jsx` (`src/components/RadarScorecard.jsx`)
* Recharts polygon radar displaying the 4 evaluation dimensions:
  * *Systems Rigor* (0-100)
  * *Algorithmic Depth* (0-100)
  * *Testing & Verification* (0-100)
  * *Git Hygiene & Collaboration* (0-100)
* Big bold overall SIFT score (e.g. `94/100`) + Percentile (`Top 2%`).
* Verdict pill (`VERIFIED AUTHENTIC`, `SUSPICIOUS REPO`, `RED FLAG / HOLLOW`).

### 🔹 Component 5: `CodeCitations.jsx` (`src/components/CodeCitations.jsx`)
* Proof-of-work evidence drawer.
* Renders exact files, line numbers, and commits cited by the JEV judge (e.g. `src/raft/consensus.rs#L84`).

### 🔹 Component 6: `Leaderboard.jsx` (`src/components/Leaderboard.jsx`)
* Filterable candidate comparison table.
* Filter tabs: `ALL`, `CLEAN`, `SUSPICIOUS`, `RED FLAG`.
* Interactive row selection that switches the active candidate dossier.

---

## 🛡️ 3. Git Commit Instructions for Harika's Machine

To ensure your GitHub profile (`Harika-reddy2628`) reflects prominent, verified commit activity:

1. **Configure Git Author (First Time Only):**
   ```bash
   git config user.name "Harika-reddy2628"
   git config user.email "<YOUR_VERIFIED_GITHUB_EMAIL>"
   ```

2. **Atomic Commits as You Build:**
   * Commit as you complete each component:
     ```bash
     git add src/components/Navbar.jsx
     git commit -m "feat(ui): add navbar with telemetry stats and SIFT branding"
     
     git add src/components/AntiCheatGrid.jsx
     git commit -m "feat(ui): implement 5-pillar anti-cheat forensic audit grid"
     
     git add src/components/Leaderboard.jsx
     git commit -m "feat(ui): add filterable candidate leaderboard table"
     ```

3. **Push to Remote:**
   ```bash
   git push origin main
   ```

---

## ⏱️ 4. Timeline Milestones (11:15 AM – 12:00 PM)

* **11:15 – 11:25 AM:** Pull latest repo, run `npm run dev`, inspect current working dashboard.
* **11:25 – 11:45 AM:** Break out modular components into `src/components/`, refine Tailwind layout tokens and badges.
* **11:45 – 11:55 AM:** Add candidate audit modal / drawer and inspect micro-interactions.
* **11:55 – 12:00 PM:** Final `npm run build` verification, commit, and push to GitHub `main`!
