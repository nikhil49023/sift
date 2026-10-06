import { UnrecoverableError } from "bullmq";
import { DIMENSIONS } from "@sift/contracts";
import { config } from "../config.ts";
import { ProviderError } from "../github.ts";
import { SYSTEM_PROMPT } from "./rubric.ts";

// Groq strict mode requires every property. Non-code citations use null line bounds;
// the application still enforces ranges, score limits and citation correspondence.
const citation = {
  type: "object",
  additionalProperties: false,
  properties: {
    evidenceId: { type: "string" },
    startLine: { type: ["integer", "null"] },
    endLine: { type: ["integer", "null"] },
    excerpt: { type: "string" },
  },
  required: ["evidenceId", "startLine", "endLine", "excerpt"],
};
const citations = { type: "array", items: citation };
const dimension = {
  type: "object",
  additionalProperties: false,
  properties: {
    level: { type: ["integer", "null"], enum: [0, 1, 2, 3, 4, null] },
    rationale: { type: "string" },
    citations,
  },
  required: ["level", "rationale", "citations"],
};
export const GROQ_JUDGMENT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    dimensions: {
      type: "object",
      additionalProperties: false,
      properties: Object.fromEntries(
        DIMENSIONS.map((name) => [name, dimension]),
      ),
      required: [...DIMENSIONS],
    },
    summary: { type: "string" },
    roleFit: {
      anyOf: [
        {
          type: "object",
          additionalProperties: false,
          properties: { rationale: { type: "string" }, citations },
          required: ["rationale", "citations"],
        },
        { type: "null" },
      ],
    },
  },
  required: ["dimensions", "summary", "roleFit"],
};
export type JudgeCompletion = (packet: string) => Promise<{
  text: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
}>;
function retryDelay(headers: Headers, fallback: number) {
  const value = headers.get("retry-after");
  if (!value) return fallback;
  const seconds = Number(value);
  const delay = Number.isFinite(seconds)
    ? seconds * 1000
    : Date.parse(value) - Date.now();
  return Number.isFinite(delay) && delay >= 0
    ? Math.max(1000, delay)
    : fallback;
}
export function createGroqCompletion(
  apiKey: string,
  model: string,
  request: typeof fetch = fetch,
): JudgeCompletion {
  return async (packet) => {
    let response: Response;
    try {
      response = await request(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          redirect: "error",
          signal: AbortSignal.timeout(90000),
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            temperature: 0,
            max_completion_tokens: config.JUDGE_MAX_OUTPUT_TOKENS,
            ...(model.startsWith("openai/gpt-oss-") ? {
              reasoning_effort: config.GROQ_REASONING_EFFORT,
              reasoning_format: "hidden",
            } : {}),
            messages: [
              {
                role: "system",
                content: `${SYSTEM_PROMPT}\nKeep rationales concise. Include startLine and endLine in every citation; use null for both on non-code evidence when no line range applies.`,
              },
              { role: "user", content: packet },
            ],
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "sift_rubric_judgment",
                strict: true,
                schema: GROQ_JUDGMENT_SCHEMA,
              },
            },
          }),
        },
      );
    } catch (error) {
      if (error instanceof Error && error.name === "AssertionError") throw error;
      throw new ProviderError(
        "Groq connection failed or timed out; evaluation will retry",
        30000,
      );
    }
    if (response.status === 429)
      throw new ProviderError(
        "Groq rate limit reached; evaluation will retry",
        retryDelay(response.headers, 60000),
      );
    if (response.status >= 500)
      throw new ProviderError(
        `Groq temporarily unavailable (${response.status}); evaluation will retry`,
        retryDelay(response.headers, 30000),
      );
    if (response.status === 401 || response.status === 403)
      throw new UnrecoverableError(
        "Groq rejected credentials or model access; check GROQ_API_KEY and model permissions",
      );
    if (!response.ok)
      throw new UnrecoverableError(
        `Groq rejected evaluation request (${response.status}); verify strict-output model support and account token limits`,
      );
    let result: any;
    try {
      result = await response.json();
    } catch {
      throw new ProviderError(
        "Groq returned an unreadable response; evaluation will retry",
        30000,
      );
    }
    if (!result || typeof result !== "object")
      throw new ProviderError(
        "Groq returned an invalid response; evaluation will retry",
        30000,
      );
    const choice = result.choices?.[0];
    if (choice?.finish_reason === "length")
      throw new UnrecoverableError(
        "Groq output was truncated; reduce the evidence packet or increase JUDGE_MAX_OUTPUT_TOKENS",
      );
    return {
      text:
        typeof choice?.message?.content === "string"
          ? choice.message.content
          : "",
      model: typeof result.model === "string" ? result.model : model,
      inputTokens: result.usage?.prompt_tokens,
      outputTokens: result.usage?.completion_tokens,
      totalTokens: result.usage?.total_tokens,
    };
  };
}
