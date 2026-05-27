import { env } from "../lib/env.ts";
import { ackCronJob, failCronJob, pullCronJob } from "../lib/bunqueue-http.ts";
import { dispatchSignedCron } from "../lib/cron-internal.ts";

/**
 * Consumes jobs from Bunqueue queue `ryvo-cron` (HTTP API) and runs the same signed
 * internal routes as the legacy in-process scheduler.
 */
export function startBunqueueCronWorker(): void {
  if (!env.useBunqueueCron || !env.bunqueueHttpBaseUrl) {
    return;
  }
  console.log("[ryvo-bunqueue-cron] Worker enabled (pull → dispatchSignedCron → ack)");

  const loop = async () => {
    for (;;) {
      try {
        const job = await pullCronJob(25_000);
        if (!job) continue;
        const res = await dispatchSignedCron(job.path);
        const body = await res.text().catch(() => "");
        if (!res.ok) {
          await failCronJob(job.id, `HTTP ${res.status}: ${body.slice(0, 500)}`);
          continue;
        }
        await ackCronJob(job.id, { ok: true, httpStatus: res.status });
      } catch (e) {
        console.error("[ryvo-bunqueue-cron] loop error", e);
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  };

  void loop();
}
