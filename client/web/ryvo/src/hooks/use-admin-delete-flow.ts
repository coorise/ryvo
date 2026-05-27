"use client";

import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import type { DeleteDialogTarget } from "@/components/admin/delete-entity-dialog";
import { DELETE_GRACE_MS, DELETE_MODE, type DeleteMode } from "@/configs/const";

type PendingJob = {
  targets: DeleteDialogTarget[];
  mode: DeleteMode;
  timer: ReturnType<typeof setTimeout>;
  toastId: string | number;
};

type UseAdminDeleteFlowOptions = {
  allowSoftDelete?: boolean;
  executeDelete: (targets: DeleteDialogTarget[], mode: DeleteMode) => Promise<void>;
  onComplete?: () => void;
};

export function useAdminDeleteFlow({
  allowSoftDelete = true,
  executeDelete,
  onComplete,
}: UseAdminDeleteFlowOptions) {
  const { t } = useTranslation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingTargets, setPendingTargets] = useState<DeleteDialogTarget[]>([]);
  const jobRef = useRef<PendingJob | null>(null);

  const openDeleteDialog = useCallback((targets: DeleteDialogTarget[]) => {
    if (!targets.length) return;
    setPendingTargets(targets);
    setDialogOpen(true);
  }, []);

  const cancelPending = useCallback(() => {
    const job = jobRef.current;
    if (!job) return;
    clearTimeout(job.timer);
    toast.dismiss(job.toastId);
    jobRef.current = null;
    toast.message(t("delete.cancelled"));
  }, [t]);

  const scheduleDelete = useCallback(
    (targets: DeleteDialogTarget[], mode: DeleteMode) => {
      if (jobRef.current) cancelPending();

      const seconds = Math.round(DELETE_GRACE_MS / 1000);
      const toastId = toast(t("delete.scheduled", { count: targets.length, seconds }), {
        duration: DELETE_GRACE_MS + 500,
        action: {
          label: t("delete.undo"),
          onClick: () => cancelPending(),
        },
      });

      const timer = setTimeout(async () => {
        jobRef.current = null;
        try {
          await executeDelete(targets, mode);
          toast.success(
            mode === DELETE_MODE.permanent ? t("delete.permanentDone") : t("delete.softDone"),
          );
          onComplete?.();
        } catch (e) {
          toast.error(e instanceof Error ? e.message : t("delete.failed"));
        }
      }, DELETE_GRACE_MS);

      jobRef.current = { targets, mode, timer, toastId };
    },
    [cancelPending, executeDelete, onComplete, t],
  );

  const confirmFromDialog = useCallback(
    (mode: DeleteMode) => {
      scheduleDelete(pendingTargets, mode);
      setPendingTargets([]);
    },
    [pendingTargets, scheduleDelete],
  );

  return {
    dialogOpen,
    setDialogOpen,
    pendingTargets,
    allowSoftDelete,
    openDeleteDialog,
    confirmFromDialog,
    cancelPending,
  };
}
