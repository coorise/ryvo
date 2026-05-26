import { createServiceRouter } from "../../../../_shared/core/router.ts";
import { ok, fail } from "../../../../_shared/core/response.ts";
import { getAdminClient } from "../../../../_shared/lib/supabase.ts";
import { publishEvent, TOPICS } from "../../../../_shared/lib/kafka.ts";
import { requirePermission, requireRole } from "../../../../_shared/middleware/auth.ts";
import { queueNotification } from "../../../../_shared/lib/events.ts";
import { REQUIRED_KYC_DOCS } from "../../../../_shared/lib/trip-flow.ts";
import { z } from "zod";

const docTypeSchema = z.enum([
  "national_id",
  "passport",
  "selfie_with_id",
  "driver_license",
  "bank_statement",
]);

async function syncDriverKycStatus(driverId: string): Promise<void> {
  const db = getAdminClient();
  const { data: docs } = await db
    .from("kyc_documents")
    .select("doc_type,status")
    .eq("driver_id", driverId);

  const approved = new Set(
    (docs ?? []).filter((d) => d.status === "approved").map((d) => d.doc_type),
  );
  const hasId = approved.has("national_id") || approved.has("passport");
  const complete =
    hasId &&
    ["selfie_with_id", "driver_license", "bank_statement"].every((t) => approved.has(t));

  const anyRejected = (docs ?? []).some((d) => d.status === "rejected");
  const anyPending = (docs ?? []).some((d) => d.status === "pending");

  let status = "pending";
  if (complete) status = "approved";
  else if (anyRejected && !anyPending) status = "rejected";

  await db.from("driver_profiles").update({ kyc_status: status }).eq("user_id", driverId);
}

import type { RouteDef } from "../../../../_shared/core/router.ts";

export const routes: RouteDef[] = [{
    method: "GET",
    path: "/v1/checklist",
    auth: true,
    handler: async (_req, ctx) => {
      const denied = requireRole(ctx.auth!, "driver");
      if (denied) return denied;
      const db = getAdminClient();
      const { data: docs } = await db
        .from("kyc_documents")
        .select("*")
        .eq("driver_id", ctx.auth!.userId);
      const { data: profile } = await db
        .from("driver_profiles")
        .select("kyc_status")
        .eq("user_id", ctx.auth!.userId)
        .single();
      const byType = Object.fromEntries((docs ?? []).map((d) => [d.doc_type, d]));
      return ok({
        kyc_status: profile?.kyc_status ?? "pending",
        required: REQUIRED_KYC_DOCS,
        documents: byType,
      });
    },
  },
{
    method: "POST",
    path: "/v1/submit",
    auth: true,
    handler: async (req, ctx) => {
      const denied = requireRole(ctx.auth!, "driver");
      if (denied) return denied;
      const { doc_type, s3_key } = z
        .object({ doc_type: docTypeSchema, s3_key: z.string().min(1) })
        .parse(await req.json());
      const db = getAdminClient();
      const { data, error } = await db
        .from("kyc_documents")
        .upsert(
{
            driver_id: ctx.auth!.userId,
            doc_type,
            s3_key,
            status: "pending",
            rejection_reason: null,
            reviewed_by: null,
            reviewed_at: null,
          },
{ onConflict: "driver_id,doc_type" },
        )
        .select()
        .single();
      if (error) return fail("SUBMIT_FAILED", error.message, 500);
      await db.from("driver_profiles").update({ kyc_status: "pending" }).eq("user_id", ctx.auth!.userId);

      const { data: roleRows } = await db
        .from("roles")
        .select("id")
        .in("name", ["admin", "super_admin", "staff"]);
      const roleIds = (roleRows ?? []).map((r) => r.id);
      const { data: staff } = roleIds.length
        ? await db.from("user_roles").select("user_id").in("role_id", roleIds)
        : { data: [] };
      for (const s of staff ?? []) {
        await queueNotification(s.user_id, "in_app", "kyc.submitted", {
          driver_id: ctx.auth!.userId,
          doc_type,
        });
      }
      return ok({ document: data });
    },
  },
{
    method: "POST",
    path: "/v1/review",
    auth: true,
    handler: async (req, ctx) => {
      const denied = requirePermission(ctx.auth!, "kyc:review");
      if (denied) return denied;
      const { driver_id, doc_type, status, rejection_reason } = await req.json();
      if (!["approved", "rejected"].includes(status)) {
        return fail("INVALID_STATUS", "status must be approved or rejected", 422);
      }
      const db = getAdminClient();
      const { error } = await db
        .from("kyc_documents")
        .update({
          status,
          rejection_reason: status === "rejected" ? rejection_reason : null,
          reviewed_by: ctx.auth!.userId,
          reviewed_at: new Date().toISOString(),
        })
        .eq("driver_id", driver_id)
        .eq("doc_type", doc_type);
      if (error) return fail("REVIEW_FAILED", error.message, 500);

      await syncDriverKycStatus(driver_id);
      await publishEvent(TOPICS.KYC_STATUS_CHANGED, { driver_id, doc_type, status }, driver_id);
      await queueNotification(driver_id, "in_app", "kyc.document_reviewed", {
        doc_type,
        status,
        rejection_reason,
      });
      const { data: profile } = await db
        .from("driver_profiles")
        .select("kyc_status")
        .eq("user_id", driver_id)
        .single();
      return ok({ driver_id, doc_type, status, kyc_status: profile?.kyc_status });
    },
  },
{
    method: "GET",
    path: "/v1/queue",
    auth: true,
    handler: async (_req, ctx) => {
      const denied = requirePermission(ctx.auth!, "kyc:review");
      if (denied) return denied;
      const db = getAdminClient();
      const { data: pending } = await db
        .from("kyc_documents")
        .select("*, driver_profiles(user_id,kyc_status)")
        .eq("status", "pending")
        .order("created_at", { ascending: true });
      return ok({ queue: pending });
    },
  },];
