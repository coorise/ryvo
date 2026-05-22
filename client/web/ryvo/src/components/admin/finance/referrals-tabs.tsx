"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { ReferralsCouponsPanel } from "@/components/admin/finance/referrals-coupons-panel";
import { ReferralsBonusPanel, ReferralsProgramsPanel } from "@/components/admin/finance/referrals-panels";
import {
  ClientProgramSettingsPanel,
  DriverProgramSettingsPanel,
} from "@/components/admin/finance/referral-settings-panel";
import { RyvoButton } from "@/components/ryvo/ryvo-button";
import { ADMIN_QUERY, ADMIN_TABS, PERMISSIONS } from "@/configs/const";
import { useAuth } from "@/hooks/use-auth";
import { useRbac } from "@/hooks/use-rbac";
import {
  DEFAULT_CLIENT_PROGRAM,
  DEFAULT_DRIVER_PROGRAM,
  normalizeClientProgram,
  normalizeDriverProgram,
  type ClientProgramConfig,
  type DriverProgramConfig,
} from "@/lib/referral-settings-config";
import { financeService } from "@/services/finance.service";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type ReferralsTabsProps = {
  tab: string;
  onTabChange: (v: string) => void;
};

export function ReferralsTabs({ tab, onTabChange }: ReferralsTabsProps) {
  const { t } = useTranslation();
  const { accessToken } = useAuth();
  const { hasPermission } = useRbac();
  const canEdit = hasPermission(PERMISSIONS.finance.referralsUpdate);
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const bonusSub =
    searchParams.get(ADMIN_QUERY.sub) === ADMIN_TABS.referralsBonus.drivers
      ? ADMIN_TABS.referralsBonus.drivers
      : ADMIN_TABS.referralsBonus.clients;

  const couponsSub =
    searchParams.get(ADMIN_QUERY.sub) === ADMIN_TABS.referralsCoupons.usedByClients
      ? ADMIN_TABS.referralsCoupons.usedByClients
      : ADMIN_TABS.referralsCoupons.codes;

  const programsSub = (() => {
    const raw = searchParams.get(ADMIN_QUERY.sub);
    const allowed = Object.values(ADMIN_TABS.referralsPrograms);
    if (raw && allowed.includes(raw as (typeof allowed)[number])) return raw;
    return ADMIN_TABS.referralsPrograms.loyalty;
  })();

  const { data, isLoading } = useQuery({
    queryKey: ["finance", "referrals"],
    queryFn: () => financeService.getReferrals(accessToken),
    enabled: Boolean(accessToken),
  });

  const { data: settingsData } = useQuery({
    queryKey: ["finance", "referral-settings"],
    queryFn: () => financeService.getReferralSettings(accessToken),
    enabled: Boolean(accessToken),
  });

  const [clientProgram, setClientProgram] = useState<ClientProgramConfig>(DEFAULT_CLIENT_PROGRAM);
  const [driverProgram, setDriverProgram] = useState<DriverProgramConfig>(DEFAULT_DRIVER_PROGRAM);

  useEffect(() => {
    if (settingsData) {
      setClientProgram(normalizeClientProgram(settingsData.client_config ?? {}));
      setDriverProgram(normalizeDriverProgram(settingsData.driver_config ?? {}));
    }
  }, [settingsData]);

  const saveSettings = useMutation({
    mutationFn: () =>
      financeService.updateReferralSettings(accessToken, {
        client_config: clientProgram as unknown as Record<string, unknown>,
        driver_config: driverProgram as unknown as Record<string, unknown>,
      }),
    onSuccess: () => {
      toast.success(t("financeReferrals.settingsSaved"));
      void queryClient.invalidateQueries({ queryKey: ["finance", "referral-settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setSub = useCallback(
    (sub: string, mainTab: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set(ADMIN_QUERY.tab, mainTab);
      params.set(ADMIN_QUERY.sub, sub);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  if (isLoading && tab !== ADMIN_TABS.referrals.settings) {
    return <p className="text-muted-foreground text-sm">{t("common.loading")}</p>;
  }

  return (
    <Tabs value={tab} onValueChange={onTabChange}>
      <TabsList>
        <TabsTrigger value={ADMIN_TABS.referrals.bonus}>{t("financeReferrals.tabs.bonus")}</TabsTrigger>
        <TabsTrigger value={ADMIN_TABS.referrals.coupons}>
          {t("financeReferrals.tabs.coupons")}
        </TabsTrigger>
        <TabsTrigger value={ADMIN_TABS.referrals.referrals}>
          {t("financeReferrals.tabs.referrals")}
        </TabsTrigger>
        <TabsTrigger value={ADMIN_TABS.referrals.settings}>
          {t("financeReferrals.tabs.settings")}
        </TabsTrigger>
      </TabsList>

      <TabsContent value={ADMIN_TABS.referrals.bonus} className="mt-6">
        <ReferralsBonusPanel
          audience={bonusSub}
          onAudienceChange={(sub) => setSub(sub, ADMIN_TABS.referrals.bonus)}
          data={data}
        />
      </TabsContent>

      <TabsContent value={ADMIN_TABS.referrals.coupons} className="mt-6">
        <ReferralsCouponsPanel
          audience={couponsSub}
          onAudienceChange={(sub) => setSub(sub, ADMIN_TABS.referrals.coupons)}
        />
      </TabsContent>

      <TabsContent value={ADMIN_TABS.referrals.referrals} className="mt-6">
        <ReferralsProgramsPanel
          audience={programsSub}
          onAudienceChange={(sub) => setSub(sub, ADMIN_TABS.referrals.referrals)}
          data={data}
        />
      </TabsContent>

      <TabsContent value={ADMIN_TABS.referrals.settings} className="mt-6 space-y-6">
        <p className="text-muted-foreground max-w-3xl text-sm">
          {t("financeReferrals.settingsIntro")}
        </p>
        <div className="grid gap-6 xl:grid-cols-2">
          <ClientProgramSettingsPanel
            config={clientProgram}
            onChange={setClientProgram}
            disabled={!canEdit}
          />
          <DriverProgramSettingsPanel
            config={driverProgram}
            onChange={setDriverProgram}
            disabled={!canEdit}
          />
        </div>
        {canEdit && (
          <RyvoButton
            intent="cta"
            disabled={saveSettings.isPending}
            onClick={() => saveSettings.mutate()}
          >
            {t("common.save")}
          </RyvoButton>
        )}
      </TabsContent>
    </Tabs>
  );
}
