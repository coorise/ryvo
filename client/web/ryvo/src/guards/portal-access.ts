import type { PortalNavItemConfig } from "@/configs/portal-nav";
import { hasAnyPermission, hasPermPrefix, hasRole } from "@/guards/abac";
import type { SessionUser } from "@/types/interfaces/schemas";

/** Whether a portal sidebar item is visible for the current user (ABAC). */
export function canSeePortalNavItem(user: SessionUser | null, item: PortalNavItemConfig): boolean {
  if (!user) return false;
  if (item.roles?.length && !hasRole(user, ...item.roles)) return false;
  if (item.permissions?.length && !hasAnyPermission(user, [...item.permissions])) return false;
  if (item.permPrefixes?.length) {
    const ok = item.permPrefixes.some((p) => hasPermPrefix(user, p));
    if (!ok) return false;
  }
  return true;
}
