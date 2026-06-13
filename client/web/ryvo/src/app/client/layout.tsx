"use client";

import type { ReactNode } from "react";

import { PortalShell } from "@/components/layout/portal-shell";
import { RouteGuard } from "@/guards/route-guard";

export default function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <RouteGuard dashboard="client" requireVerifiedEmail>
      <PortalShell area="client">{children}</PortalShell>
    </RouteGuard>
  );
}
