import { getAdminClient } from "./supabase.ts";
import type { AuthLike } from "./dynamic-rbac.ts";
import { hasPerm } from "./dynamic-rbac.ts";
import { emitAudit } from "./events.ts";

export type AdminUserRow = {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
  banned_at: string | null;
  deleted_at: string | null;
  roles: string[];
  full_name: string | null;
  phone: string | null;
};

export type AdminReviewRow = {
  id: string;
  stars: number;
  comment: string | null;
  created_at: string;
  reviewer_id: string;
  reviewer_name: string | null;
};

export type AdminUserDetail = AdminUserRow & {
  avatar_url: string | null;
  rating_avg: number;
  trip_count: number;
  email_verified: boolean;
  profile_kind: "staff" | "client" | "driver" | "unknown";
  kyc_status: string | null;
  reviews: AdminReviewRow[];
};

async function enrichUsers(userIds: string[]) {
  const db = getAdminClient();
  const rows: AdminUserRow[] = [];

  for (const id of userIds) {
    const { data: authUser } = await db.auth.admin.getUserById(id);
    if (!authUser.user) continue;

    const { data: roleRows } = await db
      .from("user_roles")
      .select("roles(name)")
      .eq("user_id", id);

    const roles = (roleRows ?? [])
      .map((r) => (r.roles as { name: string } | null)?.name)
      .filter(Boolean) as string[];

    const { data: profile } = await db
      .from("user_profiles")
      .select("banned_at, deleted_at")
      .eq("user_id", id)
      .maybeSingle();

    if (profile?.deleted_at) continue;

    const updatedAt =
      (authUser.user as { updated_at?: string }).updated_at ?? authUser.user.created_at;

    rows.push({
      id,
      email: authUser.user.email ?? "",
      created_at: authUser.user.created_at,
      updated_at: updatedAt,
      banned_at: profile?.banned_at ?? null,
      deleted_at: profile?.deleted_at ?? null,
      roles,
      full_name: (authUser.user.user_metadata?.full_name as string) ?? null,
      phone: (authUser.user.user_metadata?.phone as string) ?? null,
    });
  }
  return rows;
}

export async function listAdminUsers(opts: {
  kind?: "clients" | "drivers" | "staff" | "all";
  limit?: number;
}) {
  const db = getAdminClient();
  const limit = opts.limit ?? 100;

  const { data: list } = await db.auth.admin.listUsers({ perPage: limit });
  const users = list?.users ?? [];

  let filtered = users;
  if (opts.kind === "staff") {
    filtered = users.filter((u) => {
      // resolved below via roles
      return true;
    });
  }

  const ids = filtered.map((u) => u.id);
  let rows = await enrichUsers(ids);

  if (opts.kind === "clients") {
    rows = rows.filter((u) => u.roles.includes("client") && !u.roles.includes("driver"));
  } else if (opts.kind === "drivers") {
    rows = rows.filter((u) => u.roles.includes("driver"));
  } else if (opts.kind === "staff") {
    rows = rows.filter(
      (u) =>
        !u.roles.every((r) => r === "client" || r === "driver") &&
        u.roles.some((r) => r !== "client" && r !== "driver"),
    );
  }

  return rows.slice(0, limit);
}

function canDeleteUser(actor: AuthLike, target: AdminUserRow): boolean {
  if (hasPerm(actor, "users:delete")) return true;
  const isDriver = target.roles.includes("driver");
  const isStaff =
    target.roles.some((r) => !["client", "driver"].includes(r)) &&
    !target.roles.every((r) => r === "client" || r === "driver");
  if (isDriver && hasPerm(actor, "drivers:delete")) return true;
  if (isStaff && hasPerm(actor, "staff:delete")) return true;
  return false;
}

export async function deleteAdminUser(
  actor: AuthLike,
  userId: string,
  mode: "soft" | "permanent",
) {
  const rows = await enrichUsers([userId]);
  const target = rows[0];
  if (!target) throw new Error("NOT_FOUND");
  if (!canDeleteUser(actor, target)) throw new Error("FORBIDDEN");

  const db = getAdminClient();

  if (mode === "soft") {
    await db
      .from("user_profiles")
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: actor.userId,
      })
      .eq("user_id", userId);
    await emitAudit(actor.userId, "user.soft_delete", "user", userId, {});
    return { user_id: userId, mode: "soft" as const };
  }

  await db.auth.admin.deleteUser(userId);
  await emitAudit(actor.userId, "user.permanent_delete", "user", userId, {});
  return { user_id: userId, mode: "permanent" as const };
}

