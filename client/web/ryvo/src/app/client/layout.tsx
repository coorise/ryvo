"use client";

import type { ReactNode } from "react";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { RouteGuard } from "@/guards/route-guard";

export default function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <RouteGuard dashboard="client" requireVerifiedEmail>
      <DashboardShell area="client" portal="client" title="Client" subtitle="Book rides and manage your trips">
        {children}
      </DashboardShell>
    </RouteGuard>
  );
}
