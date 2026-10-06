// Keep dispatched messages until the corresponding work has reached a final
// state. PostgreSQL can then restore missing jobs after a free Redis restart.
export const ACTIVE_OUTBOX_WORK = `
  (o.kind='audit' AND EXISTS (
    SELECT 1 FROM audits a WHERE a.id::text=o.payload->>'auditId'
    AND a.org_id=o.org_id AND a.status IN ('queued','running') AND NOT a.cancelled
  )) OR (o.kind='report' AND EXISTS (
    SELECT 1 FROM reports r WHERE r.id::text=o.payload->>'reportId'
    AND r.org_id=o.org_id AND r.status IN ('queued','running')
  )) OR (o.kind='dataset' AND EXISTS (
    SELECT 1 FROM dataset_imports d WHERE d.id::text=o.payload->>'importId'
    AND d.org_id=o.org_id AND d.status IN ('queued','running')
  ))`;
