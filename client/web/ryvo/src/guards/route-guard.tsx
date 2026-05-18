"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { ROUTES } from "@/configs";
import { useAuth } from "@/hooks/use-auth";
import { canAccessDashboard, hasPermission, hasRole, requiresEmailVerification } from "./abac";

type RouteGuardProps = {
  children: ReactNode;
  roles?: string[];
  permissions?: string[];
  dashboard?: "client" | "driver" | "admin";
  requireVerifiedEmail?: boolean;
  fallback?: string;
};

export function RouteGuard({
  children,
  roles,
  permissions,
  dashboard,
  requireVerifiedEmail = false,
  fallback = ROUTES.auth.login,
}: RouteGuardProps) {
  const router = useRouter();
  const { user, isReady } = useAuth();

  useEffect(() => {
    if (!isReady) return;
    if (!user) {
      router.replace(fallback);
      return;
    }
    if (requireVerifiedEmail && requiresEmailVerification(user)) {
      router.replace(ROUTES.auth.verifyEmail);
      return;
    }
    if (dashboard && !canAccessDashboard(user, dashboard)) {
      router.replace(ROUTES.landing);
      return;
    }
    if (roles?.length && !hasRole(user, ...roles)) {
      router.replace(ROUTES.landing);
      return;
    }
    if (permissions?.length && !permissions.some((p) => hasPermission(user, p))) {
      router.replace(ROUTES.landing);
    }
  }, [user, isReady, router, roles, permissions, dashboard, requireVerifiedEmail, fallback]);

  if (!isReady || !user) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-muted-foreground text-sm">Loading…</p>
      </div>
    );
  }

  return <>{children}</>;
}
