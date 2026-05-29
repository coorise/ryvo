"use client";

import type { ReactNode } from "react";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { RouteGuard } from "@/guards/route-guard";

export default function DriverLayout({ children }: { children: ReactNode }) {
  return (
    <RouteGuard dashboard="driver" requireVerifiedEmail>
      <DashboardShell area="driver" portal="driver" title="Driver" subtitle="Offers, trips, and earnings">
        {children}
      </DashboardShell>
    </RouteGuard>
  );
}
