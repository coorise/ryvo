import { BaseService } from "@/lib/base-service";
import { apiRequest } from "@/lib/api-client";

export type AssignableRole = {
  id: string;
  name: string;
  description?: string | null;
  is_system?: boolean;
  permissions: string[];
};

export type RbacMe = {
  roles: string[];
  permissions: string[];
  assignable_roles: AssignableRole[];
  can_manage_staff: boolean;
};

export type RoleRow = {
  id: string;
  name: string;
  description: string | null;
  is_system: boolean;
  created_by: string | null;
  created_at?: string;
  updated_at?: string;
  updated_by?: string | null;
  updated_by_email?: string | null;
  permissions: string[];
};

export type PermissionRow = {
  id: string;
  name: string;
  description: string | null;
};

export type RbacMatrix = {
  roles: RoleRow[];
  permissions: PermissionRow[];
  grouped: Record<string, PermissionRow[]>;
  assignable_roles: AssignableRole[];
};

export type AdminUserRow = {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
  banned_at: string | null;
  deleted_at?: string | null;
  roles: string[];
  full_name: string | null;
  phone: string | null;
  username: string | null;
  custom_fields: Record<string, string>;
};

export type AdminReviewRow = {
  id: string;
  stars: number;
  comment: string | null;
  created_at: string;
  reviewer_id: string;
  reviewer_name: string | null;
};

export type AdminUserDetail = AdminUserRow & {
  avatar_url: string | null;
  rating_avg: number;
  trip_count: number;
  email_verified: boolean;
  profile_kind: "staff" | "client" | "driver" | "unknown";
  kyc_status: string | null;
  reviews: AdminReviewRow[];
};

export class RbacService extends BaseService {
  constructor() {
    super("auth-hooks");
  }

  getMe(token: string | null) {
    return this.get<RbacMe>("/v1/admin/rbac/me", token);
  }

  getMatrix(token: string | null) {
    return this.get<RbacMatrix>("/v1/admin/roles", token);
  }

  getPermissions(token: string | null) {
    return this.get<{ permissions: PermissionRow[]; grouped: Record<string, PermissionRow[]> }>(
      "/v1/admin/permissions",
      token,
    );
  }

  createRole(
    token: string | null,
    input: { name: string; description?: string; permissions: string[] },
  ) {
    return this.post<{ role: RoleRow }>("/v1/admin/roles", input, token);
  }

  updateRole(
    token: string | null,
    roleId: string,
    input: { description?: string; permissions?: string[] },
  ) {
    return this.patch<{ role: RoleRow }>(`/v1/admin/roles/${roleId}`, input, token);
  }

  deleteRole(token: string | null, roleId: string) {
    return this.delete<{ deleted: boolean }>(`/v1/admin/roles/${roleId}`, token);
  }

  listUsers(token: string | null, kind: "clients" | "drivers" | "staff" | "all" = "clients") {
    return apiRequest<{ users: AdminUserRow[] }>(
      "profile-service",
      `/v1/admin/users?kind=${kind}`,
      { token },
    );
  }

  getUserDetail(token: string | null, userId: string) {
    return apiRequest<{ user: AdminUserDetail }>(
      "profile-service",
      `/v1/admin/users/${userId}`,
      { token },
    );
  }

  createUser(
    token: string | null,
    input: { email: string; password: string; full_name?: string },
  ) {
    return apiRequest<{ user: AdminUserRow }>("profile-service", "/v1/admin/users", {
      method: "POST",
      body: input,
      token,
    });
  }

  updateUser(
    token: string | null,
    userId: string,
    input: {
      full_name?: string;
      email?: string;
      phone?: string;
      username?: string | null;
      custom_fields?: Record<string, string>;
    },
  ) {
    return apiRequest<{ user: AdminUserRow }>(
      "profile-service",
      `/v1/admin/users/${userId}`,
      { method: "PATCH", body: input, token },
    );
  }

  assignRole(token: string | null, userId: string, roleId: string) {
    return this.post<{ user_id: string; role: string }>(
      "/v1/admin/roles/assign",
      { user_id: userId, role_id: roleId },
      token,
    );
  }

  revokeRole(token: string | null, userId: string, roleId: string) {
    return this.post<{ user_id: string; role_id: string }>(
      "/v1/admin/roles/revoke",
      { user_id: userId, role_id: roleId },
      token,
    );
  }

  banUser(token: string | null, userId: string, reason?: string) {
    return apiRequest("profile-service", "/v1/admin/users/ban", {
      method: "POST",
      body: { user_id: userId, reason },
      token,
    });
  }

  unbanUser(token: string | null, userId: string) {
    return apiRequest("profile-service", "/v1/admin/users/unban", {
      method: "POST",
      body: { user_id: userId },
      token,
    });
  }

  deleteUser(token: string | null, userId: string, mode: "soft" | "permanent") {
    return apiRequest<{ user_id: string; mode: string }>(
      "profile-service",
      `/v1/admin/users/${userId}`,
      { method: "DELETE", body: { mode }, token },
    );
  }
}

export const rbacService = new RbacService();
