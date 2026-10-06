import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
dotenv.config({
  path: fileURLToPath(new URL("../../.env", import.meta.url)),
  quiet: true,
});
import { z } from "zod";
const Env = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().default(3001),
  DEPLOYMENT_MODE: z.enum(["split", "demo"]).default("split"),
  DATABASE_URL: z.string().default("postgres://sift:sift@localhost:55432/sift"),
  REDIS_URL: z.string().default("redis://localhost:56379"),
  DATABASE_CA_BASE64: z.string().optional(),
  AUTH_MODE: z.enum(["local", "supabase"]).default("local"),
  SUPABASE_URL: z.url().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SECRET_KEY: z.string().optional(),
  GITHUB_TOKEN: z.string().optional(),
  GROQ_API_KEY: z.string().optional(),
  GROQ_MODEL: z.string().default("openai/gpt-oss-120b"),
  GROQ_REASONING_EFFORT: z.enum(["low", "medium", "high"]).default("medium"),
  // Accept the old names during the configuration transition; these budgets
  // describe Groq's proposal, not TypeSafe Jev's decision API.
  JUDGE_MAX_EVIDENCE_CHARS: z.preprocess(
    (value) => value ?? process.env.JEV_MAX_EVIDENCE_CHARS,
    z.coerce.number().int().min(1000).max(80000).default(16000),
  ),
  JUDGE_MAX_OUTPUT_TOKENS: z.preprocess(
    (value) => value ?? process.env.JEV_MAX_OUTPUT_TOKENS,
    z.coerce.number().int().min(1024).max(16384).default(4096),
  ),
  DECISION_PROVIDER: z.enum(["none", "typesafe"]).default("none"),
  DECISION_PROVIDER_URL: z
    .string()
    .url()
    .default("https://api.typesafe.ai/v1/systemone"),
  TYPESAFE_API_KEY: z.string().optional(),
  TYPESAFE_MODEL: z.string().default("jev-latest"),
  JEV_SUPPORT_THRESHOLD: z.coerce.number().min(0.5).max(1).default(0.8),
  JEV_MAX_REQUEST_CHARS: z.coerce
    .number()
    .int()
    .min(1000)
    .max(160000)
    .default(64000),
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
if (config.DEPLOYMENT_MODE === "demo" && config.WORKER_CONCURRENCY !== 1)
  throw new Error("Demo deployment requires WORKER_CONCURRENCY=1");
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
