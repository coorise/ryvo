"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { RyvoButton } from "@/components/ryvo/ryvo-button";
import type { CouponRow } from "@/services/finance.service";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(v: string): string | null {
  if (!v.trim()) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

type CouponFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: CouponRow | null;
  onSubmit: (values: {
    code: string;
    bonus_cad: number;
    starts_at: string | null;
    ends_at: string | null;
    active: boolean;
  }) => void;
  pending?: boolean;
};

export function CouponFormDialog({
  open,
  onOpenChange,
  initial,
  onSubmit,
  pending,
}: CouponFormDialogProps) {
  const { t } = useTranslation();
  const [code, setCode] = useState("");
  const [bonus, setBonus] = useState(0);
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [active, setActive] = useState(true);

  useEffect(() => {
    if (!open) return;
    setCode(initial?.code ?? "");
    setBonus(initial?.bonus_cad ?? 0);
    setStartsAt(toLocalInput(initial?.starts_at ?? null));
    setEndsAt(toLocalInput(initial?.ends_at ?? null));
    setActive(initial?.active ?? true);
  }, [open, initial]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {initial ? t("financeReferrals.coupons.editCode") : t("financeReferrals.coupons.addCode")}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="space-y-1">
            <Label>{t("financeReferrals.coupons.col.secretCode")}</Label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s/g, ""))}
              placeholder="WELCOME10"
            />
          </div>
          <div className="space-y-1">
            <Label>{t("financeReferrals.coupons.col.bonus")}</Label>
            <Input
              type="number"
              step="0.01"
              value={bonus}
              onChange={(e) => setBonus(Number(e.target.value))}
            />
          </div>
          <div className="space-y-1">
            <Label>{t("financeReferrals.coupons.col.startAt")}</Label>
            <Input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>{t("financeReferrals.coupons.col.endAt")}</Label>
            <Input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
          </div>
          <div className="flex items-center justify-between">
            <Label>{t("financeReferrals.coupons.active")}</Label>
            <Switch checked={active} onCheckedChange={setActive} />
          </div>
        </div>
        <RyvoButton
          intent="cta"
          className="w-full"
          disabled={pending || !code.trim()}
          onClick={() =>
            onSubmit({
              code: code.trim(),
              bonus_cad: bonus,
              starts_at: fromLocalInput(startsAt),
              ends_at: fromLocalInput(endsAt),
              active,
            })
          }
        >
          {t("common.save")}
        </RyvoButton>
      </DialogContent>
    </Dialog>
  );
}
