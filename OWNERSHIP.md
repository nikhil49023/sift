# SIFT backend ownership

External attribution remains **The SIFT Core Team**. Ownership defines review responsibility, not fabricated commit attribution.

| Module | Owner | Responsibility |
| --- | --- | --- |
| SIFT rubric, citation validation and TypeSafe Jev review (`backend/src/jev/`) | Harika Reddy — `@Harika-reddy2628` | Rubric anchors, judge prompt, schema validation, evidence citation checks, optional Jev support checks, calibration fixtures, and explanations for hackathon organizers and recruiters |
| Ingestion, forensic rules, API, durable orchestration, and deployment | Kilani Sai Nikhil — `@nikhil49023` | GitHub/Git evidence acquisition, five forensic pillars, tenant isolation, persistence, workers, and infrastructure |

Harika's backend module receives immutable evidence and forensic findings and returns validated dimensional judgments. It cannot fetch arbitrary URLs, execute submitted code, change findings, or publish a hiring/jury decision. Missing evidence must produce an unscored dimension. Weighted aggregation is deterministic.

The API, worker, and UI integrate through shared contracts. Changes to these contracts require both owners' review. Commits use the identity of the engineer actually performing the work; review ownership does not change Git authorship.
