import { BaseService } from "@/lib/base-service";
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

export class AdminService extends BaseService {
  constructor() {
    super("auth-hooks");
  }

  getDashboard(token: string | null) {
    return this.get<AdminDashboardData>("/v1/admin/dashboard", token);
  }

  getSettings(token: string | null) {
    return this.get<{ preferences: PlatformPreferences }>("/v1/admin/settings", token);
  }

  updateSettings(token: string | null, preferences: Partial<PlatformPreferences>) {
    return this.patch<{ preferences: PlatformPreferences }>(
      "/v1/admin/settings",
      preferences,
      token,
    );
  }

  listTrips(token: string | null, limit = 100) {
    return this.get<{
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
    }>(`/v1/admin/trips?limit=${limit}`, token);
  }

  listPayments(token: string | null, limit = 100) {
    return this.get<{
      payments: {
        id: string;
        amount: number;
        currency: string;
        status: string;
        created_at: string;
        trip_id: string | null;
        client_id: string;
      }[];
    }>(`/v1/admin/payments?limit=${limit}`, token);
  }
}

export class PlatformSettingsService extends BaseService {
  constructor() {
    super("auth-hooks");
  }

  getPublic() {
    return this.get<{
      appName: string;
      defaultLanguage: string;
      supportedLanguages: string[];
    }>("/v1/settings/public", null);
  }
}

export const adminService = new AdminService();
export const platformSettingsService = new PlatformSettingsService();
