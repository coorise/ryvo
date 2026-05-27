import type { RouteDef } from "../../../../_shared/core/router.ts";
import { authLike, canEditMail, canManageMail, emitAudit, fail, getAdminClient, ok } from "../deps.ts";

import type { RouteHandler } from "../../../../_shared/core/router.ts";
import * as service from "./service.ts";
import * as validator from "./validator.ts";

export const get_v1_admin_email_templates: RouteHandler = async (_req, ctx) => {
      if (!canManageMail(authLike(ctx))) {
        return fail("FORBIDDEN", "Missing settings:mail:read or email:templates", 403);
      }
      const db = getAdminClient();
      const { data } = await db.from("email_templates").select("*").order("template_key");
      return ok({ templates: data });
    };

export const put_v1_admin_email_templates_template_key: RouteHandler = async (req, ctx, params) => {
      if (!canEditMail(authLike(ctx))) {
        return fail("FORBIDDEN", "Missing settings:mail:update or email:templates", 403);
      }
      const body = await req.json();
      const db = getAdminClient();
      const { data, error } = await db
        .from("email_templates")
        .upsert({
          template_key: params.template_key,
          subject: body.subject,
          body_html: body.body_html,
          body_text: body.body_text ?? null,
          updated_by: ctx.auth!.userId,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (error) return fail("SAVE_FAILED", error.message, 500);
      await emitAudit(ctx.auth!.userId, "email_template.update", "email_templates", params.template_key, {});
      return ok({ template: data });
    };
