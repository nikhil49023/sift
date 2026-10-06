import pg from "pg";
import { config } from "./config.ts";
export const pool = new pg.Pool({
  connectionString: config.DATABASE_URL,
  max: 10,
  ...(config.AUTH_MODE === "supabase"
    ? {
        ssl: {
          rejectUnauthorized: true,
          ...(config.DATABASE_CA_BASE64
            ? {
                ca: Buffer.from(config.DATABASE_CA_BASE64, "base64").toString(
                  "utf8",
                ),
              }
            : {}),
        },
      }
    : {}),
});
export async function transaction<T>(
  run: (client: pg.PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await run(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
