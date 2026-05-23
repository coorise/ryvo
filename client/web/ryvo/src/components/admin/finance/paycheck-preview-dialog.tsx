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
import type { PaycheckRow } from "@/services/finance.service";

type PaycheckPreviewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paycheck: PaycheckRow | null;
};

export function PaycheckPreviewDialog({ open, onOpenChange, paycheck }: PaycheckPreviewDialogProps) {
  const { t } = useTranslation();
  if (!paycheck) return null;

  const rows: { label: string; value: string }[] = [
    { label: t("financePaychecks.col.driver"), value: paycheck.driver_email ?? paycheck.driver_id },
    {
      label: t("financePaychecks.col.amount"),
      value: `$${paycheck.amount} ${paycheck.currency}`,
    },
    { label: t("financePaychecks.col.tariffType"), value: paycheck.tariff_name ?? "—" },
    {
      label: t("financePaychecks.col.transferDate"),
      value: paycheck.transfer_due_at ? formatTimestamp(paycheck.transfer_due_at) : "—",
    },
    { label: t("financePaychecks.col.status"), value: paycheck.status },
    {
      label: t("financePaychecks.col.paidAt"),
      value: paycheck.paid_at ? formatTimestamp(paycheck.paid_at) : "—",
    },
    { label: t("financePaychecks.col.note"), value: paycheck.note ?? "—" },
    { label: t("financePaychecks.col.created"), value: formatTimestamp(paycheck.created_at) },
    { label: "ID", value: paycheck.id },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("financePaychecks.detailTitle")}</DialogTitle>
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
