"use client";

import { Suspense, useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";

import { AdminPageHeader } from "@/components/admin/admin-list-ui";
import { TARIFFS_TABS, TariffsTabs } from "@/components/admin/finance/tariffs-tabs";
import { ADMIN_QUERY } from "@/configs/const";

function TariffsPageContent() {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = useMemo(() => {
    const raw = searchParams.get(ADMIN_QUERY.sub);
    return raw === TARIFFS_TABS.subscribers ? TARIFFS_TABS.subscribers : TARIFFS_TABS.tariffs;
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
        title={t("financeTariffs.title")}
        subtitle={t("financeTariffs.subtitle")}
      />
      <TariffsTabs tab={tab} onTabChange={setTab} />
    </div>
  );
}

export default function FinanceTariffsPage() {
  const { t } = useTranslation();
  return (
    <Suspense fallback={<p className="text-muted-foreground text-sm">{t("common.loading")}</p>}>
      <TariffsPageContent />
    </Suspense>
  );
}
