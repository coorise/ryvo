"use client";

import { useMemo, useState } from "react";

import {
  LIST_DEFAULT_PAGE_SIZE,
  LIST_LOAD_MODE,
  LIST_LAYOUT,
  LIST_PAGE_SIZE,
  type ListLayout,
  type ListLoadMode,
} from "@/configs/const";

export type SortDir = "asc" | "desc";

export type SortState = {
  key: string;
  dir: SortDir;
};

export function toggleSortState(current: SortState | null, key: string): SortState | null {
  if (current?.key !== key) return { key, dir: "asc" };
  if (current.dir === "asc") return { key, dir: "desc" };
  return null;
}

export function compareSortable(
  a: string | number | null | undefined,
  b: string | number | null | undefined,
  dir: SortDir,
) {
  const av = a ?? "";
  const bv = b ?? "";
  const mul = dir === "asc" ? 1 : -1;
  if (av < bv) return -1 * mul;
  if (av > bv) return 1 * mul;
  return 0;
}

export function useListControls(defaultSortKey = "updated_at") {
  const [search, setSearch] = useState("");
  const [layout, setLayout] = useState<ListLayout>(LIST_LAYOUT.table);
  const [sort, setSort] = useState<SortState | null>({ key: defaultSortKey, dir: "desc" });
  const [gridSortValue, setGridSortValue] = useState(`${defaultSortKey}:desc`);
  const [loadMode, setLoadMode] = useState<ListLoadMode>(LIST_LOAD_MODE.infinite);
  const [pageSize, setPageSizeRaw] = useState(LIST_DEFAULT_PAGE_SIZE);
  const [page, setPage] = useState(1);
  const [infinitePages, setInfinitePages] = useState(1);

  function setPageSize(value: number) {
    const n = Math.min(LIST_PAGE_SIZE.max, Math.max(LIST_PAGE_SIZE.min, Math.floor(value) || LIST_DEFAULT_PAGE_SIZE));
    setPageSizeRaw(n);
  }

  const activeSort = useMemo((): SortState | null => {
    if (layout === LIST_LAYOUT.table) return sort;
    const [key, dir] = gridSortValue.split(":");
    return { key: key || defaultSortKey, dir: (dir === "asc" ? "asc" : "desc") as SortDir };
  }, [layout, sort, gridSortValue, defaultSortKey]);

  function toggleColumnSort(key: string) {
    setSort((s) => toggleSortState(s, key));
  }

  return {
    search,
    setSearch,
    layout,
    setLayout,
    sort,
    activeSort,
    gridSortValue,
    setGridSortValue,
    toggleColumnSort,
    loadMode,
    setLoadMode,
    pageSize,
    setPageSize,
    page,
    setPage,
    infinitePages,
    setInfinitePages,
  };
}
