import { BaseService } from "@/lib/base-service";

export type TripEstimate = {
  total: number;
  currency?: string;
  breakdown?: Record<string, number>;
};

export type TripRequestBody = {
  pickup_lat: number;
  pickup_lng: number;
  dropoff_lat: number;
  dropoff_lng: number;
  pickup_address?: string;
  dropoff_address?: string;
  vehicle_category: "economy" | "comfort" | "xl";
  idempotency_key: string;
};

export type ActiveTripResponse = {
  trip?: Record<string, unknown> | null;
  request?: Record<string, unknown> | null;
  assignment?: Record<string, unknown> | null;
  phase?: string;
};

export class TripService extends BaseService {
  constructor() {
    super("trip-lifecycle");
  }

  estimate(token: string | null, body: Omit<TripRequestBody, "idempotency_key">) {
    return this.post<{ estimate: TripEstimate }>("/v1/estimate", body, token);
  }

  requestRide(token: string | null, body: TripRequestBody) {
    return this.post<{ request: Record<string, unknown>; estimate?: TripEstimate }>(
      "/v1/trip/request",
      body,
      token,
    );
  }

  getActiveTrip(token: string | null) {
    return this.get<ActiveTripResponse>("/v1/trip/active", token);
  }

  getRequestStatus(token: string | null, requestId: string) {
    return this.get<{ request: Record<string, unknown> }>(`/v1/request/${requestId}/status`, token);
  }

  cancelRequest(token: string | null, requestId: string) {
    return this.post<{ cancelled: boolean }>(`/v1/request/${requestId}/cancel`, {}, token);
  }

  acceptAssignment(token: string | null, assignmentId: string) {
    return this.post<{ request: Record<string, unknown>; proceed_to_payment?: boolean }>(
      `/v1/assignment/${assignmentId}/accept`,
      {},
      token,
    );
  }

  rejectAssignment(token: string | null, assignmentId: string) {
    return this.post<{ rejected: boolean }>(`/v1/assignment/${assignmentId}/reject`, {}, token);
  }

  transitionTrip(token: string | null, tripId: string, status: string) {
    return this.post<{ trip: Record<string, unknown> }>(
      `/v1/trip/${tripId}/transition`,
      { status },
      token,
    );
  }

  rateTrip(
    token: string | null,
    tripId: string,
    payload: { stars: number; comment?: string; role: "driver" | "rider" },
  ) {
    return this.post<{ review: Record<string, unknown> }>(`/v1/trip/${tripId}/rate`, payload, token);
  }
}

export const tripService = new TripService();
