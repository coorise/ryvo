import { BaseService } from "@/lib/base-service";

export class PaymentService extends BaseService {
  constructor() {
    super("payment-gateway");
  }

  createIntent(
    token: string | null,
    body: {
      request_id: string;
      amount?: number;
      currency?: string;
      idempotency_key: string;
    },
  ) {
    return this.post<{ intent: Record<string, unknown>; idempotent?: boolean }>(
      "/v1/intent",
      body,
      token,
    );
  }
}

export const paymentService = new PaymentService();
