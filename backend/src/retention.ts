import { pool, transaction } from "./db.ts";
import { supabase } from "./auth.ts";
import { config, local } from "./config.ts";
import { rm } from "node:fs/promises";
import { resolve } from "node:path";
import { removeReportObjects } from "./reports.ts";

export async function purgeDeletedOrganizations() {
  const deleted = (await pool.query("SELECT org_id FROM storage_deletions"))
    .rows;
  for (const { org_id: orgId } of deleted) {
    if (local)
      await rm(resolve(".data/reports", orgId), {
        recursive: true,
        force: true,
      });
    else {
      // Reports are flat under a UUID prefix. Remove each first page before listing again.
      for (;;) {
        const { data, error } = await supabase!.storage
          .from(config.STORAGE_BUCKET)
          .list(orgId, { limit: 100 });
        if (error) throw new Error("Could not list deleted workspace reports");
        if (!data.length) break;
        await removeReportObjects(
          data.map((object) => `${orgId}/${object.name}`),
        );
      }
    }
    // Repeat for seven days to catch uploads from workers stopped during deletion.
    await pool.query(
      "DELETE FROM storage_deletions WHERE org_id=$1 AND created_at<now()-interval '7 days'",
      [orgId],
    );
  }
  return deleted.length;
}

export async function runRetention() {
  const deletedOrganizations = await purgeDeletedOrganizations();
  const reports = (
    await pool.query(
      "SELECT id,object_path FROM reports WHERE created_at<now()-interval '1 year'",
    )
  ).rows;
  for (const report of reports) {
    if (report.object_path) await removeReportObjects([report.object_path]);
    await pool.query("DELETE FROM reports WHERE id=$1", [report.id]);
  }
  await transaction(async (c) => {
    const evidence = await c.query(
      "DELETE FROM evidence WHERE expires_at<now()",
    );
    await c.query(
      `UPDATE audits SET snapshots=(SELECT COALESCE(jsonb_agg(jsonb_build_object('repository',s->'repository','sha',s->'sha','coverage',s->'coverage')),'[]'::jsonb) FROM jsonb_array_elements(snapshots) s) WHERE updated_at<now()-interval '30 days' AND status NOT IN ('queued','running')`,
    );
    await c.query("DELETE FROM api_cache WHERE expires_at<now()");
    await c.query(
      "DELETE FROM outbox WHERE dispatched_at<now()-interval '7 days'",
    );
    await c.query(
      "DELETE FROM decisions WHERE created_at<now()-interval '1 year'",
    );
    await c.query(
      "DELETE FROM audits a WHERE created_at<now()-interval '1 year' AND status NOT IN ('queued','running') AND NOT EXISTS(SELECT 1 FROM decisions d WHERE d.audit_id=a.id) AND NOT EXISTS(SELECT 1 FROM reports r WHERE r.audit_id=a.id)",
    );
    await c.query(
      "DELETE FROM candidates c WHERE created_at<now()-interval '1 year' AND NOT EXISTS(SELECT 1 FROM audits a WHERE a.candidate_id=c.id)",
    );
    console.log(
      JSON.stringify({
        event: "retention_completed",
        expiredEvidence: evidence.rowCount,
        reports: reports.length,
        deletedOrganizations,
      }),
    );
  });
}
