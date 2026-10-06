import { z } from "zod";
import { pool } from "./db.ts";

export const CandidateQuery = z.object({
  cohortId: z.uuid(),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  pageSize: z.coerce.number().int().min(10).max(50).default(50),
  search: z.string().trim().max(200).default(""),
  risk: z.enum(["ALL", "REVIEW_REQUIRED", "INSUFFICIENT_EVIDENCE", "NO_FLAGS_OBSERVED", "FLAGGED"]).default("ALL"),
  state: z.enum(["ALL", "queued", "running", "completed", "partial", "failed", "cancelled"]).default("ALL"),
  sort: z.enum(["newest", "name"]).default("newest"),
});

export async function candidatePage(orgId: string, query: z.infer<typeof CandidateQuery>) {
  const { cohortId, page, pageSize, search, risk, state, sort } = query;
  const pattern = `%${search.replace(/[\\%_]/g, "\\$&")}%`;
  const result = await pool.query(`
    WITH entries AS MATERIALIZED (
      SELECT c.id,c.name,c.username,c.source,c.created_at,
        a.id AS audit_id,a.status,a.stage,
        CASE WHEN a.assessment IS NULL THEN NULL ELSE jsonb_build_object(
          'overallScore',a.assessment->'overallScore',
          'riskLevel',a.assessment->'riskLevel',
          'rankable',a.assessment->'rankable') END AS assessment
      FROM candidates c LEFT JOIN LATERAL (
        SELECT id,status,stage,assessment FROM audits
        WHERE org_id=c.org_id AND candidate_id=c.id
        ORDER BY created_at DESC,id DESC LIMIT 1
      ) a ON true
      WHERE c.org_id=$1 AND c.cohort_id=$2
        AND (c.name ILIKE $3 OR COALESCE(c.username,'') ILIKE $3)
    ), filtered AS (
      SELECT * FROM entries WHERE ($4='ALL' OR assessment->>'riskLevel'=$4)
        AND ($5='ALL' OR status=$5)
    ), selected AS (
      SELECT * FROM filtered ORDER BY
        CASE WHEN $6='name' THEN lower(name) END ASC,created_at DESC,id DESC
      LIMIT $7 OFFSET $8
    )
    SELECT COALESCE((SELECT jsonb_agg(selected) FROM selected),'[]'::jsonb) AS candidates,
      (SELECT count(*) FROM filtered)::int AS total,
      (SELECT count(*) FROM candidates WHERE org_id=$1 AND cohort_id=$2)::int AS "cohortTotal",
      (SELECT count(*) FROM entries)::int AS "searchTotal"
  `, [orgId, cohortId, pattern, risk, state, sort, pageSize, (page - 1) * pageSize]);
  return { ...result.rows[0], page, pageSize, pageCount: Math.max(1, Math.ceil(result.rows[0].total / pageSize)) };
}
