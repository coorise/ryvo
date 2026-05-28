"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

export type FinanceNotifyActionKind = "hold" | "resume" | "cancel" | "delete";

type FinanceNotifyActionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: FinanceNotifyActionKind;
  title: string;
  description: string;
  dangerous?: boolean;
  requireReason?: boolean;
  confirmLabel?: string;
  pending?: boolean;
  onConfirm: (values: { reason: string; notify: boolean }) => void;
};

export function FinanceNotifyActionDialog({
  open,
  onOpenChange,
  kind,
  title,
  description,
  dangerous,
  requireReason,
  confirmLabel,
  pending,
  onConfirm,
}: FinanceNotifyActionDialogProps) {
  const { t } = useTranslation();
  const [reason, setReason] = useState("");
  const [notify, setNotify] = useState(true);

  useEffect(() => {
    if (open) {
      setReason("");
      setNotify(true);
    }
  }, [open, kind]);

  const showNotify = kind !== "delete" && kind !== "resume";

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {showNotify && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">{t("financeActions.notifyDriver")}</p>
                <p className="text-muted-foreground text-xs">{t("financeActions.notifyHint")}</p>
              </div>
              <Switch checked={notify} onCheckedChange={setNotify} />
            </div>
            <div className="space-y-1">
              <Label>{t("financeActions.reason")}</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t("financeActions.reasonPlaceholder")}
                rows={3}
              />
            </div>
          </div>
        )}
        {kind === "delete" && (
          <p className="text-destructive text-sm font-medium">{t("financeActions.deleteDanger")}</p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            className={dangerous ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : undefined}
            disabled={pending || (requireReason && !reason.trim())}
            onClick={(e) => {
              e.preventDefault();
              onConfirm({ reason: reason.trim(), notify });
            }}
          >
            {confirmLabel ?? t("common.save")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
