"use client";

import type { ReactNode } from "react";

import { PortalShell } from "@/components/layout/portal-shell";
import { PortalPathGuard } from "@/guards/portal-path-guard";
import { RouteGuard } from "@/guards/route-guard";

export default function DriverLayout({ children }: { children: ReactNode }) {
  return (
    <RouteGuard dashboard="driver" requireVerifiedEmail>
      <PortalPathGuard area="driver">
        <PortalShell area="driver">{children}</PortalShell>
      </PortalPathGuard>
    </RouteGuard>
  );
}
