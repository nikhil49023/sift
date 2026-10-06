import "dotenv/config";
import { z } from "zod";
const Env = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().default("postgres://sift:sift@localhost:55432/sift"),
  REDIS_URL: z.string().default("redis://localhost:56379"),
  DATABASE_CA_BASE64: z.string().optional(),
  AUTH_MODE: z.enum(["local", "supabase"]).default("local"),
  SUPABASE_URL: z.url().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SECRET_KEY: z.string().optional(),
  GITHUB_TOKEN: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default("gemini-2.5-flash"),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  STORAGE_BUCKET: z.string().default("sift-private"),
  LOCAL_ORG_ID: z.uuid().default("00000000-0000-4000-8000-000000000001"),
  LOCAL_USER_ID: z.uuid().default("00000000-0000-4000-8000-000000000002"),
  GITHUB_API_VERSION: z.string().default("2026-03-10"),
  WORKER_CONCURRENCY: z.coerce.number().int().min(1).max(8).default(2),
  MAX_REPO_BYTES: z.coerce.number().positive().default(104857600),
  MAX_FILES: z.coerce.number().positive().default(2000),
  MAX_COMMITS: z.coerce.number().positive().default(10000),
  MAX_REPO_MS: z.coerce.number().positive().default(900000),
  RANKINGS_ENABLED: z.enum(["true", "false"]).default("false"),
  DATASET_LICENSE_APPROVED: z.enum(["true", "false"]).default("false"),
});
export const config = Env.parse(process.env);
if (config.NODE_ENV === "production" && config.AUTH_MODE !== "supabase")
  throw new Error("Production requires Supabase authentication");
if (
  config.AUTH_MODE === "supabase" &&
  (!config.SUPABASE_URL ||
    !config.SUPABASE_ANON_KEY ||
    !config.SUPABASE_SECRET_KEY)
)
  throw new Error("Supabase credentials are required");
if (
  config.AUTH_MODE === "supabase" &&
  [...new URL(config.DATABASE_URL).searchParams.keys()].some((key) =>
    key.startsWith("ssl"),
  )
)
  throw new Error(
    "Set DATABASE_CA_BASE64 for database TLS; remove SSL parameters from DATABASE_URL",
  );
export const local = config.AUTH_MODE === "local";
