import { env } from "./env.ts";

const QUEUE = "ryvo-cron";

function headers(): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (env.bunqueueHttpToken) {
    h.Authorization = `Bearer ${env.bunqueueHttpToken}`;
  }
  return h;
}

export async function bunqueueHttpHealth(): Promise<boolean> {
  if (!env.bunqueueHttpBaseUrl) return false;
  try {
    const res = await fetch(`${env.bunqueueHttpBaseUrl}/health`, { method: "GET" });
    return res.ok;
  } catch {
    return false;
  }
}

/** Push a cron tick onto Bunqueue; worker in this process (or another) pulls and runs `dispatchSignedCron`. */
export async function enqueueCronJob(path: string): Promise<boolean> {
  if (!env.bunqueueHttpBaseUrl) return false;
  const body = JSON.stringify({ data: { path } });
  try {
    const res = await fetch(`${env.bunqueueHttpBaseUrl}/queues/${QUEUE}/jobs`, {
      method: "POST",
      headers: headers(),
      body,
    });
    const json = (await res.json().catch(() => ({}))) as { ok?: boolean };
    return res.ok && json.ok === true;
  } catch {
    return false;
  }
}

type PullResponse = { ok?: boolean; job?: { id: string; data?: { path?: string } } | null };

/** Long-poll one job; returns null if empty / error. */
export async function pullCronJob(timeoutMs: number): Promise<{ id: string; path: string } | null> {
  if (!env.bunqueueHttpBaseUrl) return null;
  try {
    const res = await fetch(
      `${env.bunqueueHttpBaseUrl}/queues/${QUEUE}/jobs?timeout=${encodeURIComponent(String(timeoutMs))}`,
      { method: "GET", headers: headers() },
    );
    const json = (await res.json()) as PullResponse;
    if (!res.ok || json.ok !== true || !json.job?.id) return null;
    const path = json.job.data?.path;
    if (!path || typeof path !== "string") return null;
    return { id: json.job.id, path };
  } catch {
    return null;
  }
}

export async function ackCronJob(jobId: string, result: unknown): Promise<void> {
  if (!env.bunqueueHttpBaseUrl) return;
  try {
    await fetch(`${env.bunqueueHttpBaseUrl}/jobs/${jobId}/ack`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ result }),
    });
  } catch {
    // stall detector will recover
  }
}

export async function failCronJob(jobId: string, error: string): Promise<void> {
  if (!env.bunqueueHttpBaseUrl) return;
  try {
    await fetch(`${env.bunqueueHttpBaseUrl}/jobs/${jobId}/fail`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ error }),
    });
  } catch {
    // ignore
  }
}
