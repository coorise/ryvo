"use client";

import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { FeedbackTabAnalytics } from "@/components/admin/hr/feedback-tab-analytics";
import { AdminListStack } from "@/components/admin/admin-list-ui";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ADMIN_TABS } from "@/configs/const";
import type { FeedbackCategory } from "@/services/feedbacks.service";

type FeedbacksPanelProps = {
  tab: string;
  onTabChange: (v: string) => void;
};

function tabToCategory(tab: string): FeedbackCategory {
  if (tab === ADMIN_TABS.feedbacks.drivers) return "driver";
  if (tab === ADMIN_TABS.feedbacks.staff) return "staff";
  return "product";
}

export function FeedbacksPanel({ tab, onTabChange }: FeedbacksPanelProps) {
  const { t } = useTranslation();

  const descKey = useMemo(() => {
    if (tab === ADMIN_TABS.feedbacks.drivers) return "hr.feedbacks.driversDesc";
    if (tab === ADMIN_TABS.feedbacks.staff) return "hr.feedbacks.staffDesc";
    return "hr.feedbacks.productDesc";
  }, [tab]);

  return (
    <AdminListStack>
      <p className="text-muted-foreground text-sm">{t("hr.feedbacks.subtitle")}</p>
      <Tabs value={tab} onValueChange={onTabChange}>
        <TabsList>
          <TabsTrigger value={ADMIN_TABS.feedbacks.product}>
            {t("hr.feedbacks.tabs.product")}
          </TabsTrigger>
          <TabsTrigger value={ADMIN_TABS.feedbacks.drivers}>
            {t("hr.feedbacks.tabs.drivers")}
          </TabsTrigger>
          <TabsTrigger value={ADMIN_TABS.feedbacks.staff}>
            {t("hr.feedbacks.tabs.staff")}
          </TabsTrigger>
        </TabsList>
        <div className="mt-6">
          <FeedbackTabAnalytics
            key={tab}
            category={tabToCategory(tab)}
            descKey={descKey}
          />
        </div>
      </Tabs>
    </AdminListStack>
  );
}
