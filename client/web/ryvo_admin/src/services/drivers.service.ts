import { BaseService } from "@/lib/base-service";
import type { AdminReviewRow } from "@/services/rbac.service";

export type KycDocument = {
  id: string;
  driver_id: string;
  doc_type: string;
  s3_key: string;
  status: string;
  rejection_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
};

export type DriverDetail = {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
  kyc_status: string;
  avatar_url: string | null;
  rating_avg: number;
  trip_count: number;
  email_verified: boolean;
  profile_verified: boolean;
  profile: Record<string, unknown> | null;
  documents: KycDocument[];
  roles: string[];
  reviews: AdminReviewRow[];
};

export class DriversService extends BaseService {
  constructor() {
    super("kyc-service");
  }

  listDrivers(token: string | null) {
    return this.get<{ drivers: DriverDetail[] }>("/v1/admin/drivers", token);
  }

  getDriver(token: string | null, driverId: string) {
    return this.get<{ driver: DriverDetail }>(`/v1/admin/drivers/${driverId}`, token);
  }

  createDriver(
    token: string | null,
    input: { email: string; password: string; full_name?: string; phone?: string },
  ) {
    return this.post<{ driver: DriverDetail }>("/v1/admin/drivers", input, token);
  }

  getDocumentViewUrl(token: string | null, driverId: string, docType: string) {
    return this.get<{ url: string; mime_type: string; status: string }>(
      `/v1/admin/drivers/${driverId}/documents/${docType}/view-url`,
      token,
    );
  }

  reviewDocument(
    token: string | null,
    driverId: string,
    docType: string,
    status: "approved" | "rejected",
    rejectionReason?: string,
  ) {
    return this.post<{ driver: DriverDetail }>(
      `/v1/admin/drivers/${driverId}/documents/${docType}/review`,
      { status, rejection_reason: rejectionReason },
      token,
    );
  }
}

export const driversService = new DriversService();
