import type { PortalNavItemConfig } from "@/configs/portal-nav";
import {
  PORTAL_PATH_PREFIXES,
  portalNavForArea,
  type PortalArea,
} from "@/configs/portal-nav";
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

function resolveRuleForPath(area: PortalArea, pathname: string): PortalNavItemConfig | null {
  const path = pathname.replace(/\/$/, "") || (area === "driver" ? "/driver" : "/client");
  const base = area === "driver" ? "/driver" : "/client";
  if (!path.startsWith(base)) return null;

  for (const { prefix, item } of PORTAL_PATH_PREFIXES[area]) {
    const normalized = prefix.replace(/\/$/, "");
    if (path === normalized || path.startsWith(`${normalized}/`)) {
      return item;
    }
  }
  return null;
}

export function canAccessPortalPath(
  user: SessionUser | null,
  area: PortalArea,
  pathname: string,
): boolean {
  if (!user) return false;
  const config = portalNavForArea(area);
  const home = config.homeHref;
  const rule = resolveRuleForPath(area, pathname);
  if (!rule) {
    return pathname === home || pathname === `${home}/`;
  }
  return canSeePortalNavItem(user, rule);
}

export function firstAllowedPortalPath(user: SessionUser | null, area: PortalArea): string {
  const config = portalNavForArea(area);
  if (canSeePortalNavItem(user, config.overview)) return config.homeHref;
  for (const group of config.groups) {
    for (const item of group.items) {
      if (canSeePortalNavItem(user, item)) return item.href;
    }
  }
  return config.homeHref;
}
