import { getAdminClient } from "./supabase.ts";
import { env } from "./env.ts";

function sign(body: string, ts: string): string {
  return new Bun.CryptoHasher("sha256")
    .update(`${ts}.${body}`)
    .update(env.serviceHmacSecret)
    .digest("hex");
}

export type AdminTaskRow = {
  id: string;
  name: string;
  task_key: string;
  params: Record<string, unknown>;
  kind?: "preset" | "http";
  request_method?: string | null;
  request_path?: string | null;
  request_query?: Record<string, unknown> | null;
  request_headers?: Record<string, unknown> | null;
  request_body?: Record<string, unknown> | null;
  schedule_mode: "immediate" | "one_time" | "daily" | "weekly" | "monthly";
  run_at: string | null;
  time_of_day: string | null;
  day_of_week: number | null;
  day_of_month: number | null;
  timezone: string;
  next_run_at: string | null;
  paused_at: string | null;
  last_run_at: string | null;
  last_status: string | null;
  last_result: Record<string, unknown> | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

function parseTimeOfDay(s: string): { hh: number; mm: number } {
  const m = /^(\d{2}):(\d{2})$/.exec(s.trim());
  if (!m) throw new Error("Invalid time_of_day (expected HH:MM)");
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) throw new Error("Invalid time_of_day");
  return { hh, mm };
}

