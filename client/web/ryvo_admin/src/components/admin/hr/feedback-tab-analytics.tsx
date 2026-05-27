"use client";

import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  MessageSquare,
  Scale,
  Star,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  AdminListStack,
  AdminSearchToolbar,
  AdminStatCard,
  AdminStatGrid,
  AdminTable,
  AdminTableCard,
  AdminTableHead,
  SortableTableHeader,
  StatusBadge,
} from "@/components/admin/admin-list-ui";
import { ChartPanel } from "@/components/admin/charts/chart-panel";
import { ListLayoutToolbar } from "@/components/admin/list-layout-toolbar";
import { ListPaginationFooter } from "@/components/admin/list-pagination-footer";
import { LIST_LAYOUT, QUERY_KEYS, SORT_KEYS } from "@/configs/const";
import { useAuth } from "@/hooks/use-auth";
import { compareSortable, useListControls } from "@/hooks/use-list-controls";
import { usePaginatedSlice } from "@/hooks/use-paginated-slice";
import { CHART_COLORS } from "@/lib/analytics-demo";
import { formatLastSeen } from "@/lib/format-date";
import { cn } from "@/lib/utils";
import {
  feedbacksService,
  type FeedbackCategory,
  type FeedbackGranularity,
  type FeedbackSeriesPoint,
  type ServiceFeedbackEntry,
} from "@/services/feedbacks.service";

const GRANULARITIES: FeedbackGranularity[] = ["day", "week", "month", "year"];

type FeedbackTabAnalyticsProps = {
  category: FeedbackCategory;
  descKey: string;
};

function starsToPercent(stars: number) {
  return Math.round((stars / 5) * 100);
}

