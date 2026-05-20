"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { SimpleTable } from "@/components/admin/finance/simple-table";
import { RyvoButton } from "@/components/ryvo/ryvo-button";
import { useAuth } from "@/hooks/use-auth";
import { financeService, type TariffPackage } from "@/services/finance.service";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

const TYPE_LABELS: Record<string, string> = {
  essential: "Essential",
  pro: "Pro",
  per_drive: "Per drive",
  per_quota: "Per quota",
  per_daily: "Daily",
  per_weekly: "Weekly",
  per_monthly: "Monthly",
};

export function TariffsPanel() {
  const { t } = useTranslation();
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["finance", "tariffs"],
    queryFn: () => financeService.getTariffs(accessToken),
    enabled: Boolean(accessToken),
  });

  const toggle = useMutation({
    mutationFn: (pkg: TariffPackage) =>
      financeService.updateTariff(accessToken, pkg.id, { active: !pkg.active }),
    onSuccess: () => {
      toast.success(t("financeTariffs.saved"));
      void queryClient.invalidateQueries({ queryKey: ["finance", "tariffs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const packages = data?.packages ?? [];

  if (isLoading) return <p className="text-muted-foreground text-sm">{t("common.loading")}</p>;

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground text-sm">{t("financeTariffs.subtitle")}</p>
      <div className="grid gap-3 md:grid-cols-2">
        {packages.map((pkg) => (
          <div
            key={pkg.id}
            className={cn(
              "border-border bg-card rounded-2xl border p-5",
              pkg.is_optional_subscription && "ring-primary/30 ring-2",
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-bold">{pkg.name}</p>
                <p className="text-muted-foreground text-xs">
                  {TYPE_LABELS[pkg.package_type] ?? pkg.package_type} · {pkg.commission_percent}%{" "}
                  {t("financeTariffs.commission")}
                </p>
              </div>
              <Switch
                checked={pkg.active}
                onCheckedChange={() => toggle.mutate(pkg)}
                aria-label="Active"
              />
            </div>
            {pkg.is_optional_subscription && (
              <p className="text-primary mt-2 text-xs font-semibold">
                {t("financeTariffs.subscription")} ${pkg.subscription_monthly}/mo · boost +
                {pkg.search_boost}
              </p>
            )}
            <p className="text-muted-foreground mt-2 text-xs">
              {t("financeTariffs.payout")}: {pkg.payout_cadence.replace(/_/g, " ")}
            </p>
          </div>
        ))}
      </div>
      <SimpleTable
        rows={packages}
        empty={t("common.noData")}
        columns={[
          { key: "n", header: t("financeTariffs.col.name"), cell: (p) => p.name },
          { key: "t", header: t("financeTariffs.col.type"), cell: (p) => TYPE_LABELS[p.package_type] ?? p.package_type },
          { key: "c", header: "%", cell: (p) => p.commission_percent },
          { key: "p", header: t("financeTariffs.col.payout"), cell: (p) => p.payout_cadence },
          { key: "s", header: t("financeTariffs.col.sub"), cell: (p) => (p.subscription_monthly ? `$${p.subscription_monthly}` : "—") },
        ]}
      />
    </div>
  );
}
