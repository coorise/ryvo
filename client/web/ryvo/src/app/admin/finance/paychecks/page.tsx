"use client";

import { Suspense, useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";

import { AdminPageHeader } from "@/components/admin/admin-list-ui";
import { PAYCHECKS_TABS, PaychecksTabs } from "@/components/admin/finance/paychecks-tabs";
import { PermissionGate } from "@/guards/permission-gate";
import { ADMIN_QUERY, PERMISSIONS } from "@/configs/const";

function PaychecksPageContent() {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = useMemo(() => {
    const raw = searchParams.get(ADMIN_QUERY.sub);
    return raw === PAYCHECKS_TABS.driversAmount
      ? PAYCHECKS_TABS.driversAmount
      : PAYCHECKS_TABS.paying;
  }, [searchParams]);

  const setTab = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set(ADMIN_QUERY.sub, value);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={t("financePaychecks.title")}
        subtitle={t("financePaychecks.subtitle")}
      />
      <PaychecksTabs tab={tab} onTabChange={setTab} />
    </div>
  );
}

export default function FinancePaychecksPage() {
  const { t } = useTranslation();
  return (
    <PermissionGate
      permissions={[PERMISSIONS.finance.paychecksRead]}
      fallback={<p>{t("common.noData")}</p>}
    >
      <Suspense fallback={<p className="text-muted-foreground text-sm">{t("common.loading")}</p>}>
        <PaychecksPageContent />
      </Suspense>
    </PermissionGate>
  );
}
