import { BaseService } from "@/lib/base-service";

export type VehicleDocument = {
  id: string;
  vehicle_id: string;
  doc_type: string;
  label: string | null;
  s3_key: string;
  status: string;
  rejection_reason: string | null;
  created_at: string;
};

export type DriverVehicle = {
  id: string;
  driver_id: string;
  make: string;
  model: string;
  year: number;
  plate: string | null;
  brand: string | null;
  name: string | null;
  status: string;
  rejection_reason: string | null;
  documents: VehicleDocument[];
  energy_type: string | null;
};

export class VehiclesService extends BaseService {
  constructor() {
    super("kyc-service");
  }

  reviewVehicle(
    token: string | null,
    vehicleId: string,
    status: "approved" | "rejected",
    rejectionReason?: string,
  ) {
    return this.post<{ vehicle: DriverVehicle }>(
      `/v1/admin/vehicles/${vehicleId}/review`,
      { status, rejection_reason: rejectionReason },
      token,
    );
  }

  adminGetDocumentViewUrl(token: string | null, vehicleId: string, docId: string) {
    return this.get<{ url: string; mime_type: string; status: string }>(
      `/v1/admin/vehicles/${vehicleId}/documents/${docId}/view-url`,
      token,
    );
  }
}

export const vehiclesService = new VehiclesService();
