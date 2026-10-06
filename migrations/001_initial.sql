CREATE TABLE IF NOT EXISTS organizations (id uuid PRIMARY KEY, name text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS memberships (org_id uuid REFERENCES organizations ON DELETE CASCADE, user_id uuid NOT NULL, role text NOT NULL CHECK(role IN ('admin','reviewer','viewer')), PRIMARY KEY(org_id,user_id));
CREATE TABLE IF NOT EXISTS cohorts (id uuid PRIMARY KEY, org_id uuid NOT NULL REFERENCES organizations ON DELETE CASCADE, name text NOT NULL, workflow text NOT NULL CHECK(workflow IN ('hackathon','recruiting')), created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS candidates (id uuid PRIMARY KEY, org_id uuid NOT NULL REFERENCES organizations ON DELETE CASCADE, cohort_id uuid NOT NULL REFERENCES cohorts ON DELETE CASCADE, name text NOT NULL, username text, source text NOT NULL DEFAULT 'github', claims jsonb, created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS audits (id uuid PRIMARY KEY, org_id uuid NOT NULL REFERENCES organizations ON DELETE CASCADE, candidate_id uuid NOT NULL REFERENCES candidates ON DELETE CASCADE, input jsonb NOT NULL, status text NOT NULL DEFAULT 'queued', stage text, stages jsonb NOT NULL DEFAULT '{}', snapshots jsonb NOT NULL DEFAULT '[]', findings jsonb NOT NULL DEFAULT '[]', judgment jsonb, assessment jsonb, cancelled boolean NOT NULL DEFAULT false, error text, created_by uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS evidence (id text NOT NULL, audit_id uuid NOT NULL REFERENCES audits ON DELETE CASCADE, org_id uuid NOT NULL REFERENCES organizations ON DELETE CASCADE, payload jsonb NOT NULL, expires_at timestamptz NOT NULL DEFAULT now()+interval '30 days', PRIMARY KEY(audit_id,id));
CREATE TABLE IF NOT EXISTS decisions (id uuid PRIMARY KEY, candidate_id uuid NOT NULL REFERENCES candidates ON DELETE CASCADE, org_id uuid NOT NULL REFERENCES organizations ON DELETE CASCADE, reviewer_id uuid NOT NULL, decision text NOT NULL, rationale text NOT NULL, audit_id uuid NOT NULL REFERENCES audits, created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS reports (id uuid PRIMARY KEY, audit_id uuid NOT NULL REFERENCES audits ON DELETE CASCADE, org_id uuid NOT NULL REFERENCES organizations ON DELETE CASCADE, status text NOT NULL DEFAULT 'queued', manifest jsonb, object_path text, error text, created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS outbox (id uuid PRIMARY KEY, org_id uuid NOT NULL REFERENCES organizations ON DELETE CASCADE, kind text NOT NULL, payload jsonb NOT NULL, dispatched_at timestamptz, created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS api_cache (key text PRIMARY KEY, response jsonb NOT NULL, expires_at timestamptz NOT NULL);
CREATE TABLE IF NOT EXISTS dataset_imports (id uuid PRIMARY KEY, org_id uuid NOT NULL REFERENCES organizations ON DELETE CASCADE, revision text NOT NULL, manifest jsonb NOT NULL, created_at timestamptz DEFAULT now());
CREATE INDEX IF NOT EXISTS audits_org_status ON audits(org_id,status);
CREATE INDEX IF NOT EXISTS candidates_cohort ON candidates(org_id,cohort_id);
CREATE INDEX IF NOT EXISTS outbox_pending ON outbox(created_at) WHERE dispatched_at IS NULL;
CREATE INDEX IF NOT EXISTS evidence_expiry ON evidence(expires_at);
DO $$ DECLARE tab text; BEGIN
  FOREACH tab IN ARRAY ARRAY['organizations','memberships','cohorts','candidates','audits','evidence','decisions','reports','outbox','api_cache','dataset_imports'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',tab);
  END LOOP;
END $$;
-- Policies are installed only in Supabase, which provides auth.uid(). Local development uses a trusted server connection.
DO $$ DECLARE tab text; BEGIN
  IF to_regprocedure('auth.uid()') IS NOT NULL THEN
    EXECUTE 'CREATE OR REPLACE FUNCTION public.sift_member(target uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '''' AS ''SELECT EXISTS(SELECT 1 FROM public.memberships WHERE org_id=target AND user_id=auth.uid())''';
    EXECUTE 'REVOKE ALL ON FUNCTION public.sift_member(uuid) FROM PUBLIC';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.sift_member(uuid) TO authenticated';
    FOREACH tab IN ARRAY ARRAY['cohorts','candidates','audits','evidence','decisions','reports','dataset_imports'] LOOP
      EXECUTE format('CREATE POLICY tenant_read ON %I FOR SELECT TO authenticated USING (public.sift_member(org_id))',tab);
    END LOOP;
    EXECUTE 'CREATE POLICY organization_read ON organizations FOR SELECT TO authenticated USING(public.sift_member(id))';
    EXECUTE 'CREATE POLICY membership_read ON memberships FOR SELECT TO authenticated USING(user_id=auth.uid())';
    -- All writes go through the API. Outbox and cache have no browser policies.
  END IF;
END $$;
