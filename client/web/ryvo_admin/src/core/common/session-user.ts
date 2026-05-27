import type { User } from "@supabase/supabase-js";

import type { AppRole } from "@/configs/const";
import type { SessionUser } from "@/types/interfaces/schemas";

function readMeta(user: User, key: string, jwtMeta?: Record<string, unknown>): unknown {
  return jwtMeta?.[key] ?? user.app_metadata?.[key] ?? user.user_metadata?.[key];
}

function jwtAppMetadata(accessToken?: string): Record<string, unknown> {
  if (!accessToken) return {};
  try {
    const payload = JSON.parse(atob(accessToken.split(".")[1] ?? "")) as {
      app_metadata?: Record<string, unknown>;
    };
    return payload.app_metadata ?? {};
  } catch {
    return {};
  }
}

export function mapSupabaseUserToSession(user: User, accessToken?: string): SessionUser {
  const jwtMeta = jwtAppMetadata(accessToken);
  const rolesRaw = readMeta(user, "roles", jwtMeta);
  const permissionsRaw = readMeta(user, "permissions", jwtMeta);
  const roles = Array.isArray(rolesRaw)
    ? rolesRaw.map(String)
    : typeof rolesRaw === "string"
      ? [rolesRaw]
      : [];
  const permissions = Array.isArray(permissionsRaw)
    ? permissionsRaw.map(String)
    : [];

  const appRole = String(readMeta(user, "app_role", jwtMeta) ?? roles[0] ?? "client");
  const emailVerified =
    Boolean(readMeta(user, "email_verified", jwtMeta)) ||
    Boolean(readMeta(user, "is_email_verified", jwtMeta)) ||
    Boolean(user.email_confirmed_at);

  return {
    id: user.id,
    email: user.email,
    roles: roles.length ? roles : [appRole],
    permissions,
    primaryRole: appRole as AppRole,
    emailVerified,
  };
}
