import type { RouteDef } from "../../../../_shared/core/router.ts";
import {
  authLike,
  createDriverManual,
  createDriverSchema,
  docReviewSchema,
  fail,
  getDriverDetail,
  getDriverDocumentViewUrl,
  listDrivers,
  ok,
  reviewDriverDocument,
} from "../deps.ts";

import type { RouteHandler } from "../../../../_shared/core/router.ts";
import * as service from "./service.ts";
import * as validator from "./validator.ts";

export const get_v1_admin_drivers: RouteHandler = async () => {
      const drivers = await listDrivers();
      return ok({ drivers });
    };

export const get_v1_admin_drivers_driver_id: RouteHandler = async (_req, _ctx, params) => {
      const driver = await getDriverDetail(params.driver_id);
      if (!driver) return fail("NOT_FOUND", "Driver not found", 404);
      return ok({ driver });
    };

export const post_v1_admin_drivers: RouteHandler = async (req, ctx) => {
      const body = createDriverSchema.parse(await req.json());
      try {
        const driver = await createDriverManual(authLike(ctx), body);
        return ok({ driver });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Create failed";
        return fail("FORBIDDEN", msg, 403);
      }
    };

export const get_v1_admin_drivers_driver_id_documents_doc_type_view_url: RouteHandler = async (
  _req,
  ctx,
  params,
) => {
  try {
    const data = await getDriverDocumentViewUrl(
      authLike(ctx),
      params.driver_id,
      params.doc_type,
    );
    return ok(data);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "View failed";
    if (msg === "NOT_FOUND" || msg === "NO_FILE") return fail("NOT_FOUND", msg, 404);
    return fail("FORBIDDEN", msg, 403);
  }
};

export const post_v1_admin_drivers_driver_id_documents_doc_type_review: RouteHandler = async (req, ctx, params) => {
      const body = docReviewSchema.parse(await req.json());
      try {
        const driver = await reviewDriverDocument(
          authLike(ctx),
          params.driver_id,
          params.doc_type,
          body.status,
          body.rejection_reason,
        );
        return ok({ driver });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Review failed";
        return fail("FORBIDDEN", msg, 403);
      }
    };
