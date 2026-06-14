import { BaseService } from "@/lib/base-service";
import type { KycDocument } from "@/services/drivers.service";

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

  listMine(token: string | null) {
    return this.get<{ vehicles: DriverVehicle[] }>("/v1/vehicles", token);
  }

  getVehicle(token: string | null, vehicleId: string) {
    return this.get<{ vehicle: DriverVehicle }>(`/v1/vehicles/${vehicleId}`, token);
  }

  create(token: string | null, body: Record<string, unknown>) {
    return this.post<{ vehicle: DriverVehicle }>("/v1/vehicles", body, token);
  }

  update(token: string | null, vehicleId: string, body: Record<string, unknown>) {
    return this.patch<{ vehicle: DriverVehicle }>(`/v1/vehicles/${vehicleId}`, body, token);
  }

  remove(token: string | null, vehicleId: string) {
    return this.delete<{ deleted: boolean }>(`/v1/vehicles/${vehicleId}`, token);
  }

  submitDocument(
    token: string | null,
    vehicleId: string,
    body: { doc_type: string; s3_key: string; label?: string },
  ) {
    return this.post<{ vehicle: DriverVehicle }>(
      `/v1/vehicles/${vehicleId}/documents`,
      body,
      token,
    );
  }

  getDocumentViewUrl(token: string | null, vehicleId: string, docId: string) {
    return this.get<{ url: string; mime_type: string; status: string }>(
      `/v1/vehicles/${vehicleId}/documents/${docId}/view-url`,
      token,
    );
  }

  getMediaViewUrl(token: string | null, vehicleId: string, key: string) {
    return this.get<{ url: string; mime_type: string }>(
      `/v1/vehicles/${vehicleId}/media/view-url?key=${encodeURIComponent(key)}`,
      token,
    );
  }

  setActiveVehicle(token: string | null, vehicleId: string | null) {
    return this.patch<{ active_vehicle_id: string | null }>(
      "/v1/me/active-vehicle",
      { vehicle_id: vehicleId },
      token,
    );
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
}

export const vehiclesService = new VehiclesService();

export type KycChecklist = {
  kyc_status: string;
  required: string[];
  documents: Record<string, KycDocument>;
  items: KycDocument[];
};
