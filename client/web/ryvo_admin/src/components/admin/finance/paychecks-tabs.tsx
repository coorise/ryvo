"use client";

import { useTranslation } from "react-i18next";

import { DriversAmountPanel } from "@/components/admin/finance/drivers-amount-panel";
import { PaychecksPanel } from "@/components/admin/finance/paychecks-panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const PAYCHECKS_TABS = {
  paying: "paying",
  driversAmount: "drivers-amount",
} as const;

type PaychecksTabsProps = {
  tab: string;
  onTabChange: (v: string) => void;
};

export function PaychecksTabs({ tab, onTabChange }: PaychecksTabsProps) {
  const { t } = useTranslation();

  return (
    <Tabs value={tab} onValueChange={onTabChange}>
      <TabsList>
        <TabsTrigger value={PAYCHECKS_TABS.paying}>{t("financePaychecks.tabs.paying")}</TabsTrigger>
        <TabsTrigger value={PAYCHECKS_TABS.driversAmount}>
          {t("financePaychecks.tabs.driversAmount")}
        </TabsTrigger>
      </TabsList>
      <TabsContent value={PAYCHECKS_TABS.paying} className="mt-6">
        <PaychecksPanel />
      </TabsContent>
      <TabsContent value={PAYCHECKS_TABS.driversAmount} className="mt-6">
        <DriversAmountPanel />
      </TabsContent>
    </Tabs>
  );
}
