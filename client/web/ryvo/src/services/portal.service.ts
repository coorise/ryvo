import { BaseService } from "@/lib/base-service";
import type { PaymentAdminRow } from "@/services/admin.service";

export type PortalTripRow = {
  id: string;
  status: string;
  created_at: string;
  pickup_address: string | null;
  dropoff_address: string | null;
  client_id: string;
  driver_id: string | null;
  fare_estimate: number | null;
};

export type ActiveTripState = {
  trip: Record<string, unknown> | null;
  request: Record<string, unknown> | null;
};

export class PortalService extends BaseService {
  constructor() {
    super("trip-lifecycle");
  }

  getActiveTrip(token: string | null) {
    return this.get<ActiveTripState>("/v1/trip/active", token);
  }

  listMyTrips(token: string | null, limit = 100) {
    return this.get<{ trips: PortalTripRow[] }>(`/v1/me/trips?limit=${limit}`, token);
  }

  listMyPayments(token: string | null, opts?: { status?: string; limit?: number }) {
    const params = new URLSearchParams();
    if (opts?.status) params.set("status", opts.status);
    if (opts?.limit) params.set("limit", String(opts.limit));
    const q = params.toString() ? `?${params}` : "";
    return this.get<{ payments: PaymentAdminRow[] }>(`/v1/me/payments${q}`, token);
  }
}

export const portalService = new PortalService();

export function filterTripsForUser(
  trips: PortalTripRow[],
  userId: string,
  role: "driver" | "client",
): PortalTripRow[] {
  return trips.filter((t) => (role === "driver" ? t.driver_id === userId : t.client_id === userId));
}

export function filterPaymentsForUser(payments: PaymentAdminRow[], userId: string): PaymentAdminRow[] {
  return payments.filter((p) => p.rider_id === userId);
}
