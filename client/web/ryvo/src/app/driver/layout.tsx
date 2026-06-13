"use client";

import type { ReactNode } from "react";

import { PortalShell } from "@/components/layout/portal-shell";
import { RouteGuard } from "@/guards/route-guard";

export default function DriverLayout({ children }: { children: ReactNode }) {
  return (
    <RouteGuard dashboard="driver" requireVerifiedEmail>
      <PortalShell area="driver">{children}</PortalShell>
    </RouteGuard>
  );
}
