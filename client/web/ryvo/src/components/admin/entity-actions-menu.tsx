"use client";

import { MoreHorizontal } from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ENTITY_ACTIONS } from "@/configs/const";

type EntityActionsMenuProps = {
  onView: () => void;
  onEdit?: () => void;
  onUpdate?: () => void;
};

export function EntityActionsMenu({ onView, onEdit, onUpdate }: EntityActionsMenuProps) {
  const { t } = useTranslation();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="hover:bg-muted inline-flex size-8 items-center justify-center rounded-lg"
          aria-label={t("users.actions")}
        >
          <MoreHorizontal className="size-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onView}>{t(`actions.${ENTITY_ACTIONS.view}`)}</DropdownMenuItem>
        {onEdit && (
          <DropdownMenuItem onClick={onEdit}>{t(`actions.${ENTITY_ACTIONS.edit}`)}</DropdownMenuItem>
        )}
        {onUpdate && (
          <DropdownMenuItem onClick={onUpdate}>{t(`actions.${ENTITY_ACTIONS.update}`)}</DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
