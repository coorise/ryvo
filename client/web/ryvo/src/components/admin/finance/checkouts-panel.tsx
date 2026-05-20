"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { SimpleTable } from "@/components/admin/finance/simple-table";
import { useAuth } from "@/hooks/use-auth";
import { financeService } from "@/services/finance.service";
import { formatTimestamp } from "@/lib/format-date";
import { cn } from "@/lib/utils";

export function CheckoutsPanel() {
  const { t } = useTranslation();
  const { accessToken } = useAuth();
  const [filter, setFilter] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["finance", "checkouts", filter],
    queryFn: () => financeService.getCheckouts(accessToken, filter || undefined),
    enabled: Boolean(accessToken),
  });

  const rows = data?.sessions ?? [];

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground text-sm">{t("financeCheckouts.subtitle")}</p>
      <div className="flex flex-wrap gap-2">
        {["", "open", "abandoned", "cancelled", "completed"].map((s) => (
          <button
            key={s || "all"}
            type="button"
            onClick={() => setFilter(s)}
            className={cn(
              "rounded-xl px-3 py-1 text-xs font-bold uppercase",
              filter === s ? "bg-primary text-primary-foreground" : "bg-muted",
            )}
          >
            {s || t("financeCheckouts.all")}
          </button>
        ))}
      </div>
      {isLoading ? (
        <p className="text-muted-foreground text-sm">{t("common.loading")}</p>
      ) : (
        <SimpleTable
          rows={rows}
          empty={t("common.noData")}
          columns={[
            {
              key: "st",
              header: t("financeCheckouts.col.status"),
              cell: (r) => (
                <span
                  className={cn(
                    "rounded-md px-2 py-0.5 text-[10px] font-bold uppercase",
                    r.status === "completed" && "bg-primary/15 text-primary",
                    r.status === "abandoned" && "bg-amber-500/15",
                    r.status === "cancelled" && "bg-destructive/15 text-destructive",
                    r.status === "open" && "bg-muted",
                  )}
                >
                  {r.status}
                </span>
              ),
            },
            { key: "c", header: t("financeCheckouts.col.client"), cell: (r) => r.client_id.slice(0, 8) },
            {
              key: "d",
              header: t("financeCheckouts.col.driver"),
              cell: (r) => (r.driver_id ? r.driver_id.slice(0, 8) : "—"),
            },
            { key: "from", header: t("financeCheckouts.col.pickup"), cell: (r) => r.pickup_address ?? "—" },
            { key: "to", header: t("financeCheckouts.col.dropoff"), cell: (r) => r.dropoff_address ?? "—" },
            {
              key: "f",
              header: t("financeCheckouts.col.fare"),
              cell: (r) => (r.fare_estimate != null ? `$${r.fare_estimate}` : "—"),
            },
            {
              key: "pl",
              header: t("financeCheckouts.col.planned"),
              cell: (r) => (r.planned_at ? formatTimestamp(r.planned_at) : "—"),
            },
            {
              key: "at",
              header: t("financeCheckouts.col.lastEvent"),
              cell: (r) => formatTimestamp(r.last_event_at),
            },
          ]}
        />
      )}
    </div>
  );
}
