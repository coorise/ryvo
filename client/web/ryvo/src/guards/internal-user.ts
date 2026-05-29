import { canAccessDashboard, hasRole } from "@/guards/abac";
import type { SessionUser } from "@/types/interfaces/schemas";

const INTERNAL_ROLES = [
  "super_admin",
  "admin",
  "staff",
  "moderator",
  "agent",
  "support",
] as const;

/** Staff and admins must use the admin portal — never the client/driver app. */
export function isInternalPortalUser(user: SessionUser | null): boolean {
  if (!user) return false;
  if (canAccessDashboard(user, "admin")) return true;
  return INTERNAL_ROLES.some((r) => hasRole(user, r));
}
