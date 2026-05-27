import { emitAudit } from "./events.ts";
import { getUserEmail } from "./finance-referrals.ts";
import { getAdminClient } from "./supabase.ts";

const SECURITY_EVENT_TYPES = new Set([
  "login_failed",
  "login_success",
  "logout",
  "token_refresh",
  "mfa_challenge",
  "mfa_enabled",
  "password_reset",
  "sos",
  "rate_limit",
  "permission_change",
  "data_export",
  "config_change",
  "device_registered",
  "device_revoked",
]);

export async function listSecurityAuthEvents(opts?: {
  severity?: string;
  limit?: number;
}) {
  const db = getAdminClient();
  let q = db
    .from("security_auth_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(opts?.limit ?? 300);
  if (opts?.severity && opts.severity !== "all") {
    q = q.eq("severity", opts.severity);
  }
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listActivityLogs(limit = 300) {
  const db = getAdminClient();
  const { data, error } = await db
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  const rows = data ?? [];
  return rows.filter((row) => {
    const action = String(row.action ?? "");
    if (SECURITY_EVENT_TYPES.has(action)) return false;
    if (action.startsWith("auth.") || action.startsWith("security.")) return false;
    return true;
  });
}

export async function listUserDevices(includeRevoked = true) {
  const db = getAdminClient();
  let q = db
    .from("device_tokens")
    .select("*")
    .order("last_seen_at", { ascending: false, nullsFirst: false })
    .limit(500);
  if (!includeRevoked) {
    q = q.is("revoked_at", null);
  }
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  const rows = data ?? [];
  const enriched = await Promise.all(
    rows.map(async (row) => {
      let user_email = row.user_id;
      try {
        user_email = await getUserEmail(row.user_id);
      } catch {
        /* keep id fallback */
      }
      return {
        ...row,
        user_email,
        token_preview: String(row.token ?? "").slice(-8),
      };
    }),
  );
  return enriched;
}

export async function revokeUserDevice(deviceId: string, actorId: string) {
  const db = getAdminClient();
  const { data: existing, error: loadErr } = await db
    .from("device_tokens")
    .select("*")
    .eq("id", deviceId)
    .maybeSingle();
  if (loadErr) throw new Error(loadErr.message);
  if (!existing) throw new Error("Device not found");
  if (existing.revoked_at) throw new Error("Device already revoked");

  const { data, error } = await db
    .from("device_tokens")
    .update({
      revoked_at: new Date().toISOString(),
      revoked_by: actorId,
    })
    .eq("id", deviceId)
    .select()
    .single();
  if (error) throw new Error(error.message);

  await emitAudit(actorId, "device.revoked", "device_tokens", deviceId, {
    user_id: existing.user_id,
    platform: existing.platform,
    device_name: existing.device_name,
  });

  await db.from("security_auth_events").insert({
    severity: "info",
    event_type: "device_revoked",
    actor_id: actorId,
    actor_label: await getUserEmail(actorId).catch(() => "admin"),
    details: `Revoked ${existing.device_name ?? existing.platform} for user ${existing.user_id}`,
    mfa_used: null,
    country_code: existing.country_code,
  });

  return data;
}
