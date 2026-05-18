"use client";

import type { ReactNode } from "react";

import { AdminShell } from "@/components/layout/admin-shell";
import { RouteGuard } from "@/guards/route-guard";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <RouteGuard dashboard="admin">
      <AdminShell>{children}</AdminShell>
    </RouteGuard>
  );
}
