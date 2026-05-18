import { getAdminClient } from "./supabase.ts";
import {
  canCreateRoles,
  canGrantPermissions,
  canManageRoleRecord,
  hasPerm,
  isProtectedSystemRole,
  type AuthLike,
} from "./dynamic-rbac.ts";
import { emitAudit } from "./events.ts";

export const KYC_DOC_TYPES = [
  "driver_license",
  "vehicle_insurance",
  "vehicle_registration",
  "background_check",
  "profile_photo",
  "national_id",
  "passport",
  "selfie_with_id",
  "bank_statement",
] as const;

export async function listPermissionsCatalog() {
  const db = getAdminClient();
  const { data } = await db.from("permissions").select("id,name,description").order("name");
  const grouped: Record<string, { id: string; name: string; description: string | null }[]> = {};
  for (const p of data ?? []) {
    const [resource] = p.name.split(":");
    const key = resource ?? "other";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(p);
  }
  return { permissions: data ?? [], grouped };
}

export async function listRolesWithPermissions() {
  const db = getAdminClient();
  const { data: roles } = await db
    .from("roles")
    .select("id,name,description,is_system,created_by,created_at,updated_at")
    .order("name");
  const { data: mappings } = await db.from("role_permissions").select("role_id,permission_id");
  const { data: perms } = await db.from("permissions").select("id,name");
  const permById = Object.fromEntries((perms ?? []).map((p) => [p.id, p.name]));

  return (roles ?? []).map((r) => ({
    ...r,
    permissions: (mappings ?? [])
      .filter((m) => m.role_id === r.id)
      .map((m) => permById[m.permission_id])
      .filter(Boolean) as string[],
  }));
}

export async function createRole(
  actor: AuthLike,
  input: { name: string; description?: string; permissions: string[] },
) {
  if (!canCreateRoles(actor)) throw new Error("FORBIDDEN");
  if (!canGrantPermissions(actor, input.permissions)) {
    throw new Error("Cannot grant permissions you do not hold");
  }
  const slug = input.name.trim().toLowerCase().replace(/\s+/g, "_");
  if (isProtectedSystemRole(slug)) throw new Error("Reserved role name");

  const db = getAdminClient();
  const { data: role, error } = await db
    .from("roles")
    .insert({
      name: slug,
      description: input.description ?? null,
      created_by: actor.userId,
      is_system: false,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);

  await setRolePermissionsByNames(role.id, input.permissions);
  await emitAudit(actor.userId, "role.create", "role", role.id, { name: slug, permissions: input.permissions });
  return getRoleById(role.id);
}

export async function updateRole(
  actor: AuthLike,
  roleId: string,
  input: { description?: string; permissions?: string[] },
) {
  const db = getAdminClient();
  const role = await getRoleById(roleId);
  if (!role || !canManageRoleRecord(actor, role)) throw new Error("FORBIDDEN");

  if (input.description !== undefined) {
    await db.from("roles").update({ description: input.description, updated_at: new Date().toISOString() }).eq("id", roleId);
  }
  if (input.permissions) {
    if (!canGrantPermissions(actor, input.permissions)) throw new Error("Cannot grant permissions you do not hold");
    await setRolePermissionsByNames(roleId, input.permissions);
  }
  await emitAudit(actor.userId, "role.update", "role", roleId, input);
  return getRoleById(roleId);
}

export async function deleteRole(actor: AuthLike, roleId: string) {
  const role = await getRoleById(roleId);
  if (!role || role.is_system) throw new Error("Cannot delete system role");
  if (!canManageRoleRecord(actor, role)) throw new Error("FORBIDDEN");
  if (!hasPerm(actor, "roles:delete")) throw new Error("FORBIDDEN");

  const db = getAdminClient();
  const { count } = await db.from("user_roles").select("user_id", { count: "exact", head: true }).eq("role_id", roleId);
  if ((count ?? 0) > 0) throw new Error("Role is assigned to users");

  await db.from("roles").delete().eq("id", roleId);
  await emitAudit(actor.userId, "role.delete", "role", roleId, { name: role.name });
  return { deleted: true };
}

async function setRolePermissionsByNames(roleId: string, names: string[]) {
  const db = getAdminClient();
  const { data: perms } = await db.from("permissions").select("id,name").in("name", names);
  await db.from("role_permissions").delete().eq("role_id", roleId);
  const rows = (perms ?? []).map((p) => ({ role_id: roleId, permission_id: p.id }));
  if (rows.length) await db.from("role_permissions").insert(rows);
}

async function getRoleById(roleId: string) {
  const db = getAdminClient();
  const { data: role } = await db
    .from("roles")
    .select("id,name,description,is_system,created_by,created_at,updated_at")
    .eq("id", roleId)
    .maybeSingle();
  if (!role) return null;
  const { data: mappings } = await db.from("role_permissions").select("permission_id").eq("role_id", roleId);
  const permIds = (mappings ?? []).map((m) => m.permission_id);
  const { data: perms } = permIds.length
    ? await db.from("permissions").select("name").in("id", permIds)
    : { data: [] };
  return { ...role, permissions: (perms ?? []).map((p) => p.name) };
}

export async function listAssignableRoles(actor: AuthLike) {
  const roles = await listRolesWithPermissions();
  const blocked = new Set(["super_admin", "client", "driver"]);
  return roles.filter(
    (r) => !blocked.has(r.name) && canGrantPermissions(actor, r.permissions),
  );
}

export async function assignRoleToUser(
  actor: AuthLike,
  userId: string,
  roleId: string,
) {
  if (!hasPerm(actor, "staff:update") && !hasPerm(actor, "roles:update")) {
    throw new Error("FORBIDDEN");
  }
  const role = await getRoleById(roleId);
  if (!role) throw new Error("Role not found");
  if (!canGrantPermissions(actor, role.permissions)) {
    throw new Error("Cannot assign role with permissions you do not hold");
  }

  const db = getAdminClient();
  await db.from("user_roles").upsert({
    user_id: userId,
    role_id: roleId,
    granted_by: actor.userId,
  });
  await emitAudit(actor.userId, "role.assign", "user", userId, { role_id: roleId, role: role.name });
  return { user_id: userId, role: role.name };
}
