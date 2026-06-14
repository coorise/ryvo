import { getAdminClient } from "./supabase.ts";
import { isRealStorageKey } from "./storage-keys.ts";

export const PERSONAL_KYC_DOC_TYPES = [
  "national_id",
  "passport",
  "selfie_with_id",
  "driver_license",
  "bank_statement",
] as const;

export type KycDocumentRow = {
  id?: string;
  driver_id: string;
  doc_type: string;
  s3_key: string | null;
  status: string;
  rejection_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at?: string;
  has_file?: boolean;
};

export function normalizeKycDocumentRow(
  doc: Partial<KycDocumentRow> | null | undefined,
  docType: string,
  driverId = "",
): KycDocumentRow {
  if (!doc || !isRealStorageKey(doc.s3_key)) {
    return {
      id: doc?.id ?? docType,
      driver_id: doc?.driver_id ?? driverId,
      doc_type: docType,
      s3_key: null,
      status: "missing",
      rejection_reason: doc?.rejection_reason ?? null,
      reviewed_by: doc?.reviewed_by ?? null,
      reviewed_at: doc?.reviewed_at ?? null,
      created_at: doc?.created_at ?? "",
      has_file: false,
    };
  }

  return {
    id: doc.id!,
    driver_id: doc.driver_id ?? driverId,
    doc_type: doc.doc_type ?? docType,
    s3_key: doc.s3_key!,
    status: doc.status ?? "pending",
    rejection_reason: doc.rejection_reason ?? null,
    reviewed_by: doc.reviewed_by ?? null,
    reviewed_at: doc.reviewed_at ?? null,
    created_at: doc.created_at ?? "",
    has_file: true,
  };
}

/** Recompute driver_profiles.kyc_status from real uploaded + reviewed documents. */
export async function syncDriverKycStatus(driverId: string): Promise<string> {
  const db = getAdminClient();
  const { data: docs } = await db
    .from("kyc_documents")
    .select("doc_type,status,s3_key")
    .eq("driver_id", driverId);

  const realDocs = (docs ?? []).filter((d) => isRealStorageKey(d.s3_key));
  const approvedTypes = new Set(
    realDocs.filter((d) => d.status === "approved").map((d) => d.doc_type),
  );
  const hasId = approvedTypes.has("national_id") || approvedTypes.has("passport");
  const requiredSecondary = ["selfie_with_id", "driver_license", "bank_statement"];
  const complete = hasId && requiredSecondary.every((t) => approvedTypes.has(t));

  const anyPending = realDocs.some((d) => d.status === "pending");
  const anyRejected = realDocs.some((d) => d.status === "rejected");

  let status = "pending";
  if (complete) status = "approved";
  else if (anyRejected && !anyPending) status = "rejected";

  await db.from("driver_profiles").update({ kyc_status: status }).eq("user_id", driverId);
  return status;
}

export function buildPersonalKycChecklist(
  driverId: string,
  docs: Partial<KycDocumentRow>[] | null | undefined,
) {
  const byType = Object.fromEntries((docs ?? []).map((d) => [d.doc_type, d]));
  const normalized = PERSONAL_KYC_DOC_TYPES.map((docType) =>
    normalizeKycDocumentRow(byType[docType], docType, driverId),
  );
  const documents = Object.fromEntries(normalized.map((d) => [d.doc_type, d]));
  return { documents, items: normalized };
}
