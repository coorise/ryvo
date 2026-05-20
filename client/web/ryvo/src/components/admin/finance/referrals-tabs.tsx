"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { SimpleTable } from "@/components/admin/finance/simple-table";
import { RyvoButton } from "@/components/ryvo/ryvo-button";
import { ADMIN_QUERY, ADMIN_TABS } from "@/configs/const";
import { useAuth } from "@/hooks/use-auth";
import { financeService, type ReferralEntry } from "@/services/finance.service";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type ReferralsTabsProps = {
  tab: string;
  onTabChange: (v: string) => void;
};

export function ReferralsTabs({ tab, onTabChange }: ReferralsTabsProps) {
  const { t } = useTranslation();
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const bonusSub =
    searchParams.get(ADMIN_QUERY.sub) ?? ADMIN_TABS.referralsBonus.users;

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

  const clientReferrals = (data?.referrals ?? []).filter((r) => r.role === "client");
  const driverReferrals = (data?.referrals ?? []).filter((r) => r.role === "driver");

  const setBonusSub = useCallback(
    (sub: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set(ADMIN_QUERY.tab, ADMIN_TABS.referrals.bonus);
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

      <TabsContent value={ADMIN_TABS.referrals.bonus} className="mt-6 space-y-4">
        <Tabs value={bonusSub} onValueChange={setBonusSub}>
          <TabsList>
            <TabsTrigger value={ADMIN_TABS.referralsBonus.users}>
              {t("financeReferrals.bonus.users")}
            </TabsTrigger>
            <TabsTrigger value={ADMIN_TABS.referralsBonus.drivers}>
              {t("financeReferrals.bonus.drivers")}
            </TabsTrigger>
          </TabsList>
          <TabsContent value={ADMIN_TABS.referralsBonus.users} className="mt-4">
            <SimpleTable
              empty={t("common.noData")}
              rows={data?.loyalty ?? []}
              columns={[
                { key: "u", header: t("financeReferrals.col.user"), cell: (r) => r.user_id.slice(0, 8) },
                { key: "p", header: t("financeReferrals.col.points"), cell: (r) => r.points },
                { key: "c", header: t("financeReferrals.col.cash"), cell: (r) => `$${r.cash_balance}` },
              ]}
            />
          </TabsContent>
          <TabsContent value={ADMIN_TABS.referralsBonus.drivers} className="mt-4">
            <SimpleTable
              empty={t("common.noData")}
              rows={driverReferrals.filter((r) => r.status === "credited")}
              columns={referralCols(t)}
            />
          </TabsContent>
        </Tabs>
      </TabsContent>

      <TabsContent value={ADMIN_TABS.referrals.referrals} className="mt-6 space-y-8">
        <section>
          <h3 className="mb-3 font-semibold">{t("financeReferrals.clientsTable")}</h3>
          <SimpleTable empty={t("common.noData")} rows={clientReferrals} columns={referralCols(t)} />
        </section>
        <section>
          <h3 className="mb-3 font-semibold">{t("financeReferrals.driversTable")}</h3>
          <SimpleTable empty={t("common.noData")} rows={driverReferrals} columns={referralCols(t)} />
        </section>
        <section>
          <h3 className="mb-3 font-semibold">{t("financeReferrals.loyaltyTable")}</h3>
          <SimpleTable
            empty={t("common.noData")}
            rows={data?.loyalty ?? []}
            columns={[
              { key: "u", header: t("financeReferrals.col.user"), cell: (r) => r.user_id.slice(0, 8) },
              { key: "p", header: t("financeReferrals.col.points"), cell: (r) => r.points },
              {
                key: "c",
                header: t("financeReferrals.col.redeemable"),
                cell: (r) => `$${r.cash_balance}`,
              },
            ]}
          />
        </section>
      </TabsContent>

      <TabsContent value={ADMIN_TABS.referrals.settings} className="mt-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <SettingsBlock
            title={t("financeReferrals.clientRules")}
            hint={t("financeReferrals.clientRulesHint")}
            cfg={clientCfg}
            setCfg={setClientCfg}
            fields={[
              ["maxReferrals", t("financeReferrals.maxReferrals")],
              ["referrerBonusCad", t("financeReferrals.referrerBonus")],
              ["refereeBonusCad", t("financeReferrals.refereeBonus")],
            ]}
          />
          <SettingsBlock
            title={t("financeReferrals.driverRules")}
            hint={t("financeReferrals.driverRulesHint")}
            cfg={driverCfg}
            setCfg={setDriverCfg}
            fields={[
              ["maxReferrals", t("financeReferrals.maxReferrals")],
              ["referrerBonusCad", t("financeReferrals.referrerBonus")],
              ["commissionReductionPercent", t("financeReferrals.commissionCut")],
            ]}
          />
        </div>
        <RyvoButton
          intent="cta"
          className="mt-6"
          disabled={saveSettings.isPending}
          onClick={() => saveSettings.mutate()}
        >
          {t("common.save")}
        </RyvoButton>
      </TabsContent>
    </Tabs>
  );
}

function referralCols(t: (k: string) => string) {
  return [
    {
      key: "ref",
      header: t("financeReferrals.col.referrer"),
      cell: (r: ReferralEntry) => r.referrer_id.slice(0, 8),
    },
    {
      key: "new",
      header: t("financeReferrals.col.referee"),
      cell: (r: ReferralEntry) => r.referee_id.slice(0, 8),
    },
    {
      key: "ch",
      header: t("financeReferrals.col.channel"),
      cell: (r: ReferralEntry) => (r.channel === "coupon" ? r.coupon_code ?? "coupon" : "link"),
    },
    { key: "b", header: t("financeReferrals.col.bonus"), cell: (r: ReferralEntry) => `$${r.bonus_earned}` },
    { key: "s", header: t("financeReferrals.col.status"), cell: (r: ReferralEntry) => r.status },
  ];
}

function SettingsBlock({
  title,
  hint,
  cfg,
  setCfg,
  fields,
}: {
  title: string;
  hint: string;
  cfg: Record<string, unknown>;
  setCfg: (c: Record<string, unknown>) => void;
  fields: [string, string][];
}) {
  return (
    <div className="border-border bg-card space-y-3 rounded-2xl border p-5">
      <div>
        <h3 className="font-semibold">{title}</h3>
        <p className="text-muted-foreground text-xs">{hint}</p>
      </div>
      {fields.map(([key, label]) => (
        <div key={key} className="space-y-1">
          <Label>{label}</Label>
          <Input
            type="number"
            value={String(cfg[key] ?? "")}
            onChange={(e) => setCfg({ ...cfg, [key]: Number(e.target.value) })}
          />
        </div>
      ))}
    </div>
  );
}
