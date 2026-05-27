import { BaseService } from "@/lib/base-service";

export type AdminMessageCampaign = {
  id: string;
  created_by: string | null;
  audience: "clients" | "drivers" | "all";
  body_template: string;
  send_push: boolean;
  send_email: boolean;
  delay_minutes: number;
  status: "draft" | "queued" | "sent" | "cancelled";
  last_sent_at: string | null;
  created_at: string;
  updated_at: string;
  updated_by?: string | null;
  updated_by_email?: string | null;
};

export type MessageCampaignFormInput = {
  audience: "clients" | "drivers" | "all";
  body_template: string;
  send_push: boolean;
  send_email: boolean;
  delay_minutes: number;
};

export type CreateMessageCampaignInput = MessageCampaignFormInput & {
  status?: "draft" | "queued" | "sent" | "cancelled";
};

export type UpdateMessageCampaignInput = Partial<MessageCampaignFormInput> & {
  status?: "draft" | "queued" | "sent" | "cancelled";
};

export class MessagesService extends BaseService {
  constructor() {
    super("notification-service");
  }

  list(token: string | null, audience?: "clients" | "drivers" | "all") {
    const qs = audience ? `?audience=${encodeURIComponent(audience)}` : "";
    return this.get<{ campaigns: AdminMessageCampaign[] }>(
      `/v1/admin/communication/messages${qs}`,
      token,
    );
  }

  getById(token: string | null, id: string) {
    return this.get<{ campaign: AdminMessageCampaign }>(
      `/v1/admin/communication/messages/${id}`,
      token,
    );
  }

  create(token: string | null, body: CreateMessageCampaignInput) {
    return this.post<{ campaign: AdminMessageCampaign }>(
      "/v1/admin/communication/messages",
      body,
      token,
    );
  }

  update(token: string | null, id: string, body: UpdateMessageCampaignInput) {
    return this.patch<{ campaign: AdminMessageCampaign }>(
      `/v1/admin/communication/messages/${id}`,
      body,
      token,
    );
  }

  send(token: string | null, id: string, body?: Partial<MessageCampaignFormInput>) {
    return this.post<{ campaign: AdminMessageCampaign }>(
      `/v1/admin/communication/messages/${id}/send`,
      body ?? {},
      token,
    );
  }

  resend(token: string | null, id: string) {
    return this.post<{ campaign: AdminMessageCampaign }>(
      `/v1/admin/communication/messages/${id}/resend`,
      {},
      token,
    );
  }

  remove(token: string | null, id: string) {
    return this.delete<{ deleted: boolean }>(`/v1/admin/communication/messages/${id}`, token);
  }
}

export const messagesService = new MessagesService();
