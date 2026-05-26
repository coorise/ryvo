import { env } from "../lib/env.ts";

function sign(body: string, ts: string): string {
  return new Bun.CryptoHasher("sha256")
    .update(`${ts}.${body}`)
    .update(env.serviceHmacSecret)
    .digest("hex");
}

async function callCron(path: string): Promise<void> {
  const ts = String(Date.now());
  const body = "{}";
  await fetch(`http://127.0.0.1:${env.port}/${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-service-timestamp": ts,
      "x-service-signature": sign(body, ts),
    },
    body,
  }).catch((e) => console.error("[cron]", path, e));
}

export function startCronScheduler(): void {
  setInterval(() => callCron("cron-jobs/v1/run/stale-drivers"), 60_000);
  setInterval(() => callCron("cron-jobs/v1/run/expire-offers"), 15_000);
  setInterval(() => callCron("cron-jobs/v1/run/expire-idempotency"), 3_600_000);
  setInterval(() => callCron("cron-jobs/v1/run/admin-tasks"), 60_000);
  console.log("[ryvo-cron] Scheduler started");
}
