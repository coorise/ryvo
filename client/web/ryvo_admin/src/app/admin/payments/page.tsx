"use client";

import { useTranslation } from "react-i18next";

import { AdminPageHeader } from "@/components/admin/admin-list-ui";
import { PaymentsPanel } from "@/components/admin/finance/payments-panel";
import { PermissionGate } from "@/guards/permission-gate";
import { PERMISSIONS } from "@/configs/const";

export default function AdminPaymentsPage() {
  const { t } = useTranslation();

  return (
    <PermissionGate permissions={[PERMISSIONS.payments.read]} fallback={<p>{t("common.noData")}</p>}>
      <div className="space-y-6">
        <AdminPageHeader title={t("nav.payments")} subtitle={t("payments.subtitle")} />
        <PaymentsPanel />
      </div>
    </PermissionGate>
  );
}
