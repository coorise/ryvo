"use client";

import { useQuery } from "@tanstack/react-query";
import { Star, User } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  AdminListStack,
  AdminTable,
  AdminTableCard,
  AdminTableHead,
} from "@/components/admin/admin-list-ui";
import { RyvoButton } from "@/components/ryvo/ryvo-button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { getDriverPublicProfile } from "@/services/profile.service";
import { portalService } from "@/services/portal.service";
import type { PortalArea } from "@/configs/portal-nav";

type PortalCounterpartiesPanelProps = {
  area: PortalArea;
};

export function PortalCounterpartiesPanel({ area }: PortalCounterpartiesPanelProps) {
  const { t } = useTranslation();
  const { accessToken, user } = useAuth();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["portal", area, "counterparties"],
    queryFn: () => portalService.listMyTrips(accessToken),
    enabled: Boolean(accessToken) && Boolean(user?.id),
    retry: false,
  });

  const profileQ = useQuery({
    queryKey: ["portal", "driver-public", selectedId],
    queryFn: () => getDriverPublicProfile(accessToken, selectedId!),
    enabled: Boolean(accessToken) && area === "client" && Boolean(selectedId),
  });

  const rows = useMemo(() => {
    const mine = data?.trips ?? [];
    const map = new Map<string, { id: string; trips: number; name?: string }>();
    for (const trip of mine) {
      const otherId = area === "driver" ? trip.client_id : trip.driver_id;
      if (!otherId) continue;
      const prev = map.get(otherId);
      map.set(otherId, { id: otherId, trips: (prev?.trips ?? 0) + 1 });
    }
    return [...map.values()].sort((a, b) => b.trips - a.trips);
  }, [area, data?.trips]);

  const profile = profileQ.data?.profile;
  const vehicle = profileQ.data?.active_vehicle as {
    make?: string;
    model?: string;
    brand?: string;
    name?: string;
    energy_type?: string;
  } | null;

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
                {area === "client" ? <th /> : null}
              </tr>
            </AdminTableHead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={area === "client" ? 3 : 2} className="text-muted-foreground py-8 text-center text-sm">
                    {t("common.loading")}
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={area === "client" ? 3 : 2} className="text-muted-foreground py-8 text-center text-sm">
                    {t("common.noData")}
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id}>
                    <td className="font-mono text-sm">{row.id.slice(0, 8)}…</td>
                    <td className="text-sm">{row.trips}</td>
                    {area === "client" ? (
                      <td className="text-right">
                        <RyvoButton intent="outline" size="sm" onClick={() => setSelectedId(row.id)}>
                          {t("portal.counterparties.viewProfile")}
                        </RyvoButton>
                      </td>
                    ) : null}
                  </tr>
                ))
              )}
            </tbody>
          </AdminTable>
        </AdminTableCard>
      )}

      <Dialog open={Boolean(selectedId)} onOpenChange={(open) => !open && setSelectedId(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("portal.counterparties.profileTitle")}</DialogTitle>
          </DialogHeader>
          {profileQ.isLoading ? (
            <p className="text-muted-foreground text-sm">{t("common.loading")}</p>
          ) : profile ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="bg-muted flex size-12 items-center justify-center rounded-full">
                  <User className="size-6" />
                </div>
                <div>
                  <p className="font-semibold">{profile.full_name ?? profile.user_id.slice(0, 8)}</p>
                  <p className="text-muted-foreground flex items-center gap-1 text-sm">
                    <Star className="size-3.5 fill-current text-amber-500" />
                    {Number(profile.rating_avg).toFixed(1)} · {profile.trip_count} {t("portal.counterparties.trips")}
                  </p>
                </div>
              </div>
              {vehicle ? (
                <div className="border-border rounded-xl border p-3 text-sm">
                  <p className="font-semibold">{t("portal.counterparties.activeCar")}</p>
                  <p>
                    {vehicle.brand || vehicle.make} {vehicle.name || vehicle.model}
                  </p>
                  {vehicle.energy_type ? (
                    <p className="text-muted-foreground text-xs">{vehicle.energy_type}</p>
                  ) : null}
                </div>
              ) : null}
              {(profileQ.data?.reviews ?? []).slice(0, 5).map((r, i) => (
                <div key={i} className="border-border border-b pb-2 text-sm last:border-0">
                  <p className="flex items-center gap-1 font-medium">
                    <Star className="size-3 fill-current text-amber-500" /> {r.stars}/5
                  </p>
                  {r.comment ? <p className="text-muted-foreground">{r.comment}</p> : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">{t("common.noData")}</p>
          )}
        </DialogContent>
      </Dialog>
    </AdminListStack>
  );
}
