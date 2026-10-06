-- Keep page ordering and latest-audit lookups stable as cohorts grow.
CREATE INDEX IF NOT EXISTS candidates_cohort_page ON candidates(org_id,cohort_id,created_at DESC,id DESC);
CREATE INDEX IF NOT EXISTS audits_candidate_latest ON audits(org_id,candidate_id,created_at DESC,id DESC);
