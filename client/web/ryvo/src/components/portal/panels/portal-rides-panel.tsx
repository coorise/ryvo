"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { Car, MapPin } from "lucide-react";

import {
  AdminListStack,
  AdminTable,
  AdminTableCard,
  AdminTableHead,
  StatusBadge,
} from "@/components/admin/admin-list-ui";
import { RyvoButton } from "@/components/ryvo/ryvo-button";
import { PORTAL_ROUTES } from "@/configs/portal-nav";
import { useAuth } from "@/hooks/use-auth";
import { formatLastSeen } from "@/lib/format-date";
import {
  filterTripsForUser,
  portalService,
  type PortalTripRow,
} from "@/services/portal.service";
import type { PortalArea } from "@/configs/portal-nav";

type PortalRidesPanelProps = {
  area: PortalArea;
};

function statusVariant(status: string): "success" | "warning" | "default" | "danger" {
  if (status === "completed") return "success";
  if (status === "cancelled" || status === "canceled") return "danger";
  if (status === "in_progress" || status === "active") return "warning";
  return "default";
}

export function PortalRidesPanel({ area }: PortalRidesPanelProps) {
  const { t } = useTranslation();
  const { accessToken, user } = useAuth();
  const liveMapHref =
    area === "driver" ? PORTAL_ROUTES.driver.liveMap : PORTAL_ROUTES.client.liveMap;

  const activeQ = useQuery({
    queryKey: ["portal", area, "trip-active"],
    queryFn: () => portalService.getActiveTrip(accessToken),
    enabled: Boolean(accessToken),
  });

  const historyQ = useQuery({
    queryKey: ["portal", area, "trips"],
    queryFn: () => portalService.listMyTrips(accessToken),
    enabled: Boolean(accessToken),
    retry: false,
  });

  const trips: PortalTripRow[] =
    user && historyQ.data?.trips
      ? filterTripsForUser(historyQ.data.trips, user.id, area)
      : [];

  const active = activeQ.data?.trip as { id?: string; status?: string } | null;

  return (
    <AdminListStack>
      {active?.id ? (
        <div className="border-primary/30 rounded-2xl border p-4">
          <p className="text-sm font-semibold">{t("portal.rides.activeTrip")}</p>
          <p className="text-muted-foreground mt-1 text-sm">
            {String(active.status ?? "active")} · {active.id}
          </p>
          <RyvoButton intent="cta" size="sm" className="mt-3" asChild>
            <Link href={liveMapHref}>{t("portal.rides.trackOnMap")}</Link>
          </RyvoButton>
        </div>
      ) : null}

      {historyQ.isError ? (
        <p className="text-muted-foreground text-sm">{t("portal.rides.historyUnavailable")}</p>
      ) : null}

      <AdminTableCard>
        <AdminTable>
          <AdminTableHead>
            <tr>
              <th>{t("portal.rides.columns.when")}</th>
              <th>{t("portal.rides.columns.route")}</th>
              <th>{t("portal.rides.columns.status")}</th>
            </tr>
          </AdminTableHead>
          <tbody>
            {trips.length === 0 ? (
              <tr>
                <td colSpan={3} className="text-muted-foreground py-8 text-center text-sm">
                  {historyQ.isLoading ? t("common.loading") : t("common.noData")}
                </td>
              </tr>
            ) : (
              trips.map((trip) => (
                <tr key={trip.id}>
                  <td className="whitespace-nowrap text-sm">
                    {formatLastSeen(trip.created_at)}
                  </td>
                  <td className="text-sm">
                    <div className="flex items-start gap-1">
                      <MapPin className="text-primary mt-0.5 size-3 shrink-0" />
                      <span>
                        {trip.pickup_address ?? "—"}
                        <span className="text-muted-foreground block text-xs">
                          → {trip.dropoff_address ?? "—"}
                        </span>
                      </span>
                    </div>
                  </td>
                  <td>
                    <StatusBadge variant={statusVariant(trip.status)}>{trip.status}</StatusBadge>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </AdminTable>
      </AdminTableCard>

      {!historyQ.isError && trips.length === 0 && !active?.id ? (
        <div className="text-muted-foreground flex flex-col items-center gap-2 py-6 text-sm">
          <Car className="size-8 opacity-40" />
          <p>{t("portal.rides.emptyHint")}</p>
          <RyvoButton intent="outline" size="sm" asChild>
            <Link href={liveMapHref}>{t("portal.nav.liveMap")}</Link>
          </RyvoButton>
        </div>
      ) : null}
    </AdminListStack>
  );
}
