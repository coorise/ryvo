"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  ArrowUpRight,
  Bot,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  Clock,
  Headphones,
  MessageSquare,
  Send,
  Shield,
  Volume2,
  VolumeX,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ComponentType } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { RyvoButton } from "@/components/ryvo/ryvo-button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ADMIN_TABS } from "@/configs/const";
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-media-query";
import { useRbac } from "@/hooks/use-rbac";
import { adminProfilePath } from "@/lib/admin-paths";
import { cn } from "@/lib/utils";
import {
  supportService,
  type SupportTicket,
  type TicketMessage,
} from "@/services/support.service";

type Audience = "clients" | "drivers";

function ticketAudience(ticket: SupportTicket): Audience {
  const cat = ticket.category.toLowerCase();
  if (cat.includes("driver") || cat.includes("kyc") || cat.includes("chauffeur")) {
    return "drivers";
  }
  if (cat.includes("client") || cat.includes("rider") || cat.includes("passenger")) {
    return "clients";
  }
  return "clients";
}

function normStatus(s: string): string {
  return s.toLowerCase().replace(/\s+/g, "_");
}

function ticketLabel(userId: string): string {
  const tail = userId.replace(/-/g, "").slice(-6);
  return `User · ${tail}`;
}

function hueFromId(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h + id.charCodeAt(i) * (i + 1)) % 360;
  return `hsl(${h} 42% 42%)`;
}

function initialsFromId(id: string): string {
  const hex = id.replace(/-/g, "");
  return (hex.slice(0, 1) + hex.slice(4, 5)).toUpperCase();
}

function relativeCreated(iso: string, locale: string): string {
  const then = new Date(iso).getTime();
  const diffSec = Math.round((then - Date.now()) / 1000);
  const abs = Math.abs(diffSec);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  if (abs < 60) return rtf.format(Math.round(diffSec / 1), "second");
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(diffSec / 86400), "day");
  return rtf.format(Math.round(diffSec / (86400 * 30)), "month");
}

const PRIORITY_BADGE: Record<string, string> = {
  critical: "bg-destructive text-destructive-foreground",
  high: "bg-destructive/15 text-destructive",
  medium: "bg-yellow-500/15 text-yellow-800 dark:text-yellow-400",
  low: "bg-muted text-muted-foreground",
};

const STATUS_BADGE: Record<string, string> = {
  open: "bg-secondary/15 text-secondary",
  in_progress: "bg-primary/15 text-primary",
  resolved: "bg-muted text-muted-foreground",
};

const LEVEL_META = {
  1: {
    label: "L1",
    shortKey: "communication.chatSupport.levelShort.ai",
    icon: Bot,
    bg: "bg-primary/15",
    fg: "text-primary",
    border: "border-primary/30",
  },
  2: {
    label: "L2",
    shortKey: "communication.chatSupport.levelShort.human",
    icon: Headphones,
    bg: "bg-secondary/15",
    fg: "text-secondary",
    border: "border-secondary/30",
  },
  3: {
    label: "L3",
    shortKey: "communication.chatSupport.levelShort.admin",
    icon: Shield,
    bg: "bg-destructive/15",
    fg: "text-destructive",
    border: "border-destructive/30",
  },
} as const;

type ChatSupportPanelProps = {
  tab: string;
  onTabChange: (v: string) => void;
  /** True when mobile is showing a ticket thread (hide page chrome). */
  onMobileThreadChange?: (inThread: boolean) => void;
  /** Open a ticket after staff creates one from the dialog. */
  focusTicketId?: string | null;
};

