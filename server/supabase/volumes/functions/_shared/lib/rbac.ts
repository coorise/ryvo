/** Role hierarchy and assignment rules for admin staff UI. */

export const ROLE_RANK: Record<string, number> = {
  super_admin: 100,
  admin: 90,
  moderator: 80,
  agent: 60,
  support: 50,
  staff: 50,
  driver: 20,
  client: 10,
};

export const STAFF_ROLES = [
  "super_admin",
  "admin",
  "moderator",
  "agent",
  "support",
  "staff",
] as const;

export const PLATFORM_STAFF_ROLES = ["moderator", "agent", "support", "staff"] as const;

export function highestRole(roles: string[]): string {
  let best = "client";
  let rank = 0;
  for (const r of roles) {
    const n = ROLE_RANK[r] ?? 0;
    if (n > rank) {
      rank = n;
      best = r;
    }
  }
  return best;
}

export function canManageStaff(actorRoles: string[]): boolean {
  if (actorRoles.includes("super_admin") || actorRoles.includes("admin")) return true;
  if (actorRoles.includes("moderator")) return true;
  return false;
}

/** Roles the actor may assign to another user. */
export function assignableRoles(actorRoles: string[]): string[] {
  if (actorRoles.includes("super_admin")) {
    return [...STAFF_ROLES, "driver", "client"];
  }
  if (actorRoles.includes("admin")) {
    return ["moderator", "agent", "support", "staff", "driver", "client"];
  }
  if (actorRoles.includes("moderator")) {
    return ["agent", "support", "staff"];
  }
  return [];
}

export function canAssignRole(actorRoles: string[], targetRole: string): boolean {
  return assignableRoles(actorRoles).includes(targetRole);
}

export function canAccessAdminPanel(roles: string[]): boolean {
  return roles.some((r) =>
    ["super_admin", "admin", "moderator", "agent", "support", "staff"].includes(r),
  );
}

export function isStaffDirectoryRole(roleName: string): boolean {
  return (PLATFORM_STAFF_ROLES as readonly string[]).includes(roleName);
}
