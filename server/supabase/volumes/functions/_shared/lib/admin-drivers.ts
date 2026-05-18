import { getAdminClient } from "./supabase.ts";
import { KYC_DOC_TYPES } from "./rbac-admin.ts";
import { queueNotification, emitAudit } from "./events.ts";
import type { AuthLike } from "./dynamic-rbac.ts";
import { hasPerm } from "./dynamic-rbac.ts";
import { loadReviewsForUser, type AdminReviewRow } from "./admin-users.ts";

export async function listDrivers(limit = 150) {
  const db = getAdminClient();
  const { data: role } = await db.from("roles").select("id").eq("name", "driver").maybeSingle();
  if (!role) return [];

  const { data: userRoles } = await db.from("user_roles").select("user_id").eq("role_id", role.id).limit(limit);
  const ids = (userRoles ?? []).map((r) => r.user_id);
  const drivers = [];
  for (const id of ids) {
    const d = await getDriverDetail(id);
    if (d) drivers.push(d);
  }
  return drivers;
}

export async function getDriverDetail(driverId: string) {
  const db = getAdminClient();
  const { data: authUser } = await db.auth.admin.getUserById(driverId);
  if (!authUser.user) return null;

  const { data: profile } = await db
    .from("driver_profiles")
    .select("*")
    .eq("user_id", driverId)
    .maybeSingle();

  const { data: docs } = await db
    .from("kyc_documents")
    .select("*")
    .eq("driver_id", driverId)
    .order("doc_type");

  const { data: roles } = await db
    .from("user_roles")
    .select("roles(name)")
    .eq("user_id", driverId);

  const profilePhoto = (docs ?? []).find((d) => d.doc_type === "profile_photo");
  const avatar_url =
    profile?.avatar_url ??
    (profilePhoto?.status === "approved" ? profilePhoto.s3_key : null);

  const updated_at =
    profile?.updated_at ??
    (authUser.user as { updated_at?: string }).updated_at ??
    authUser.user.created_at;

  const email_verified = Boolean(
    authUser.user.email_confirmed_at ?? authUser.user.confirmed_at,
  );

  const reviews: AdminReviewRow[] = await loadReviewsForUser(driverId);

  return {
    id: driverId,
    email: authUser.user.email ?? "",
    full_name: (authUser.user.user_metadata?.full_name as string) ?? null,
    phone: (authUser.user.user_metadata?.phone as string) ?? null,
    created_at: authUser.user.created_at,
    updated_at,
    kyc_status: profile?.kyc_status ?? "pending",
    avatar_url,
    rating_avg: Number(profile?.rating_avg ?? 0),
    trip_count: profile?.trip_count ?? 0,
    email_verified,
    profile_verified: profile?.kyc_status === "approved",
    profile,
    documents: docs ?? [],
    roles: (roles ?? []).map((r) => (r.roles as { name: string })?.name).filter(Boolean),
    reviews,
  };
}

export async function createDriverManual(
  actor: AuthLike,
  input: { email: string; password: string; full_name?: string; phone?: string },
) {
  if (!hasPerm(actor, "drivers:create")) throw new Error("FORBIDDEN");

  const db = getAdminClient();
  const { data: created, error } = await db.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: input.full_name, phone: input.phone },
  });
  if (error || !created.user) throw new Error(error?.message ?? "Create failed");

  const userId = created.user.id;
  await db.from("user_profiles").upsert({ user_id: userId, tos_accepted_at: new Date().toISOString() });

  const { data: driverRole } = await db.from("roles").select("id").eq("name", "driver").single();
  if (driverRole) {
    await db.from("user_roles").upsert({
      user_id: userId,
      role_id: driverRole.id,
      granted_by: actor.userId,
    });
  }

  await db.from("driver_profiles").upsert({
    user_id: userId,
    kyc_status: "pending",
  });

  for (const docType of KYC_DOC_TYPES) {
    await db.from("kyc_documents").upsert(
      {
        driver_id: userId,
        doc_type: docType,
        s3_key: `pending/${userId}/${docType}`,
        status: "pending",
      },
      { onConflict: "driver_id,doc_type" },
    );
  }

  await emitAudit(actor.userId, "driver.create", "user", userId, { email: input.email });
  return getDriverDetail(userId);
}

export async function reviewDriverDocument(
  actor: AuthLike,
  driverId: string,
  docType: string,
  status: "approved" | "rejected",
  rejectionReason?: string,
) {
  if (!hasPerm(actor, "drivers:kyc:verify")) throw new Error("FORBIDDEN");

  const db = getAdminClient();
  const { error } = await db
    .from("kyc_documents")
    .update({
      status,
      rejection_reason: status === "rejected" ? rejectionReason ?? "Document not valid" : null,
      reviewed_by: actor.userId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("driver_id", driverId)
    .eq("doc_type", docType);
  if (error) throw new Error(error.message);

  await syncDriverKycStatus(driverId);

  if (status === "rejected") {
    await queueNotification(driverId, "in_app", "kyc.document_rejected", {
      doc_type: docType,
      reason: rejectionReason ?? "Document not valid",
    });
  } else {
    await queueNotification(driverId, "in_app", "kyc.document_approved", { doc_type: docType });
  }

  await emitAudit(actor.userId, "kyc.document_review", "driver", driverId, { doc_type: docType, status });
  return getDriverDetail(driverId);
}

async function syncDriverKycStatus(driverId: string) {
  const db = getAdminClient();
  const { data: docs } = await db.from("kyc_documents").select("doc_type,status").eq("driver_id", driverId);

  const required = ["driver_license", "vehicle_insurance", "vehicle_registration", "profile_photo"];
  const approved = new Set((docs ?? []).filter((d) => d.status === "approved").map((d) => d.doc_type));
  const allApproved = required.every((t) => approved.has(t));
  const anyRejected = (docs ?? []).some((d) => d.status === "rejected");

  let status = "pending";
  if (allApproved) status = "approved";
  else if (anyRejected) status = "rejected";

  await db.from("driver_profiles").update({ kyc_status: status }).eq("user_id", driverId);
}
