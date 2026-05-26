"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Code2, ListTodo, Play, Plus, Trash2 } from "lucide-react";

import {
  AdminFilterSelect,
  AdminListStack,
  AdminSearchToolbar,
  AdminStatCard,
  AdminStatGrid,
  AdminTable,
  AdminTableCard,
  AdminTableHead,
  InlineRowActions,
  SortableTableHeader,
  StatusBadge,
  UpdatedByCell,
} from "@/components/admin/admin-list-ui";
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
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LIST_LAYOUT, PERMISSIONS, SORT_KEYS } from "@/configs/const";
import { useAuth } from "@/hooks/use-auth";
import { useRbac } from "@/hooks/use-rbac";
import { compareSortable, useListControls } from "@/hooks/use-list-controls";
import { usePaginatedSlice } from "@/hooks/use-paginated-slice";
import { formatLastSeen } from "@/lib/format-date";
import { cn } from "@/lib/utils";
import { tasksService, type AdminTask } from "@/services/tasks.service";

export function TasksPanel() {
  const { t } = useTranslation();
  const { accessToken, isReady } = useAuth();
  const { hasPermission } = useRbac();
  const qc = useQueryClient();
  const canEdit =
    hasPermission(PERMISSIONS.tasks.manage) || hasPermission(PERMISSIONS.settings.update);
  const list = useListControls(SORT_KEYS.updatedAt);
  const [statusFilter, setStatusFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminTask | null>(null);

  const [formName, setFormName] = useState("");
  const [scheduleMode, setScheduleMode] = useState<AdminTask["schedule_mode"]>("daily");
  const [runAt, setRunAt] = useState<string>("");
  const [timeOfDay, setTimeOfDay] = useState("02:00");
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [taskKind, setTaskKind] = useState<"preset" | "http">("http");
  const [presetKey, setPresetKey] = useState<"purge_abandoned_checkouts">("purge_abandoned_checkouts");

  const [olderThanDays, setOlderThanDays] = useState(90);
  const [limit, setLimit] = useState(2000);

  const [reqMethod, setReqMethod] = useState<"POST" | "GET" | "PATCH" | "PUT" | "DELETE">("POST");
  const [reqPath, setReqPath] = useState("cron-jobs/v1/run/expire-offers");
  const [reqQuery, setReqQuery] = useState("{}");
  const [reqHeaders, setReqHeaders] = useState("{}");
  const [reqBody, setReqBody] = useState("{}");
  const [pausedOnCreate, setPausedOnCreate] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "settings", "tasks"],
    queryFn: () => tasksService.list(accessToken),
    enabled: isReady && Boolean(accessToken) && hasPermission(PERMISSIONS.settings.read),
  });

  const allTasks = data?.tasks ?? [];

  const stats = useMemo(() => {
    const planned = allTasks.length;
    const active = allTasks.filter((x) => !x.paused_at).length;
    const paused = allTasks.filter((x) => x.paused_at).length;
    return { planned, active, paused };
  }, [allTasks]);

  const create = useMutation({
    mutationFn: async () => {
      const isHttp = taskKind === "http";
      const safeJson = (raw: string, label: string) => {
        try {
          const v = JSON.parse(raw || "{}");
          if (v && typeof v === "object") return v as Record<string, unknown>;
          throw new Error("must be an object");
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          throw new Error(`${label}: ${msg}`);
        }
      };

      const body = isHttp
        ? {
            name: formName.trim(),
            kind: "http" as const,
            task_key: "",
            params: {},
            request_method: reqMethod,
            request_path: reqPath.trim(),
            request_query: safeJson(reqQuery, "Query JSON"),
            request_headers: safeJson(reqHeaders, "Headers JSON"),
            request_body: reqMethod === "GET" ? null : safeJson(reqBody, "Body JSON"),
            schedule_mode: scheduleMode,
            run_at: scheduleMode === "one_time" ? new Date(runAt).toISOString() : null,
            time_of_day:
              scheduleMode === "daily" || scheduleMode === "weekly" || scheduleMode === "monthly" ? timeOfDay : null,
            day_of_week: scheduleMode === "weekly" ? dayOfWeek : null,
            day_of_month: scheduleMode === "monthly" ? dayOfMonth : null,
          }
        : {
            name: formName.trim(),
            kind: "preset" as const,
            task_key: presetKey,
            params: { older_than_days: olderThanDays, limit },
            schedule_mode: scheduleMode,
            run_at: scheduleMode === "one_time" ? new Date(runAt).toISOString() : null,
            time_of_day:
              scheduleMode === "daily" || scheduleMode === "weekly" || scheduleMode === "monthly" ? timeOfDay : null,
            day_of_week: scheduleMode === "weekly" ? dayOfWeek : null,
            day_of_month: scheduleMode === "monthly" ? dayOfMonth : null,
          };
      const res = await tasksService.create(accessToken, body);
      if (pausedOnCreate) await tasksService.pause(accessToken, res.task.id);
      return res.task;
    },
    onSuccess: () => {
      toast.success(t("settingsTasks.created"));
      setCreateOpen(false);
      void qc.invalidateQueries({ queryKey: ["admin", "settings", "tasks"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const runNow = useMutation({
    mutationFn: (id: string) => tasksService.run(accessToken, id),
    onSuccess: () => {
      toast.success(t("settingsTasks.ran"));
      void qc.invalidateQueries({ queryKey: ["admin", "settings", "tasks"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const togglePause = useMutation({
    mutationFn: (task: AdminTask) =>
      task.paused_at ? tasksService.resume(accessToken, task.id) : tasksService.pause(accessToken, task.id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["admin", "settings", "tasks"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => tasksService.removeTask(accessToken, id),
    onSuccess: () => {
      toast.success(t("settingsTasks.deleted"));
      setDeleteTarget(null);
      void qc.invalidateQueries({ queryKey: ["admin", "settings", "tasks"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const tasks = useMemo(() => {
    let rows = [...allTasks];
    if (statusFilter === "active") rows = rows.filter((x) => !x.paused_at);
    if (statusFilter === "paused") rows = rows.filter((x) => x.paused_at);
    if (list.search) {
      const q = list.search.toLowerCase();
      rows = rows.filter(
        (x) => x.name.toLowerCase().includes(q) || x.task_key.toLowerCase().includes(q),
      );
    }
    const sort = list.activeSort;
    if (sort) {
      rows.sort((a, b) => compareSortable(a.updated_at, b.updated_at, sort.dir));
    }
    return rows;
  }, [allTasks, statusFilter, list.search, list.activeSort]);

  const pagination = usePaginatedSlice(tasks, {
    pageSize: list.pageSize,
    loadMode: list.loadMode,
    page: list.page,
    setPage: list.setPage,
    infinitePages: list.infinitePages,
    setInfinitePages: list.setInfinitePages,
    resetDeps: [list.search, list.activeSort, statusFilter],
  });

  function scheduleLabel(task: AdminTask) {
    if (task.schedule_mode === "immediate") return t("settingsTasks.schedule.immediate");
    if (task.schedule_mode === "one_time") return t("settingsTasks.schedule.oneTime");
    if (task.schedule_mode === "daily") return t("settingsTasks.schedule.daily", { time: task.time_of_day ?? "—" });
    if (task.schedule_mode === "weekly") return t("settingsTasks.schedule.weekly", { time: task.time_of_day ?? "—", dow: String(task.day_of_week ?? 1) });
    return t("settingsTasks.schedule.monthly", { time: task.time_of_day ?? "—", dom: String(task.day_of_month ?? 1) });
  }

  function kindLabel(task: AdminTask) {
    return (task.kind ?? "preset") === "http"
      ? t("settingsTasks.kind.http")
      : t("settingsTasks.kind.preset");
  }

  return (
    <AdminListStack>
      <p className="text-muted-foreground text-sm">{t("settingsTasks.subtitle")}</p>
      <AdminStatGrid>
        <AdminStatCard icon={ListTodo} label={t("settingsTasks.stats.planned")} value={stats.planned} />
        <AdminStatCard icon={ListTodo} tone="success" label={t("settingsTasks.stats.active")} value={stats.active} />
        <AdminStatCard icon={ListTodo} tone="warning" label={t("settingsTasks.stats.paused")} value={stats.paused} />
      </AdminStatGrid>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <AdminSearchToolbar
          value={list.search}
          onChange={list.setSearch}
          placeholder={t("settingsTasks.search")}
        />
        {canEdit && (
          <button
            type="button"
            className="bg-primary text-primary-foreground inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold"
            onClick={() => {
              setFormName("");
              setScheduleMode("daily");
              setRunAt("");
              setTimeOfDay("02:00");
              setDayOfWeek(1);
              setDayOfMonth(1);
              setOlderThanDays(90);
              setLimit(2000);
              setPausedOnCreate(false);
              setCreateOpen(true);
            }}
          >
            <Plus className="size-4" /> {t("settingsTasks.create")}
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <AdminFilterSelect
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: "all", label: t("list.allStatuses") },
            { value: "active", label: t("security.deviceStatus.active") },
            { value: "paused", label: t("settingsTasks.paused") },
          ]}
        />
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">{t("common.loading")}</p>
      ) : (
        <AdminTableCard
          isEmpty={!tasks.length}
          empty={<p className="text-muted-foreground px-4 py-12 text-center text-sm">{t("common.noData")}</p>}
        >
          <AdminTable>
            <AdminTableHead>
              <tr>
                <th className="px-5 py-3.5">{t("settingsTasks.col.name")}</th>
                <th className="px-5 py-3.5">{t("settingsTasks.col.type")}</th>
                <th className="px-5 py-3.5">{t("settingsTasks.col.kind")}</th>
                <th className="px-5 py-3.5">{t("settingsTasks.col.schedule")}</th>
                <SortableTableHeader
                  label={t("settingsTasks.col.nextRun")}
                  sortKey={SORT_KEYS.updatedAt}
                  activeSort={list.sort}
                  onSort={list.toggleColumnSort}
                />
                <th className="px-5 py-3.5">{t("settingsTasks.col.lastRun")}</th>
                <th className="px-5 py-3.5">{t("settingsTasks.col.status")}</th>
                <th className="px-5 py-3.5">{t("list.updatedBy")}</th>
                <th className="px-5 py-3.5 text-right">{t("users.actions")}</th>
              </tr>
            </AdminTableHead>
            <tbody>
              {pagination.visibleItems.map((task) => (
                <tr key={task.id} className="border-border hover:bg-muted/30 border-t transition">
                  <td className="px-5 py-3 font-semibold">{task.name}</td>
                  <td className="text-muted-foreground px-5 py-3 text-sm">
                    {(task.kind ?? "preset") === "http"
                      ? task.request_path ?? "—"
                      : t("settingsTasks.type.purgeAbandonedCheckouts")}
                  </td>
                  <td className="text-muted-foreground px-5 py-3 text-sm">{kindLabel(task)}</td>
                  <td className="text-muted-foreground px-5 py-3 text-sm">{scheduleLabel(task)}</td>
                  <td className="text-muted-foreground px-5 py-3 text-sm">
                    {task.next_run_at ? formatLastSeen(task.next_run_at) : "—"}
                  </td>
                  <td className="text-muted-foreground px-5 py-3 text-sm">
                    {task.last_run_at ? formatLastSeen(task.last_run_at) : "—"}
                  </td>
                  <td className="px-5 py-3">
                    {task.paused_at ? (
                      <StatusBadge variant="warning">{t("settingsTasks.paused")}</StatusBadge>
                    ) : (
                      <StatusBadge variant="success">{t("settingsTasks.active")}</StatusBadge>
                    )}
                    {task.last_status === "error" && (
                      <span className="text-destructive ml-2 text-xs font-semibold">
                        {t("settingsTasks.lastError")}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <UpdatedByCell email={task.updated_by_email} />
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                      {canEdit && (
                        <button
                          type="button"
                          className={cn(
                            "hover:bg-muted inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold uppercase",
                            runNow.isPending && "opacity-70",
                          )}
                          onClick={() => runNow.mutate(task.id)}
                        >
                          <Play className="size-3.5" /> {t("settingsTasks.runNow")}
                        </button>
                      )}
                      {canEdit && (
                        <button
                          type="button"
                          className="hover:bg-muted rounded-xl px-3 py-2 text-xs font-bold uppercase"
                          onClick={() => togglePause.mutate(task)}
                        >
                          {task.paused_at ? t("settingsTasks.resume") : t("settingsTasks.pause")}
                        </button>
                      )}
                      {canEdit && (
                        <button
                          type="button"
                          className="hover:bg-destructive/10 text-destructive rounded-xl px-3 py-2 text-xs font-bold uppercase"
                          onClick={() => setDeleteTarget(task)}
                        >
                          <Trash2 className="mr-1 inline size-3.5" />
                          {t("actions.delete")}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </AdminTable>
        </AdminTableCard>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{t("settingsTasks.createTitle")}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1">
              <Label>{t("settingsTasks.form.name")}</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>{t("settingsTasks.form.kind")}</Label>
              <div className="flex flex-wrap gap-2">
                {(["http", "preset"] as const).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setTaskKind(k)}
                    className={cn(
                      "rounded-xl px-3 py-1.5 text-xs font-bold uppercase",
                      taskKind === k ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {k === "http" ? t("settingsTasks.kind.http") : t("settingsTasks.kind.preset")}
                  </button>
                ))}
              </div>
              <p className="text-muted-foreground text-xs">{t("settingsTasks.form.kindHint")}</p>
            </div>

            {taskKind === "http" ? (
              <div className="border-border bg-muted/30 rounded-2xl border p-4">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <Code2 className="size-4" /> {t("settingsTasks.form.httpTitle")}
                </p>
                <p className="text-muted-foreground mt-1 text-xs">{t("settingsTasks.form.httpHint")}</p>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="space-y-1 sm:col-span-1">
                    <Label>{t("settingsTasks.form.method")}</Label>
                    <Input
                      value={reqMethod}
                      onChange={(e) => setReqMethod(e.target.value.toUpperCase() as any)}
                      placeholder="POST"
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label>{t("settingsTasks.form.path")}</Label>
                    <Input
                      value={reqPath}
                      onChange={(e) => setReqPath(e.target.value)}
                      placeholder="cron-jobs/v1/run/expire-offers"
                    />
                  </div>
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label>{t("settingsTasks.form.query")}</Label>
                    <Textarea value={reqQuery} onChange={(e) => setReqQuery(e.target.value)} rows={3} />
                  </div>
                  <div className="space-y-1">
                    <Label>{t("settingsTasks.form.headers")}</Label>
                    <Textarea value={reqHeaders} onChange={(e) => setReqHeaders(e.target.value)} rows={3} />
                  </div>
                </div>

                {reqMethod !== "GET" && (
                  <div className="mt-3 space-y-1">
                    <Label>{t("settingsTasks.form.body")}</Label>
                    <Textarea value={reqBody} onChange={(e) => setReqBody(e.target.value)} rows={4} />
                  </div>
                )}
              </div>
            ) : (
              <div className="border-border bg-muted/30 rounded-2xl border p-4">
                <p className="text-sm font-semibold">{t("settingsTasks.form.operation")}</p>
                <p className="text-muted-foreground mt-1 text-xs">{t("settingsTasks.form.operationHint")}</p>
                <div className="mt-3 space-y-1">
                  <Label>{t("settingsTasks.form.preset")}</Label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="border-border bg-background hover:bg-muted flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm font-semibold"
                      >
                        <span>
                          {presetKey === "purge_abandoned_checkouts"
                            ? t("settingsTasks.presets.purgeAbandonedCheckouts")
                            : presetKey}
                        </span>
                        <span className="text-muted-foreground text-xs">{t("settingsTasks.form.choose")}</span>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuItem onSelect={() => setPresetKey("purge_abandoned_checkouts")}>
                        {t("settingsTasks.presets.purgeAbandonedCheckouts")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label>{t("settingsTasks.form.olderThanDays")}</Label>
                    <Input
                      type="number"
                      min={1}
                      value={olderThanDays}
                      onChange={(e) => setOlderThanDays(Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>{t("settingsTasks.form.limit")}</Label>
                    <Input
                      type="number"
                      min={1}
                      max={5000}
                      value={limit}
                      onChange={(e) => setLimit(Number(e.target.value))}
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>{t("settingsTasks.form.scheduleMode")}</Label>
              <div className="flex flex-wrap gap-2">
                {(["immediate", "one_time", "daily", "weekly", "monthly"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setScheduleMode(m)}
                    className={cn(
                      "rounded-xl px-3 py-1.5 text-xs font-bold uppercase",
                      scheduleMode === m ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {t(`settingsTasks.form.mode.${m}`)}
                  </button>
                ))}
              </div>
            </div>

            {scheduleMode === "one_time" && (
              <div className="space-y-1">
                <Label>{t("settingsTasks.form.runAt")}</Label>
                <Input type="datetime-local" value={runAt} onChange={(e) => setRunAt(e.target.value)} />
              </div>
            )}

            {(scheduleMode === "daily" || scheduleMode === "weekly" || scheduleMode === "monthly") && (
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1 sm:col-span-1">
                  <Label>{t("settingsTasks.form.timeOfDay")}</Label>
                  <Input type="time" value={timeOfDay} onChange={(e) => setTimeOfDay(e.target.value)} />
                </div>
                {scheduleMode === "weekly" && (
                  <div className="space-y-1 sm:col-span-2">
                    <Label>{t("settingsTasks.form.dayOfWeek")}</Label>
                    <Input type="number" min={0} max={6} value={dayOfWeek} onChange={(e) => setDayOfWeek(Number(e.target.value))} />
                    <p className="text-muted-foreground text-xs">{t("settingsTasks.form.dayOfWeekHint")}</p>
                  </div>
                )}
                {scheduleMode === "monthly" && (
                  <div className="space-y-1 sm:col-span-2">
                    <Label>{t("settingsTasks.form.dayOfMonth")}</Label>
                    <Input type="number" min={1} max={28} value={dayOfMonth} onChange={(e) => setDayOfMonth(Number(e.target.value))} />
                    <p className="text-muted-foreground text-xs">{t("settingsTasks.form.dayOfMonthHint")}</p>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">{t("settingsTasks.form.startPaused")}</p>
                <p className="text-muted-foreground text-xs">{t("settingsTasks.form.startPausedHint")}</p>
              </div>
              <Switch checked={pausedOnCreate} onCheckedChange={setPausedOnCreate} />
            </div>
          </div>

          <DialogFooter className="mt-4">
            <button type="button" className="hover:bg-muted rounded-xl px-4 py-2 text-sm font-semibold" onClick={() => setCreateOpen(false)}>
              {t("common.cancel")}
            </button>
            <button
              type="button"
              className="bg-primary text-primary-foreground rounded-xl px-4 py-2 text-sm font-semibold"
              disabled={create.isPending || formName.trim().length < 3 || (scheduleMode === "one_time" && !runAt)}
              onClick={() => create.mutate()}
            >
              {t("common.save")}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("settingsTasks.confirmDelete")}</AlertDialogTitle>
            <AlertDialogDescription>{deleteTarget?.name ?? ""}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={remove.isPending}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
    </AdminListStack>
  );
}
