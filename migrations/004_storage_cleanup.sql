-- Survives tenant deletion so private report objects can be removed durably.
CREATE TABLE IF NOT EXISTS storage_deletions (
  org_id uuid PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE storage_deletions ENABLE ROW LEVEL SECURITY;
-- No browser policies. Only the trusted retention job can process tombstones.
