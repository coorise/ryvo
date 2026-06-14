"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { ROUTES } from "@/configs";
import { portalDashboardPathForUser } from "@/guards/abac";
import { useAuth } from "@/hooks/use-auth";

/** Legacy /admin URLs on the customer app — redirect to driver/client portal. */
export default function AdminLegacyRedirectPage() {
  const router = useRouter();
  const { user, isReady } = useAuth();

  useEffect(() => {
    if (!isReady) return;
    router.replace(user ? portalDashboardPathForUser(user) : ROUTES.auth.login);
  }, [user, isReady, router]);

  return (
    <div className="flex min-h-svh items-center justify-center">
      <p className="text-muted-foreground text-sm">Redirecting…</p>
    </div>
  );
}
