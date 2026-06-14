"use client";

import type { ReactNode } from "react";

import { PortalShell } from "@/components/layout/portal-shell";
import { PortalPathGuard } from "@/guards/portal-path-guard";
import { RouteGuard } from "@/guards/route-guard";

export default function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <RouteGuard dashboard="client" requireVerifiedEmail>
      <PortalPathGuard area="client">
        <PortalShell area="client">{children}</PortalShell>
      </PortalPathGuard>
    </RouteGuard>
  );
}
