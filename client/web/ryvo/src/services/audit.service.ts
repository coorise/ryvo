import { BaseService } from "@/lib/base-service";

export type AuditLogRow = {
  id: string;
  action: string;
  actor_id: string | null;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export class AuditService extends BaseService {
  constructor() {
    super("audit-service");
  }

  listLogs(token: string | null, limit = 200) {
    return this.get<{ logs: AuditLogRow[] }>(`/v1/logs?limit=${limit}`, token);
  }
}

export const auditService = new AuditService();
