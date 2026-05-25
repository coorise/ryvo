import { BaseService } from "@/lib/base-service";

export type AuditLogRow = {
  id: string;
  action: string;
  actor_id: string | null;
  target_type: string | null;
  target_id: string | null;
  diff: Record<string, unknown> | null;
  ip?: string | null;
  user_agent?: string | null;
  created_at: string;
};

export type SecurityAuthEvent = {
  id: string;
  severity: "critical" | "warning" | "info";
  event_type: string;
  actor_id: string | null;
  actor_label: string | null;
  ip: string | null;
  country_code: string | null;
  mfa_used: boolean | null;
  details: string | null;
  created_at: string;
};

export type UserDeviceRow = {
  id: string;
  user_id: string;
  user_email: string;
  token_preview: string;
  platform: "ios" | "android" | "web";
  device_name: string | null;
  os_version: string | null;
  app_version: string | null;
  ip_last: string | null;
  country_code: string | null;
  created_at: string;
  last_seen_at: string | null;
  revoked_at: string | null;
  revoked_by: string | null;
};

export class AuditService extends BaseService {
  constructor() {
    super("audit-service");
  }

  listActivityLogs(token: string | null, limit = 300) {
    return this.get<{ logs: AuditLogRow[] }>(`/v1/logs?limit=${limit}`, token);
  }

  /** @deprecated use listActivityLogs */
  listLogs(token: string | null, limit = 200) {
    return this.listActivityLogs(token, limit);
  }

  listSecurityAuthEvents(token: string | null, severity?: string) {
    const q = severity ? `?severity=${encodeURIComponent(severity)}` : "";
    return this.get<{ events: SecurityAuthEvent[] }>(`/v1/security/auth-events${q}`, token);
  }

  listDevices(token: string | null, includeRevoked = true) {
    const q = includeRevoked ? "" : "?include_revoked=false";
    return this.get<{ devices: UserDeviceRow[] }>(`/v1/security/devices${q}`, token);
  }

  revokeDevice(token: string | null, id: string) {
    return this.post<{ device: UserDeviceRow }>(`/v1/security/devices/${id}/revoke`, {}, token);
  }
}

export const auditService = new AuditService();
