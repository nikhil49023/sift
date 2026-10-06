import { UnrecoverableError } from "bullmq";
import { z } from "zod";
import { ProviderError } from "../github.ts";
import { config } from "../config.ts";

// TypeSafe Jev is a separate decision API. Noul returns P(yes), not prose or
// the confidence field used by TypeSafe's Choice and Score primitives.
export type NoulQuestion = {
  type: "noul";
  instructions: string;
  criteria?: { true: string; false: string };
};
export type JevRequest = {
  state: Record<string, unknown>;
  questions: Record<string, NoulQuestion>;
};
const ResponseSchema = z.object({
  model: z.string().min(1).max(200),
  answers: z.record(
    z.string(),
    z
      .object({ type: z.literal("noul"), noul: z.number().min(0).max(1) })
      .strict(),
  ),
  usage: z.object({
    input_tokens: z.number().int().nonnegative(),
    output_tokens: z.number().int().nonnegative(),
  }),
});
export type JevResponse = z.infer<typeof ResponseSchema>;
export type JevVerifier = (request: JevRequest) => Promise<JevResponse>;

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

export function createJevVerifier(
  apiKey: string,
  model: string,
  request: typeof fetch = fetch,
  maxRequestChars = 64000,
  endpoint = config.DECISION_PROVIDER_URL,
): JevVerifier {
  return async ({ state, questions }) => {
    const names = Object.keys(questions).sort();
    if (!names.length || names.length > 12)
      throw new UnrecoverableError(
        "Jev requires 1–12 bounded verification questions",
      );
    const body = JSON.stringify({ state, model, questions });
    if (body.length > maxRequestChars)
      throw new UnrecoverableError(
        "Jev verification packet exceeds its character budget; reduce judge evidence or the job description",
      );
    let response: Response;
    try {
      response = await request(endpoint, {
        method: "POST",
        redirect: "error",
        signal: AbortSignal.timeout(45000),
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body,
      });
    } catch {
      throw new ProviderError(
        "TypeSafe Jev connection failed or timed out",
        30000,
      );
    }
    if (
      response.status === 429 ||
      response.status === 408 ||
      response.status >= 500
    )
      throw new ProviderError(
        `TypeSafe Jev temporarily unavailable (${response.status})`,
        retryDelay(response.headers, response.status === 429 ? 60000 : 30000),
      );
    if (response.status === 402)
      throw new UnrecoverableError(
        "TypeSafe Jev credit balance is unavailable; check account billing",
      );
    if (response.status === 401 || response.status === 403)
      throw new UnrecoverableError(
        "TypeSafe Jev rejected credentials or model access; check TYPESAFE_API_KEY and permissions",
      );
    if (!response.ok)
      throw new UnrecoverableError(
        `TypeSafe Jev rejected verification (${response.status}); check the model and request limits`,
      );
    // Never propagate upstream bodies: validation errors may echo request data.
    let value: unknown;
    try {
      value = await response.json();
    } catch {
      throw new ProviderError(
        "TypeSafe Jev returned an unreadable response",
        30000,
      );
    }
    const parsed = ResponseSchema.safeParse(value);
    if (
      !parsed.success ||
      JSON.stringify(Object.keys(parsed.data.answers).sort()) !==
        JSON.stringify(names)
    )
      throw new ProviderError(
        "TypeSafe Jev returned invalid or incomplete typed answers",
        30000,
      );
    return parsed.data;
  };
}
