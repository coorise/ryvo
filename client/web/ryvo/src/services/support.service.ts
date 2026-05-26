import { BaseService } from "@/lib/base-service";

export type SupportTicket = {
  id: string;
  user_id: string;
  subject: string;
  category: string;
  status: string;
  trip_id: string | null;
  created_at: string;
  support_level?: number | null;
  priority?: string | null;
  assignee_id?: string | null;
};

export type TicketMessage = {
  id: string;
  ticket_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  message_kind?: string | null;
};

export type PatchTicketInput = {
  status?: "open" | "in_progress" | "resolved";
  support_level?: number;
  priority?: "low" | "medium" | "high" | "critical";
  assignee_id?: string | null;
};

export class SupportService extends BaseService {
  constructor() {
    super("support-service");
  }

  listTickets(token: string | null) {
    return this.get<{ tickets: SupportTicket[] }>("/v1/tickets", token);
  }

  patchTicket(token: string | null, ticketId: string, body: PatchTicketInput) {
    return this.patch<{ ticket: SupportTicket }>(`/v1/tickets/${ticketId}`, body, token);
  }

  listMessages(token: string | null, ticketId: string) {
    return this.get<{ messages: TicketMessage[] }>(`/v1/tickets/${ticketId}/messages`, token);
  }

  postMessage(
    token: string | null,
    ticketId: string,
    body: string,
    opts?: { message_kind?: "user" | "staff" | "ai" | "system" },
  ) {
    return this.post<{ message: TicketMessage }>(
      `/v1/tickets/${ticketId}/messages`,
      { body, message_kind: opts?.message_kind },
      token,
    );
  }

  createAdminTicket(
    token: string | null,
    body: {
      user_id: string;
      subject: string;
      message: string;
      audience: "clients" | "drivers";
    },
  ) {
    return this.post<{ ticket: SupportTicket; message: TicketMessage }>(
      "/v1/admin/tickets",
      body,
      token,
    );
  }
}

export const supportService = new SupportService();
