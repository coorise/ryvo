import { getAdminClient } from "./supabase.ts";

/** Resolve auth user ids to emails (batch). */
export async function resolveUserEmails(userIds: string[]): Promise<Record<string, string>> {
  const unique = [...new Set(userIds.filter(Boolean))];
  if (!unique.length) return {};

  const db = getAdminClient();
  const { data, error } = await db.rpc("admin_user_emails", { p_ids: unique });
  if (error) {
    const map: Record<string, string> = {};
    for (const id of unique) {
      const { data: u } = await db.auth.admin.getUserById(id);
      if (u?.user?.email) map[id] = u.user.email;
    }
    return map;
  }

  const map: Record<string, string> = {};
  for (const row of data ?? []) {
    const r = row as { id: string; email: string };
    if (r.id && r.email) map[r.id] = r.email;
  }
  return map;
}

export async function withUpdatedByEmail<T extends { updated_by?: string | null }>(
  rows: T[],
): Promise<(T & { updated_by_email: string | null })[]> {
  const ids = rows.map((r) => r.updated_by).filter((id): id is string => Boolean(id));
  const emails = await resolveUserEmails(ids);
  return rows.map((r) => ({
    ...r,
    updated_by_email: r.updated_by ? (emails[r.updated_by] ?? null) : null,
  }));
}
