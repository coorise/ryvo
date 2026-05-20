"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { TariffCardBadge } from "@/components/admin/finance/tariff-card-badge";
import { TariffCardLabel, TariffCardTitle } from "@/components/admin/finance/tariff-card-labels";
import {
  TARIFF_CARD_DELETE_BUTTON_CLASS,
  TARIFF_CARD_EDIT_BUTTON_CLASS,
  TARIFF_CARD_SWITCH_CLASS,
} from "@/lib/tariff-card-styles";
import { TariffFeatureChips, TariffPackageForm } from "@/components/admin/finance/tariff-package-form";
import { SimpleTable } from "@/components/admin/finance/simple-table";
import { RyvoButton } from "@/components/ryvo/ryvo-button";
import { PERMISSIONS } from "@/configs/const";
import { useAuth } from "@/hooks/use-auth";
import { useRbac } from "@/hooks/use-rbac";
import {
  emptyTariffInput,
  packageToInput,
  type TariffPackage,
  type TariffPackageInput,
} from "@/lib/tariff-types";
import { financeService } from "@/services/finance.service";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { cn } from "@/lib/utils";

export function TariffsPanel() {
  const { t } = useTranslation();
  const { accessToken } = useAuth();
  const { hasPermission } = useRbac();
  const queryClient = useQueryClient();
  const canEdit = hasPermission(PERMISSIONS.finance.tariffsUpdate);

  const [editorOpen, setEditorOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TariffPackage | null>(null);
  const [form, setForm] = useState<TariffPackageInput>(emptyTariffInput());
  const [isNew, setIsNew] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["finance", "tariffs"],
    queryFn: () => financeService.getTariffs(accessToken),
    enabled: Boolean(accessToken),
  });

  const save = useMutation({
    mutationFn: () => {
      if (isNew) return financeService.createTariff(accessToken, form);
      if (!form.id) throw new Error("Missing id");
      return financeService.updateTariff(accessToken, form.id, form);
    },
    onSuccess: () => {
      toast.success(t("financeTariffs.saved"));
      setEditorOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["finance", "tariffs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => financeService.deleteTariff(accessToken, id),
    onSuccess: () => {
      toast.success(t("financeTariffs.deleted"));
      setDeleteTarget(null);
      void queryClient.invalidateQueries({ queryKey: ["finance", "tariffs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: (pkg: TariffPackage) => {
      const input = packageToInput(pkg);
      input.active = !pkg.active;
      return financeService.updateTariff(accessToken, pkg.id, input);
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["finance", "tariffs"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const packages = data?.packages ?? [];

  function openCreate() {
    setForm(emptyTariffInput());
    setIsNew(true);
    setEditorOpen(true);
  }

  function openEdit(pkg: TariffPackage) {
    setForm(packageToInput(pkg));
    setIsNew(false);
    setEditorOpen(true);
  }

  if (isLoading) return <p className="text-muted-foreground text-sm">{t("common.loading")}</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground max-w-2xl text-sm">{t("financeTariffs.subtitleEditable")}</p>
        {canEdit && (
          <RyvoButton intent="cta" onClick={openCreate}>
            <Plus className="size-4" /> {t("financeTariffs.createPackage")}
          </RyvoButton>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {packages.map((pkg) => {
          const input = packageToInput(pkg);
          const onColoredCard = Boolean(input.card_display.background_color);
          return (
            <div
              key={pkg.id}
              className={cn(
                "border-border relative overflow-hidden rounded-2xl border p-5",
                !input.card_display.background_color && "bg-card",
                pkg.is_optional_subscription && pkg.active && "ring-primary/30 ring-2",
                !pkg.active && "opacity-60",
              )}
              style={
                input.card_display.background_color
                  ? { backgroundColor: input.card_display.background_color }
                  : undefined
              }
            >
              <TariffCardBadge display={input.card_display} accessToken={accessToken} />
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1 space-y-0.5">
                  <TariffCardTitle display={input.card_display}>{pkg.name}</TariffCardTitle>
                  <TariffCardLabel display={input.card_display} kind="commission">
                    {pkg.commission_percent}% · {pkg.payout_cadence.replace(/_/g, " ")}
                    {pkg.payout_delay_minutes > 0 && ` · ${pkg.payout_delay_minutes} min`}
                  </TariffCardLabel>
                </div>
                {canEdit && (
                  <Switch
                    className={cn(
                      input.card_display.background_color && TARIFF_CARD_SWITCH_CLASS,
                    )}
                    checked={pkg.active}
                    onCheckedChange={() => toggleActive.mutate(pkg)}
                    aria-label={t("financeTariffs.form.active")}
                  />
                )}
              </div>
              {pkg.description && (
                <p className="text-muted-foreground mt-2 line-clamp-2 text-xs">{pkg.description}</p>
              )}
              <TariffFeatureChips form={input} display={input.card_display} />
              {pkg.is_optional_subscription && pkg.subscription_monthly != null && (
                <TariffCardLabel display={input.card_display} kind="subscription" className="mt-2">
                  ${pkg.subscription_monthly}/mo · +{pkg.search_boost} {t("financeTariffs.searchList")}
                </TariffCardLabel>
              )}
              {canEdit && (
                <div className="mt-4 flex gap-2">
                  <RyvoButton
                    intent="outline"
                    className={cn(
                      "h-8 flex-1 text-xs",
                      onColoredCard && TARIFF_CARD_EDIT_BUTTON_CLASS,
                    )}
                    onClick={() => openEdit(pkg)}
                  >
                    <Pencil className="size-3.5" /> {t("actions.edit")}
                  </RyvoButton>
                  {!pkg.is_system ? (
                    <RyvoButton
                      intent="outline"
                      className={cn(
                        "h-8 flex-1 text-xs",
                        onColoredCard
                          ? TARIFF_CARD_DELETE_BUTTON_CLASS
                          : "text-destructive border-destructive/40 hover:bg-destructive/10",
                      )}
                      onClick={() => setDeleteTarget(pkg)}
                    >
                      <Trash2 className="size-3.5" /> {t("actions.delete")}
                    </RyvoButton>
                  ) : null}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <SimpleTable
        rows={packages}
        empty={t("common.noData")}
        columns={[
          { key: "n", header: t("financeTariffs.col.name"), cell: (p) => p.name },
          {
            key: "c",
            header: "%",
            cell: (p) => `${p.commission_percent}%`,
          },
          {
            key: "p",
            header: t("financeTariffs.col.payout"),
            cell: (p) => `${p.payout_cadence} (${p.payout_delay_minutes}m)`,
          },
          {
            key: "q",
            header: t("financeTariffs.col.quota"),
            cell: (p) => (p.quota_trips != null ? String(p.quota_trips) : "—"),
          },
          {
            key: "s",
            header: t("financeTariffs.col.sub"),
            cell: (p) => (p.subscription_monthly != null ? `$${p.subscription_monthly}` : "—"),
          },
        ]}
      />

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {isNew ? t("financeTariffs.createPackage") : t("financeTariffs.editPackage")}
            </DialogTitle>
          </DialogHeader>
          <TariffPackageForm form={form} setForm={setForm} isNew={isNew} readOnly={!canEdit} />
          {canEdit && (
            <RyvoButton
              intent="cta"
              className="w-full"
              disabled={save.isPending || !form.name || !form.code}
              onClick={() => save.mutate()}
            >
              {t("common.save")}
            </RyvoButton>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("financeTariffs.confirmDelete")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("financeTariffs.confirmDeleteDesc", { name: deleteTarget?.name ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={remove.isPending}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              disabled={remove.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (deleteTarget) remove.mutate(deleteTarget.id);
              }}
            >
              {t("actions.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
