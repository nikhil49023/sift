export const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
export async function request(
  path,
  {
    token,
    orgId,
    body,
    method = body ? "POST" : "GET",
    signal,
    idempotencyKey,
  } = {},
) {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    signal,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(orgId ? { "X-Organization-ID": orgId } : {}),
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    const failure = new Error(
      error.error || `Request failed (${response.status})`,
    );
    failure.status = response.status;
    throw failure;
  }
  return response.status === 204 ? null : response.json();
}
export async function downloadReport(url, token, orgId) {
  const isLocal = url.startsWith("/api/");
  const response = await fetch(isLocal ? API_BASE + url : url, {
    headers: isLocal
      ? {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          "X-Organization-ID": orgId,
        }
      : {},
  });
  if (!response.ok) throw new Error("Report download failed");
  const objectUrl = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = "sift-dossier.pdf";
  link.click();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}
