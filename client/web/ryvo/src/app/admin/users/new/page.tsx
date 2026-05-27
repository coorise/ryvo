"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { RyvoButton } from "@/components/ryvo/ryvo-button";
import { RouteGuard } from "@/guards/route-guard";
import { PERMISSIONS, QUERY_KEYS, ROUTES } from "@/configs/const";
import { useAuth } from "@/hooks/use-auth";
import { adminProfilePath } from "@/lib/admin-paths";
import { rbacService } from "@/services/rbac.service";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function NewUserPage() {
  const { t } = useTranslation();
  const { accessToken } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  const create = useMutation({
    mutationFn: () =>
      rbacService.createUser(accessToken, {
        email,
        password,
        full_name: fullName || undefined,
      }),
    onSuccess: (res) => {
      toast.success(t("users.created"));
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.admin.users("clients") });
      router.push(adminProfilePath("users", res.user.id));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <RouteGuard permissions={[PERMISSIONS.users.create]}>
      <div className="mx-auto max-w-lg space-y-6">
        <div>
          <Link href={ROUTES.admin.users.list} className="text-muted-foreground text-sm hover:underline">
            ← {t("nav.users")}
          </Link>
          <h1 className="mt-2 text-2xl font-bold">{t("users.create")}</h1>
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
          <RyvoButton
            intent="cta"
            className="w-full"
            disabled={create.isPending}
            onClick={() => create.mutate()}
          >
            {t("users.create")}
          </RyvoButton>
        </div>
      </div>
    </RouteGuard>
  );
}
