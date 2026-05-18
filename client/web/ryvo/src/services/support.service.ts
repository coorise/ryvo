import { BaseService } from "@/lib/base-service";

export type SupportTicket = {
  id: string;
  user_id: string;
  subject: string;
  category: string;
  status: string;
  trip_id: string | null;
  created_at: string;
};

export type TicketMessage = {
  id: string;
  ticket_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

export class SupportService extends BaseService {
  constructor() {
    super("support-service");
  }

  listTickets(token: string | null) {
    return this.get<{ tickets: SupportTicket[] }>("/v1/tickets", token);
  }

  listMessages(token: string | null, ticketId: string) {
    return this.get<{ messages: TicketMessage[] }>(`/v1/tickets/${ticketId}/messages`, token);
  }

  postMessage(token: string | null, ticketId: string, body: string) {
    return this.post<{ message: TicketMessage }>(
      `/v1/tickets/${ticketId}/messages`,
      { body },
      token,
    );
  }
}

export const supportService = new SupportService();
