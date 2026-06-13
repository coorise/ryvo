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

  getChecklist(token: string | null) {
    return this.get<{
      kyc_status: string;
      required: string[];
      documents: Record<string, { doc_type: string; status: string; rejection_reason?: string | null }>;
    }>("/v1/checklist", token);
  }

  submitDocument(token: string | null, docType: string, s3Key: string) {
    return this.post<{ document: Record<string, unknown> }>(
      "/v1/submit",
      { doc_type: docType, s3_key: s3Key },
      token,
    );
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
