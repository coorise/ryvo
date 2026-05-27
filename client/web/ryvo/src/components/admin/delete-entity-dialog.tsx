"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { RyvoButton } from "@/components/ryvo/ryvo-button";
import { DELETE_CONFIRM_TEXT, DELETE_MODE, type DeleteMode } from "@/configs/const";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export type DeleteDialogTarget = {
  id: string;
  label: string;
  email?: string;
};

type DeleteEntityDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targets: DeleteDialogTarget[];
  /** Users support soft delete; roles are permanent-only */
  allowSoftDelete?: boolean;
  onConfirm: (mode: DeleteMode) => void;
};

export function DeleteEntityDialog({
  open,
  onOpenChange,
  targets,
  allowSoftDelete = true,
  onConfirm,
}: DeleteEntityDialogProps) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<DeleteMode>(DELETE_MODE.soft);
  const [confirmText, setConfirmText] = useState("");

  const isBulk = targets.length > 1;
  const primary = targets[0];

  useEffect(() => {
    if (!open) {
      setMode(allowSoftDelete ? DELETE_MODE.soft : DELETE_MODE.permanent);
      setConfirmText("");
    }
  }, [open, allowSoftDelete]);

  useEffect(() => {
    if (!allowSoftDelete) setMode(DELETE_MODE.permanent);
  }, [allowSoftDelete]);

  const permanentReady =
    mode === DELETE_MODE.permanent && confirmText.trim().toUpperCase() === DELETE_CONFIRM_TEXT;

  const canSubmit = mode === DELETE_MODE.soft || permanentReady;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isBulk ? t("delete.titleBulk", { count: targets.length }) : t("delete.title")}
          </DialogTitle>
          <DialogDescription>
            {isBulk
              ? t("delete.descriptionBulk", { count: targets.length })
              : t("delete.description", { name: primary?.label ?? "" })}
          </DialogDescription>
        </DialogHeader>

        {allowSoftDelete && (
          <div className="space-y-2">
            <Label className="text-sm font-semibold">{t("delete.chooseMode")}</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              <ModeCard
                active={mode === DELETE_MODE.soft}
                title={t("delete.softTitle")}
                description={t("delete.softHint")}
                onClick={() => setMode(DELETE_MODE.soft)}
              />
              <ModeCard
                active={mode === DELETE_MODE.permanent}
                title={t("delete.permanentTitle")}
                description={t("delete.permanentHint")}
                onClick={() => setMode(DELETE_MODE.permanent)}
              />
            </div>
          </div>
        )}

        {mode === DELETE_MODE.permanent && (
          <div
            className={cn(
              "border-destructive/50 bg-destructive/5 space-y-3 rounded-2xl border p-4",
            )}
          >
            <p className="text-destructive text-sm font-bold">{t("delete.dangerZone")}</p>
            <p className="text-muted-foreground text-xs">{t("delete.dangerHint")}</p>
            <div className="space-y-2">
              <Label htmlFor="delete-confirm" className="text-xs">
                {t("delete.typeConfirm", { word: DELETE_CONFIRM_TEXT })}
              </Label>
              <Input
                id="delete-confirm"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={DELETE_CONFIRM_TEXT}
                className="border-destructive/40"
                autoComplete="off"
              />
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <RyvoButton intent="outline" type="button" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </RyvoButton>
          <RyvoButton
            intent="danger"
            type="button"
            disabled={!canSubmit}
            onClick={() => {
              onConfirm(mode);
              onOpenChange(false);
            }}
          >
            {t("delete.confirm")}
          </RyvoButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ModeCard({
  active,
  title,
  description,
  onClick,
}: {
  active: boolean;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-xl border p-3 text-left transition",
        active ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
      )}
    >
      <p className="text-sm font-semibold">{title}</p>
      <p className="text-muted-foreground mt-1 text-xs">{description}</p>
    </button>
  );
}
