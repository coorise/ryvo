import type { DriverVehicle } from "@/services/vehicles.service";
import { isRealStorageKey } from "@/lib/storage-keys";

export const MAX_VIDEO_BYTES = 30 * 1024 * 1024;
export const MAX_VIDEO_SECONDS = 30;
export const MIN_GALLERY_IMAGES = 2;

export const TYRES_TYPES = ["summer", "winter", "all_season", "performance", "other"] as const;
export const ENERGY_TYPES = ["electric", "fuel", "hybrid"] as const;

export type VehicleFormState = {
  brand: string;
  name: string;
  max_speed_kmh: string;
  age_years: string;
  tyres_type: string;
  carbon_print: string;
  energy_type: string;
  plate: string;
  make: string;
  model: string;
  year: number;
};

export const emptyVehicleForm: VehicleFormState = {
  brand: "",
  name: "",
  max_speed_kmh: "",
  age_years: "",
  tyres_type: "",
  carbon_print: "",
  energy_type: "fuel",
  plate: "",
  make: "",
  model: "",
  year: new Date().getFullYear(),
};

export function vehicleToForm(v: DriverVehicle): VehicleFormState {
  return {
    brand: v.brand ?? "",
    name: v.name ?? "",
    max_speed_kmh: v.max_speed_kmh != null ? String(v.max_speed_kmh) : "",
    age_years: v.age_years != null ? String(v.age_years) : "",
    tyres_type: v.tyres_type ?? "",
    carbon_print: v.carbon_print != null ? String(v.carbon_print) : "",
    energy_type: v.energy_type ?? "fuel",
    plate: v.plate ?? "",
    make: v.make ?? "",
    model: v.model ?? "",
    year: v.year ?? new Date().getFullYear(),
  };
}

export function formToBody(form: VehicleFormState): Record<string, unknown> {
  const brand = form.brand.trim();
  const name = form.name.trim();
  return {
    brand: brand || null,
    name: name || null,
    max_speed_kmh: form.max_speed_kmh ? Number(form.max_speed_kmh) : null,
    age_years: form.age_years ? Number(form.age_years) : null,
    tyres_type: form.tyres_type || null,
    carbon_print: form.carbon_print ? Number(form.carbon_print) : null,
    energy_type: form.energy_type,
    plate: form.plate.trim() || null,
    make: form.make.trim() || brand || "Unknown",
    model: form.model.trim() || name || "Unknown",
    year: Number(form.year) || new Date().getFullYear(),
    category: "economy",
  };
}

export type VehicleProfileChecklist = {
  profileComplete: boolean;
  hasBanner: boolean;
  galleryCount: number;
  hasRegistration: boolean;
  hasInsurance: boolean;
  readyForReview: boolean;
};

export function buildVehicleChecklist(
  form: VehicleFormState,
  vehicle: DriverVehicle | undefined,
): VehicleProfileChecklist {
  const profileComplete =
    Boolean(form.brand.trim()) &&
    Boolean(form.name.trim()) &&
    Boolean(form.max_speed_kmh) &&
    Boolean(form.age_years) &&
    Boolean(form.tyres_type) &&
    Boolean(form.carbon_print) &&
    ENERGY_TYPES.includes(form.energy_type as (typeof ENERGY_TYPES)[number]) &&
    Boolean(form.plate.trim());

  const hasBanner = isRealStorageKey(vehicle?.banner_key);
  const galleryCount = (vehicle?.image_keys ?? []).filter(isRealStorageKey).length;
  const hasRegistration = Boolean(
    vehicle?.documents.some((d) => d.doc_type === "registration" && isRealStorageKey(d.s3_key)),
  );
  const hasInsurance = Boolean(
    vehicle?.documents.some((d) => d.doc_type === "insurance" && isRealStorageKey(d.s3_key)),
  );

  return {
    profileComplete,
    hasBanner,
    galleryCount,
    hasRegistration,
    hasInsurance,
    readyForReview:
      profileComplete &&
      hasBanner &&
      galleryCount >= MIN_GALLERY_IMAGES &&
      hasRegistration &&
      hasInsurance,
  };
}

export async function validateVideoFile(file: File): Promise<{ ok: boolean; reason?: string }> {
  if (file.size > MAX_VIDEO_BYTES) return { ok: false, reason: "size" };
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      if (video.duration > MAX_VIDEO_SECONDS) resolve({ ok: false, reason: "duration" });
      else resolve({ ok: true });
    };
    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      resolve({ ok: false, reason: "invalid" });
    };
    video.src = URL.createObjectURL(file);
  });
}
