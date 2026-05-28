"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { RyvoButton } from "@/components/ryvo/ryvo-button";
import { RouteGuard } from "@/guards/route-guard";
import { ADMIN_TABS, PERMISSIONS, QUERY_KEYS } from "@/configs/const";
import { staffListUrl } from "@/lib/admin-staff-url";
import { useAuth } from "@/hooks/use-auth";
import { useRbac } from "@/hooks/use-rbac";
import { rbacService } from "@/services/rbac.service";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function StaffAssignPage() {
  const { t } = useTranslation();
  const { accessToken } = useAuth();
  const { assignableRoles } = useRbac();
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [roleId, setRoleId] = useState("");

  const assign = useMutation({
    mutationFn: async () => {
      const users = await rbacService.listUsers(accessToken, "all");
      const match = users.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
      if (!match) throw new Error(t("staff.userNotFound"));
      return rbacService.assignRole(accessToken, match.id, roleId || assignableRoles[0]?.id);
    },
    onSuccess: () => {
      toast.success(t("staff.roleAssigned"));
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.admin.staff });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <RouteGuard permissions={[PERMISSIONS.staff.update]}>
      <div className="mx-auto max-w-lg space-y-6">
        <div>
          <Link href={staffListUrl(ADMIN_TABS.staff.staffs)} className="text-muted-foreground text-sm hover:underline">
            ← {t("nav.staff")}
          </Link>
          <h1 className="mt-2 text-2xl font-bold">{t("staff.assignRole")}</h1>
        </div>
        <div className="border-border bg-card space-y-4 rounded-3xl border p-6">
          <div className="space-y-2">
            <Label htmlFor="staff-email">{t("staff.assignByEmail")}</Label>
            <Input
              id="staff-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="staff-role">{t("staff.role")}</Label>
            <select
              id="staff-role"
              className="border-border bg-background w-full rounded-xl border px-3 py-2 text-sm"
              value={roleId || assignableRoles[0]?.id}
              onChange={(e) => setRoleId(e.target.value)}
            >
              {assignableRoles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <RyvoButton
            intent="cta"
            className="w-full"
            disabled={!email || assign.isPending}
            onClick={() => assign.mutate()}
          >
            {t("staff.assignRole")}
          </RyvoButton>
        </div>
      </div>
    </RouteGuard>
  );
}
