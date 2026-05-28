"use client";

import type { ReactNode } from "react";

import { AdminShell } from "@/components/layout/admin-shell";
import { AdminPathGuard } from "@/guards/admin-path-guard";
import { RouteGuard } from "@/guards/route-guard";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <RouteGuard dashboard="admin">
      <AdminPathGuard>
        <AdminShell>{children}</AdminShell>
      </AdminPathGuard>
    </RouteGuard>
  );
}
