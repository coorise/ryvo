"use client";

import { useTranslation } from "react-i18next";

import { RyvoButton } from "@/components/ryvo/ryvo-button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatTimestamp } from "@/lib/format-date";
import { shortUserId } from "@/components/admin/admin-list-ui";
import type { CheckoutSession } from "@/services/finance.service";

type CheckoutPreviewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: CheckoutSession | null;
};

export function CheckoutPreviewDialog({
  open,
  onOpenChange,
  session,
}: CheckoutPreviewDialogProps) {
  const { t } = useTranslation();
  if (!session) return null;

  const rows: { label: string; value: string }[] = [
    { label: t("financeCheckouts.col.status"), value: session.status },
    {
      label: t("financeCheckouts.col.client"),
      value: shortUserId(session.client_id),
    },
    {
      label: t("financeCheckouts.col.driver"),
      value: session.driver_id ? shortUserId(session.driver_id) : "—",
    },
    { label: t("financeCheckouts.col.pickup"), value: session.pickup_address ?? "—" },
    { label: t("financeCheckouts.col.dropoff"), value: session.dropoff_address ?? "—" },
    {
      label: t("financeCheckouts.col.fare"),
      value: session.fare_estimate != null ? `$${session.fare_estimate}` : "—",
    },
    {
      label: t("financeCheckouts.col.planned"),
      value: session.planned_at ? formatTimestamp(session.planned_at) : "—",
    },
    {
      label: t("financeCheckouts.col.lastEvent"),
      value: formatTimestamp(session.last_event_at),
    },
    { label: "ID", value: session.id },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("financeCheckouts.detailTitle")}</DialogTitle>
        </DialogHeader>
        <dl className="space-y-2 text-sm">
          {rows.map((row) => (
            <div key={row.label} className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{row.label}</dt>
              <dd className="max-w-[60%] text-right font-medium break-all">{row.value}</dd>
            </div>
          ))}
        </dl>
        <DialogFooter>
          <RyvoButton intent="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </RyvoButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
