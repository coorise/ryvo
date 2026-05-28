"use client";

import { useCallback, useEffect, useState } from "react";

import {
  DEFAULT_OPEX_RESOURCES,
  loadOpexResources,
  saveOpexResources,
  type OpexResource,
} from "@/lib/finance-speculative";

export function useOpexConfig() {
  const [resources, setResources] = useState<OpexResource[]>(DEFAULT_OPEX_RESOURCES);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setResources(loadOpexResources());
    setHydrated(true);
  }, []);

  const persist = useCallback((next: OpexResource[]) => {
    setResources(next);
    saveOpexResources(next);
  }, []);

  const addResource = useCallback(
    (resource: OpexResource) => persist([...resources, resource]),
    [resources, persist],
  );

  const updateResource = useCallback(
    (id: string, patch: Partial<OpexResource>) =>
      persist(resources.map((r) => (r.id === id ? { ...r, ...patch } : r))),
    [resources, persist],
  );

  const removeResource = useCallback(
    (id: string) => persist(resources.filter((r) => r.id !== id)),
    [resources, persist],
  );

  return { resources, hydrated, addResource, updateResource, removeResource, persist };
}
