"use client";

import { Tag, Ticket } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { CouponFormDialog } from "@/components/admin/finance/coupon-form-dialog";
import {
  DateCell,
  EmailCell,
  ReferralAdminList,
} from "@/components/admin/finance/referral-admin-list";
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
import { ADMIN_TABS, PERMISSIONS, SORT_KEYS } from "@/configs/const";
import { useAuth } from "@/hooks/use-auth";
import { useRbac } from "@/hooks/use-rbac";
import { financeService, type CouponRow } from "@/services/finance.service";

type ReferralsCouponsPanelProps = {
  audience: string;
  onAudienceChange: (v: string) => void;
};

export function ReferralsCouponsPanel({ audience, onAudienceChange }: ReferralsCouponsPanelProps) {
  const { t } = useTranslation();
  const { accessToken } = useAuth();
  const { hasPermission } = useRbac();
  const qc = useQueryClient();
  const canEdit = hasPermission(PERMISSIONS.finance.referralsUpdate);

  const isUsed = audience === ADMIN_TABS.referralsCoupons.usedByClients;

  const { data, isLoading } = useQuery({
    queryKey: ["finance", "coupons"],
    queryFn: () => financeService.getCoupons(accessToken),
    enabled: Boolean(accessToken),
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRow, setEditRow] = useState<CouponRow | null>(null);
  const [deleteRow, setDeleteRow] = useState<CouponRow | null>(null);

  const save = useMutation({
    mutationFn: (values: {
      code: string;
      bonus_cad: number;
      starts_at: string | null;
      ends_at: string | null;
      active: boolean;
    }) => {
      if (editRow?.id) return financeService.updateCoupon(accessToken, editRow.id, values);
      return financeService.createCoupon(accessToken, values);
    },
    onSuccess: () => {
      toast.success(t("financeReferrals.saved"));
      setDialogOpen(false);
      setEditRow(null);
      void qc.invalidateQueries({ queryKey: ["finance", "coupons"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => financeService.deleteCoupon(accessToken, id),
    onSuccess: () => {
      toast.success(t("financeReferrals.deleted"));
      setDeleteRow(null);
      void qc.invalidateQueries({ queryKey: ["finance", "coupons"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return <p className="text-muted-foreground text-sm">{t("common.loading")}</p>;
  }

  const coupons = data?.coupons ?? [];
  const redemptions = data?.redemptions ?? [];

  const codeStats = useMemo(
    () => [
      {
        label: t("financeReferrals.coupons.stats.activeCodes"),
        value: coupons.filter((c) => c.active).length,
        icon: Tag,
        tone: "success" as const,
      },
      {
        label: t("financeReferrals.coupons.stats.totalRedemptions"),
        value: redemptions.length,
        icon: Ticket,
        tone: "neutral" as const,
      },
    ],
    [coupons, redemptions.length, t],
  );

  if (isUsed) {
    const stats = [
      {
        label: t("financeReferrals.coupons.stats.redemptions"),
        value: redemptions.length,
        icon: Ticket,
        tone: "info" as const,
      },
    ];
    return (
      <ReferralAdminList
        rows={redemptions}
        rowKey={(r) => r.id}
        stats={stats}
        audience={audience}
        onAudienceChange={onAudienceChange}
        audienceLabel={t("financeReferrals.audience")}
        audienceOptions={[
          { value: ADMIN_TABS.referralsCoupons.codes, label: t("financeReferrals.coupons.codes") },
          { value: ADMIN_TABS.referralsCoupons.usedByClients, label: t("financeReferrals.coupons.usedByClients") },
        ]}
        searchPlaceholder={t("financeReferrals.coupons.searchUsed")}
        searchMatch={(r, q) =>
          r.email.toLowerCase().includes(q) || r.code.toLowerCase().includes(q)
        }
        addLabel=""
        onAdd={() => {}}
        onEdit={() => toast.message(t("financeReferrals.coupons.usedReadOnly"))}
        onDelete={() => {}}
        canEdit={false}
        emptyLabel={t("common.noData")}
        columns={[
          {
            key: "email",
            header: t("financeReferrals.col.receiver"),
            sortKey: SORT_KEYS.email,
            gridPrimary: (r) => ({ title: r.email }),
            cell: (r) => <EmailCell email={r.email} />,
          },
          {
            key: "code",
            header: t("financeReferrals.coupons.col.secretCode"),
            sortKey: "code",
            cell: (r) => <span className="font-mono text-xs font-semibold">{r.code}</span>,
          },
          {
            key: "bonus",
            header: t("financeReferrals.coupons.col.bonus"),
            sortKey: "bonus_cad",
            cell: (r) => `$${Number(r.bonus_cad).toFixed(2)}`,
          },
          {
            key: "created",
            header: t("financeReferrals.coupons.col.createdAt"),
            sortKey: "created_at",
            cell: (r) => <DateCell value={r.created_at} />,
          },
        ]}
      />
    );
  }

  return (
    <>
      <ReferralAdminList
        rows={coupons}
        rowKey={(r) => r.id}
        stats={codeStats}
        audience={audience}
        onAudienceChange={onAudienceChange}
        audienceLabel={t("financeReferrals.audience")}
        audienceOptions={[
          { value: ADMIN_TABS.referralsCoupons.codes, label: t("financeReferrals.coupons.codes") },
          { value: ADMIN_TABS.referralsCoupons.usedByClients, label: t("financeReferrals.coupons.usedByClients") },
        ]}
        searchPlaceholder={t("financeReferrals.coupons.searchCodes")}
        searchMatch={(r, q) => r.code.toLowerCase().includes(q)}
        addLabel={t("financeReferrals.coupons.addCode")}
        onAdd={() => {
          setEditRow(null);
          setDialogOpen(true);
        }}
        onEdit={(r) => {
          setEditRow(r);
          setDialogOpen(true);
        }}
        onDelete={(r) => setDeleteRow(r)}
        canEdit={canEdit}
        emptyLabel={t("common.noData")}
        columns={[
          {
            key: "code",
            header: t("financeReferrals.coupons.col.secretCode"),
            sortKey: "code",
            gridPrimary: (r) => ({ title: r.code, subtitle: `$${r.bonus_cad}` }),
            cell: (r) => <span className="font-mono text-sm font-bold tracking-wide">{r.code}</span>,
          },
          {
            key: "bonus",
            header: t("financeReferrals.coupons.col.bonus"),
            sortKey: "bonus_cad",
            cell: (r) => `$${Number(r.bonus_cad).toFixed(2)}`,
          },
          {
            key: "start",
            header: t("financeReferrals.coupons.col.startAt"),
            sortKey: "starts_at",
            cell: (r) => <DateCell value={r.starts_at ?? r.created_at} />,
          },
          {
            key: "end",
            header: t("financeReferrals.coupons.col.endAt"),
            sortKey: "ends_at",
            cell: (r) => <DateCell value={r.ends_at ?? ""} />,
          },
          {
            key: "updated",
            header: t("financeReferrals.coupons.col.updatedAt"),
            sortKey: SORT_KEYS.updatedAt,
            cell: (r) => <DateCell value={r.updated_at} />,
          },
        ]}
      />
      <CouponFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editRow}
        onSubmit={(v) => save.mutate(v)}
        pending={save.isPending}
      />
      <AlertDialog open={Boolean(deleteRow)} onOpenChange={() => setDeleteRow(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("financeReferrals.coupons.confirmDelete")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("financeReferrals.coupons.confirmDeleteDesc", { code: deleteRow?.code ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => deleteRow && remove.mutate(deleteRow.id)}
            >
              {t("actions.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
