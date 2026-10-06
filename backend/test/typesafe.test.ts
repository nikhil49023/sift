import { test } from "node:test";
import assert from "node:assert/strict";
import { UnrecoverableError } from "bullmq";
import { ProviderError } from "../src/github.ts";
import { createJevVerifier, type JevRequest } from "../src/jev/typesafe.ts";

const packet: JevRequest = {
  state: { evidence: "Synthetic fixture only" },
  questions: {
    supported: { type: "noul", instructions: "Is this claim supported?" },
  },
};
const success = (
  answers: unknown = { supported: { type: "noul", noul: 0.9 } },
) =>
  new Response(
    JSON.stringify({
      model: "jev-test-version",
      answers,
      usage: { input_tokens: 120, output_tokens: 2 },
    }),
  );

test("TypeSafe Jev uses its own API and preserves typed probabilities and resolved model", async () => {
  const verify = createJevVerifier(
    "synthetic-key",
    "jev-latest",
    async (url, options) => {
      assert.equal(url, "https://api.typesafe.ai/v1/systemone");
      assert.equal(options?.redirect, "error");
      assert.equal(
        new Headers(options?.headers).get("Authorization"),
        "Bearer synthetic-key",
      );
      assert.deepEqual(JSON.parse(String(options?.body)), {
        ...packet,
        model: "jev-latest",
      });
      return success();
    },
  );
  const result = await verify(packet);
  assert.equal(result.answers.supported.noul, 0.9);
  assert.equal(result.model, "jev-test-version");
  assert.equal(result.usage.input_tokens, 120);
});

test("TypeSafe rejects missing, extra, wrong-type and invalid probability answers", async () => {
  for (const answers of [
    {},
    {
      supported: { type: "noul", noul: 0.9 },
      extra: { type: "noul", noul: 0.9 },
    },
    { supported: { type: "noul", noul: 1.1 } },
    { supported: { type: "noul", noul: -0.1 } },
    { supported: { type: "noul", noul: "0.9" } },
    { supported: { type: "score", score: 4 } },
  ]) {
    const verify = createJevVerifier("synthetic-key", "jev-latest", async () =>
      success(answers),
    );
    await assert.rejects(verify(packet), ProviderError);
  }
});

test("TypeSafe quota errors retry; credit, credential and request failures are permanent and redacted", async () => {
  for (const status of [408, 429, 503]) {
    const verify = createJevVerifier(
      "synthetic-key",
      "jev-latest",
      async () =>
        new Response("sensitive input echoed upstream", {
          status,
          headers: { "retry-after": "2" },
        }),
    );
    await assert.rejects(
      verify(packet),
      (error) =>
        error instanceof ProviderError &&
        error.retryAfterMs === 2000 &&
        !error.message.includes("sensitive"),
    );
  }
  for (const status of [400, 401, 402, 403, 422]) {
    const verify = createJevVerifier(
      "synthetic-key",
      "jev-latest",
      async () => new Response("sensitive input echoed upstream", { status }),
    );
    await assert.rejects(
      verify(packet),
      (error) =>
        error instanceof UnrecoverableError &&
        !error.message.includes("sensitive"),
    );
  }
});

test("TypeSafe request budgets are checked before spending API credits", async () => {
  let calls = 0;
  const verify = createJevVerifier(
    "synthetic-key",
    "jev-latest",
    async () => {
      calls++;
      return success();
    },
    100,
  );
  await assert.rejects(verify(packet), /character budget/);
  await assert.rejects(
    verify({ state: {}, questions: {} }),
    /verification questions/,
  );
  assert.equal(calls, 0);
});
