"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useAuth } from "@/hooks/use-auth";
import { canAccessAdminPath, firstAllowedAdminPath } from "./admin-access";

type AdminPathGuardProps = {
  children: ReactNode;
};

/** Blocks direct URL access to admin pages the user lacks permission for. */
export function AdminPathGuard({ children }: AdminPathGuardProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isReady } = useAuth();

  useEffect(() => {
    if (!isReady || !user) return;
    if (!canAccessAdminPath(user, pathname)) {
      router.replace(firstAllowedAdminPath(user));
    }
  }, [user, isReady, pathname, router]);

  if (!isReady || !user) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-muted-foreground text-sm">Loading…</p>
      </div>
    );
  }

  if (!canAccessAdminPath(user, pathname)) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-muted-foreground text-sm">Loading…</p>
      </div>
    );
  }

  return <>{children}</>;
}
