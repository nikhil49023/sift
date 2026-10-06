CREATE TABLE idempotency (org_id uuid NOT NULL REFERENCES organizations ON DELETE CASCADE, key text NOT NULL, request_hash text NOT NULL, audit_id uuid NOT NULL REFERENCES audits ON DELETE CASCADE, PRIMARY KEY(org_id,key));
ALTER TABLE idempotency ENABLE ROW LEVEL SECURITY;
CREATE TABLE stage_attempts (id bigserial PRIMARY KEY, org_id uuid NOT NULL REFERENCES organizations ON DELETE CASCADE, audit_id uuid NOT NULL REFERENCES audits ON DELETE CASCADE, stage text NOT NULL, status text NOT NULL, error text, started_at timestamptz DEFAULT now(), finished_at timestamptz);
ALTER TABLE stage_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE dataset_imports ADD COLUMN status text NOT NULL DEFAULT 'queued';
ALTER TABLE dataset_imports ADD COLUMN error text;
CREATE TABLE template_corpus (id uuid PRIMARY KEY, org_id uuid NOT NULL REFERENCES organizations ON DELETE CASCADE, version text NOT NULL, repository text NOT NULL, sha text NOT NULL, entries jsonb NOT NULL, source_license text NOT NULL, created_at timestamptz DEFAULT now(), UNIQUE(org_id,version,repository,sha));
ALTER TABLE template_corpus ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
IF to_regprocedure('auth.uid()') IS NOT NULL THEN
CREATE POLICY corpus_read ON template_corpus FOR SELECT TO authenticated USING(public.sift_member(org_id));
CREATE POLICY attempts_read ON stage_attempts FOR SELECT TO authenticated USING(public.sift_member(org_id));
END IF;
END $$;
