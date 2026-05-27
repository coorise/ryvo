"use client";

import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { RyvoButton } from "@/components/ryvo/ryvo-button";
import { RouteGuard } from "@/guards/route-guard";
import { ADMIN_TABS, PERMISSIONS, ROUTES } from "@/configs/const";
import { staffListUrl } from "@/lib/admin-staff-url";
import { useAuth } from "@/hooks/use-auth";
import { useRbac } from "@/hooks/use-rbac";
import { rbacService } from "@/services/rbac.service";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function CreateRolePage() {
  const { t } = useTranslation();
  const { accessToken } = useAuth();
  const { matrix, permissions: actorPerms, roles: actorRoles } = useRbac();
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const grantable = useMemo(() => {
    if (actorRoles.includes("super_admin")) {
      return matrix.data?.permissions.map((p) => p.name) ?? [];
    }
    return actorPerms;
  }, [actorPerms, actorRoles, matrix.data?.permissions]);

  const create = useMutation({
    mutationFn: () =>
      rbacService.createRole(accessToken, {
        name,
        description: description || undefined,
        permissions: [...selected],
      }),
    onSuccess: () => {
      toast.success(t("staff.roleCreated"));
      router.push(staffListUrl(ADMIN_TABS.staff.roles));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <RouteGuard permissions={[PERMISSIONS.roles.create]}>
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <Link href={staffListUrl(ADMIN_TABS.staff.roles)} className="text-muted-foreground text-sm hover:underline">
            ← {t("nav.staff")}
          </Link>
          <h1 className="mt-2 text-2xl font-bold">{t("staff.createRole")}</h1>
        </div>
        <div className="border-border bg-card space-y-4 rounded-3xl border p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>{t("staff.roleName")}</Label>
              <Input
                placeholder={t("staff.roleNamePlaceholder")}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("staff.roleDescription")}</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto rounded-xl border p-3">
            <div className="grid gap-2 sm:grid-cols-2">
              {grantable.map((p) => (
                <label key={p} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selected.has(p)}
                    onChange={() => {
                      setSelected((prev) => {
                        const next = new Set(prev);
                        if (next.has(p)) next.delete(p);
                        else next.add(p);
                        return next;
                      });
                    }}
                  />
                  {p}
                </label>
              ))}
            </div>
          </div>
          <RyvoButton intent="cta" disabled={!name || create.isPending} onClick={() => create.mutate()}>
            {t("staff.createRole")}
          </RyvoButton>
        </div>
      </div>
    </RouteGuard>
  );
}
