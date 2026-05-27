"use client";

import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { PermissionGate } from "@/guards/permission-gate";
import { PERMISSIONS, ROUTES } from "@/configs/const";
import { RyvoButton } from "@/components/ryvo/ryvo-button";
import { useAuth } from "@/hooks/use-auth";
import { driversService } from "@/services/drivers.service";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function NewDriverPage() {
  const { t } = useTranslation();
  const { accessToken } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  const create = useMutation({
    mutationFn: () =>
      driversService.createDriver(accessToken, {
        email,
        password,
        full_name: fullName || undefined,
        phone: phone || undefined,
      }),
    onSuccess: (res) => {
      toast.success(t("drivers.created"));
      router.push(`${ROUTES.admin.drivers.profile}?id=${res.driver.id}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <PermissionGate permissions={[PERMISSIONS.drivers.create]}>
      <div className="mx-auto max-w-lg space-y-6">
        <div>
          <Link href={ROUTES.admin.drivers.list} className="text-muted-foreground text-sm hover:underline">
            ← {t("nav.driverKyc")}
          </Link>
          <h1 className="mt-2 text-2xl font-bold">{t("drivers.create")}</h1>
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
            <Label>{t("drivers.phone")}</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
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
            {t("drivers.create")}
          </RyvoButton>
        </div>
      </div>
    </PermissionGate>
  );
}
