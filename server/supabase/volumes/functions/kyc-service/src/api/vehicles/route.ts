import type { RouteDef } from "../../../../_shared/core/router.ts";
import { fail, ok } from "../../../../_shared/core/response.ts";
import { requireRole } from "../../../../_shared/middleware/auth.ts";
import {
  createDriverVehicle,
  deleteDriverVehicle,
  getDriverVehicle,
  getVehicleDocumentViewUrl,
  getVehicleMediaViewUrl,
  listDriverVehicles,
  reviewVehicle,
  reviewVehicleDocument,
  setActiveVehicle,
  submitVehicleDocument,
  updateDriverVehicle,
} from "../../../../_shared/lib/driver-vehicles.ts";
import { hasPerm } from "../../../../_shared/lib/dynamic-rbac.ts";

export const routes: RouteDef[] = [
  {
    method: "GET",
    path: "/v1/vehicles",
    auth: true,
    handler: async (_req, ctx) => {
      const denied = requireRole(ctx.auth!, "driver");
      if (denied) return denied;
      try {
        const vehicles = await listDriverVehicles(ctx.auth!.userId);
        return ok({ vehicles });
      } catch (e) {
        return fail("VEHICLES_LIST_FAILED", (e as Error).message, 500);
      }
    },
  },
  {
    method: "POST",
    path: "/v1/vehicles",
    auth: true,
    handler: async (req, ctx) => {
      const denied = requireRole(ctx.auth!, "driver");
      if (denied) return denied;
      try {
        const body = await req.json();
        const vehicle = await createDriverVehicle(ctx.auth!.userId, body);
        return ok({ vehicle });
      } catch (e) {
        return fail("VEHICLE_CREATE_FAILED", (e as Error).message, 400);
      }
    },
  },
  {
    method: "GET",
    path: "/v1/vehicles/:vehicle_id",
    auth: true,
    handler: async (_req, ctx, params) => {
      const denied = requireRole(ctx.auth!, "driver");
      if (denied) return denied;
      try {
        const vehicle = await getDriverVehicle(ctx.auth!.userId, params.vehicle_id);
        return ok({ vehicle });
      } catch (e) {
        return fail("VEHICLE_NOT_FOUND", (e as Error).message, 404);
      }
    },
  },
  {
    method: "PATCH",
    path: "/v1/vehicles/:vehicle_id",
    auth: true,
    handler: async (req, ctx, params) => {
      const denied = requireRole(ctx.auth!, "driver");
      if (denied) return denied;
      try {
        const body = await req.json();
        const vehicle = await updateDriverVehicle(ctx.auth!.userId, params.vehicle_id, body);
        return ok({ vehicle });
      } catch (e) {
        return fail("VEHICLE_UPDATE_FAILED", (e as Error).message, 400);
      }
    },
  },
  {
    method: "DELETE",
    path: "/v1/vehicles/:vehicle_id",
    auth: true,
    handler: async (_req, ctx, params) => {
      const denied = requireRole(ctx.auth!, "driver");
      if (denied) return denied;
      try {
        const result = await deleteDriverVehicle(ctx.auth!.userId, params.vehicle_id);
        return ok(result);
      } catch (e) {
        return fail("VEHICLE_DELETE_FAILED", (e as Error).message, 400);
      }
    },
  },
  {
    method: "POST",
    path: "/v1/vehicles/:vehicle_id/documents",
    auth: true,
    handler: async (req, ctx, params) => {
      const denied = requireRole(ctx.auth!, "driver");
      if (denied) return denied;
      try {
        const body = await req.json();
        const vehicle = await submitVehicleDocument(ctx.auth!.userId, params.vehicle_id, body);
        return ok({ vehicle });
      } catch (e) {
        return fail("VEHICLE_DOC_FAILED", (e as Error).message, 400);
      }
    },
  },
  {
    method: "GET",
    path: "/v1/vehicles/:vehicle_id/documents/:doc_id/view-url",
    auth: true,
    handler: async (_req, ctx, params) => {
      const denied = requireRole(ctx.auth!, "driver");
      if (denied) return denied;
      try {
        const view = await getVehicleDocumentViewUrl(
          ctx.auth!.userId,
          params.vehicle_id,
          params.doc_id,
        );
        return ok(view);
      } catch (e) {
        const msg = (e as Error).message;
        return fail(msg === "NO_FILE" ? "NO_FILE" : "VIEW_FAILED", msg, msg === "NOT_FOUND" ? 404 : 400);
      }
    },
  },
  {
    method: "GET",
    path: "/v1/vehicles/:vehicle_id/media/view-url",
    auth: true,
    handler: async (req, ctx, params) => {
      const denied = requireRole(ctx.auth!, "driver");
      if (denied) return denied;
      const url = new URL(req.url);
      const key = url.searchParams.get("key");
      if (!key) return fail("VALIDATION", "key required", 422);
      try {
        const vehicle = await getDriverVehicle(ctx.auth!.userId, params.vehicle_id);
        const keys = [
          vehicle.banner_key,
          vehicle.video_key,
          vehicle.photo_key,
          ...(Array.isArray(vehicle.image_keys) ? vehicle.image_keys : []),
        ].filter(Boolean);
        if (!keys.includes(key)) return fail("FORBIDDEN", "Not your media", 403);
        const view = await getVehicleMediaViewUrl(key);
        return ok(view);
      } catch (e) {
        return fail("VIEW_FAILED", (e as Error).message, 400);
      }
    },
  },
  {
    method: "PATCH",
    path: "/v1/me/active-vehicle",
    auth: true,
    handler: async (req, ctx) => {
      const denied = requireRole(ctx.auth!, "driver");
      if (denied) return denied;
      try {
        const { vehicle_id } = await req.json();
        const result = await setActiveVehicle(ctx.auth!.userId, vehicle_id ?? null);
        return ok(result);
      } catch (e) {
        return fail("ACTIVE_VEHICLE_FAILED", (e as Error).message, 400);
      }
    },
  },
  {
    method: "POST",
    path: "/v1/admin/vehicles/:vehicle_id/review",
    auth: true,
    handler: async (req, ctx, params) => {
      if (!hasPerm(ctx.auth!, "drivers:kyc:verify")) return fail("FORBIDDEN", "Forbidden", 403);
      try {
        const { status, rejection_reason } = await req.json();
        const vehicle = await reviewVehicle(ctx.auth!, params.vehicle_id, status, rejection_reason);
        return ok({ vehicle });
      } catch (e) {
        return fail("REVIEW_FAILED", (e as Error).message, 400);
      }
    },
  },
  {
    method: "POST",
    path: "/v1/admin/vehicles/:vehicle_id/documents/:doc_id/review",
    auth: true,
    handler: async (req, ctx, params) => {
      if (!hasPerm(ctx.auth!, "drivers:kyc:verify")) return fail("FORBIDDEN", "Forbidden", 403);
      try {
        const { status, rejection_reason } = await req.json();
        const doc = await reviewVehicleDocument(
          ctx.auth!,
          params.vehicle_id,
          params.doc_id,
          status,
          rejection_reason,
        );
        return ok({ document: doc });
      } catch (e) {
        return fail("REVIEW_FAILED", (e as Error).message, 400);
      }
    },
  },
  {
    method: "GET",
    path: "/v1/admin/vehicles/:vehicle_id/documents/:doc_id/view-url",
    auth: true,
    permissions: ["drivers:read"],
    handler: async (_req, ctx, params) => {
      try {
        const db = (await import("../../../../_shared/lib/supabase.ts")).getAdminClient();
        const { data: doc } = await db
          .from("vehicle_documents")
          .select("s3_key, status, vehicles(driver_id)")
          .eq("id", params.doc_id)
          .eq("vehicle_id", params.vehicle_id)
          .maybeSingle();
        if (!doc) return fail("NOT_FOUND", "Not found", 404);
        const view = await getVehicleDocumentViewUrl(
          (doc.vehicles as { driver_id: string }).driver_id,
          params.vehicle_id,
          params.doc_id,
        );
        return ok(view);
      } catch (e) {
        return fail("VIEW_FAILED", (e as Error).message, 400);
      }
    },
  },
  {
    method: "GET",
    path: "/v1/admin/vehicles/:vehicle_id/media/view-url",
    auth: true,
    permissions: ["drivers:read"],
    handler: async (req, _ctx, params) => {
      const url = new URL(req.url);
      const key = url.searchParams.get("key");
      if (!key) return fail("VALIDATION", "key required", 422);
      try {
        const db = (await import("../../../../_shared/lib/supabase.ts")).getAdminClient();
        const { data: vehicle } = await db
          .from("vehicles")
          .select("banner_key, video_key, photo_key, image_keys")
          .eq("id", params.vehicle_id)
          .maybeSingle();
        if (!vehicle) return fail("NOT_FOUND", "Not found", 404);
        const keys = [
          vehicle.banner_key,
          vehicle.video_key,
          vehicle.photo_key,
          ...(Array.isArray(vehicle.image_keys) ? vehicle.image_keys : []),
        ].filter(Boolean);
        if (!keys.includes(key)) return fail("FORBIDDEN", "Invalid media key", 403);
        const view = await getVehicleMediaViewUrl(key);
        return ok(view);
      } catch (e) {
        return fail("VIEW_FAILED", (e as Error).message, 400);
      }
    },
  },
];
