import * as jose from "jose";
import type { AuthContext } from "../core/context.ts";
import { fail } from "../core/response.ts";
import { env } from "../lib/env.ts";

export async function verifyJwt(req: Request): Promise<AuthContext | Response> {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) {
    return fail("UNAUTHORIZED", "Missing bearer token", 401);
  }
  const token = header.slice(7);
  try {
    const secret = new TextEncoder().encode(env.jwtSecret);
    const { payload } = await jose.jwtVerify(token, secret);
    const sub = payload.sub;
    if (!sub || typeof sub !== "string") {
      return fail("UNAUTHORIZED", "Invalid token subject", 401);
    }
    const appMeta = (payload.app_metadata ?? {}) as Record<string, unknown>;
    const roles = (appMeta.roles as string[]) ?? [];
    const permissions = (appMeta.permissions as string[]) ?? [];
    const primaryRole =
      (payload.app_role as string) ?? roles[0] ?? "client";
    const appMetaVerified = appMeta.is_email_verified ?? appMeta.email_verified;
    const emailVerified =
      payload.is_email_verified === true ||
      payload.email_verified === true ||
      appMetaVerified === true;
    return {
      userId: sub,
      email: payload.email as string | undefined,
      roles,
      permissions,
      primaryRole,
      emailVerified: Boolean(emailVerified),
    };
  } catch {
    return fail("UNAUTHORIZED", "Invalid or expired token", 401);
  }
}

export function requirePermission(auth: AuthContext, permission: string): Response | null {
  if (auth.roles.includes("super_admin")) return null;
  if (auth.permissions.includes(permission)) return null;
  return fail("FORBIDDEN", `Missing permission: ${permission}`, 403);
}

export function requireRole(auth: AuthContext, ...roles: string[]): Response | null {
  if (auth.roles.some((r) => roles.includes(r))) return null;
  return fail("FORBIDDEN", "Insufficient role", 403);
}

/** Client/driver must confirm email; admin/super_admin bypass. */
export function requireEmailVerified(auth: AuthContext): Response | null {
  if (auth.roles.includes("super_admin") || auth.roles.includes("admin")) return null;
  if (auth.emailVerified) return null;
  return fail(
    "EMAIL_NOT_VERIFIED",
    "Confirm your email to use this feature. Check your inbox (link valid 30 minutes).",
    403,
    { is_email_verified: false },
  );
}
