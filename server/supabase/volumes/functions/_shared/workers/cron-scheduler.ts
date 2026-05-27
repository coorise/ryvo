import { bunqueueHttpHealth, enqueueCronJob } from "../lib/bunqueue-http.ts";
import { dispatchSignedCron } from "../lib/cron-internal.ts";
import { env } from "../lib/env.ts";

async function tickCron(path: string): Promise<void> {
  if (env.useBunqueueCron && env.bunqueueHttpBaseUrl) {
    const ok = await enqueueCronJob(path);
    if (ok) return;
    console.warn("[cron] Bunqueue enqueue failed, falling back to direct dispatch:", path);
  }
  await dispatchSignedCron(path).catch((e) => console.error("[cron]", path, e));
}

export function startCronScheduler(): void {
  if (env.useBunqueueCron && env.bunqueueHttpBaseUrl) {
    void bunqueueHttpHealth().then((ok) => {
      if (!ok) {
        console.warn(
          "[cron] USE_BUNQUEUE_CRON is set but Bunqueue HTTP is not reachable at",
          env.bunqueueHttpBaseUrl,
          "— ticks will fall back to direct dispatch until the server is healthy.",
        );
      }
    });
  }

  setInterval(() => void tickCron("cron-jobs/v1/run/stale-drivers"), 60_000);
  setInterval(() => void tickCron("cron-jobs/v1/run/expire-offers"), 15_000);
  setInterval(() => void tickCron("cron-jobs/v1/run/expire-idempotency"), 3_600_000);
  setInterval(() => void tickCron("cron-jobs/v1/run/admin-tasks"), 60_000);
  console.log(
    env.useBunqueueCron
      ? "[ryvo-cron] Scheduler started (Bunqueue enqueue when available, else direct)"
      : "[ryvo-cron] Scheduler started (direct dispatch)",
  );
}