function startOfDayUTC(d: Date): Date {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

function computeNextRunAt(input: {
  schedule_mode: AdminTaskRow["schedule_mode"];
  run_at?: string | null;
  time_of_day?: string | null;
  day_of_week?: number | null;
  day_of_month?: number | null;
}): string | null {
  const now = new Date();

  if (input.schedule_mode === "immediate") return now.toISOString();

  if (input.schedule_mode === "one_time") {
    if (!input.run_at) throw new Error("run_at is required for one_time");
    return new Date(input.run_at).toISOString();
  }

  if (!input.time_of_day) throw new Error("time_of_day is required for recurring schedules");
  const { hh, mm } = parseTimeOfDay(input.time_of_day);

  if (input.schedule_mode === "daily") {
    const base = startOfDayUTC(now);
    base.setUTCHours(hh, mm, 0, 0);
    if (base.getTime() <= now.getTime()) base.setUTCDate(base.getUTCDate() + 1);
    return base.toISOString();
  }

  if (input.schedule_mode === "weekly") {
    const dow = input.day_of_week ?? 1;
    if (dow < 0 || dow > 6) throw new Error("day_of_week must be 0-6");
    const base = startOfDayUTC(now);
    base.setUTCHours(hh, mm, 0, 0);
    const todayDow = base.getUTCDay();
    let delta = dow - todayDow;
    if (delta < 0) delta += 7;
    base.setUTCDate(base.getUTCDate() + delta);
    if (base.getTime() <= now.getTime()) base.setUTCDate(base.getUTCDate() + 7);
    return base.toISOString();
  }

  // monthly
  const dom = input.day_of_month ?? 1;
  if (dom < 1 || dom > 28) throw new Error("day_of_month must be 1-28");
  const base = startOfDayUTC(now);
  base.setUTCDate(dom);
  base.setUTCHours(hh, mm, 0, 0);
  if (base.getTime() <= now.getTime()) {
    base.setUTCMonth(base.getUTCMonth() + 1);
    base.setUTCDate(dom);
    base.setUTCHours(hh, mm, 0, 0);
  }
  return base.toISOString();
}

async function runTask(task: AdminTaskRow): Promise<{ ok: boolean; result: Record<string, unknown> }> {
  const db = getAdminClient();

  if ((task.kind ?? "preset") === "http") {
    const method = String(task.request_method ?? "POST").toUpperCase();
    const path = String(task.request_path ?? "").trim();
    if (!path) throw new Error("request_path is required");

    // Safety: only allow internal cron-jobs endpoints (service-signed) for MVP
    if (!path.startsWith("cron-jobs/")) {
      throw new Error("Only cron-jobs/* paths are allowed for interactive tasks (MVP)");
    }

    const query = (task.request_query ?? {}) as Record<string, unknown>;
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v == null) continue;
      qs.set(k, String(v));
    }
    const url = `http://127.0.0.1:${env.port}/${path}${qs.toString() ? `?${qs.toString()}` : ""}`;

    const bodyObj = task.request_body ?? {};
    const body = method === "GET" ? undefined : JSON.stringify(bodyObj);
    const ts = String(Date.now());

    const res = await fetch(url, {
      method,
      headers: {
        "content-type": "application/json",
        "x-service-timestamp": ts,
        "x-service-signature": sign(body ?? "{}", ts),
        ...(task.request_headers ?? {}),
      } as Record<string, string>,
      body,
    });

    const text = await res.text();
    let json: unknown = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = { raw: text };
    }
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${typeof json === "object" ? JSON.stringify(json) : String(json)}`);
    }
    return { ok: true, result: { status: res.status, response: json } };
  }

  if (task.task_key === "purge_abandoned_checkouts") {
    const days = Number(task.params?.older_than_days ?? 90);
    const limit = Math.min(5000, Math.max(1, Number(task.params?.limit ?? 2000)));
    const cutoff = new Date(Date.now() - days * 86400_000).toISOString();
    const { data, error } = await db
      .from("checkout_sessions")
      .delete()
      .eq("status", "abandoned")
      .lt("created_at", cutoff)
      .select("id")
      .limit(limit);
    if (error) throw new Error(error.message);
    return { ok: true, result: { deleted: data?.length ?? 0, cutoff, limit } };
  }

  throw new Error("Unknown task_key");
}

export async function listAdminTasks(): Promise<AdminTaskRow[]> {
  const db = getAdminClient();
  const { data, error } = await db.from("admin_tasks").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as AdminTaskRow[];
}

export async function createAdminTask(input: {
  name: string;
  task_key: string;
  params: Record<string, unknown>;
  kind?: "preset" | "http";
  request_method?: string | null;
  request_path?: string | null;
  request_query?: Record<string, unknown> | null;
  request_headers?: Record<string, unknown> | null;
  request_body?: Record<string, unknown> | null;
  schedule_mode: AdminTaskRow["schedule_mode"];
  run_at?: string | null;
  time_of_day?: string | null;
  day_of_week?: number | null;
  day_of_month?: number | null;
  timezone?: string;
  created_by: string;
}) {
  const db = getAdminClient();
  const next_run_at = computeNextRunAt(input);
  const payload = {
    name: input.name,
    task_key: input.task_key,
    params: input.params ?? {},
    kind: input.kind ?? "preset",
    request_method: input.request_method ?? null,
    request_path: input.request_path ?? null,
    request_query: input.request_query ?? {},
    request_headers: input.request_headers ?? {},
    request_body: input.request_body ?? null,
    schedule_mode: input.schedule_mode,
    run_at: input.schedule_mode === "one_time" ? input.run_at ?? null : null,
    time_of_day: input.schedule_mode === "daily" || input.schedule_mode === "weekly" || input.schedule_mode === "monthly" ? input.time_of_day ?? "02:00" : null,
    day_of_week: input.schedule_mode === "weekly" ? input.day_of_week ?? 1 : null,
    day_of_month: input.schedule_mode === "monthly" ? input.day_of_month ?? 1 : null,
    timezone: input.timezone ?? "UTC",
    next_run_at,
    created_by: input.created_by,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await db.from("admin_tasks").insert(payload).select("*").single();
  if (error) throw new Error(error.message);
  return data as AdminTaskRow;
}

export async function setAdminTaskPaused(taskId: string, paused: boolean) {
  const db = getAdminClient();
  const patch = paused
    ? { paused_at: new Date().toISOString() }
    : { paused_at: null, next_run_at: new Date().toISOString() };
  const { data, error } = await db
    .from("admin_tasks")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", taskId)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as AdminTaskRow;
}

export async function deleteAdminTask(taskId: string) {
  const db = getAdminClient();
  const { error } = await db.from("admin_tasks").delete().eq("id", taskId);
  if (error) throw new Error(error.message);
  return { deleted: true };
}

export async function runAdminTaskNow(taskId: string) {
  const db = getAdminClient();
  const { data: task, error: loadErr } = await db.from("admin_tasks").select("*").eq("id", taskId).single();
  if (loadErr) throw new Error(loadErr.message);
  const row = task as AdminTaskRow;

  const runInsert = await db.from("admin_task_runs").insert({ task_id: taskId, status: "success" }).select("*").single();
  const runId = String((runInsert.data as any)?.id ?? "");

  try {
    const out = await runTask(row);
    const finishedAt = new Date().toISOString();
    await db.from("admin_task_runs").update({ finished_at: finishedAt, result: out.result }).eq("id", runId);

    const next = row.paused_at ? null : computeNextRunAt(row);
    await db
      .from("admin_tasks")
      .update({
        last_run_at: finishedAt,
        last_status: "success",
        last_result: out.result,
        next_run_at: row.schedule_mode === "one_time" ? null : next,
        updated_at: finishedAt,
      })
      .eq("id", taskId);

    return { run_id: runId, result: out.result };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const finishedAt = new Date().toISOString();
    await db.from("admin_task_runs").update({ status: "error", finished_at: finishedAt, error_message: msg }).eq("id", runId);
    await db
      .from("admin_tasks")
      .update({
        last_run_at: finishedAt,
        last_status: "error",
        last_result: { error: msg },
        updated_at: finishedAt,
      })
      .eq("id", taskId);
    throw new Error(msg);
  }
}

export async function runDueAdminTasks(): Promise<{ ran: number }> {
  const db = getAdminClient();
  const now = new Date().toISOString();
  const { data, error } = await db
    .from("admin_tasks")
    .select("*")
    .is("paused_at", null)
    .not("next_run_at", "is", null)
    .lte("next_run_at", now)
    .limit(20);
  if (error) throw new Error(error.message);

  let ran = 0;
  for (const t of (data ?? []) as AdminTaskRow[]) {
    await runAdminTaskNow(t.id).catch(() => undefined);
    ran++;
  }
  return { ran };
}

