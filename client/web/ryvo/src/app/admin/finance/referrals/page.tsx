"use client";

import { Suspense, useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";

import { ReferralsTabs } from "@/components/admin/finance/referrals-tabs";
import { ADMIN_QUERY, ADMIN_TABS } from "@/configs/const";

function parseTab(raw: string | null) {
  const v = Object.values(ADMIN_TABS.referrals);
  if (raw && v.includes(raw as (typeof v)[number])) return raw;
  return ADMIN_TABS.referrals.bonus;
}

function ReferralsPageContent() {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = useMemo(() => parseTab(searchParams.get(ADMIN_QUERY.tab)), [searchParams]);

  const setTab = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set(ADMIN_QUERY.tab, value);
      if (value === ADMIN_TABS.referrals.bonus) {
        params.set(ADMIN_QUERY.sub, ADMIN_TABS.referralsBonus.clients);
      } else if (value === ADMIN_TABS.referrals.referrals) {
        params.set(ADMIN_QUERY.sub, ADMIN_TABS.referralsPrograms.loyalty);
      } else {
        params.delete(ADMIN_QUERY.sub);
      }
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("financeReferrals.title")}</h1>
        <p className="text-muted-foreground text-sm">{t("financeReferrals.pageSubtitle")}</p>
      </div>
      <ReferralsTabs tab={tab} onTabChange={setTab} />
    </div>
  );
}

export default function FinanceReferralsPage() {
  const { t } = useTranslation();
  return (
    <Suspense fallback={<p className="text-muted-foreground text-sm">{t("common.loading")}</p>}>
      <ReferralsPageContent />
    </Suspense>
  );
}
