"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { ReferralsBonusPanel, ReferralsProgramsPanel } from "@/components/admin/finance/referrals-panels";
import { RyvoButton } from "@/components/ryvo/ryvo-button";
import { ADMIN_QUERY, ADMIN_TABS } from "@/configs/const";
import { useAuth } from "@/hooks/use-auth";
import { financeService } from "@/services/finance.service";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type ReferralsTabsProps = {
  tab: string;
  onTabChange: (v: string) => void;
};

const INVITE_RULES = [
  ["clientInviteClient", "financeReferrals.rules.clientInviteClient"],
  ["clientInviteDriver", "financeReferrals.rules.clientInviteDriver"],
  ["driverInviteClient", "financeReferrals.rules.driverInviteClient"],
  ["driverInviteDriver", "financeReferrals.rules.driverInviteDriver"],
] as const;

export function ReferralsTabs({ tab, onTabChange }: ReferralsTabsProps) {
  const { t } = useTranslation();
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const bonusSub =
    searchParams.get(ADMIN_QUERY.sub) === ADMIN_TABS.referralsBonus.drivers
      ? ADMIN_TABS.referralsBonus.drivers
      : ADMIN_TABS.referralsBonus.clients;

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

  const [clientCfg, setClientCfg] = useState<Record<string, unknown>>({});
  const [driverCfg, setDriverCfg] = useState<Record<string, unknown>>({});

  useEffect(() => {
    if (settingsData) {
      setClientCfg(settingsData.client_config ?? {});
      setDriverCfg(settingsData.driver_config ?? {});
    }
  }, [settingsData]);

  const saveSettings = useMutation({
    mutationFn: () =>
      financeService.updateReferralSettings(accessToken, {
        client_config: clientCfg,
        driver_config: driverCfg,
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

      <TabsContent value={ADMIN_TABS.referrals.referrals} className="mt-6">
        <ReferralsProgramsPanel
          audience={programsSub}
          onAudienceChange={(sub) => setSub(sub, ADMIN_TABS.referrals.referrals)}
          data={data}
        />
      </TabsContent>

      <TabsContent value={ADMIN_TABS.referrals.settings} className="mt-6 space-y-6">
        <p className="text-muted-foreground text-sm">{t("financeReferrals.settingsIntro")}</p>
        <div className="grid gap-6 lg:grid-cols-2">
          <SettingsBlock
            title={t("financeReferrals.clientRules")}
            hint={t("financeReferrals.clientRulesHint")}
            cfg={clientCfg}
            setCfg={setClientCfg}
            t={t}
          />
          <SettingsBlock
            title={t("financeReferrals.driverRules")}
            hint={t("financeReferrals.driverRulesHint")}
            cfg={driverCfg}
            setCfg={setDriverCfg}
            t={t}
          />
        </div>
        <RyvoButton
          intent="cta"
          disabled={saveSettings.isPending}
          onClick={() => saveSettings.mutate()}
        >
          {t("common.save")}
        </RyvoButton>
      </TabsContent>
    </Tabs>
  );
}

function SettingsBlock({
  title,
  hint,
  cfg,
  setCfg,
  t,
}: {
  title: string;
  hint: string;
  cfg: Record<string, unknown>;
  setCfg: (c: Record<string, unknown>) => void;
  t: (k: string) => string;
}) {
  function patchRule(key: string, field: "condition" | "targetBonus", value: number) {
    const rule = { ...((cfg[key] as Record<string, number>) ?? {}) };
    rule[field] = value;
    setCfg({ ...cfg, [key]: rule });
  }

  function ruleVal(key: string, field: "condition" | "targetBonus") {
    const rule = cfg[key] as { condition?: number; targetBonus?: number } | undefined;
    return Number(rule?.[field] ?? 0);
  }

  return (
    <div className="border-border bg-card space-y-4 rounded-2xl border p-5">
      <div>
        <h3 className="font-semibold">{title}</h3>
        <p className="text-muted-foreground text-xs">{hint}</p>
      </div>
      <div className="space-y-1">
        <Label>{t("financeReferrals.pointsPerDollar")}</Label>
        <Input
          type="number"
          value={String(cfg.pointsPerDollar ?? 1000)}
          onChange={(e) => setCfg({ ...cfg, pointsPerDollar: Number(e.target.value) })}
        />
        <p className="text-muted-foreground text-xs">{t("financeReferrals.pointsPerDollarHint")}</p>
      </div>
      <div className="space-y-3">
        <p className="text-sm font-semibold">{t("financeReferrals.inviteRulesTitle")}</p>
        {INVITE_RULES.map(([key, labelKey]) => (
          <div key={key} className="border-border grid grid-cols-2 gap-2 rounded-xl border p-3">
            <p className="text-muted-foreground col-span-2 text-xs font-medium">{t(labelKey)}</p>
            <div className="space-y-1">
              <Label className="text-xs">{t("financeReferrals.col.condition")}</Label>
              <Input
                type="number"
                value={ruleVal(key, "condition")}
                onChange={(e) => patchRule(key, "condition", Number(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("financeReferrals.col.targetBonus")}</Label>
              <Input
                type="number"
                step="0.01"
                value={ruleVal(key, "targetBonus")}
                onChange={(e) => patchRule(key, "targetBonus", Number(e.target.value))}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
