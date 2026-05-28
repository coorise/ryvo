import { apiRequest } from "@/lib/api-client";
import type { PlatformPreferences } from "@/types/interfaces/schemas/platform.schema";

export type AdminDashboardData = {
  stats: {
    rides_24h: number;
    revenue_today: number;
    cancel_rate_pct: number;
    satisfaction_avg: number | null;
  };
  badges: { rides: number; drivers: number; tickets: number };
  alerts: {
    id: string;
    severity: "critical" | "warning" | "info";
    text: string;
    href: string;
  }[];
  chart: { label: string; count: number }[];
  pending_drivers: { id: string; name: string; city: string; status: string }[];
  recent_audit: {
    id: string;
    action: string;
    actor_id: string | null;
    target_type: string | null;
    created_at: string;
  }[];
  live: { active_trips: number };
};

export type AdminAnalyticsData = {
  period: "7d" | "30d" | "90d" | "1y";
  audience: "all" | "clients" | "drivers";
  kpis: {
    activeUsers: number;
    completedTrips: number;
    avgRating: number;
    cancelRate: number;
    avgWaitMin: number;
    driverOnlineHours: number;
  };
  volume: { label: string; trips: number }[];
  ratingDist: { stars: number; count: number }[];
  destinations: { name: string; count: number }[];
  experience: { metric: string; score: number }[];
};

/** Admin UI calls are routed to the owning edge function per domain. */
export class AdminService {
  getDashboard(token: string | null) {
    return apiRequest<AdminDashboardData>("audit-service", "/v1/admin/dashboard", { token });
  }

  getAnalytics(
    token: string | null,
    period: "7d" | "30d" | "90d" | "1y",
    audience: "all" | "clients" | "drivers",
  ) {
    const qs = new URLSearchParams({ period, audience });
    return apiRequest<AdminAnalyticsData>(
      "audit-service",
      `/v1/admin/analytics?${qs}`,
      { token },
    );
  }

  getSettings(token: string | null) {
    return apiRequest<{ preferences: PlatformPreferences }>(
      "profile-service",
      "/v1/admin/settings",
      { token },
    );
  }

  updateSettings(token: string | null, preferences: Partial<PlatformPreferences>) {
    return apiRequest<{ preferences: PlatformPreferences }>(
      "profile-service",
      "/v1/admin/settings",
      { method: "PATCH", body: preferences, token },
    );
  }

  listTrips(token: string | null, limit = 100) {
    return apiRequest<{
      trips: {
        id: string;
        status: string;
        created_at: string;
        pickup_address: string | null;
        dropoff_address: string | null;
        client_id: string;
        driver_id: string | null;
        fare_estimate: number | null;
      }[];
    }>("trip-lifecycle", `/v1/admin/trips?limit=${limit}`, { token });
  }

  listPayments(token: string | null, opts?: { status?: string; limit?: number }) {
    const params = new URLSearchParams();
    if (opts?.status) params.set("status", opts.status);
    if (opts?.limit) params.set("limit", String(opts.limit));
    const q = params.toString() ? `?${params}` : "";
    return apiRequest<{ payments: PaymentAdminRow[] }>(
      "payment-gateway",
      `/v1/admin/payments${q}`,
      { token },
    );
  }
}

export type PaymentAdminRow = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  provider: string;
  provider_intent_id: string | null;
  created_at: string;
  settled_at: string | null;
  trip_id: string | null;
  request_id: string | null;
  rider_id: string;
  rider_email: string;
};

export class PlatformSettingsService {
  getPublic() {
    return apiRequest<{
      appName: string;
      defaultLanguage: string;
      supportedLanguages: string[];
      defaultMapCenter?: { lat: number; lng: number };
    }>("profile-service", "/v1/settings/public", {});
  }
}

export const adminService = new AdminService();
export const platformSettingsService = new PlatformSettingsService();
