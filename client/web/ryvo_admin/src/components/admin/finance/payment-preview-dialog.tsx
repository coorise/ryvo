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
import type { PaymentAdminRow } from "@/services/admin.service";

type PaymentPreviewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: PaymentAdminRow | null;
};

export function PaymentPreviewDialog({ open, onOpenChange, payment }: PaymentPreviewDialogProps) {
  const { t } = useTranslation();
  if (!payment) return null;

  const rows: { label: string; value: string }[] = [
    { label: t("payments.col.client"), value: payment.rider_email },
    { label: t("payments.col.amount"), value: `${payment.amount} ${payment.currency}` },
    { label: t("payments.col.status"), value: payment.status },
    { label: t("payments.col.provider"), value: payment.provider },
    {
      label: t("payments.col.providerRef"),
      value: payment.provider_intent_id ?? "—",
    },
    { label: t("payments.col.trip"), value: payment.trip_id?.slice(0, 8) ?? "—" },
    { label: t("payments.col.request"), value: payment.request_id?.slice(0, 8) ?? "—" },
    { label: t("payments.col.created"), value: formatTimestamp(payment.created_at) },
    {
      label: t("payments.col.settled"),
      value: payment.settled_at ? formatTimestamp(payment.settled_at) : "—",
    },
    { label: "ID", value: payment.id },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("payments.detailTitle")}</DialogTitle>
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
