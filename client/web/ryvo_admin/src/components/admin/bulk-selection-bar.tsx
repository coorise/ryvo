"use client";

import { Trash2, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { RyvoButton } from "@/components/ryvo/ryvo-button";

type BulkSelectionBarProps = {
  count: number;
  onClear: () => void;
  onDelete: () => void;
  canDelete?: boolean;
};

export function BulkSelectionBar({ count, onClear, onDelete, canDelete = true }: BulkSelectionBarProps) {
  const { t } = useTranslation();

  if (count < 1) return null;

  return (
    <div className="border-primary/30 bg-primary/5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3">
      <p className="text-sm font-semibold">{t("list.selectedCount", { count })}</p>
      <div className="flex flex-wrap gap-2">
        <RyvoButton intent="outline" type="button" onClick={onClear}>
          <X className="size-4" />
          {t("list.clearSelection")}
        </RyvoButton>
        {canDelete && (
          <RyvoButton intent="danger" type="button" onClick={onDelete}>
            <Trash2 className="size-4" />
            {t("delete.bulkAction")}
          </RyvoButton>
        )}
      </div>
    </div>
  );
}
