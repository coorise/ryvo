"use client";

import { useEffect, useMemo, type Dispatch, type SetStateAction } from "react";

import { LIST_LOAD_MODE, type ListLoadMode } from "@/configs/const";

type PaginatedSliceOptions = {
  pageSize: number;
  loadMode: ListLoadMode;
  page: number;
  setPage: (page: number) => void;
  infinitePages: number;
  setInfinitePages: Dispatch<SetStateAction<number>>;
  /** When any value changes, reset to page 1 / first chunk */
  resetDeps?: readonly unknown[];
};

export function usePaginatedSlice<T>(allItems: T[], options: PaginatedSliceOptions) {
  const {
    pageSize,
    loadMode,
    page,
    setPage,
    infinitePages,
    setInfinitePages,
    resetDeps = [],
  } = options;

  const safePageSize = Math.max(1, pageSize);
  const total = allItems.length;
  const totalPages = Math.max(1, Math.ceil(total / safePageSize) || 1);

  useEffect(() => {
    setPage(1);
    setInfinitePages(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset when filters/search/sort change
  }, [safePageSize, loadMode, setPage, setInfinitePages, ...resetDeps]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages, setPage]);

  const visibleItems = useMemo(() => {
    if (loadMode === LIST_LOAD_MODE.pages) {
      const start = (page - 1) * safePageSize;
      return allItems.slice(start, start + safePageSize);
    }
    return allItems.slice(0, infinitePages * safePageSize);
  }, [allItems, loadMode, page, safePageSize, infinitePages]);

  const hasMore =
    loadMode === LIST_LOAD_MODE.infinite && visibleItems.length < total;

  function loadMore() {
    if (loadMode !== LIST_LOAD_MODE.infinite || !hasMore) return;
    setInfinitePages((p) => p + 1);
  }

  const showingFrom = total === 0 ? 0 : loadMode === LIST_LOAD_MODE.pages ? (page - 1) * safePageSize + 1 : 1;
  const showingTo =
    total === 0
      ? 0
      : loadMode === LIST_LOAD_MODE.pages
        ? Math.min(page * safePageSize, total)
        : visibleItems.length;

  return {
    visibleItems,
    total,
    totalPages,
    page,
    setPage,
    hasMore,
    loadMore,
    showingFrom,
    showingTo,
    loadMode,
  };
}
