"use client";

import { useTranslation } from "react-i18next";
import Link from "next/link";

import { PermissionGate } from "@/guards/permission-gate";
import { ROUTES } from "@/configs";

/** Security events share the audit log pipeline. */
export default function AdminSecurityPage() {
  const { t } = useTranslation();

  return (
    <PermissionGate permissions={["audit:read"]} fallback={<p>{t("common.noData")}</p>}>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">{t("nav.security")}</h1>
        <p className="text-muted-foreground text-sm">{t("security.subtitle")}</p>
        <Link href="/admin/audit" className="text-primary font-semibold hover:underline">
          {t("security.viewAudit")} →
        </Link>
      </div>
    </PermissionGate>
  );
}
