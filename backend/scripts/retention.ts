import { pool } from "../src/db.ts";
import { runRetention } from "../src/retention.ts";
try {
  await runRetention();
} finally {
  await pool.end();
}
