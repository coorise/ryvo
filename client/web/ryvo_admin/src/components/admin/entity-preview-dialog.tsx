"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";

import { RyvoButton } from "@/components/ryvo/ryvo-button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UI } from "@/configs/const";
import { formatTimestamp } from "@/lib/format-date";

export type EntityPreviewData = {
  id: string;
  full_name: string | null;
  email: string;
  roles?: string[];
  updated_at?: string;
  phone?: string | null;
  statusLabel?: string;
};

type EntityPreviewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entity: EntityPreviewData | null;
  profileHref: string;
  onEdit?: () => void;
};

export function EntityPreviewDialog({
  open,
  onOpenChange,
  entity,
  profileHref,
  onEdit,
}: EntityPreviewDialogProps) {
  const { t } = useTranslation();
  if (!entity) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{entity.full_name ?? entity.email}</DialogTitle>
        </DialogHeader>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Email</dt>
            <dd className="font-medium">{entity.email}</dd>
          </div>
          {entity.phone && (
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{t("drivers.phone")}</dt>
              <dd>{entity.phone}</dd>
            </div>
          )}
          {entity.roles?.length ? (
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{t("staff.roles")}</dt>
              <dd>{entity.roles.join(", ")}</dd>
            </div>
          ) : null}
          {entity.statusLabel && (
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{t("users.status")}</dt>
              <dd>{entity.statusLabel}</dd>
            </div>
          )}
          {entity.updated_at && (
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{t("profile.updatedAt")}</dt>
              <dd>{formatTimestamp(entity.updated_at)}</dd>
            </div>
          )}
        </dl>
        <DialogFooter className="flex-col gap-2 sm:flex-row">
          {onEdit && (
            <RyvoButton intent="outline" onClick={onEdit}>
              {t("users.edit")}
            </RyvoButton>
          )}
          <Link href={profileHref} className="w-full sm:w-auto">
            <RyvoButton intent="cta" className="w-full">
              {t("profile.showFullDetails")}
            </RyvoButton>
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
