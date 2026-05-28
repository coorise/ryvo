import { ADMIN_QUERY, ADMIN_TABS, ROUTES } from "@/configs/const";
import type { RoleRow } from "@/services/rbac.service";

const STAFF_TAB_VALUES = Object.values(ADMIN_TABS.staff);

/** Only super_admin role permissions are locked in the matrix. */
const NON_EDITABLE_SYSTEM_ROLES = new Set(["super_admin"]);

export function parseStaffTab(raw: string | null): string {
  if (raw && STAFF_TAB_VALUES.includes(raw as (typeof STAFF_TAB_VALUES)[number])) {
    return raw;
  }
  return ADMIN_TABS.staff.staffs;
}

export function staffListUrl(tab?: string, roleId?: string) {
  const params = new URLSearchParams();
  if (tab) params.set(ADMIN_QUERY.tab, tab);
  if (roleId) params.set(ADMIN_QUERY.role, roleId);
  const qs = params.toString();
  return qs ? `${ROUTES.admin.staff.list}?${qs}` : ROUTES.admin.staff.list;
}

export function isRolePermissionsEditable(role: Pick<RoleRow, "is_system" | "name">) {
  if (!role.is_system) return true;
  return !NON_EDITABLE_SYSTEM_ROLES.has(role.name);
}
