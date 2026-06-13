"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import {
  AdminListStack,
  AdminTable,
  AdminTableCard,
  AdminTableHead,
} from "@/components/admin/admin-list-ui";
import { useAuth } from "@/hooks/use-auth";
import { portalService } from "@/services/portal.service";
import type { PortalArea } from "@/configs/portal-nav";

type PortalCounterpartiesPanelProps = {
  area: PortalArea;
};

export function PortalCounterpartiesPanel({ area }: PortalCounterpartiesPanelProps) {
  const { t } = useTranslation();
  const { accessToken, user } = useAuth();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["portal", area, "counterparties"],
    queryFn: () => portalService.listMyTrips(accessToken),
    enabled: Boolean(accessToken) && Boolean(user?.id),
    retry: false,
  });

  const rows = useMemo(() => {
    const mine = data?.trips ?? [];
    const map = new Map<string, { id: string; trips: number }>();
    for (const trip of mine) {
      const otherId = area === "driver" ? trip.client_id : trip.driver_id;
      if (!otherId) continue;
      const prev = map.get(otherId);
      map.set(otherId, { id: otherId, trips: (prev?.trips ?? 0) + 1 });
    }
    return [...map.values()].sort((a, b) => b.trips - a.trips);
  }, [area, data?.trips, user?.id]);

  return (
    <AdminListStack>
      {isError ? (
        <p className="text-muted-foreground text-sm">{t("portal.counterparties.unavailable")}</p>
      ) : (
        <AdminTableCard>
          <AdminTable>
            <AdminTableHead>
              <tr>
                <th>{t("portal.counterparties.columns.user")}</th>
                <th>{t("portal.counterparties.columns.trips")}</th>
              </tr>
            </AdminTableHead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={2} className="text-muted-foreground py-8 text-center text-sm">
                    {t("common.loading")}
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={2} className="text-muted-foreground py-8 text-center text-sm">
                    {t("common.noData")}
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id}>
                    <td className="font-mono text-sm">{row.id.slice(0, 8)}…</td>
                    <td className="text-sm">{row.trips}</td>
                  </tr>
                ))
              )}
            </tbody>
          </AdminTable>
        </AdminTableCard>
      )}
      <p className="text-muted-foreground text-xs">
        {t("portal.counterparties.hint")}{" "}
        <Link href={area === "driver" ? "/driver/main/rides" : "/client/main/rides"} className="text-primary underline">
          {t("portal.nav.rides")}
        </Link>
      </p>
    </AdminListStack>
  );
}
