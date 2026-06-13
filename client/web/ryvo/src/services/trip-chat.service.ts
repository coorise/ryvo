import { BaseService } from "@/lib/base-service";

export type TripChatMessage = {
  id: string;
  trip_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

export class TripChatService extends BaseService {
  constructor() {
    super("trip-chat");
  }

  listMessages(token: string | null, tripId: string) {
    return this.get<{ messages: TripChatMessage[] }>(`/v1/trip/${tripId}/messages`, token);
  }

  sendMessage(token: string | null, tripId: string, body: string) {
    return this.post<{ message: TripChatMessage }>(`/v1/trip/${tripId}/messages`, { body }, token);
  }
}

export const tripChatService = new TripChatService();
