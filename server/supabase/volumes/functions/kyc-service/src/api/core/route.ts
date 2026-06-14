import { createServiceRouter } from "../../../../_shared/core/router.ts";
import { ok, fail } from "../../../../_shared/core/response.ts";
import { getAdminClient } from "../../../../_shared/lib/supabase.ts";
import { publishEvent, TOPICS } from "../../../../_shared/lib/kafka.ts";
import { requirePermission, requireRole } from "../../../../_shared/middleware/auth.ts";
import { queueNotification } from "../../../../_shared/lib/events.ts";
import { REQUIRED_KYC_DOCS } from "../../../../_shared/lib/trip-flow.ts";
import {
  getPersonalKycDocumentViewUrl,
  PERSONAL_KYC_DOC_TYPES,
} from "../../../../_shared/lib/driver-vehicles.ts";
import {
  buildPersonalKycChecklist,
  syncDriverKycStatus,
} from "../../../../_shared/lib/kyc-documents.ts";
import { isRealStorageKey } from "../../../../_shared/lib/storage-keys.ts";
import { z } from "zod";

const docTypeSchema = z.enum(PERSONAL_KYC_DOC_TYPES);

import type { RouteDef } from "../../../../_shared/core/router.ts";

export const routes: RouteDef[] = [{
    method: "GET",
    path: "/v1/checklist",
    auth: true,
    handler: async (_req, ctx) => {
      const denied = requireRole(ctx.auth!, "driver");
      if (denied) return denied;
      const kyc_status = await syncDriverKycStatus(ctx.auth!.userId);
      const db = getAdminClient();
      const { data: docs } = await db
        .from("kyc_documents")
        .select("*")
        .eq("driver_id", ctx.auth!.userId);
      const checklist = buildPersonalKycChecklist(ctx.auth!.userId, docs ?? []);
      return ok({
        kyc_status,
        required: REQUIRED_KYC_DOCS,
        documents: checklist.documents,
        items: checklist.items,
      });
    },
  },
{
    method: "GET",
    path: "/v1/documents/:doc_type/view-url",
    auth: true,
    handler: async (_req, ctx, params) => {
      const denied = requireRole(ctx.auth!, "driver");
      if (denied) return denied;
      try {
        const view = await getPersonalKycDocumentViewUrl(ctx.auth!.userId, params.doc_type);
        return ok(view);
      } catch (e) {
        const msg = (e as Error).message;
        if (msg === "NOT_FOUND") return fail("NOT_FOUND", "Document not found", 404);
        if (msg === "NO_FILE") return fail("NO_FILE", "No file uploaded yet", 404);
        return fail("VIEW_FAILED", msg, 400);
      }
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
      if (!isRealStorageKey(s3_key)) return fail("INVALID_STORAGE_KEY", "Invalid storage key", 422);
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
      await syncDriverKycStatus(ctx.auth!.userId);

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

      const kyc_status = await syncDriverKycStatus(driver_id);
      await publishEvent(TOPICS.KYC_STATUS_CHANGED, { driver_id, doc_type, status }, driver_id);
      await queueNotification(driver_id, "in_app", "kyc.document_reviewed", {
        doc_type,
        status,
        rejection_reason,
      });
      return ok({ driver_id, doc_type, status, kyc_status });
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
