/** Permission-based RBAC — no hardcoded role names for authorization. */

export type AuthLike = {
  userId: string;
  roles: string[];
  permissions: string[];
};

const SYSTEM_PROTECTED = new Set(["super_admin", "client", "driver"]);

export function hasPerm(auth: AuthLike, permission: string): boolean {
  if (auth.roles.includes("super_admin")) return true;
  if (auth.permissions.includes(permission)) return true;
  return false;
}

export function hasAnyPerm(auth: AuthLike, permissions: string[]): boolean {
  return permissions.some((p) => hasPerm(auth, p));
}

/** Match `users:read` or prefix `users:` */
export function hasPermPrefix(auth: AuthLike, prefix: string): boolean {
  if (auth.roles.includes("super_admin")) return true;
  const p = prefix.endsWith(":") ? prefix : `${prefix}:`;
  return auth.permissions.some((name) => name === prefix || name.startsWith(p));
}

/** Actor may only grant permissions they hold (unless super_admin). */
export function canGrantPermissions(actor: AuthLike, targetPermissionNames: string[]): boolean {
  if (actor.roles.includes("super_admin")) return true;
  return targetPermissionNames.every((p) => actor.permissions.includes(p));
}

export function canCreateRoles(actor: AuthLike): boolean {
  return hasPerm(actor, "roles:create");
}

export function canManageRoleRecord(actor: AuthLike, role: { is_system: boolean; created_by: string | null }): boolean {
  if (role.is_system && !actor.roles.includes("super_admin")) return false;
  if (actor.roles.includes("super_admin") || actor.roles.includes("admin")) return hasPerm(actor, "roles:update");
  if (role.created_by === actor.userId) return hasPerm(actor, "roles:update");
  return hasPerm(actor, "roles:update") && role.created_by === actor.userId;
}

export function isProtectedSystemRole(name: string): boolean {
  return SYSTEM_PROTECTED.has(name);
}

export function canAccessAdmin(auth: AuthLike): boolean {
  if (auth.roles.includes("super_admin") || auth.roles.includes("admin")) return true;
  const adminPrefixes = [
    "roles:",
    "staff:",
    "users:",
    "drivers:",
    "rides:",
    "support:",
    "audit:",
    "payments:",
    "settings:",
  ];
  return adminPrefixes.some((p) => hasPermPrefix(auth, p));
}
