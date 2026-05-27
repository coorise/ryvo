import {
  ADMIN_NAV_GROUPS,
  ADMIN_NAV_OVERVIEW,
  ADMIN_PATH_PREFIXES,
  type AdminNavItemConfig,
} from "@/configs/admin-nav";
import { ROUTES } from "@/configs/const";
import {
  canAccessDashboard,
  canViewStaffSection,
  hasPermission,
  hasPermPrefix,
  hasRole,
} from "@/guards/abac";
import type { SessionUser } from "@/types/interfaces/schemas";

export function canSeeAdminNavItem(user: SessionUser | null, item: AdminNavItemConfig): boolean {
  if (!user || !canAccessDashboard(user, "admin")) return false;
  if (item.alwaysForAdmin) return true;
  if (item.staffSection && !canViewStaffSection(user)) return false;
  if (hasRole(user, "super_admin")) return true;
  if (item.permissions?.some((p) => hasPermission(user, p))) return true;
  if (item.permPrefixes?.some((p) => hasPermPrefix(user, p))) return true;
  if (item.href === ROUTES.admin.home) {
    return (
      hasPermPrefix(user, "rides:") ||
      hasPermPrefix(user, "users:") ||
      hasPermPrefix(user, "drivers:") ||
      hasPermPrefix(user, "staff:") ||
      hasPermPrefix(user, "support:") ||
      hasPermPrefix(user, "payments:") ||
      hasPermPrefix(user, "audit:") ||
      hasPermPrefix(user, "settings:") ||
      hasPermPrefix(user, "observability:") ||
      hasPermPrefix(user, "finances:") ||
      hasPermPrefix(user, "analytics:")
    );
  }
  return false;
}

function resolveRuleForPath(pathname: string): AdminNavItemConfig | null {
  const path = pathname.replace(/\/$/, "") || "/admin";
  if (!path.startsWith("/admin")) return null;

  for (const { prefix, item } of ADMIN_PATH_PREFIXES) {
    const normalized = prefix.replace(/\/$/, "");
    if (path === normalized || path.startsWith(`${normalized}/`)) {
      return item;
    }
  }

  return null;
}

/** Whether the user may open this admin URL (address bar included). */
export function canAccessAdminPath(user: SessionUser | null, pathname: string): boolean {
  if (!user || !canAccessDashboard(user, "admin")) return false;

  const rule = resolveRuleForPath(pathname);
  if (!rule) {
    return pathname === ROUTES.admin.home || pathname === `${ROUTES.admin.home}/`;
  }
  return canSeeAdminNavItem(user, rule);
}

/** First admin route the user is allowed to open (fallback when blocked). */
export function firstAllowedAdminPath(user: SessionUser | null): string {
  if (canSeeAdminNavItem(user, ADMIN_NAV_OVERVIEW)) return ROUTES.admin.home;

  for (const group of ADMIN_NAV_GROUPS) {
    for (const item of group.items) {
      if (canSeeAdminNavItem(user, item)) return item.href;
    }
  }

  return ROUTES.landing;
}

/** Expand groups that contain the active route */
export function adminNavGroupsForPath(pathname: string): Set<string> {
  const open = new Set<string>();
  for (const group of ADMIN_NAV_GROUPS) {
    if (group.items.some((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))) {
      open.add(group.id);
    }
  }
  return open;
}