export function FeedbackTabAnalytics({ category, descKey }: FeedbackTabAnalyticsProps) {
  const { t } = useTranslation();
  const { accessToken } = useAuth();
  const [granularity, setGranularity] = useState<FeedbackGranularity>("week");
  const [selectedPoint, setSelectedPoint] = useState<FeedbackSeriesPoint | null>(null);
  const list = useListControls(SORT_KEYS.createdAt);
  const [litigeOnly, setLitigeOnly] = useState(false);

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: [...QUERY_KEYS.admin.feedbacksAnalytics, category, granularity],
    queryFn: () => feedbacksService.getAnalytics(accessToken, category, granularity),
    enabled: Boolean(accessToken),
  });

  const chartData = useMemo(() => {
    return (data?.series ?? []).map((p) => ({
      ...p,
      displayScore: p.score ?? undefined,
    }));
  }, [data?.series]);

  const bucketFiltered = useMemo(() => {
    let items = data?.entries ?? [];
    if (selectedPoint) {
      const start = new Date(selectedPoint.bucketStart).getTime();
      const end = new Date(selectedPoint.bucketEnd).getTime();
      items = items.filter((e) => {
        const t = new Date(e.created_at).getTime();
        return t >= start && t < end;
      });
    }
    if (litigeOnly) items = items.filter((e) => e.is_litige);
    if (list.search) {
      const q = list.search.toLowerCase();
      items = items.filter((e) => {
        const hay = [
          e.comment,
          e.subject_label,
          e.source,
          e.author_role,
          ...(e.tags ?? []),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      });
    }
    const s = list.activeSort;
    if (s) {
      items = [...items].sort((a, b) => {
        if (s.key === SORT_KEYS.createdAt) {
          return compareSortable(a.created_at, b.created_at, s.dir);
        }
        if (s.key === "stars") {
          return compareSortable(a.stars, b.stars, s.dir);
        }
        return compareSortable(a.source, b.source, s.dir);
      });
    }
    return items;
  }, [data?.entries, selectedPoint, litigeOnly, list.search, list.activeSort]);

  const pagination = usePaginatedSlice(bucketFiltered, {
    pageSize: list.pageSize,
    loadMode: list.loadMode,
    page: list.page,
    setPage: list.setPage,
    infinitePages: list.infinitePages,
    setInfinitePages: list.setInfinitePages,
    resetDeps: [list.search, list.activeSort, litigeOnly, selectedPoint?.key],
  });

  const stats = data?.stats ?? { total: 0, avgScore: 0, litiges: 0, lowRatings: 0 };

  function handleChartClick(state: any) {
    const point = (state?.activePayload?.[0]?.payload ?? null) as FeedbackSeriesPoint | null;
    if (!point) return;
    setSelectedPoint((prev) => (prev?.key === point.key ? null : point));
  }

  function renderStars(stars: number) {
    return (
      <span className="inline-flex items-center gap-1 text-sm">
        <Star className="size-3.5 fill-amber-400 text-amber-400" />
        {stars}/5
        <span className="text-muted-foreground text-xs">({starsToPercent(stars)}%)</span>
      </span>
    );
  }

  function renderRow(e: ServiceFeedbackEntry) {
    return (
      <>
        <td className="p-3 text-sm whitespace-nowrap">{formatLastSeen(e.created_at)}</td>
        <td className="p-3">{renderStars(e.stars)}</td>
        <td className="p-3 text-sm">
          <p className="line-clamp-2 max-w-md">{e.comment ?? "—"}</p>
          {e.tags?.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {e.tags.map((tag) => (
                <span
                  key={tag}
                  className="bg-muted text-muted-foreground rounded-md px-1.5 py-0.5 text-[10px] font-medium uppercase"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </td>
        <td className="p-3 text-sm">
          {e.subject_label ?? "—"}
          {e.is_litige && (
            <div className="mt-1">
              <StatusBadge variant="warning">{t("hr.feedbacks.litige")}</StatusBadge>
            </div>
          )}
        </td>
        <td className="p-3 text-sm capitalize">{t(`hr.feedbacks.source.${e.source}`)}</td>
        <td className="p-3 text-sm capitalize">
          {e.author_role ? t(`hr.feedbacks.role.${e.author_role}`) : "—"}
        </td>
      </>
    );
  }

  const insightTitle =
    selectedPoint == null
      ? null
      : category === "product"
        ? t("hr.feedbacks.insights.product")
        : category === "driver"
          ? t("hr.feedbacks.insights.drivers")
          : t("hr.feedbacks.insights.staff");

  return (
    <AdminListStack>
      <p className="text-muted-foreground text-sm">{t(descKey)}</p>

      <AdminStatGrid>
        <AdminStatCard
          icon={TrendingUp}
          tone="success"
          label={t("hr.feedbacks.stats.avgQuality")}
          value={`${stats.avgScore}%`}
        />
        <AdminStatCard
          icon={MessageSquare}
          label={t("hr.feedbacks.stats.total")}
          value={stats.total}
        />
        <AdminStatCard
          icon={TrendingDown}
          tone="warning"
          label={t("hr.feedbacks.stats.lowRatings")}
          value={stats.lowRatings}
        />
        <AdminStatCard
          icon={Scale}
          tone="danger"
          label={t("hr.feedbacks.stats.litiges")}
          value={stats.litiges}
        />
      </AdminStatGrid>

      <div className="flex flex-wrap gap-2">
        {GRANULARITIES.map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => {
              setGranularity(g);
              setSelectedPoint(null);
            }}
            className={cn(
              "rounded-xl px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition",
              granularity === g
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground",
            )}
          >
            {t(`hr.feedbacks.period.${g}`)}
          </button>
        ))}
      </div>

      <ChartPanel
        title={t("hr.feedbacks.chart.title")}
        description={t("hr.feedbacks.chart.hint")}
      >
        {isLoading ? (
          <p className="text-muted-foreground text-sm">{t("common.loading")}</p>
        ) : isError ? (
          <div className="space-y-2 py-6 text-center">
            <p className="text-destructive text-sm">{t("hr.feedbacks.loadError")}</p>
            <p className="text-muted-foreground mx-auto max-w-md text-xs">{t("hr.feedbacks.loadErrorHint")}</p>
            {error instanceof Error && error.message && (
              <p className="text-muted-foreground mx-auto max-w-md font-mono text-[10px]">{error.message}</p>
            )}
            <button
              type="button"
              onClick={() => void refetch()}
              disabled={isFetching}
              className="text-primary text-xs font-semibold underline disabled:opacity-50"
            >
              {t("hr.feedbacks.retry")}
            </button>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart
              data={chartData}
              onClick={handleChartClick}
              style={{ cursor: "pointer" }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
              <Tooltip
                formatter={(v) => (v == null ? "—" : `${v}%`)}
                labelFormatter={(_, payload) => {
                  const p = payload?.[0]?.payload as FeedbackSeriesPoint | undefined;
                  if (!p) return "";
                  return `${p.label} · ${p.count} ${t("hr.feedbacks.chart.feedbacks")}`;
                }}
              />
              <Line
                type="monotone"
                dataKey="displayScore"
                name={t("hr.feedbacks.chart.quality")}
                stroke={CHART_COLORS[0]}
                strokeWidth={2}
                connectNulls
                dot={(props) => {
                  const { cx, cy, payload } = props;
                  const active = selectedPoint?.key === (payload as FeedbackSeriesPoint).key;
                  return (
                    <circle
                      key={(payload as FeedbackSeriesPoint).key}
                      cx={cx}
                      cy={cy}
                      r={active ? 7 : 4}
                      fill={active ? CHART_COLORS[0] : "var(--background)"}
                      stroke={CHART_COLORS[0]}
                      strokeWidth={active ? 3 : 2}
                    />
                  );
                }}
                activeDot={{ r: 8 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </ChartPanel>

      {selectedPoint && (
        <div className="border-border bg-card rounded-2xl border p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold">{insightTitle}</h3>
              <p className="text-muted-foreground text-xs">
                {selectedPoint.label} ·{" "}
                {selectedPoint.score != null ? `${selectedPoint.score}%` : "—"} ·{" "}
                {selectedPoint.count} {t("hr.feedbacks.chart.feedbacks")}
              </p>
            </div>
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground text-xs underline"
              onClick={() => setSelectedPoint(null)}
            >
              {t("hr.feedbacks.clearSelection")}
            </button>
          </div>
          {selectedPoint.insights.items.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("hr.feedbacks.insights.empty")}</p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {selectedPoint.insights.items.map((item) => (
                <li
                  key={item.label}
                  className="border-border bg-muted/30 flex items-start gap-2 rounded-xl border p-3"
                >
                  <AlertTriangle className="text-primary mt-0.5 size-4 shrink-0" />
                  <div>
                    <p className="text-sm font-medium capitalize">{item.label}</p>
                    <p className="text-muted-foreground text-xs">
                      {item.count} {t("hr.feedbacks.insights.mentions")}
                      {item.score != null && ` · ${item.score}%`}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <AdminSearchToolbar
        value={list.search}
        onChange={list.setSearch}
        placeholder={t("hr.feedbacks.search")}
      />

      <ListLayoutToolbar
        layout={list.layout}
        onLayoutChange={list.setLayout}
        loadMode={list.loadMode}
        onLoadModeChange={list.setLoadMode}
        pageSize={list.pageSize}
        onPageSizeChange={list.setPageSize}
        filters={
          <label className="text-muted-foreground flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={litigeOnly}
              onChange={(e) => setLitigeOnly(e.target.checked)}
              className="accent-primary size-3.5 rounded"
            />
            {t("hr.feedbacks.filterLitige")}
          </label>
        }
      />

      {isLoading ? (
        <p className="text-muted-foreground text-sm">{t("common.loading")}</p>
      ) : list.layout === LIST_LAYOUT.table ? (
        <AdminTable>
          <AdminTableHead>
            <tr>
              <SortableTableHeader
                label={t("hr.feedbacks.columns.date")}
                sortKey={SORT_KEYS.createdAt}
                activeSort={list.activeSort}
                onSort={list.toggleColumnSort}
              />
              <SortableTableHeader
                label={t("hr.feedbacks.columns.rating")}
                sortKey="stars"
                activeSort={list.activeSort}
                onSort={list.toggleColumnSort}
              />
              <th className="px-5 py-3.5">{t("hr.feedbacks.columns.comment")}</th>
              <th className="px-5 py-3.5">
                {category === "product"
                  ? t("hr.feedbacks.columns.topic")
                  : t("hr.feedbacks.columns.subject")}
              </th>
              <SortableTableHeader
                label={t("hr.feedbacks.columns.source")}
                sortKey="source"
                activeSort={list.activeSort}
                onSort={list.toggleColumnSort}
              />
              <th className="px-5 py-3.5">{t("hr.feedbacks.columns.author")}</th>
            </tr>
          </AdminTableHead>
          <tbody>
            {pagination.visibleItems.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-muted-foreground p-8 text-center text-sm">
                  {t("common.noData")}
                </td>
              </tr>
            ) : (
              pagination.visibleItems.map((e) => (
                <tr key={e.id} className="border-border border-t">
                  {renderRow(e)}
                </tr>
              ))
            )}
          </tbody>
        </AdminTable>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {pagination.visibleItems.length === 0 ? (
            <p className="text-muted-foreground col-span-full py-8 text-center text-sm">
              {t("common.noData")}
            </p>
          ) : (
            pagination.visibleItems.map((e) => (
              <AdminTableCard key={e.id}>
                <div className="flex items-center justify-between gap-2">
                  {renderStars(e.stars)}
                  <span className="text-muted-foreground text-xs">{formatLastSeen(e.created_at)}</span>
                </div>
                <p className="mt-2 line-clamp-3 text-sm">{e.comment ?? "—"}</p>
                {e.subject_label && (
                  <p className="text-muted-foreground mt-2 text-xs">{e.subject_label}</p>
                )}
                {e.is_litige && (
                  <div className="mt-2">
                    <StatusBadge variant="warning">{t("hr.feedbacks.litige")}</StatusBadge>
                  </div>
                )}
              </AdminTableCard>
            ))
          )}
        </div>
      )}

      {bucketFiltered.length > 0 && (
        <ListPaginationFooter
          loadMode={pagination.loadMode}
          total={pagination.total}
          page={pagination.page}
          totalPages={pagination.totalPages}
          showingFrom={pagination.showingFrom}
          showingTo={pagination.showingTo}
          hasMore={pagination.hasMore}
          onPageChange={pagination.setPage}
          onLoadMore={pagination.loadMore}
        />
      )}
    </AdminListStack>
  );
}
