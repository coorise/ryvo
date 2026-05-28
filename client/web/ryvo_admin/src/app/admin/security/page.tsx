"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";

import { AdminPageHeader } from "@/components/admin/admin-list-ui";
import { SECURITY_TABS, SecurityTabs } from "@/components/admin/audit/security-tabs";
import { PermissionGate } from "@/guards/permission-gate";
import { PERMISSIONS } from "@/configs/const";

export default function AdminSecurityPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<string>(SECURITY_TABS.auth);

  return (
    <PermissionGate permissions={[PERMISSIONS.audit.read]} fallback={<p>{t("common.noData")}</p>}>
      <div className="space-y-6">
        <AdminPageHeader title={t("nav.security")} subtitle={t("security.subtitle")} />
        <SecurityTabs tab={tab} onTabChange={setTab} />
      </div>
    </PermissionGate>
  );
}
