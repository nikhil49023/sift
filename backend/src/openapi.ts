import { z } from "zod";
import { AuditInput, EvidenceSchema, JudgeOutput } from "@sift/contracts";
const paths: Record<string, any> = {};
const routes: [string, string, string][] = [
  ["get", "/api/organizations", "List memberships"],
  ["post", "/api/organizations", "Create organization"],
  ["get", "/api/cohorts", "List cohorts"],
  ["post", "/api/cohorts", "Create cohort"],
  ["post", "/api/audits", "Queue audit"],
  ["get", "/api/audits/{id}", "Read audit progress"],
  ["post", "/api/audits/{id}/cancel", "Cancel audit"],
  ["get", "/api/audits/{id}/evidence", "List evidence manifests"],
  ["get", "/api/audits/{id}/evidence/{evidenceId}", "Read retained evidence"],
  ["get", "/api/candidates", "List cohort assessments"],
  ["get", "/api/candidates/{id}", "Read candidate dossier"],
  ["post", "/api/candidates/{id}/decisions", "Record human decision"],
  ["post", "/api/audits/{id}/reports", "Queue PDF"],
  ["get", "/api/reports/{id}", "Read report status and signed download"],
  ["post", "/api/template-corpus", "Register pinned template"],
  ["post", "/api/dataset-imports", "Queue approved dataset import"],
  ["get", "/api/dataset-imports", "Read import status"],
  ["get", "/api/memberships", "List organization members"],
  ["post", "/api/memberships", "Assign member role"],
  ["delete", "/api/organization", "Delete organization"],
  [
    "get",
    "/api/github/profiles/{username}/repositories",
    "Discover public repositories",
  ],
];
for (const [method, path, summary] of routes) {
  const parameters = [...path.matchAll(/\{([^}]+)\}/g)].map((m) => ({
    name: m[1],
    in: "path",
    required: true,
    schema: { type: "string" },
  }));
  if (!path.endsWith("/organizations"))
    parameters.push({
      name: "X-Organization-ID",
      in: "header",
      required: true,
      schema: { type: "string" },
    });
  paths[path] ??= {};
  paths[path][method] = {
    summary,
    security: [{ bearerAuth: [] }],
    parameters,
    responses: {
      "200": { description: "Successful read" },
      "201": { description: "Resource created" },
      "202": { description: "Background work queued" },
      "400": { description: "Invalid request" },
      "401": { description: "Authentication required" },
      "403": { description: "Role or tenant access denied" },
      "404": { description: "Resource not found" },
      "409": { description: "Conflicting state" },
      "429": { description: "Request or audit concurrency limit" },
    },
  };
}
paths["/api/audits"].post.parameters.push({
  name: "Idempotency-Key",
  in: "header",
  required: true,
  schema: { type: "string" },
});
paths["/api/audits/{id}/retry"] = {
  post: {
    summary: "Retry evaluation using retained pinned evidence",
    security: [{ bearerAuth: [] }],
    parameters: paths["/api/audits/{id}"].get.parameters,
    responses: {
      "202": { description: "Audit queued" },
      "409": { description: "State or evidence retention prevents retry" },
    },
  },
};
paths["/api/audits"].post.requestBody = {
  required: true,
  content: {
    "application/json": {
      schema: { $ref: "#/components/schemas/AuditSubmission" },
    },
  },
};
paths["/api/candidates"].get.parameters.push(
  {
    name: "cohortId",
    in: "query",
    required: true,
    schema: { type: "string", format: "uuid" },
  },
  { name: "page", in: "query", schema: { type: "integer", minimum: 1 } },
  { name: "search", in: "query", schema: { type: "string" } },
);
export const openapi = {
  openapi: "3.1.0",
  info: {
    title: "SIFT API",
    version: "1.0.0",
    description: "Tenant-scoped evidence audits and human-reviewed decisions.",
  },
  paths,
  components: {
    securitySchemes: { bearerAuth: { type: "http", scheme: "bearer" } },
    schemas: {
      AuditSubmission: z.toJSONSchema(AuditInput, {
        io: "input",
        unrepresentable: "any",
      }),
      Evidence: z.toJSONSchema(EvidenceSchema),
      Judgment: z.toJSONSchema(JudgeOutput),
    },
  },
};
