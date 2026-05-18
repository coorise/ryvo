"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { PermissionGate } from "@/guards/permission-gate";
import { useAuth } from "@/hooks/use-auth";
import { adminService } from "@/services";
import { cn } from "@/lib/utils";

export default function AdminRidesPage() {
  const { t } = useTranslation();
  const { accessToken } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "trips"],
    queryFn: () => adminService.listTrips(accessToken),
    enabled: Boolean(accessToken),
  });

  return (
    <PermissionGate permissions={["rides:read"]} fallback={<p>{t("common.noData")}</p>}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("nav.rides")}</h1>
          <p className="text-muted-foreground text-sm">{t("rides.subtitle")}</p>
        </div>
        {isLoading ? (
          <p className="text-muted-foreground text-sm">{t("common.loading")}</p>
        ) : (
          <div className="border-border bg-card overflow-x-auto rounded-3xl border">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-muted/50 text-muted-foreground text-left text-xs uppercase">
                <tr>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">{t("rides.status")}</th>
                  <th className="px-4 py-3">{t("rides.pickup")}</th>
                  <th className="px-4 py-3">{t("rides.fare")}</th>
                  <th className="px-4 py-3">{t("rides.created")}</th>
                </tr>
              </thead>
              <tbody>
                {(data?.trips ?? []).map((trip) => (
                  <tr key={trip.id} className="border-border border-t">
                    <td className="px-4 py-3 font-mono text-xs">{trip.id.slice(0, 8)}</td>
                    <td className="px-4 py-3">
                      <span className="bg-muted rounded-md px-2 py-0.5 text-[10px] font-bold uppercase">
                        {trip.status}
                      </span>
                    </td>
                    <td className="text-muted-foreground max-w-[200px] truncate px-4 py-3">
                      {trip.pickup_address ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      {trip.fare_estimate != null ? `$${trip.fare_estimate}` : "—"}
                    </td>
                    <td className="text-muted-foreground px-4 py-3">
                      {new Date(trip.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!data?.trips?.length && (
              <p className="text-muted-foreground px-4 py-8 text-center text-sm">{t("common.noData")}</p>
            )}
          </div>
        )}
      </div>
    </PermissionGate>
  );
}
