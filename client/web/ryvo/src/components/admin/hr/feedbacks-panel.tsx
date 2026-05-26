"use client";

import { useTranslation } from "react-i18next";

import { AdminListStack } from "@/components/admin/admin-list-ui";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ADMIN_TABS } from "@/configs/const";

type FeedbacksPanelProps = {
  tab: string;
  onTabChange: (v: string) => void;
};

function FeedbackTabPlaceholder({ titleKey, descKey }: { titleKey: string; descKey: string }) {
  const { t } = useTranslation();
  return (
    <div className="border-border bg-card rounded-3xl border p-8">
      <h3 className="text-lg font-semibold">{t(titleKey)}</h3>
      <p className="text-muted-foreground mt-2 max-w-2xl text-sm">{t(descKey)}</p>
      <p className="text-muted-foreground mt-6 text-sm">{t("hr.feedbacks.comingSoon")}</p>
    </div>
  );
}

export function FeedbacksPanel({ tab, onTabChange }: FeedbacksPanelProps) {
  const { t } = useTranslation();

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
        <TabsContent value={ADMIN_TABS.feedbacks.product} className="mt-6">
          <FeedbackTabPlaceholder
            titleKey="hr.feedbacks.tabs.product"
            descKey="hr.feedbacks.productDesc"
          />
        </TabsContent>
        <TabsContent value={ADMIN_TABS.feedbacks.drivers} className="mt-6">
          <FeedbackTabPlaceholder
            titleKey="hr.feedbacks.tabs.drivers"
            descKey="hr.feedbacks.driversDesc"
          />
        </TabsContent>
        <TabsContent value={ADMIN_TABS.feedbacks.staff} className="mt-6">
          <FeedbackTabPlaceholder
            titleKey="hr.feedbacks.tabs.staff"
            descKey="hr.feedbacks.staffDesc"
          />
        </TabsContent>
      </Tabs>
    </AdminListStack>
  );
}
