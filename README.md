# 🛡️ Anvaya Sentinel

> **Autonomous Multi-Agent Decision Intelligence System for Developer Profiling and Hackathon Jury Scoring**

[![Public Repository](https://img.shields.io/badge/GitHub-Public-blue.svg)](https://github.com/nikhil49023/anvaya-sentinel)
[![Hackathon Track](https://img.shields.io/badge/Hackathon_Track-Agentic_AI_%26_Intelligent_Systems-purple.svg)](https://github.com/nikhil49023/anvaya-sentinel)
[![Built by Anvaya](https://img.shields.io/badge/Engineered_by-The_Anvaya_Team-emerald.svg)](https://github.com/nikhil49023/anvaya-sentinel)

---

## 🌟 Overview

Technical hiring managers and hackathon organizers receive hundreds of applications and repositories. Traditional screening methods rely on superficial resume keyword matching or quick manual scans that miss critical engineering realities—such as distinguishing between genuine algorithmic implementations versus copy-pasted tutorial forks, or identifying actual commit contributions versus inactive team passengers.

**Anvaya Sentinel** solves this problem autonomously. With simply a **GitHub username** or **project URL**, an orchestrated 4-agent autonomous pipeline crawls the candidate's public activity, conducts AST-level code depth and git forensic analysis, verifies technical claims against an objective 4-pillar rubric, and generates an explainable, ranked candidate dossier with audit evidence.

---

## 🤖 The 4-Agent Autonomous Council

1. **Agent 1: Scout Agent (Data Ingestion)**
   * Ingests GitHub repositories, commit graphs, PR reviews, and language breakdowns via GitHub REST/GraphQL APIs.
2. **Agent 2: Forensics & Authenticity Inspector**
   * Inspects code depth, commit cadence, diff entropy, unit test coverage, and flags cloned boilerplate vs original work.
3. **Agent 3: Rubric Verification Judge (Sentinel Engine)**
   * Evaluates evidence against structured multi-dimensional rubrics using Google Gemini 2.5 with citation-grounded scoring.
4. **Agent 4: Decision & Ranking Synthesizer**
   * Computes normalized candidate scores, generates dimensional radar profiles, and synthesizes jury audit dossiers.

---

## 💻 Tech Stack

* **Frontend:** React 18, Vite, Tailwind CSS, Lucide Icons, Recharts
* **Backend:** Node.js, Express.js, Octokit, Zod
* **AI & Intelligence:** Google Gemini 2.5 API (Structured JSON Schema generation)
* **Database:** SQLite / PostgreSQL (Supabase)
* **Testing & CI:** Vitest, Supertest, GitHub Actions

---

## 👥 Engineering Team
* **Kilani Sai Nikhil** (`[ARCHITECT]`): Lead Systems, Forensics & Agentic Orchestration Architect
* **Harika Reddy** (`[SENTINEL]`): Lead Rubric Systems, Verification Integrity, Audit Reporting & UX Lead

---

## 📄 License
MIT License. Engineered by the Anvaya Team.
