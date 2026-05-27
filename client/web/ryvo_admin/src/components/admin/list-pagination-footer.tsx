"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

import { LIST_LOAD_MODE, type ListLoadMode } from "@/configs/const";
import { cn } from "@/lib/utils";

type ListPaginationFooterProps = {
  loadMode: ListLoadMode;
  total: number;
  page: number;
  totalPages: number;
  showingFrom: number;
  showingTo: number;
  hasMore: boolean;
  onPageChange: (page: number) => void;
  onLoadMore: () => void;
};

export function ListPaginationFooter({
  loadMode,
  total,
  page,
  totalPages,
  showingFrom,
  showingTo,
  hasMore,
  onPageChange,
  onLoadMore,
}: ListPaginationFooterProps) {
  const { t } = useTranslation();
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (loadMode !== LIST_LOAD_MODE.infinite || !hasMore) return;
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) onLoadMore();
      },
      { rootMargin: "120px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMode, hasMore, onLoadMore]);

  if (total === 0) return null;

  return (
    <div className="flex flex-col items-center gap-3 pt-2">
      <p className="text-muted-foreground text-xs">
        {t("list.showingRange", { from: showingFrom, to: showingTo, total })}
      </p>

      {loadMode === LIST_LOAD_MODE.infinite ? (
        <>
          {hasMore && (
            <button
              type="button"
              className="border-border hover:border-primary text-sm font-semibold rounded-full border px-4 py-2 transition"
              onClick={onLoadMore}
            >
              {t("list.loadMore")}
            </button>
          )}
          {hasMore && <div ref={sentinelRef} className="h-1 w-full" aria-hidden />}
        </>
      ) : (
        <div className="flex flex-wrap items-center justify-center gap-1">
          <PageBtn
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            aria-label={t("list.previous")}
          >
            <ChevronLeft className="size-4" />
          </PageBtn>
          {pageNumbers(page, totalPages).map((n) =>
            n === "…" ? (
              <span key={`ellipsis-${n}-${page}`} className="text-muted-foreground px-2 text-sm">
                …
              </span>
            ) : (
              <PageBtn
                key={n}
                active={n === page}
                onClick={() => onPageChange(n as number)}
                aria-label={t("list.pageNumber", { page: n })}
              >
                {n}
              </PageBtn>
            ),
          )}
          <PageBtn
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            aria-label={t("list.next")}
          >
            <ChevronRight className="size-4" />
          </PageBtn>
        </div>
      )}
    </div>
  );
}

function PageBtn({
  children,
  onClick,
  disabled,
  active,
  ...rest
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex size-9 items-center justify-center rounded-full border text-sm font-semibold transition",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background hover:border-primary",
        disabled && "pointer-events-none opacity-40",
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

function pageNumbers(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "…")[] = [1];
  if (current > 3) pages.push("…");
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) {
    pages.push(p);
  }
  if (current < total - 2) pages.push("…");
  pages.push(total);
  return pages;
}
