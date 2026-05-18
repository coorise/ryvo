"use client";

import type { ReactNode } from "react";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { DASHBOARD_NAV } from "@/configs/const";
import { RouteGuard } from "@/guards/route-guard";

export default function DriverLayout({ children }: { children: ReactNode }) {
  return (
    <RouteGuard dashboard="driver" requireVerifiedEmail>
      <DashboardShell
        area="driver"
        title="Driver"
        subtitle="Offers, trips, and earnings"
        nav={[...DASHBOARD_NAV.driver]}
      >
        {children}
      </DashboardShell>
    </RouteGuard>
  );
}
