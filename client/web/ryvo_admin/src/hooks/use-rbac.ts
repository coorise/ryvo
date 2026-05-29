"use client";

import { useQuery } from "@tanstack/react-query";

import { gatewayRetryDelay, retryGatewayUnavailable } from "@/lib/query-retry";
import { rbacService } from "@/services/rbac.service";
import { useAuth } from "./use-auth";

export function useRbac() {
  const { accessToken, isReady, user } = useAuth();

  const me = useQuery({
    queryKey: ["rbac", "me", accessToken],
    queryFn: () => rbacService.getMe(accessToken),
    enabled: isReady && Boolean(accessToken),
    staleTime: 60_000,
    retry: retryGatewayUnavailable,
    retryDelay: gatewayRetryDelay,
  });

  const permissions = me.data?.permissions ?? user?.permissions ?? [];
  const roles = me.data?.roles ?? user?.roles ?? [];
  const assignableRoles = me.data?.assignable_roles ?? [];

  const matrix = useQuery({
    queryKey: ["rbac", "matrix", accessToken],
    queryFn: () => rbacService.getMatrix(accessToken),
    enabled:
      isReady &&
      Boolean(accessToken) &&
      (me.data?.can_manage_staff ||
        roles.includes("super_admin") ||
        permissions.includes("roles:read")),
    staleTime: 120_000,
  });

  function hasPermission(p: string) {
    return roles.includes("super_admin") || permissions.includes(p);
  }

  function hasPermPrefix(prefix: string) {
    if (roles.includes("super_admin")) return true;
    const p = prefix.endsWith(":") ? prefix : `${prefix}:`;
    return permissions.some((name) => name === prefix || name.startsWith(p));
  }

  return {
    ...me,
    matrix,
    permissions,
    roles,
    assignableRoles,
    canManageStaff: me.data?.can_manage_staff ?? false,
    hasPermission,
    hasPermPrefix,
  };
}
