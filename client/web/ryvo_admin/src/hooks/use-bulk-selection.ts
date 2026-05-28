"use client";

import { useCallback, useMemo, useState } from "react";

export function useBulkSelection<T extends { id: string }>() {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback((items: T[]) => {
    setSelected((prev) => {
      const allSelected = items.length > 0 && items.every((i) => prev.has(i.id));
      if (allSelected) return new Set();
      return new Set(items.map((i) => i.id));
    });
  }, []);

  const clear = useCallback(() => setSelected(new Set()), []);

  const isSelected = useCallback((id: string) => selected.has(id), [selected]);

  const count = selected.size;

  const pick = useCallback(
    (items: T[]) => items.filter((i) => selected.has(i.id)),
    [selected],
  );

  const isAllSelected = useCallback(
    (items: T[]) => items.length > 0 && items.every((i) => selected.has(i.id)),
    [selected],
  );

  const isSomeSelected = useCallback(
    (items: T[]) => items.some((i) => selected.has(i.id)) && !isAllSelected(items),
    [isAllSelected],
  );

  return useMemo(
    () => ({
      selected,
      count,
      toggle,
      toggleAll,
      clear,
      isSelected,
      pick,
      isAllSelected,
      isSomeSelected,
    }),
    [selected, count, toggle, toggleAll, clear, isSelected, pick, isAllSelected, isSomeSelected],
  );
}
