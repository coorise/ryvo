import { PERMISSIONS } from "@/configs/const";
import type { SessionUser } from "@/types/interfaces/schemas";

export function hasRole(user: SessionUser | null, ...roles: string[]): boolean {
  if (!user) return false;
  if (user.roles.includes("super_admin")) return true;
  return roles.some((r) => user.roles.includes(r));
}

export function hasPermission(user: SessionUser | null, permission: string): boolean {
  if (!user) return false;
  if (user.roles.includes("super_admin")) return true;
  return user.permissions.includes(permission);
}

export function hasPermPrefix(user: SessionUser | null, prefix: string): boolean {
  if (!user) return false;
  if (user.roles.includes("super_admin")) return true;
  const p = prefix.endsWith(":") ? prefix : `${prefix}:`;
  return user.permissions.some((name) => name === prefix || name.startsWith(p));
}

export function hasAnyPermission(user: SessionUser | null, permissions: string[]): boolean {
  return permissions.some((p) => hasPermission(user, p));
}

export function canAccessDashboard(user: SessionUser | null, area: "client" | "driver" | "admin"): boolean {
  if (!user) return false;
  switch (area) {
    case "admin":
      return (
        hasRole(user, "super_admin", "admin", "staff", "moderator", "agent", "support") ||
        hasPermPrefix(user, "roles:") ||
        hasPermPrefix(user, "staff:") ||
        hasPermPrefix(user, "users:") ||
        hasPermPrefix(user, "drivers:") ||
        hasPermPrefix(user, "rides:") ||
        hasPermPrefix(user, "support:") ||
        hasPermPrefix(user, "audit:") ||
        hasPermPrefix(user, "settings:") ||
        hasPermPrefix(user, "payments:") ||
        hasPermPrefix(user, "observability:") ||
        hasPermPrefix(user, "finances:") ||
        hasPermPrefix(user, "analytics:") ||
        hasPermPrefix(user, "feedbacks:") ||
        hasPermPrefix(user, "communication:") ||
        hasPermPrefix(user, "map:") ||
        hasPermPrefix(user, "tasks:")
      );
    case "driver":
      return hasRole(user, "driver");
    case "client":
      return hasRole(user, "client");
    default:
      return false;
  }
}

export function requiresEmailVerification(user: SessionUser | null): boolean {
  if (!user) return false;
  if (hasRole(user, "admin", "super_admin")) return false;
  return !user.emailVerified;
}

export function canViewStaffSection(user: SessionUser | null): boolean {
  return hasPermission(user, "staff:read") || hasPermission(user, "roles:read");
}

export function canManageStaff(user: SessionUser | null): boolean {
  return (
    hasPermPrefix(user, "staff:") ||
    hasPermission(user, "roles:create") ||
    hasPermission(user, "roles:update")
  );
}

export function canEditRoleMatrix(user: SessionUser | null): boolean {
  return hasPermission(user, "roles:update");
}

export function canManageClientUsers(user: SessionUser | null): boolean {
  return hasPermPrefix(user, "users:");
}

export function canManageDrivers(user: SessionUser | null): boolean {
  return hasPermPrefix(user, "drivers:");
}

export function canViewSettingsTab(
  user: SessionUser | null,
  tab: "profile" | "general" | "payment" | "mail" | "notifications",
): boolean {
  if (!user || !canAccessDashboard(user, "admin")) return false;
  if (tab === "profile") return true;
  if (tab === "general") return hasPermission(user, PERMISSIONS.settings.read);
  if (tab === "payment") return hasPermission(user, PERMISSIONS.settings.paymentRead);
  if (tab === "mail") {
    return (
      hasPermission(user, PERMISSIONS.settings.mailRead) ||
      hasPermission(user, PERMISSIONS.settings.emailTemplates)
    );
  }
  if (tab === "notifications") return hasPermission(user, PERMISSIONS.settings.notificationsRead);
  return false;
}

export function canEditSettingsTab(
  user: SessionUser | null,
  tab: "profile" | "general" | "payment" | "mail" | "notifications",
): boolean {
  if (!user) return false;
  if (tab === "profile") return true;
  if (tab === "general") return hasPermission(user, PERMISSIONS.settings.update);
  if (tab === "payment") return hasPermission(user, PERMISSIONS.settings.paymentUpdate);
  if (tab === "mail") {
    return (
      hasPermission(user, PERMISSIONS.settings.mailUpdate) ||
      hasPermission(user, PERMISSIONS.settings.emailTemplates)
    );
  }
  if (tab === "notifications") return hasPermission(user, PERMISSIONS.settings.notificationsUpdate);
  return false;
}

export function dashboardPathForUser(user: SessionUser | null): string {
  if (!user) return "/auth/login";
  if (canAccessDashboard(user, "admin")) return "/admin";
  if (hasRole(user, "driver")) return "/driver";
  // Admin web app has no /client routes — avoid 404 after login when JWT lacks role claims.
  if (hasRole(user, "client")) return "/landing";
  return "/admin";
}
