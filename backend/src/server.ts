import { app } from "./app.ts";
import { config, local } from "./config.ts";
import { pool } from "./db.ts";

let worker: { close(): Promise<void> } | undefined;
let retentionTimer: ReturnType<typeof setInterval> | undefined;
let retaining: Promise<void> | undefined;
if (config.DEPLOYMENT_MODE === "demo") {
  const { startWorker } = await import("./worker.ts");
  const { runRetention } = await import("./retention.ts");
  worker = startWorker({ recoverQueue: true });
  const retain = () => {
    if (retaining) return;
    retaining = runRetention()
      .catch(() => console.error(JSON.stringify({ event: "retention_failed" })))
      .finally(() => { retaining = undefined; });
  };
  // Free services sleep: cleanup catches up on wake and repeats while running.
  retain();
  retentionTimer = setInterval(retain, 3600000);
}

const server = app.listen(config.PORT, local ? "127.0.0.1" : "0.0.0.0", () =>
  console.log(JSON.stringify({
    event: "server_started",
    port: config.PORT,
    authMode: config.AUTH_MODE,
    deploymentMode: config.DEPLOYMENT_MODE,
  })),
);
let closing = false;
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, async () => {
    if (closing) return;
    closing = true;
    if (retentionTimer) clearInterval(retentionTimer);
    const timeout = setTimeout(() => process.exit(1), 25000);
    try {
      await Promise.all([
        new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())),
        worker?.close(),
        retaining,
      ]);
      await pool.end();
      clearTimeout(timeout);
      process.exit(0);
    } catch {
      process.exit(1);
    }
  });
