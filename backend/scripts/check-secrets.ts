// Read-only deployment checks. Never print environment values or provider bodies.
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { X509Certificate } from "node:crypto";
import dotenv from "dotenv";
import pg from "pg";
import { createClient } from "@supabase/supabase-js";

const file = fileURLToPath(new URL("../../.env", import.meta.url));
const saved = await readFile(file, "utf8").catch(() => "");
const env = { ...dotenv.parse(saved), ...process.env };
type Check = { setting: string; status: "passed" | "missing" | "failed" | "unverified"; detail: string };
const checks: Check[] = [];
const add = (setting: string, status: Check["status"], detail: string) => checks.push({ setting, status, detail });
const missing = (setting: string) => {
  if (env[setting]?.trim()) return false;
  add(setting, "missing", "Not configured");
  return true;
};
const limitedFetch: typeof fetch = (url, options) => fetch(url, { ...options, redirect: "error", signal: AbortSignal.timeout(15000) });
let supabaseUrl: URL | undefined;
if (!missing("SUPABASE_URL")) {
  try {
    const url = new URL(env.SUPABASE_URL!);
    if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash || url.pathname !== "/") throw new Error();
    supabaseUrl = url;
    add("SUPABASE_URL", "passed", "HTTPS project URL");
  } catch { add("SUPABASE_URL", "failed", "Use the HTTPS project origin without credentials or URL parameters"); }
}
for (const setting of ["SUPABASE_ANON_KEY", "SUPABASE_SECRET_KEY"] as const) {
  if (missing(setting)) continue;
  if (!supabaseUrl) { add(setting, "unverified", "A valid project URL is required"); continue; }
  try {
    const key = env[setting]!;
    const client = createClient(supabaseUrl.href, key, {
      auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: limitedFetch },
    });
    if (setting === "SUPABASE_ANON_KEY") {
      const response = await limitedFetch(new URL("/auth/v1/settings", supabaseUrl), { headers: { apikey: key } });
      add(setting, response.ok ? "passed" : "failed", `Public Auth endpoint HTTP ${response.status}`);
    } else {
      const { error } = await client.auth.admin.listUsers({ page: 1, perPage: 1 });
      add(setting, error ? "failed" : "passed", error ? `Admin Auth endpoint HTTP ${error.status ?? "error"}` : "Admin Auth access verified");
      if (!error) {
        const { data, error: storageError } = await client.storage.getBucket(env.STORAGE_BUCKET || "sift-private");
        add("PRIVATE_REPORT_BUCKET", !storageError && data?.public === false ? "passed" : "failed", storageError ? "Private bucket unavailable" : data?.public ? "Report bucket is public" : "Private PDF storage configured");
      }
    }
  } catch { add(setting, "failed", "Request failed; provider response omitted"); }
}

let ca: string | undefined;
let caValid = true;
if (env.DATABASE_CA_BASE64?.trim()) {
  try {
    const value = env.DATABASE_CA_BASE64.trim();
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(value)) throw new Error();
    ca = Buffer.from(value, "base64").toString("utf8");
    const certificate = new X509Certificate(ca);
    if (!certificate.ca || Date.parse(certificate.validFrom) > Date.now() || Date.parse(certificate.validTo) < Date.now()) throw new Error();
    add("DATABASE_CA_BASE64", "passed", "Valid, unexpired CA certificate");
  } catch { caValid = false; add("DATABASE_CA_BASE64", "failed", "Expected a base64 PEM root CA certificate"); }
} else add("DATABASE_CA_BASE64", "unverified", "Not configured; database probe will use trusted system roots");

if (!missing("DATABASE_URL")) {
  let url: URL | undefined;
  try {
    url = new URL(env.DATABASE_URL!);
    if (!["postgres:", "postgresql:"].includes(url.protocol) || !url.password || url.port !== "5432"
      || !url.hostname.endsWith(".pooler.supabase.com") || [...url.searchParams.keys()].some(k => k.startsWith("ssl"))) throw new Error();
    if (supabaseUrl?.hostname.endsWith(".supabase.co") && decodeURIComponent(url.username) !== `postgres.${supabaseUrl.hostname.split(".")[0]}`) throw new Error();
  } catch { url = undefined; add("DATABASE_URL", "failed", "Use this project's session pooler on port 5432, with password and without SSL query parameters"); }
  if (url && caValid) {
    const client = new pg.Client({ connectionString: url.href, connectionTimeoutMillis: 10000, query_timeout: 10000,
      ssl: { rejectUnauthorized: true, ...(ca ? { ca } : {}) },
    });
    try {
      await client.connect();
      const result = await client.query("SELECT to_regclass('public.audits') IS NOT NULL AS migrated");
      add("DATABASE_URL", "passed", "Database login with certificate and hostname verification succeeded");
      add("DATABASE_SCHEMA", result.rows[0].migrated ? "passed" : "unverified", result.rows[0].migrated ? "Audit table exists; full migration state still checked at deployment" : "Application migrations have not run");
      if (!ca) {
        const check = checks.find(c => c.setting === "DATABASE_CA_BASE64")!;
        check.status = "passed"; check.detail = "Verified TLS uses trusted system roots; an explicit CA is unnecessary for this connection";
      }
    } catch { add("DATABASE_URL", "failed", "Database login/TLS probe failed; connection details omitted"); }
    finally { await client.end().catch(() => {}); }
  }
}
if (!missing("GROQ_API_KEY")) {
  try {
    const response = await limitedFetch("https://api.groq.com/openai/v1/models", { headers: { Authorization: `Bearer ${env.GROQ_API_KEY}` } });
    if (!response.ok) add("GROQ_API_KEY", "failed", `Groq models endpoint HTTP ${response.status}`);
    else {
      const body = await response.json() as { data?: { id: string }[] };
      const available = body.data?.some(model => model.id === (env.GROQ_MODEL || "openai/gpt-oss-120b"));
      add("GROQ_API_KEY", available ? "passed" : "failed", available ? "Authentication and configured model availability verified; inference quota is not tested" : "Configured model unavailable");
    }
  } catch { add("GROQ_API_KEY", "failed", "Request failed; provider response omitted"); }
}
console.log(JSON.stringify({ ready: ["DATABASE_URL", "SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SECRET_KEY", "GROQ_API_KEY", "PRIVATE_REPORT_BUCKET"].every(setting => checks.some(c => c.setting === setting && c.status === "passed")), checks }, null, 2));
process.exitCode = checks.some(c => c.status === "failed" || c.status === "missing") ? 1 : 0;
