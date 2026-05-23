"use client";

import { useTranslation } from "react-i18next";

import { TariffSubscribersPanel } from "@/components/admin/finance/tariff-subscribers-panel";
import { TariffsPanel } from "@/components/admin/finance/tariffs-panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type TariffsTabsProps = {
  tab: string;
  onTabChange: (v: string) => void;
};

export const TARIFFS_TABS = {
  tariffs: "tariffs",
  subscribers: "subscribers",
} as const;

export function TariffsTabs({ tab, onTabChange }: TariffsTabsProps) {
  const { t } = useTranslation();

  return (
    <Tabs value={tab} onValueChange={onTabChange}>
      <TabsList>
        <TabsTrigger value={TARIFFS_TABS.tariffs}>{t("financeTariffs.tabs.tariffs")}</TabsTrigger>
        <TabsTrigger value={TARIFFS_TABS.subscribers}>
          {t("financeTariffs.tabs.subscribers")}
        </TabsTrigger>
      </TabsList>
      <TabsContent value={TARIFFS_TABS.tariffs} className="mt-6">
        <TariffsPanel />
      </TabsContent>
      <TabsContent value={TARIFFS_TABS.subscribers} className="mt-6">
        <TariffSubscribersPanel />
      </TabsContent>
    </Tabs>
  );
}
