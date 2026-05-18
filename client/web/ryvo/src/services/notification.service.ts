import { BaseService } from "@/lib/base-service";

export type InboxNotification = {
  id: string;
  user_id: string;
  channel: string;
  type: string;
  payload: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
};

export class NotificationService extends BaseService {
  constructor() {
    super("notification-service");
  }

  getInbox(token: string | null) {
    return this.get<{ notifications: InboxNotification[] }>("/v1/inbox", token);
  }

  markRead(token: string | null, id: string) {
    return this.patch<{ id: string; read: boolean }>(`/v1/inbox/${id}/read`, {}, token);
  }
}

export const notificationService = new NotificationService();
