"use client";

import { Gift, Heart, Link2, Users } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import {
  DateCell,
  EmailCell,
  GoalBadge,
  JoinedEmailsCell,
  ReferralAdminList,
} from "@/components/admin/finance/referral-admin-list";
import { ReferralRecordDialog } from "@/components/admin/finance/referral-record-dialog";
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
import {
  financeService,
  type BonusAccountRow,
  type LoyaltyRowEnriched,
  type ReferralCampaignRow,
  type ReferralsBundle,
} from "@/services/finance.service";

type BonusPanelProps = {
  audience: string;
  onAudienceChange: (v: string) => void;
  data: ReferralsBundle | undefined;
};

export function ReferralsBonusPanel({ audience, onAudienceChange, data }: BonusPanelProps) {
  const { t } = useTranslation();
  const { accessToken } = useAuth();
  const { hasPermission } = useRbac();
  const qc = useQueryClient();
  const canEdit = hasPermission(PERMISSIONS.finance.referralsUpdate);

  const isDrivers = audience === ADMIN_TABS.referralsBonus.drivers;
  const rows = isDrivers ? (data?.driverBonuses ?? []) : (data?.clientBonuses ?? []);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRow, setEditRow] = useState<BonusAccountRow | null>(null);
  const [deleteRow, setDeleteRow] = useState<BonusAccountRow | null>(null);

  const save = useMutation({
    mutationFn: (values: Record<string, unknown>) => {
      if (editRow?.id) {
        return financeService.updateBonus(accessToken, editRow.id, {
          channel: values.channel as string,
          balance: Number(values.balance),
        });
      }
      return financeService.createBonus(accessToken, {
        email: String(values.email),
        account_type: isDrivers ? "driver" : "client",
        channel: values.channel as string,
        balance: Number(values.balance),
      });
    },
    onSuccess: () => {
      toast.success(t("financeReferrals.saved"));
      setDialogOpen(false);
      setEditRow(null);
      void qc.invalidateQueries({ queryKey: ["finance", "referrals"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => financeService.deleteBonus(accessToken, id),
    onSuccess: () => {
      toast.success(t("financeReferrals.deleted"));
      setDeleteRow(null);
      void qc.invalidateQueries({ queryKey: ["finance", "referrals"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const stats = useMemo(() => {
    const total = rows.reduce((s, r) => s + Number(r.balance), 0);
    return [
      {
        label: t("financeReferrals.stats.totalBonus"),
        value: `$${total.toFixed(2)}`,
        hint: isDrivers ? t("financeReferrals.bonus.drivers") : t("financeReferrals.bonus.clients"),
        icon: Gift,
        tone: "success" as const,
      },
      {
        label: t("financeReferrals.stats.accounts"),
        value: rows.length,
        icon: Users,
        tone: "neutral" as const,
      },
    ];
  }, [rows, isDrivers, t]);

  return (
    <>
      <ReferralAdminList
        rows={rows}
        rowKey={(r) => r.id}
        stats={stats}
        audience={audience}
        onAudienceChange={onAudienceChange}
        audienceLabel={t("financeReferrals.audience")}
        audienceOptions={[
          { value: ADMIN_TABS.referralsBonus.clients, label: t("financeReferrals.bonus.clients") },
          { value: ADMIN_TABS.referralsBonus.drivers, label: t("financeReferrals.bonus.drivers") },
        ]}
        searchPlaceholder={t("financeReferrals.searchBonus")}
        searchMatch={(r, q) => r.email.toLowerCase().includes(q) || r.channel.includes(q)}
        addLabel={t("financeReferrals.addBonus")}
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
            key: "email",
            header: t("financeReferrals.col.receiver"),
            sortKey: SORT_KEYS.email,
            gridPrimary: (r) => ({ title: r.email }),
            cell: (r) => <EmailCell email={r.email} />,
          },
          {
            key: "channel",
            header: t("financeReferrals.col.channel"),
            sortKey: "channel",
            cell: (r) => r.channel,
          },
          {
            key: "bonus",
            header: t("financeReferrals.col.bonus"),
            sortKey: "balance",
            cell: (r) => <span className="font-semibold">${Number(r.balance).toFixed(2)}</span>,
          },
          {
            key: "updated",
            header: t("financeReferrals.col.updatedAt"),
            sortKey: SORT_KEYS.updatedAt,
            cell: (r) => <DateCell value={r.updated_at} />,
          },
        ]}
      />
      <ReferralRecordDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode="bonus"
        title={editRow ? t("financeReferrals.editBonus") : t("financeReferrals.addBonus")}
        initial={editRow ?? undefined}
        accountType={isDrivers ? "driver" : "client"}
        onSubmit={(v) => save.mutate(v)}
        pending={save.isPending}
      />
      <AlertDialog open={Boolean(deleteRow)} onOpenChange={() => setDeleteRow(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("financeReferrals.confirmDeleteBonus")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("financeReferrals.confirmDeleteBonusDesc", { email: deleteRow?.email ?? "" })}
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

type ProgramsPanelProps = {
  audience: string;
  onAudienceChange: (v: string) => void;
  data: ReferralsBundle | undefined;
};

export function ReferralsProgramsPanel({ audience, onAudienceChange, data }: ProgramsPanelProps) {
  const { t } = useTranslation();
  const { accessToken } = useAuth();
  const { hasPermission } = useRbac();
  const qc = useQueryClient();
  const canEdit = hasPermission(PERMISSIONS.finance.referralsUpdate);

  const isLoyalty = audience === ADMIN_TABS.referralsPrograms.loyalty;
  const isDriverReferrals = audience === ADMIN_TABS.referralsPrograms.driverReferrals;

  const loyaltyRows = data?.loyalty ?? [];
  const campaignRows = isDriverReferrals
    ? (data?.driverCampaigns ?? [])
    : (data?.clientCampaigns ?? []);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editLoyalty, setEditLoyalty] = useState<LoyaltyRowEnriched | null>(null);
  const [editCampaign, setEditCampaign] = useState<ReferralCampaignRow | null>(null);
  const [deleteCampaign, setDeleteCampaign] = useState<ReferralCampaignRow | null>(null);

  const saveLoyalty = useMutation({
    mutationFn: (values: Record<string, unknown>) =>
      financeService.createLoyalty(accessToken, {
        email: String(values.email),
        points: Number(values.points),
      }),
    onSuccess: () => {
      toast.success(t("financeReferrals.saved"));
      setDialogOpen(false);
      setEditLoyalty(null);
      void qc.invalidateQueries({ queryKey: ["finance", "referrals"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveCampaign = useMutation({
    mutationFn: (values: Record<string, unknown>) => {
      if (editCampaign?.id) {
        return financeService.updateCampaign(accessToken, editCampaign.id, {
          channel: values.channel as string,
          condition_required: Number(values.condition_required),
          target_bonus: Number(values.target_bonus),
          goal: values.goal as "pending" | "achieved",
        });
      }
      return financeService.createCampaign(accessToken, {
        referrer_email: String(values.referrer_email),
        referrer_role: isDriverReferrals ? "driver" : "client",
        invitation_type: values.invitation_type as "client" | "driver",
        channel: values.channel as "link" | "coupon" | "manual",
        condition_required: Number(values.condition_required),
        target_bonus: Number(values.target_bonus),
        goal: values.goal as "pending" | "achieved",
        joined_emails: values.joined_emails as string[],
      });
    },
    onSuccess: () => {
      toast.success(t("financeReferrals.saved"));
      setDialogOpen(false);
      setEditCampaign(null);
      void qc.invalidateQueries({ queryKey: ["finance", "referrals"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeCampaign = useMutation({
    mutationFn: (id: string) => financeService.deleteCampaign(accessToken, id),
    onSuccess: () => {
      toast.success(t("financeReferrals.deleted"));
      setDeleteCampaign(null);
      void qc.invalidateQueries({ queryKey: ["finance", "referrals"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoyalty) {
    const stats = [
      {
        label: t("financeReferrals.stats.totalPoints"),
        value: loyaltyRows.reduce((s, r) => s + r.points, 0),
        icon: Heart,
        tone: "info" as const,
      },
      {
        label: t("financeReferrals.stats.loyalClients"),
        value: loyaltyRows.length,
        icon: Users,
        tone: "neutral" as const,
      },
    ];
    return (
      <>
        <ReferralAdminList
          rows={loyaltyRows}
          rowKey={(r) => r.user_id}
          stats={stats}
          audience={audience}
          onAudienceChange={onAudienceChange}
          audienceLabel={t("financeReferrals.audience")}
          audienceOptions={[
            { value: ADMIN_TABS.referralsPrograms.loyalty, label: t("financeReferrals.programs.loyalty") },
            { value: ADMIN_TABS.referralsPrograms.clientReferrals, label: t("financeReferrals.programs.clientReferrals") },
            { value: ADMIN_TABS.referralsPrograms.driverReferrals, label: t("financeReferrals.programs.driverReferrals") },
          ]}
          searchPlaceholder={t("financeReferrals.searchLoyalty")}
          searchMatch={(r, q) => r.email.toLowerCase().includes(q)}
          addLabel={t("financeReferrals.addLoyalty")}
          onAdd={() => {
            setEditLoyalty(null);
            setDialogOpen(true);
          }}
          onEdit={(r) => {
            setEditLoyalty(r);
            setDialogOpen(true);
          }}
          onDelete={() => toast.message(t("financeReferrals.loyaltyNoDelete"))}
          canEdit={canEdit}
          emptyLabel={t("common.noData")}
          columns={[
            {
              key: "email",
              header: t("financeReferrals.col.loyalClient"),
              sortKey: SORT_KEYS.email,
              gridPrimary: (r) => ({ title: r.email }),
              cell: (r) => <EmailCell email={r.email} />,
            },
            {
              key: "points",
              header: t("financeReferrals.col.points"),
              sortKey: "points",
              cell: (r) => r.points.toLocaleString(),
            },
            {
              key: "updated",
              header: t("financeReferrals.col.updatedAt"),
              sortKey: SORT_KEYS.updatedAt,
              cell: (r) => <DateCell value={r.updated_at} />,
            },
          ]}
        />
        <ReferralRecordDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          mode="loyalty"
          title={editLoyalty ? t("financeReferrals.editLoyalty") : t("financeReferrals.addLoyalty")}
          initial={editLoyalty ? { email: editLoyalty.email, points: editLoyalty.points } : undefined}
          onSubmit={(v) => saveLoyalty.mutate(v)}
          pending={saveLoyalty.isPending}
        />
      </>
    );
  }

  const stats = [
    {
      label: t("financeReferrals.stats.campaigns"),
      value: campaignRows.length,
      icon: Link2,
      tone: "neutral" as const,
    },
    {
      label: t("financeReferrals.stats.achieved"),
      value: campaignRows.filter((c) => c.goal === "achieved").length,
      icon: Gift,
      tone: "success" as const,
    },
  ];

  return (
    <>
      <ReferralAdminList
        rows={campaignRows}
        rowKey={(r) => r.id}
        stats={stats}
        audience={audience}
        onAudienceChange={onAudienceChange}
        audienceLabel={t("financeReferrals.audience")}
        audienceOptions={[
          { value: ADMIN_TABS.referralsPrograms.loyalty, label: t("financeReferrals.programs.loyalty") },
          { value: ADMIN_TABS.referralsPrograms.clientReferrals, label: t("financeReferrals.programs.clientReferrals") },
          { value: ADMIN_TABS.referralsPrograms.driverReferrals, label: t("financeReferrals.programs.driverReferrals") },
        ]}
        searchPlaceholder={t("financeReferrals.searchReferral")}
        searchMatch={(r, q) =>
          r.referrer_email.toLowerCase().includes(q) ||
          r.joined_emails.some((e) => e.toLowerCase().includes(q)) ||
          r.channel.includes(q)
        }
        addLabel={t("financeReferrals.addReferral")}
        onAdd={() => {
          setEditCampaign(null);
          setDialogOpen(true);
        }}
        onEdit={(r) => {
          setEditCampaign(r);
          setDialogOpen(true);
        }}
        onDelete={(r) => setDeleteCampaign(r)}
        canEdit={canEdit}
        emptyLabel={t("common.noData")}
        columns={[
          {
            key: "referrer",
            header: t("financeReferrals.col.referrer"),
            sortKey: SORT_KEYS.email,
            gridPrimary: (r) => ({ title: r.referrer_email }),
            cell: (r) => <EmailCell email={r.referrer_email} />,
          },
          {
            key: "type",
            header: t("financeReferrals.col.invitationType"),
            sortKey: "invitation_type",
            cell: (r) => r.invitation_type,
          },
          {
            key: "joined",
            header: t("financeReferrals.col.joinedUsers"),
            cell: (r) => <JoinedEmailsCell emails={r.joined_emails} />,
          },
          {
            key: "channel",
            header: t("financeReferrals.col.channel"),
            sortKey: "channel",
            cell: (r) => r.channel,
          },
          {
            key: "cond",
            header: t("financeReferrals.col.condition"),
            sortKey: "condition_required",
            cell: (r) => `${r.joined_count} / ${r.condition_required}`,
          },
          {
            key: "target",
            header: t("financeReferrals.col.targetBonus"),
            sortKey: "target_bonus",
            cell: (r) => `$${Number(r.target_bonus).toFixed(2)}`,
          },
          {
            key: "goal",
            header: t("financeReferrals.col.goal"),
            sortKey: "goal",
            cell: (r) => <GoalBadge goal={r.goal} />,
          },
          {
            key: "updated",
            header: t("financeReferrals.col.updatedAt"),
            sortKey: SORT_KEYS.updatedAt,
            cell: (r) => <DateCell value={r.updated_at} />,
          },
        ]}
      />
      <ReferralRecordDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode="campaign"
        title={editCampaign ? t("financeReferrals.editReferral") : t("financeReferrals.addReferral")}
        initial={editCampaign ?? undefined}
        referrerRole={isDriverReferrals ? "driver" : "client"}
        onSubmit={(v) => saveCampaign.mutate(v)}
        pending={saveCampaign.isPending}
      />
      <AlertDialog open={Boolean(deleteCampaign)} onOpenChange={() => setDeleteCampaign(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("financeReferrals.confirmDeleteReferral")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("financeReferrals.confirmDeleteReferralDesc", {
                email: deleteCampaign?.referrer_email ?? "",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => deleteCampaign && removeCampaign.mutate(deleteCampaign.id)}
            >
              {t("actions.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