export function ChatSupportPanel({
  tab,
  onTabChange,
  onMobileThreadChange,
  focusTicketId,
}: ChatSupportPanelProps) {
  const { t, i18n } = useTranslation();
  const { accessToken, user } = useAuth();
  const { hasPermission } = useRbac();
  const isMobile = useIsMobile();
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "in_progress" | "resolved">(
    "all",
  );
  const [levelFilter, setLevelFilter] = useState<"all" | "1" | "2" | "3">("all");
  const [soundOn, setSoundOn] = useState(true);
  const [overviewOpen, setOverviewOpen] = useState(false);

  useEffect(() => {
    setSelectedId(null);
    setSearch("");
  }, [tab]);

  useEffect(() => {
    if (focusTicketId) setSelectedId(focusTicketId);
  }, [focusTicketId]);

  const audience: Audience =
    tab === ADMIN_TABS.chatSupport.drivers ? "drivers" : "clients";

  const ticketsQ = useQuery({
    queryKey: ["admin", "tickets"],
    queryFn: () => supportService.listTickets(accessToken),
    enabled: Boolean(accessToken) && hasPermission("support:reply"),
  });

  const filteredByTab = useMemo(() => {
    const all = ticketsQ.data?.tickets ?? [];
    return all.filter((tk) => ticketAudience(tk) === audience);
  }, [ticketsQ.data?.tickets, audience]);

  const enriched = useMemo(() => {
    return filteredByTab.map((tk) => ({
      ...tk,
      _status: normStatus(tk.status),
      _level: Math.min(3, Math.max(1, Number(tk.support_level) || 1)) as 1 | 2 | 3,
      _priority: (tk.priority ?? "medium").toLowerCase(),
    }));
  }, [filteredByTab]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return enriched.filter((tk) => {
      const okStatus = statusFilter === "all" || tk._status === statusFilter;
      const okLevel = levelFilter === "all" || String(tk._level) === levelFilter;
      const okQuery =
        !q ||
        tk.subject.toLowerCase().includes(q) ||
        tk.category.toLowerCase().includes(q) ||
        tk.user_id.toLowerCase().includes(q) ||
        tk.id.toLowerCase().includes(q) ||
        ticketLabel(tk.user_id).toLowerCase().includes(q);
      return okStatus && okLevel && okQuery;
    });
  }, [enriched, statusFilter, levelFilter, search]);

  const sorted = useMemo(() => {
    const pri = { critical: 0, high: 1, medium: 2, low: 3 } as Record<string, number>;
    return [...filtered].sort((a, b) => {
      const pa = pri[a._priority] ?? 9;
      const pb = pri[b._priority] ?? 9;
      if (pa !== pb) return pa - pb;
      if (b._level !== a._level) return b._level - a._level;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [filtered]);

  const effectiveId = useMemo(() => {
    if (selectedId) return selectedId;
    if (isMobile) return null;
    return sorted[0]?.id ?? null;
  }, [selectedId, isMobile, sorted]);

  const selected = sorted.find((x) => x.id === effectiveId) ?? null;
  const mobileInThread = isMobile && Boolean(effectiveId);

  useEffect(() => {
    onMobileThreadChange?.(mobileInThread);
  }, [mobileInThread, onMobileThreadChange]);

  const backToList = () => setSelectedId(null);

  const messagesQ = useQuery({
    queryKey: ["admin", "tickets", selected?.id, "messages"],
    queryFn: () => supportService.listMessages(accessToken, selected!.id),
    enabled: Boolean(accessToken && selected?.id),
  });

  useEffect(() => {
    setReply("");
  }, [selected?.id]);

  const invalidateTickets = useCallback(() => {
    void qc.invalidateQueries({ queryKey: ["admin", "tickets"] });
  }, [qc]);

  const patchTicket = useMutation({
    mutationFn: (args: { id: string; patch: Parameters<typeof supportService.patchTicket>[2] }) =>
      supportService.patchTicket(accessToken, args.id, args.patch),
    onSuccess: () => {
      invalidateTickets();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const postSystem = useMutation({
    mutationFn: async (args: { ticketId: string; body: string }) => {
      return supportService.postMessage(accessToken, args.ticketId, args.body, {
        message_kind: "system",
      });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const send = useMutation({
    mutationFn: () => supportService.postMessage(accessToken, selected!.id, reply),
    onSuccess: () => {
      setReply("");
      toast.success(t("tickets.sent"));
      invalidateTickets();
      void qc.invalidateQueries({ queryKey: ["admin", "tickets", selected?.id, "messages"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const counts = useMemo(() => {
    const active = (tk: (typeof enriched)[0]) => tk._status !== "resolved";
    return {
      l1: enriched.filter((tk) => tk._level === 1 && active(tk)).length,
      l2: enriched.filter((tk) => tk._level === 2 && active(tk)).length,
      l3: enriched.filter((tk) => tk._level === 3 && active(tk)).length,
    };
  }, [enriched]);

  const assigneeLabel = (tk: SupportTicket) => {
    if (!tk.assignee_id) return t("communication.chatSupport.assigneePending");
    if (user?.id && tk.assignee_id === user.id) return t("communication.chatSupport.assigneeYou");
    return t("communication.chatSupport.assigneeAgent");
  };

  const escalate = async () => {
    if (!selected || selected._level >= 3) return;
    const next = (selected._level + 1) as 1 | 2 | 3;
    const priority =
      next === 3 ? "critical" : selected._priority === "low" ? "medium" : selected._priority;
    await patchTicket.mutateAsync({
      id: selected.id,
      patch: {
        support_level: next,
        priority: priority as "low" | "medium" | "high" | "critical",
        assignee_id: next === 3 ? null : selected.assignee_id ?? undefined,
      },
    });
    await postSystem.mutateAsync({
      ticketId: selected.id,
      body: t("communication.chatSupport.systemEscalated", { level: next }),
    });
    void qc.invalidateQueries({ queryKey: ["admin", "tickets", selected.id, "messages"] });
    toast.success(t("communication.chatSupport.escalated"));
  };

  const takeOver = async () => {
    if (!selected || !user?.id) return;
    await patchTicket.mutateAsync({
      id: selected.id,
      patch: { assignee_id: user.id, status: "in_progress" },
    });
    toast.success(t("communication.chatSupport.tookOver"));
  };

  const resolveTicket = async () => {
    if (!selected) return;
    await patchTicket.mutateAsync({ id: selected.id, patch: { status: "resolved" } });
    toast.success(t("communication.chatSupport.toastResolved"));
  };

  const sendReply = () => {
    if (!reply.trim() || !selected || selected._status === "resolved") return;
    send.mutate();
  };

  const messageRole = (m: TicketMessage, ticketUserId: string): "user" | "staff" | "ai" | "system" => {
    const k = (m.message_kind ?? "").toLowerCase();
    if (k === "system" || k === "ai" || k === "staff" || k === "user") return k;
    return m.sender_id === ticketUserId ? "user" : "staff";
  };

  const locale = i18n.language?.startsWith("fr") ? "fr" : "en";

  return (
    <Tabs value={tab} onValueChange={onTabChange} className="flex min-h-0 flex-1 flex-col">
      <TabsList className={cn("shrink-0", mobileInThread && "hidden lg:inline-flex")}>
        <TabsTrigger value={ADMIN_TABS.chatSupport.clients}>
          {t("communication.chatSupport.tabs.clients")}
        </TabsTrigger>
        <TabsTrigger value={ADMIN_TABS.chatSupport.drivers}>
          {t("communication.chatSupport.tabs.drivers")}
        </TabsTrigger>
      </TabsList>

      <TabsContent
        value={tab}
        className="mt-4 flex min-h-0 flex-1 flex-col space-y-4 sm:mt-6 sm:space-y-5"
      >
        {/* Overview (KPIs + status) — collapsed on mobile by default */}
        {!mobileInThread && (
          <>
            <button
              type="button"
              aria-expanded={overviewOpen}
              onClick={() => setOverviewOpen((o) => !o)}
              className="border-border bg-card hover:border-primary/40 flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition lg:hidden"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold">{t("communication.chatSupport.overview")}</p>
                <p className="text-muted-foreground truncate text-xs">
                  {t("communication.chatSupport.overviewSummary", {
                    total: enriched.length,
                    l3: counts.l3,
                  })}
                </p>
              </div>
              <ChevronDown
                className={cn("size-5 shrink-0 transition-transform", overviewOpen && "rotate-180")}
              />
            </button>

            <div className={cn("space-y-4", !overviewOpen && "max-lg:hidden")}>
              <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-3 lg:grid-cols-6">
                <KpiCard
                  icon={MessageSquare}
                  value={enriched.length}
                  label={t("communication.chatSupport.kpi.total")}
                />
                <KpiCard
                  icon={Bot}
                  value={counts.l1}
                  label={t("communication.chatSupport.kpi.l1")}
                  tone="primary"
                />
                <KpiCard
                  icon={Headphones}
                  value={counts.l2}
                  label={t("communication.chatSupport.kpi.l2")}
                  tone="secondary"
                />
                <KpiCard
                  icon={Shield}
                  value={counts.l3}
                  label={t("communication.chatSupport.kpi.l3")}
                  tone="destructive"
                  ring={counts.l3 > 0}
                />
                <KpiCard
                  icon={Clock}
                  value={t("communication.chatSupport.kpi.responseValue")}
                  label={t("communication.chatSupport.kpi.response")}
                />
                <KpiCard
                  icon={CheckCircle2}
                  value={t("communication.chatSupport.kpi.resolutionValue")}
                  label={t("communication.chatSupport.kpi.resolution")}
                />
              </div>

              <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setSoundOn((s) => !s)}
                  className="border-border bg-card hover:border-primary flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-semibold transition"
                >
                  {soundOn ? (
                    <Volume2 className="size-3.5" />
                  ) : (
                    <VolumeX className="text-muted-foreground size-3.5" />
                  )}
                  {soundOn
                    ? t("communication.chatSupport.soundsOn")
                    : t("communication.chatSupport.soundsOff")}
                </button>
                <span>·</span>
                <span className="flex items-center gap-1.5">
                  <Zap className="text-secondary size-3.5" />
                  {t("communication.chatSupport.liveHint")}
                </span>
              </div>
            </div>
          </>
        )}

        <div
          className={cn(
            "flex min-h-0 flex-col gap-0 lg:grid lg:min-h-[min(70vh,720px)] lg:grid-cols-12 lg:gap-4",
            mobileInThread && "min-h-[calc(100dvh-10rem)] flex-1",
          )}
        >
          {/* Ticket list — full screen on mobile until a ticket is opened */}
          <div
            className={cn(
              "border-border bg-card flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border lg:col-span-5 lg:flex-none",
              mobileInThread && "hidden",
            )}
          >
            <div className="border-border space-y-2 border-b p-3">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("communication.chatSupport.searchPlaceholder")}
                className="bg-muted rounded-full"
              />
              <div className="flex flex-wrap gap-1.5">
                {(["all", "open", "in_progress", "resolved"] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setStatusFilter(f)}
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase transition",
                      statusFilter === f
                        ? "bg-foreground text-background"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {t(`communication.chatSupport.filters.status.${f}`)}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(["all", "1", "2", "3"] as const).map((l) => {
                  const Lm = l !== "all" ? LEVEL_META[Number(l) as 1 | 2 | 3].icon : null;
                  return (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setLevelFilter(l)}
                      className={cn(
                        "flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase transition",
                        levelFilter === l
                          ? "bg-foreground text-background"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {Lm ? <Lm className="size-3" /> : null}
                      {l === "all"
                        ? t("communication.chatSupport.filters.allLevels")
                        : LEVEL_META[Number(l) as 1 | 2 | 3].label}
                    </button>
                  );
                })}
              </div>
            </div>
            <ScrollArea className="min-h-[280px] flex-1">
              <div className="divide-border divide-y">
                {sorted.map((tk) => {
                  const lm = LEVEL_META[tk._level];
                  const LIcon = lm.icon;
                  const isSel = tk.id === effectiveId;
                  return (
                    <button
                      key={tk.id}
                      type="button"
                      onClick={() => {
                        setSelectedId(tk.id);
                      }}
                      className={cn(
                        "hover:bg-muted/50 w-full p-3 text-left transition",
                        isSel && "bg-muted/40",
                        tk._priority === "critical" && tk._status !== "resolved" && "border-destructive border-l-4",
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                          style={{ backgroundColor: hueFromId(tk.user_id) }}
                        >
                          {initialsFromId(tk.user_id)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="mb-0.5 flex items-center gap-2">
                            <span className="truncate text-sm font-semibold">
                              {ticketLabel(tk.user_id)}
                            </span>
                            <span className="text-muted-foreground ml-auto shrink-0 font-mono text-[10px]">
                              T-{tk.id.slice(0, 4).toUpperCase()}
                            </span>
                          </div>
                          <div className="truncate text-sm">{tk.subject}</div>
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            <Badge
                              variant="outline"
                              className={cn(
                                "h-5 px-1.5 text-[9px] font-bold tracking-wider uppercase",
                                PRIORITY_BADGE[tk._priority] ?? PRIORITY_BADGE.medium,
                              )}
                            >
                              {tk._priority === "critical"
                                ? t("communication.chatSupport.priority.critical")
                                : tk._priority}
                            </Badge>
                            <Badge
                              variant="outline"
                              className={cn(
                                "h-5 px-1.5 text-[9px] font-bold tracking-wider uppercase",
                                STATUS_BADGE[tk._status] ?? "bg-muted",
                              )}
                            >
                              {tk._status.replace("_", " ")}
                            </Badge>
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-bold tracking-wider uppercase",
                                lm.bg,
                                lm.fg,
                              )}
                            >
                              <LIcon className="size-2.5" /> {lm.label}
                            </span>
                            <span className="text-muted-foreground ml-auto text-[10px]">
                              {relativeCreated(tk.created_at, locale)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
                {!sorted.length && (
                  <p className="text-muted-foreground p-8 text-center text-sm">
                    {t("communication.chatSupport.emptyFilter")}
                  </p>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Thread — full screen on mobile when a ticket is selected */}
          <div
            className={cn(
              "border-border bg-card flex min-h-0 flex-col overflow-hidden rounded-3xl border lg:col-span-7",
              isMobile && !effectiveId && "hidden",
              isMobile && effectiveId && "min-h-[calc(100dvh-10rem)] flex-1",
            )}
          >
            {selected ? (
              <>
                <div className="border-border flex shrink-0 flex-wrap items-center gap-2 border-b p-3 sm:gap-3 sm:p-4">
                  <button
                    type="button"
                    aria-label={t("communication.chatSupport.backToList")}
                    onClick={backToList}
                    className="hover:bg-muted flex size-10 shrink-0 items-center justify-center rounded-full transition lg:hidden"
                  >
                    <ChevronLeft className="size-5" />
                  </button>
                  <div
                    className="flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                    style={{ backgroundColor: hueFromId(selected.user_id) }}
                  >
                    {initialsFromId(selected.user_id)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-display truncate font-bold">
                        {ticketLabel(selected.user_id)}
                      </span>
                      {(() => {
                        const lm = LEVEL_META[selected._level];
                        const Ic = lm.icon;
                        return (
                          <>
                            <Ic className={cn("size-3.5 shrink-0", lm.fg)} />
                            <span
                              className={cn(
                                "rounded px-1.5 py-0.5 text-[9px] font-bold tracking-wider uppercase",
                                lm.bg,
                                lm.fg,
                              )}
                            >
                              {lm.label}
                            </span>
                          </>
                        );
                      })()}
                    </div>
                    <div className="text-muted-foreground truncate text-xs">
                      {selected.subject} · T-{selected.id.slice(0, 4).toUpperCase()} ·{" "}
                      {t("communication.chatSupport.assignee")}: {assigneeLabel(selected)}
                    </div>
                    <Link
                      href={
                        audience === "drivers"
                          ? adminProfilePath("drivers", selected.user_id)
                          : adminProfilePath("users", selected.user_id)
                      }
                      className="text-primary mt-1 inline-block text-xs hover:underline"
                    >
                      {t("communication.chatSupport.openProfile")}
                    </Link>
                  </div>
                  <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto">
                    {!selected.assignee_id && (
                      <RyvoButton intent="danger" size="sm" className="rounded-full" onClick={takeOver}>
                        {t("communication.chatSupport.takeOver")}
                      </RyvoButton>
                    )}
                    {selected._level < 3 && (
                      <RyvoButton
                        intent="outline"
                        size="sm"
                        className="rounded-full"
                        onClick={() => void escalate()}
                        disabled={patchTicket.isPending || postSystem.isPending}
                      >
                        <ArrowUpRight className="mr-1 size-3" />
                        {t("communication.chatSupport.escalate", { level: selected._level + 1 })}
                      </RyvoButton>
                    )}
                    <RyvoButton
                      intent="cta"
                      size="sm"
                      className="rounded-full"
                      onClick={() => void resolveTicket()}
                      disabled={selected._status === "resolved" || patchTicket.isPending}
                    >
                      {t("communication.chatSupport.resolve")}
                    </RyvoButton>
                  </div>
                </div>

                <ScrollArea className="min-h-0 flex-1 overscroll-contain">
                  <div className="space-y-3 p-4">
                    {(messagesQ.data?.messages ?? []).length === 0 && (
                      <p className="text-muted-foreground py-10 text-center text-sm">
                        {t("communication.chatSupport.noMessages")}
                      </p>
                    )}
                    {(messagesQ.data?.messages ?? []).map((m) => {
                      const role = messageRole(m, selected.user_id);
                      if (role === "system") {
                        return (
                          <div key={m.id} className="my-2 text-center">
                            <span className="bg-muted text-muted-foreground inline-block rounded-full px-3 py-1 text-[10px] font-bold tracking-wider uppercase">
                              {m.body}
                            </span>
                          </div>
                        );
                      }
                      const isStaff = role === "staff" || role === "ai";
                      const meta =
                        role === "ai" ? LEVEL_META[1] : role === "staff" ? LEVEL_META[2] : null;
                      return (
                        <div
                          key={m.id}
                          className={cn("flex gap-2", isStaff ? "justify-end" : "justify-start")}
                        >
                          {!isStaff && (
                            <div
                              className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                              style={{ backgroundColor: hueFromId(selected.user_id) }}
                            >
                              {initialsFromId(selected.user_id)}
                            </div>
                          )}
                          <div
                            className={cn(
                              "flex max-w-[min(100%,420px)] flex-col",
                              isStaff ? "items-end" : "items-start",
                            )}
                          >
                            {isStaff && meta && (
                              <div className={cn("mb-0.5 text-[9px] font-bold tracking-wider uppercase", meta.fg)}>
                                {t(meta.shortKey)}
                              </div>
                            )}
                            <div
                              className={cn(
                                "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                                !isStaff && "bg-muted text-foreground rounded-bl-md",
                                isStaff &&
                                  role === "staff" &&
                                  "bg-secondary text-secondary-foreground rounded-br-md",
                                isStaff &&
                                  role === "ai" &&
                                  "bg-primary text-primary-foreground rounded-br-md",
                              )}
                            >
                              {m.body}
                            </div>
                            <div className="text-muted-foreground mt-1 px-1 text-[10px]">
                              {new Date(m.created_at).toLocaleTimeString(locale, {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>

                <div className="border-border flex shrink-0 items-center gap-2 border-t p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                  <Input
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendReply();
                      }
                    }}
                    placeholder={t("communication.chatSupport.replyPlaceholder", {
                      role:
                        selected._level >= 3
                          ? t("communication.chatSupport.roleL3")
                          : t("communication.chatSupport.roleL2"),
                    })}
                    disabled={selected._status === "resolved" || send.isPending}
                    className="bg-muted flex-1 rounded-full"
                  />
                  <button
                    type="button"
                    onClick={sendReply}
                    disabled={!reply.trim() || selected._status === "resolved" || send.isPending}
                    className="bg-primary text-primary-foreground flex size-10 shrink-0 items-center justify-center rounded-full disabled:opacity-50"
                  >
                    <Send className="size-4" />
                  </button>
                </div>
              </>
            ) : (
              <div className="text-muted-foreground hidden flex-1 items-center justify-center p-8 text-sm lg:flex">
                {t("tickets.selectTicket")}
              </div>
            )}
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
}

function KpiCard({
  icon: Icon,
  value,
  label,
  tone,
  ring,
}: {
  icon: ComponentType<{ className?: string }>;
  value: string | number;
  label: string;
  tone?: "primary" | "secondary" | "destructive";
  ring?: boolean;
}) {
  const toneCls =
    tone === "primary"
      ? "bg-primary/15 text-primary"
      : tone === "secondary"
        ? "bg-secondary/15 text-secondary"
        : tone === "destructive"
          ? "bg-destructive/15 text-destructive"
          : "bg-muted text-foreground";
  return (
    <div
      className={cn(
        "border-border bg-card rounded-2xl border p-3",
        ring && "ring-destructive/40 ring-2",
      )}
    >
      <div className={cn("mb-1.5 flex size-8 items-center justify-center rounded-xl", toneCls)}>
        <Icon className="size-4" />
      </div>
      <div className="font-display text-xl font-bold">{value}</div>
      <div className="text-muted-foreground text-[10px] tracking-wider uppercase">{label}</div>
    </div>
  );
}
