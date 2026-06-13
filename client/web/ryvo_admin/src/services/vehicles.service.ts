import { BaseService } from "@/lib/base-service";

export type VehicleDocument = {
  id: string;
  vehicle_id: string;
  doc_type: string;
  label: string | null;
  s3_key: string;
  status: string;
  rejection_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
};

export type DriverVehicle = {
  id: string;
  driver_id: string;
  make: string;
  model: string;
  year: number;
  plate: string | null;
  color: string | null;
  category: string;
  brand: string | null;
  name: string | null;
  max_speed_kmh: number | null;
  age_years: number | null;
  tyres_type: string | null;
  carbon_print: number | null;
  energy_type: string | null;
  status: string;
  rejection_reason: string | null;
  banner_key: string | null;
  image_keys: string[];
  video_key: string | null;
  photo_key: string | null;
  documents: VehicleDocument[];
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

  reviewVehicleDocument(
    token: string | null,
    vehicleId: string,
    docId: string,
    status: "approved" | "rejected",
    rejectionReason?: string,
  ) {
    return this.post<{ document: VehicleDocument }>(
      `/v1/admin/vehicles/${vehicleId}/documents/${docId}/review`,
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

  adminGetMediaViewUrl(token: string | null, vehicleId: string, key: string) {
    return this.get<{ url: string; mime_type: string }>(
      `/v1/admin/vehicles/${vehicleId}/media/view-url?key=${encodeURIComponent(key)}`,
      token,
    );
  }
}

export const vehiclesService = new VehiclesService();

export const VEHICLE_DOC_LABEL_KEYS: Record<string, string> = {
  registration: "drivers.vehicleDocRegistration",
  insurance: "drivers.vehicleDocInsurance",
  other: "drivers.vehicleDocOther",
};
