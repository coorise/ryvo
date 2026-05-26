"use client";

import { Suspense, useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";

import { AdminPageHeader } from "@/components/admin/admin-list-ui";
import { FeedbacksPanel } from "@/components/admin/hr/feedbacks-panel";
import { PermissionGate } from "@/guards/permission-gate";
import { ADMIN_QUERY, ADMIN_TABS } from "@/configs/const";

function FeedbacksPageContent() {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = useMemo(() => {
    const raw = searchParams.get(ADMIN_QUERY.sub);
    if (raw === ADMIN_TABS.feedbacks.drivers) return ADMIN_TABS.feedbacks.drivers;
    if (raw === ADMIN_TABS.feedbacks.staff) return ADMIN_TABS.feedbacks.staff;
    return ADMIN_TABS.feedbacks.product;
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
      <AdminPageHeader title={t("nav.feedbacks")} subtitle={t("hr.feedbacks.pageSubtitle")} />
      <FeedbacksPanel tab={tab} onTabChange={setTab} />
    </div>
  );
}

export default function HrFeedbacksPage() {
  const { t } = useTranslation();
  return (
    <PermissionGate permissions={["support:read"]} fallback={<p>{t("common.noData")}</p>}>
      <Suspense fallback={<p className="text-muted-foreground text-sm">{t("common.loading")}</p>}>
        <FeedbacksPageContent />
      </Suspense>
    </PermissionGate>
  );
}
