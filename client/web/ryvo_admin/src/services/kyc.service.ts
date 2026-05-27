import { BaseService } from "@/lib/base-service";

export type KycQueueItem = {
  id: string;
  driver_id: string;
  doc_type: string;
  status: string;
  created_at: string;
  s3_key: string;
};

export class KycService extends BaseService {
  constructor() {
    super("kyc-service");
  }

  getQueue(token: string | null) {
    return this.get<{ queue: KycQueueItem[] }>("/v1/queue", token);
  }

  review(
    token: string | null,
    driverId: string,
    docType: string,
    status: "approved" | "rejected",
    rejectionReason?: string,
  ) {
    return this.post("/v1/review", {
      driver_id: driverId,
      doc_type: docType,
      status,
      rejection_reason: rejectionReason,
    }, token);
  }
}

export const kycService = new KycService();
