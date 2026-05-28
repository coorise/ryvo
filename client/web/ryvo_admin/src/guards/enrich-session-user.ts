import { rbacService } from "@/services/rbac.service";
import type { SessionUser } from "@/types/interfaces/schemas";

/** Merge roles/permissions from auth-hooks when the Supabase JWT omits app_metadata claims. */
export async function enrichSessionUser(
  user: SessionUser,
  accessToken: string,
): Promise<SessionUser> {
  try {
    const me = await rbacService.getMe(accessToken);
    return {
      ...user,
      roles: me.roles.length > 0 ? me.roles : user.roles,
      permissions: me.permissions.length > 0 ? me.permissions : user.permissions,
    };
  } catch {
    return user;
  }
}
