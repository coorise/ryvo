"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

import type { PortalArea } from "@/configs/portal-nav";
import { canAccessPortalPath, firstAllowedPortalPath } from "@/guards/portal-access";
import { useAuth } from "@/hooks/use-auth";

type PortalPathGuardProps = {
  area: PortalArea;
  children: ReactNode;
};

/** Blocks direct URL access to portal pages the user lacks permission for. */
export function PortalPathGuard({ area, children }: PortalPathGuardProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isReady } = useAuth();

  useEffect(() => {
    if (!isReady || !user) return;
    if (!canAccessPortalPath(user, area, pathname)) {
      router.replace(firstAllowedPortalPath(user, area));
    }
  }, [user, isReady, pathname, router, area]);

  if (!isReady || !user) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-muted-foreground text-sm">Loading…</p>
      </div>
    );
  }

  if (!canAccessPortalPath(user, area, pathname)) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-muted-foreground text-sm">Loading…</p>
      </div>
    );
  }

  return <>{children}</>;
}