export async function createClientUser(
  actor: AuthLike,
  input: { email: string; password: string; full_name?: string },
) {
  if (!hasPerm(actor, "users:create")) throw new Error("FORBIDDEN");

  const db = getAdminClient();
  const { data: created, error } = await db.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: input.full_name },
  });
  if (error || !created.user) throw new Error(error?.message ?? "Create failed");

  const userId = created.user.id;
  await db.from("user_profiles").upsert({ user_id: userId, tos_accepted_at: new Date().toISOString() });

  const { data: clientRole } = await db.from("roles").select("id").eq("name", "client").single();
  if (clientRole) {
    await db.from("user_roles").upsert({
      user_id: userId,
      role_id: clientRole.id,
      granted_by: actor.userId,
    });
  }
  await db.from("rider_profiles").upsert({ user_id: userId });

  await emitAudit(actor.userId, "user.create", "user", userId, { email: input.email });
  return enrichUsers([userId]).then((r) => r[0]);
}

export async function updateClientUser(
  actor: AuthLike,
  userId: string,
  input: { full_name?: string; email?: string },
) {
  if (!hasPerm(actor, "users:update")) throw new Error("FORBIDDEN");
  const db = getAdminClient();
  await db.auth.admin.updateUserById(userId, {
    email: input.email,
    user_metadata: input.full_name ? { full_name: input.full_name } : undefined,
  });
  await emitAudit(actor.userId, "user.update", "user", userId, input);
  return enrichUsers([userId]).then((r) => r[0]);
}

export async function loadReviewsForUser(userId: string): Promise<AdminReviewRow[]> {
  const db = getAdminClient();
  const { data: reviews } = await db
    .from("ratings_reviews")
    .select("id, stars, comment, created_at, reviewer_id")
    .eq("reviewee_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  const rows: AdminReviewRow[] = [];
  for (const r of reviews ?? []) {
    const { data: reviewer } = await db.auth.admin.getUserById(r.reviewer_id);
    rows.push({
      id: r.id,
      stars: r.stars,
      comment: r.comment,
      created_at: r.created_at,
      reviewer_id: r.reviewer_id,
      reviewer_name: (reviewer.user?.user_metadata?.full_name as string) ?? reviewer.user?.email ?? null,
    });
  }
  return rows;
}

export async function getAdminUserDetail(userId: string): Promise<AdminUserDetail | null> {
  const rows = await enrichUsers([userId]);
  const base = rows[0];
  if (!base) return null;

  const db = getAdminClient();
  const { data: authUser } = await db.auth.admin.getUserById(userId);
  const emailVerified = Boolean(
    authUser.user?.email_confirmed_at ?? authUser.user?.confirmed_at,
  );

  let avatar_url: string | null = null;
  let rating_avg = 0;
  let trip_count = 0;
  let kyc_status: string | null = null;
  let profile_kind: AdminUserDetail["profile_kind"] = "unknown";

  if (base.roles.includes("driver")) {
    profile_kind = "driver";
    const { data: dp } = await db
      .from("driver_profiles")
      .select("avatar_url, rating_avg, trip_count, kyc_status, updated_at")
      .eq("user_id", userId)
      .maybeSingle();
    if (dp) {
      avatar_url = dp.avatar_url;
      rating_avg = Number(dp.rating_avg ?? 0);
      trip_count = dp.trip_count ?? 0;
      kyc_status = dp.kyc_status;
      if (dp.updated_at) base.updated_at = dp.updated_at;
    }
  } else if (base.roles.includes("client")) {
    profile_kind = "client";
    const { data: rp } = await db
      .from("rider_profiles")
      .select("avatar_url, rating_avg, trip_count, updated_at")
      .eq("user_id", userId)
      .maybeSingle();
    if (rp) {
      avatar_url = rp.avatar_url;
      rating_avg = Number(rp.rating_avg ?? 0);
      trip_count = rp.trip_count ?? 0;
      if (rp.updated_at) base.updated_at = rp.updated_at;
    }
  } else {
    profile_kind = "staff";
  }

  const reviews = await loadReviewsForUser(userId);

  return {
    ...base,
    avatar_url,
    rating_avg,
    trip_count,
    email_verified: emailVerified,
    profile_kind,
    kyc_status,
    reviews,
  };
}
