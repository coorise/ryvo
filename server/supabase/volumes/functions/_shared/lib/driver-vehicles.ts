import { getAdminClient } from "./supabase.ts";
import { emitAudit, queueNotification } from "./events.ts";
import type { AuthLike } from "./dynamic-rbac.ts";
import { hasPerm } from "./dynamic-rbac.ts";
import { isRealStorageKey } from "./storage-keys.ts";

export { PERSONAL_KYC_DOC_TYPES } from "./kyc-documents.ts";

export const VEHICLE_DOC_TYPES = ["registration", "insurance", "other"] as const;

function mimeFromKey(key: string): string {
  const lower = key.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".mp4") || lower.endsWith(".webm")) return "video/mp4";
  return "application/octet-stream";
}

const STORAGE_BUCKET = "ryvo-storage";

async function signedUrlForKey(key: string): Promise<string> {
  const db = getAdminClient();
  if (!isRealStorageKey(key)) throw new Error("NO_FILE");
  const { data: signed, error } = await db.storage.from(STORAGE_BUCKET).createSignedUrl(key, 3600);
  if (error || !signed?.signedUrl) throw new Error(error?.message ?? "STORAGE_ERROR");
  return signed.signedUrl;
}

export async function getPersonalKycDocumentViewUrl(driverId: string, docType: string) {
  const db = getAdminClient();
  const { data: doc, error } = await db
    .from("kyc_documents")
    .select("s3_key, status")
    .eq("driver_id", driverId)
    .eq("doc_type", docType)
    .maybeSingle();
  if (error || !doc) throw new Error("NOT_FOUND");
  const url = await signedUrlForKey(doc.s3_key);
  return { url, mime_type: mimeFromKey(doc.s3_key), status: doc.status };
}

