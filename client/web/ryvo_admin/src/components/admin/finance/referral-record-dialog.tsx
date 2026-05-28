"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { RyvoButton } from "@/components/ryvo/ryvo-button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type ReferralDialogMode =
  | "bonus"
  | "loyalty"
  | "campaign";

type ReferralRecordDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: ReferralDialogMode;
  title: string;
  initial?: Record<string, unknown>;
  accountType?: "client" | "driver";
  referrerRole?: "client" | "driver";
  onSubmit: (values: Record<string, unknown>) => void;
  pending?: boolean;
};

export function ReferralRecordDialog({
  open,
  onOpenChange,
  mode,
  title,
  initial,
  accountType = "client",
  referrerRole = "client",
  onSubmit,
  pending,
}: ReferralRecordDialogProps) {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [referrerEmail, setReferrerEmail] = useState("");
  const [channel, setChannel] = useState("manual");
  const [balance, setBalance] = useState(0);
  const [points, setPoints] = useState(0);
  const [invitationType, setInvitationType] = useState<"client" | "driver">("client");
  const [condition, setCondition] = useState(5);
  const [targetBonus, setTargetBonus] = useState(10);
  const [goal, setGoal] = useState<"pending" | "achieved">("pending");
  const [joinedEmails, setJoinedEmails] = useState("");

  useEffect(() => {
    if (!open) return;
    setEmail(String(initial?.email ?? ""));
    setReferrerEmail(String(initial?.referrer_email ?? initial?.email ?? ""));
    setChannel(String(initial?.channel ?? "manual"));
    setBalance(Number(initial?.balance ?? 0));
    setPoints(Number(initial?.points ?? 0));
    setInvitationType((initial?.invitation_type as "client" | "driver") ?? "client");
    setCondition(Number(initial?.condition_required ?? 5));
    setTargetBonus(Number(initial?.target_bonus ?? 10));
    setGoal((initial?.goal as "pending" | "achieved") ?? "pending");
    setJoinedEmails((initial?.joined_emails as string[])?.join(", ") ?? "");
  }, [open, initial]);

  function handleSave() {
    if (mode === "bonus") {
      onSubmit({ email, account_type: accountType, channel, balance });
    } else if (mode === "loyalty") {
      onSubmit({ email, points });
    } else {
      onSubmit({
        referrer_email: referrerEmail,
        referrer_role: referrerRole,
        invitation_type: invitationType,
        channel,
        condition_required: condition,
        target_bonus: targetBonus,
        goal,
        joined_emails: joinedEmails
          .split(/[,;\s]+/)
          .map((s) => s.trim())
          .filter(Boolean),
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          {mode === "campaign" ? (
            <>
              <div className="space-y-1">
                <Label>{t("financeReferrals.col.referrer")}</Label>
                <Input value={referrerEmail} onChange={(e) => setReferrerEmail(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>{t("financeReferrals.col.invitationType")}</Label>
                <select
                  className="border-border bg-background w-full rounded-xl border px-3 py-2 text-sm"
                  value={invitationType}
                  onChange={(e) => setInvitationType(e.target.value as "client" | "driver")}
                >
                  <option value="client">{t("financeReferrals.inviteClient")}</option>
                  <option value="driver">{t("financeReferrals.inviteDriver")}</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label>{t("financeReferrals.col.joinedUsers")}</Label>
                <Input
                  placeholder="email1@x.com, email2@x.com"
                  value={joinedEmails}
                  onChange={(e) => setJoinedEmails(e.target.value)}
                />
              </div>
            </>
          ) : (
            <div className="space-y-1">
              <Label>
                {mode === "loyalty"
                  ? t("financeReferrals.col.loyalClient")
                  : t("financeReferrals.col.receiver")}
              </Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} disabled={Boolean(initial?.id)} />
            </div>
          )}
          {mode !== "loyalty" && (
            <div className="space-y-1">
              <Label>{t("financeReferrals.col.channel")}</Label>
              <select
                className="border-border bg-background w-full rounded-xl border px-3 py-2 text-sm"
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
              >
                <option value="link">link</option>
                <option value="coupon">coupon</option>
                <option value="manual">manual</option>
                {mode === "bonus" && <option value="loyalty">loyalty</option>}
              </select>
            </div>
          )}
          {mode === "bonus" && (
            <div className="space-y-1">
              <Label>{t("financeReferrals.col.bonus")}</Label>
              <Input type="number" step="0.01" value={balance} onChange={(e) => setBalance(Number(e.target.value))} />
            </div>
          )}
          {mode === "loyalty" && (
            <div className="space-y-1">
              <Label>{t("financeReferrals.col.points")}</Label>
              <Input type="number" value={points} onChange={(e) => setPoints(Number(e.target.value))} />
            </div>
          )}
          {mode === "campaign" && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label>{t("financeReferrals.col.condition")}</Label>
                  <Input type="number" value={condition} onChange={(e) => setCondition(Number(e.target.value))} />
                </div>
                <div className="space-y-1">
                  <Label>{t("financeReferrals.col.targetBonus")}</Label>
                  <Input type="number" step="0.01" value={targetBonus} onChange={(e) => setTargetBonus(Number(e.target.value))} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>{t("financeReferrals.col.goal")}</Label>
                <select
                  className="border-border bg-background w-full rounded-xl border px-3 py-2 text-sm"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value as "pending" | "achieved")}
                >
                  <option value="pending">{t("financeReferrals.goalPending")}</option>
                  <option value="achieved">{t("financeReferrals.goalAchieved")}</option>
                </select>
              </div>
            </>
          )}
        </div>
        <RyvoButton intent="cta" className="w-full" disabled={pending} onClick={handleSave}>
          {t("common.save")}
        </RyvoButton>
      </DialogContent>
    </Dialog>
  );
}
