"use client";

import { useMemo } from "react";

import { canAccessDashboard, hasPermission, hasRole } from "@/guards/abac";
import { useAuth } from "./use-auth";

export function useAbac() {
  const { user } = useAuth();

  return useMemo(
    () => ({
      user,
      hasRole: (...roles: string[]) => hasRole(user, ...roles),
      hasPermission: (p: string) => hasPermission(user, p),
      canAccessDashboard: (area: "client" | "driver" | "admin") =>
        canAccessDashboard(user, area),
    }),
    [user],
  );
}
