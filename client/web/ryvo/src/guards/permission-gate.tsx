"use client";

import type { ReactNode } from "react";

import { hasPermission, hasRole } from "./abac";
import { useAuth } from "@/hooks/use-auth";

type PermissionGateProps = {
  children: ReactNode;
  roles?: string[];
  permissions?: string[];
  fallback?: ReactNode;
};

export function PermissionGate({
  children,
  roles,
  permissions,
  fallback = null,
}: PermissionGateProps) {
  const { user } = useAuth();
  if (!user) return fallback;
  if (roles?.length && !hasRole(user, ...roles)) return fallback;
  if (permissions?.length && !permissions.some((p) => hasPermission(user, p))) {
    return fallback;
  }
  return <>{children}</>;
}
