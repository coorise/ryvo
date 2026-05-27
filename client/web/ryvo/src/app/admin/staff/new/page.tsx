"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { RyvoButton } from "@/components/ryvo/ryvo-button";
import { RouteGuard } from "@/guards/route-guard";
import { ADMIN_TABS, PERMISSIONS, QUERY_KEYS, ROUTES } from "@/configs/const";
import { staffListUrl } from "@/lib/admin-staff-url";
import { useAuth } from "@/hooks/use-auth";
import { useRbac } from "@/hooks/use-rbac";
import { adminProfilePath } from "@/lib/admin-paths";
import { rbacService } from "@/services/rbac.service";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const STAFF_ROLE_NAMES = new Set([
  "admin",
  "super_admin",
  "moderator",
  "staff",
  "agent",
  "support",
]);

export default function NewStaffMemberPage() {
  const { t } = useTranslation();
  const { accessToken } = useAuth();
  const { assignableRoles } = useRbac();
  const router = useRouter();
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [roleId, setRoleId] = useState("");

  const staffRoles = assignableRoles.filter((r) => STAFF_ROLE_NAMES.has(r.name));

  const create = useMutation({
    mutationFn: async () => {
      const res = await rbacService.createUser(accessToken, {
        email,
        password,
        full_name: fullName || undefined,
      });
      const rid = roleId || staffRoles[0]?.id;
      if (rid) {
        await rbacService.assignRole(accessToken, res.user.id, rid);
      }
      return res.user;
    },
    onSuccess: (user) => {
      toast.success(t("staff.memberCreated"));
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.admin.staff });
      router.push(adminProfilePath("staff", user.id));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <RouteGuard permissions={[PERMISSIONS.staff.create, PERMISSIONS.users.create]}>
      <div className="mx-auto max-w-lg space-y-6">
        <div>
          <Link href={staffListUrl(ADMIN_TABS.staff.staffs)} className="text-muted-foreground text-sm hover:underline">
            ← {t("nav.staff")}
          </Link>
          <h1 className="mt-2 text-2xl font-bold">{t("staff.createMember")}</h1>
        </div>
        <div className="border-border bg-card space-y-4 rounded-3xl border p-6">
          <div className="space-y-2">
            <Label>{t("staff.name")}</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>{t("users.password")}</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>{t("staff.role")}</Label>
            <select
              className="border-border bg-background w-full rounded-xl border px-3 py-2 text-sm"
              value={roleId || staffRoles[0]?.id}
              onChange={(e) => setRoleId(e.target.value)}
            >
              {staffRoles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <RyvoButton
            intent="cta"
            className="w-full"
            disabled={!email || !password || create.isPending}
            onClick={() => create.mutate()}
          >
            {t("staff.createMember")}
          </RyvoButton>
        </div>
      </div>
    </RouteGuard>
  );
}
