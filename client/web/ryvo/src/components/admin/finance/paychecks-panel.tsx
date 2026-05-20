"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { SimpleTable } from "@/components/admin/finance/simple-table";
import { RyvoButton } from "@/components/ryvo/ryvo-button";
import { useAuth } from "@/hooks/use-auth";
import { financeService, type PaycheckRow } from "@/services/finance.service";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function PaychecksPanel() {
  const { t } = useTranslation();
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<string>("");
  const [driverId, setDriverId] = useState("");
  const [amount, setAmount] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["finance", "paychecks", filter],
    queryFn: () => financeService.getPaychecks(accessToken, filter || undefined),
    enabled: Boolean(accessToken),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: PaycheckRow["status"] }) =>
      financeService.updatePaycheckStatus(accessToken, id, status),
    onSuccess: () => {
      toast.success(t("financePaychecks.updated"));
      void queryClient.invalidateQueries({ queryKey: ["finance", "paychecks"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const create = useMutation({
    mutationFn: () =>
      financeService.createPaycheck(accessToken, {
        driver_id: driverId,
        amount: Number(amount),
        period_label: "Manual",
      }),
    onSuccess: () => {
      toast.success(t("financePaychecks.added"));
      setDriverId("");
      setAmount("");
      void queryClient.invalidateQueries({ queryKey: ["finance", "paychecks"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = data?.paychecks ?? [];

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground text-sm">{t("financePaychecks.subtitle")}</p>

      <div className="flex flex-wrap gap-2">
        {["", "pending", "paid", "held", "cancelled"].map((s) => (
          <button
            key={s || "all"}
            type="button"
            onClick={() => setFilter(s)}
            className={cn(
              "rounded-xl px-3 py-1 text-xs font-bold uppercase",
              filter === s ? "bg-primary text-primary-foreground" : "bg-muted",
            )}
          >
            {s || t("financePaychecks.all")}
          </button>
        ))}
      </div>

      <div className="border-border bg-card grid gap-3 rounded-2xl border p-4 sm:grid-cols-4">
        <div className="space-y-1 sm:col-span-2">
          <Label>{t("financePaychecks.driverId")}</Label>
          <Input value={driverId} onChange={(e) => setDriverId(e.target.value)} placeholder="uuid" />
        </div>
        <div className="space-y-1">
          <Label>{t("financePaychecks.amount")}</Label>
          <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div className="flex items-end">
          <RyvoButton
            intent="cta"
            className="w-full"
            disabled={!driverId || !amount || create.isPending}
            onClick={() => create.mutate()}
          >
            {t("financePaychecks.addManual")}
          </RyvoButton>
        </div>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">{t("common.loading")}</p>
      ) : (
        <SimpleTable
          rows={rows}
          empty={t("common.noData")}
          columns={[
            { key: "d", header: t("financePaychecks.col.driver"), cell: (r) => r.driver_id.slice(0, 8) },
            { key: "a", header: t("financePaychecks.col.amount"), cell: (r) => `$${r.amount} ${r.currency}` },
            { key: "p", header: t("financePaychecks.col.period"), cell: (r) => r.period_label ?? "—" },
            {
              key: "s",
              header: t("financePaychecks.col.status"),
              cell: (r) => (
                <span
                  className={cn(
                    "rounded-md px-2 py-0.5 text-[10px] font-bold uppercase",
                    r.status === "paid" && "bg-primary/15 text-primary",
                    r.status === "pending" && "bg-amber-500/15 text-amber-700",
                    r.status === "held" && "bg-muted",
                    r.status === "cancelled" && "bg-destructive/15 text-destructive",
                  )}
                >
                  {r.status}
                </span>
              ),
            },
            {
              key: "act",
              header: "",
              cell: (r) =>
                r.status === "pending" ? (
                  <div className="flex gap-1">
                    <RyvoButton
                      intent="outline"
                      className="h-8 px-2 text-xs"
                      onClick={() => updateStatus.mutate({ id: r.id, status: "paid" })}
                    >
                      {t("financePaychecks.pay")}
                    </RyvoButton>
                    <RyvoButton
                      intent="ghost"
                      className="h-8 px-2 text-xs"
                      onClick={() => updateStatus.mutate({ id: r.id, status: "held" })}
                    >
                      {t("financePaychecks.hold")}
                    </RyvoButton>
                  </div>
                ) : null,
            },
          ]}
        />
      )}
    </div>
  );
}
