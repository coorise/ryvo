import type { RouteDef } from "../../../../_shared/core/router.ts";
import { fail, getAdminClient, ok, verifyServiceSignature } from "../deps.ts";

import type { RouteHandler } from "../../../../_shared/core/router.ts";
import * as service from "./service.ts";
import * as validator from "./validator.ts";

export const post_v1_internal_post_signup: RouteHandler = async (req) => {
      const body = await req.text();
      const badSig = verifyServiceSignature(req, body);
      if (badSig) return badSig;
      const { user_id, email } = JSON.parse(body);
      const db = getAdminClient();
      await db.from("user_profiles").upsert({
        user_id,
        tos_accepted_at: new Date().toISOString(),
        gdpr_consent_at: new Date().toISOString(),
      });
      const role = email?.includes("driver") ? "driver" : "client";
      const { data: roleRow } = await db.from("roles").select("id").eq("name", role).single();
      if (roleRow) {
        await db.from("user_roles").upsert({ user_id, role_id: roleRow.id });
      }
      if (role === "client") await db.from("rider_profiles").upsert({ user_id });
      if (role === "driver") {
        await db.from("driver_profiles").upsert({ user_id, kyc_status: "pending" });
      }
      return ok({ user_id, role });
    };

export const post_v1_internal_pre_sign_in: RouteHandler = async (req) => {
      const { user_id } = await req.json();
      const db = getAdminClient();
      const { data } = await db
        .from("user_profiles")
        .select("banned_at")
        .eq("user_id", user_id)
        .maybeSingle();
      if (data?.banned_at) {
        return fail("ACCOUNT_SUSPENDED", "Account suspended", 403);
      }
      return ok({ allowed: true });
    };