export async function listDriverVehicles(driverId: string) {
  const db = getAdminClient();
  const { data: vehicles, error } = await db
    .from("vehicles")
    .select("*")
    .eq("driver_id", driverId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  const ids = (vehicles ?? []).map((v) => v.id);
  const { data: docs } = ids.length
    ? await db.from("vehicle_documents").select("*").in("vehicle_id", ids)
    : { data: [] };

  const byVehicle = new Map<string, typeof docs>();
  for (const d of docs ?? []) {
    const list = byVehicle.get(d.vehicle_id) ?? [];
    list.push(d);
    byVehicle.set(d.vehicle_id, list);
  }

  return (vehicles ?? []).map((v) => ({
    ...v,
    documents: byVehicle.get(v.id) ?? [],
  }));
}

export async function getDriverVehicle(driverId: string, vehicleId: string) {
  const db = getAdminClient();
  const { data: vehicle, error } = await db
    .from("vehicles")
    .select("*")
    .eq("id", vehicleId)
    .eq("driver_id", driverId)
    .maybeSingle();
  if (error || !vehicle) throw new Error("NOT_FOUND");
  const { data: documents } = await db
    .from("vehicle_documents")
    .select("*")
    .eq("vehicle_id", vehicleId)
    .order("created_at", { ascending: false });
  return { ...vehicle, documents: documents ?? [] };
}

export async function createDriverVehicle(
  driverId: string,
  input: Record<string, unknown>,
) {
  const db = getAdminClient();
  const { data, error } = await db
    .from("vehicles")
    .insert({
      driver_id: driverId,
      make: input.make ?? "Unknown",
      model: input.model ?? "Unknown",
      year: input.year ?? new Date().getFullYear(),
      plate: input.plate ?? null,
      color: input.color ?? null,
      category: input.category ?? "economy",
      capacity: input.capacity ?? 4,
      brand: input.brand ?? null,
      name: input.name ?? null,
      max_speed_kmh: input.max_speed_kmh ?? null,
      age_years: input.age_years ?? null,
      tyres_type: input.tyres_type ?? null,
      carbon_print: input.carbon_print ?? null,
      energy_type: input.energy_type ?? null,
      banner_key: input.banner_key ?? null,
      image_keys: input.image_keys ?? [],
      video_key: input.video_key ?? null,
      photo_key: input.photo_key ?? null,
      status: "pending",
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return getDriverVehicle(driverId, data.id);
}

export async function updateDriverVehicle(
  driverId: string,
  vehicleId: string,
  input: Record<string, unknown>,
) {
  const db = getAdminClient();
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString(), status: "pending" };
  for (const key of [
    "make",
    "model",
    "year",
    "plate",
    "color",
    "category",
    "capacity",
    "brand",
    "name",
    "max_speed_kmh",
    "age_years",
    "tyres_type",
    "carbon_print",
    "energy_type",
    "banner_key",
    "image_keys",
    "video_key",
    "photo_key",
  ]) {
    if (input[key] !== undefined) patch[key] = input[key];
  }
  const { error } = await db
    .from("vehicles")
    .update(patch)
    .eq("id", vehicleId)
    .eq("driver_id", driverId);
  if (error) throw new Error(error.message);
  return getDriverVehicle(driverId, vehicleId);
}

export async function deleteDriverVehicle(driverId: string, vehicleId: string) {
  const db = getAdminClient();
  await db.from("driver_profiles").update({ active_vehicle_id: null }).eq("active_vehicle_id", vehicleId);
  const { error } = await db.from("vehicles").delete().eq("id", vehicleId).eq("driver_id", driverId);
  if (error) throw new Error(error.message);
  return { deleted: true };
}

import { isRealStorageKey } from "./storage-keys.ts";

export async function submitVehicleDocument(
  driverId: string,
  vehicleId: string,
  input: { doc_type: string; s3_key: string; label?: string },
) {
  const db = getAdminClient();
  if (!isRealStorageKey(input.s3_key)) throw new Error("INVALID_STORAGE_KEY");
  const vehicle = await getDriverVehicle(driverId, vehicleId);
  if (vehicle.driver_id !== driverId) throw new Error("FORBIDDEN");

  if (input.doc_type === "other") {
    const { error } = await db.from("vehicle_documents").insert({
      vehicle_id: vehicleId,
      doc_type: "other",
      label: input.label ?? "Other document",
      s3_key: input.s3_key,
      status: "pending",
      rejection_reason: null,
      reviewed_by: null,
      reviewed_at: null,
    });
    if (error) throw new Error(error.message);
  } else {
    const { data: existing } = await db
      .from("vehicle_documents")
      .select("id")
      .eq("vehicle_id", vehicleId)
      .eq("doc_type", input.doc_type)
      .maybeSingle();
    const row = {
      vehicle_id: vehicleId,
      doc_type: input.doc_type,
      label: input.label ?? null,
      s3_key: input.s3_key,
      status: "pending",
      rejection_reason: null,
      reviewed_by: null,
      reviewed_at: null,
    };
    if (existing) {
      const { error } = await db.from("vehicle_documents").update(row).eq("id", existing.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await db.from("vehicle_documents").insert(row);
      if (error) throw new Error(error.message);
    }
  }

  await db.from("vehicles").update({ status: "pending", updated_at: new Date().toISOString() }).eq("id", vehicleId);
  return getDriverVehicle(driverId, vehicleId);
}

export async function getVehicleDocumentViewUrl(
  driverId: string,
  vehicleId: string,
  docId: string,
) {
  const db = getAdminClient();
  const { data: doc, error } = await db
    .from("vehicle_documents")
    .select("*, vehicles(driver_id)")
    .eq("id", docId)
    .eq("vehicle_id", vehicleId)
    .maybeSingle();
  if (error || !doc) throw new Error("NOT_FOUND");
  const ownerId = (doc.vehicles as { driver_id: string } | null)?.driver_id;
  if (ownerId !== driverId) throw new Error("FORBIDDEN");
  const url = await signedUrlForKey(doc.s3_key);
  return { url, mime_type: mimeFromKey(doc.s3_key), status: doc.status };
}

export async function reviewVehicle(
  actor: AuthLike,
  vehicleId: string,
  status: "approved" | "rejected",
  rejectionReason?: string,
) {
  if (!hasPerm(actor, "drivers:kyc:verify")) throw new Error("FORBIDDEN");
  const db = getAdminClient();
  const { data: vehicle, error } = await db
    .from("vehicles")
    .update({
      status,
      rejection_reason: status === "rejected" ? rejectionReason ?? "Vehicle does not meet standards" : null,
      reviewed_by: actor.userId,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", vehicleId)
    .select("*, driver_id")
    .single();
  if (error || !vehicle) throw new Error(error.message);
  await queueNotification(vehicle.driver_id, "in_app", "vehicle.reviewed", { vehicle_id: vehicleId, status });
  await emitAudit(actor.userId, "vehicle.review", "vehicle", vehicleId, { status });
  return vehicle;
}

export async function reviewVehicleDocument(
  actor: AuthLike,
  vehicleId: string,
  docId: string,
  status: "approved" | "rejected",
  rejectionReason?: string,
) {
  if (!hasPerm(actor, "drivers:kyc:verify")) throw new Error("FORBIDDEN");
  const db = getAdminClient();
  const { data: doc, error } = await db
    .from("vehicle_documents")
    .update({
      status,
      rejection_reason: status === "rejected" ? rejectionReason ?? "Document not valid" : null,
      reviewed_by: actor.userId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", docId)
    .eq("vehicle_id", vehicleId)
    .select("*, vehicles(driver_id)")
    .single();
  if (error || !doc) throw new Error(error.message);
  const driverId = (doc.vehicles as { driver_id: string }).driver_id;
  await queueNotification(driverId, "in_app", "vehicle.document_reviewed", {
    vehicle_id: vehicleId,
    doc_type: doc.doc_type,
    status,
  });
  await emitAudit(actor.userId, "vehicle.document_review", "vehicle", vehicleId, {
    doc_id: docId,
    status,
  });
  return doc;
}

export async function listApprovedVehicles(driverId: string) {
  const db = getAdminClient();
  const { data, error } = await db
    .from("vehicles")
    .select("id, make, model, year, plate, brand, name, category, status")
    .eq("driver_id", driverId)
    .eq("status", "approved")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function setActiveVehicle(driverId: string, vehicleId: string | null) {
  const db = getAdminClient();
  if (vehicleId) {
    const { data: vehicle } = await db
      .from("vehicles")
      .select("id, status")
      .eq("id", vehicleId)
      .eq("driver_id", driverId)
      .maybeSingle();
    if (!vehicle || vehicle.status !== "approved") throw new Error("Vehicle must be approved");
  }
  await db.from("driver_profiles").update({ active_vehicle_id: vehicleId }).eq("user_id", driverId);
  return { active_vehicle_id: vehicleId };
}

export async function getVehicleMediaViewUrl(key: string) {
  const url = await signedUrlForKey(key);
  return { url, mime_type: mimeFromKey(key) };
}

export { mimeFromKey, signedUrlForKey };
