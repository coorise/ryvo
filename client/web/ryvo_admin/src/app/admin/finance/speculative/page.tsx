"use client";

import { Suspense, useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";

import { SpeculativeOpexTab } from "@/components/admin/finance/speculative-opex-tab";
import { SpeculativeRevenuesTab } from "@/components/admin/finance/speculative-revenues-tab";
import { ADMIN_QUERY, ADMIN_TABS } from "@/configs/const";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function parseSpeculativeTab(raw: string | null) {
  const values = Object.values(ADMIN_TABS.speculative);
  if (raw && values.includes(raw as (typeof values)[number])) return raw;
  return ADMIN_TABS.speculative.revenues;
}

function SpeculativePageContent() {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = useMemo(
    () => parseSpeculativeTab(searchParams.get(ADMIN_QUERY.tab)),
    [searchParams],
  );

  const setTab = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set(ADMIN_QUERY.tab, value);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("speculative.title")}</h1>
        <p className="text-muted-foreground text-sm">{t("speculative.subtitle")}</p>
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value={ADMIN_TABS.speculative.revenues}>
            {t("speculative.tabs.revenues")}
          </TabsTrigger>
          <TabsTrigger value={ADMIN_TABS.speculative.opex}>
            {t("speculative.tabs.opex")}
          </TabsTrigger>
        </TabsList>
        <TabsContent value={ADMIN_TABS.speculative.revenues} className="mt-6">
          <SpeculativeRevenuesTab />
        </TabsContent>
        <TabsContent value={ADMIN_TABS.speculative.opex} className="mt-6">
          <SpeculativeOpexTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function SpeculativeEstimatorPage() {
  const { t } = useTranslation();
  return (
    <Suspense fallback={<p className="text-muted-foreground text-sm">{t("common.loading")}</p>}>
      <SpeculativePageContent />
    </Suspense>
  );
}
