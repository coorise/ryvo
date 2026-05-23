"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
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
import { AdminFilterSelect, AdminSearchToolbar } from "@/components/admin/admin-list-ui";
import { RyvoButton } from "@/components/ryvo/ryvo-button";
import { PERMISSIONS } from "@/configs/const";
import { useAuth } from "@/hooks/use-auth";
import { useRbac } from "@/hooks/use-rbac";
import { compareSortable, useListControls } from "@/hooks/use-list-controls";
import {
  emptyTariffInput,
  isBasicTariff,
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
  const [activeFilter, setActiveFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const list = useListControls("name");

  function payoutLine(pkg: TariffPackage) {
    const label = pkg.payout_custom_label?.trim() || pkg.payout_label;
    if (pkg.payout_label === "days") return `${label} · ${pkg.payout_delay_days}d`;
    if (pkg.payout_delay_minutes > 0) return `${label} · ${pkg.payout_delay_minutes} min`;
    return label;
  }

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

  const filteredPackages = useMemo(() => {
    let rows = [...packages];
    if (activeFilter === "active") rows = rows.filter((p) => p.active);
    if (activeFilter === "inactive") rows = rows.filter((p) => !p.active);
    if (typeFilter === "builtin") rows = rows.filter((p) => p.is_system);
    if (typeFilter === "custom") rows = rows.filter((p) => !p.is_system);
    if (typeFilter !== "all" && typeFilter !== "builtin" && typeFilter !== "custom") {
      rows = rows.filter((p) => p.package_type === typeFilter || p.code === typeFilter);
    }
    if (list.search) {
      const q = list.search.toLowerCase();
      rows = rows.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.code.toLowerCase().includes(q) ||
          (p.description ?? "").toLowerCase().includes(q),
      );
    }
    const s = list.activeSort;
    if (s?.key === "name") rows.sort((a, b) => compareSortable(a.name, b.name, s.dir));
    return rows;
  }, [packages, activeFilter, typeFilter, list.search, list.activeSort]);

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

      <AdminSearchToolbar
        value={list.search}
        onChange={list.setSearch}
        placeholder={t("financeTariffs.search")}
        filters={
          <>
            <AdminFilterSelect
              value={activeFilter}
              onChange={setActiveFilter}
              options={[
                { value: "all", label: t("financeTariffs.filter.all") },
                { value: "active", label: t("financeTariffs.filter.active") },
                { value: "inactive", label: t("financeTariffs.filter.inactive") },
              ]}
            />
            <AdminFilterSelect
              value={typeFilter}
              onChange={setTypeFilter}
              options={[
                { value: "all", label: t("financeTariffs.filter.allTypes") },
                { value: "builtin", label: t("financeTariffs.filter.builtin") },
                { value: "custom", label: t("financeTariffs.filter.custom") },
                { value: "basic", label: t("financeTariffs.types.basic") },
                { value: "essential", label: t("financeTariffs.types.essential") },
                { value: "pro", label: t("financeTariffs.types.pro") },
                { value: "pro_plus", label: t("financeTariffs.types.pro_plus") },
              ]}
            />
          </>
        }
      />

      {!filteredPackages.length && (
        <p className="text-muted-foreground text-sm">{t("common.noData")}</p>
      )}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filteredPackages.map((pkg) => {
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
                    {pkg.commission_percent}% · {payoutLine(pkg)}
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
              {pkg.code !== "basic" && pkg.subscription_monthly != null && pkg.subscription_monthly > 0 && (
                <TariffCardLabel display={input.card_display} kind="subscription" className="mt-2">
                  ${pkg.subscription_monthly}/mo
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
                  {!isBasicTariff(pkg) && (
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
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <SimpleTable
        rows={filteredPackages}
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
            cell: (p) => payoutLine(p),
          },
          {
            key: "w",
            header: t("financeTariffs.col.minWithdraw"),
            cell: (p) => `$${p.min_withdraw_amount}`,
          },
          {
            key: "s",
            header: t("financeTariffs.col.sub"),
            cell: (p) =>
              p.code === "basic" || p.subscription_monthly == null ? "—" : `$${p.subscription_monthly}`,
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
            <AlertDialogTitle>
              {deleteTarget && isBasicTariff(deleteTarget)
                ? t("financeTariffs.cannotDeleteBasicTitle")
                : deleteTarget?.is_system
                  ? t("financeTariffs.cannotDeleteSystemTitle")
                  : t("financeTariffs.confirmDelete")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && isBasicTariff(deleteTarget)
                ? t("financeTariffs.cannotDeleteBasicDesc", { name: deleteTarget.name })
                : deleteTarget?.is_system
                  ? t("financeTariffs.cannotDeleteSystemDesc", { name: deleteTarget.name })
                  : t("financeTariffs.confirmDeleteDesc", { name: deleteTarget?.name ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {deleteTarget && (isBasicTariff(deleteTarget) || deleteTarget.is_system) ? (
              <AlertDialogAction onClick={() => setDeleteTarget(null)}>
                {t("financeTariffs.cannotDeleteSystemOk")}
              </AlertDialogAction>
            ) : (
              <>
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
              </>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
