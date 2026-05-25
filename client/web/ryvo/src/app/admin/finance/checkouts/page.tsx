"use client";

import { useTranslation } from "react-i18next";

import { AdminPageHeader } from "@/components/admin/admin-list-ui";
import { CheckoutsPanel } from "@/components/admin/finance/checkouts-panel";
import { PermissionGate } from "@/guards/permission-gate";
import { PERMISSIONS } from "@/configs/const";

export default function FinanceCheckoutsPage() {
  const { t } = useTranslation();

  return (
    <PermissionGate
      permissions={[PERMISSIONS.finance.checkoutsRead]}
      fallback={<p>{t("common.noData")}</p>}
    >
      <div className="space-y-6">
        <AdminPageHeader
          title={t("financeCheckouts.title")}
          subtitle={t("financeCheckouts.subtitle")}
        />
        <CheckoutsPanel />
      </div>
    </PermissionGate>
  );
}
