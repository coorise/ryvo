import type { RouteDef } from "../../../../_shared/core/router.ts";
import { z, createAdminTask, deleteAdminTask, emitAudit, listAdminTasks, ok, runAdminTaskNow, setAdminTaskPaused, withUpdatedByEmail } from "../deps.ts";

import type { RouteHandler } from "../../../../_shared/core/router.ts";
import * as service from "./service.ts";
import * as validator from "./validator.ts";

export const get_v1_admin_settings_tasks: RouteHandler = async () => {
      const tasks = await withUpdatedByEmail(await listAdminTasks());
      return ok({ tasks });
    };

export const post_v1_admin_settings_tasks: RouteHandler = async (req, ctx) => {
      const body = z
        .object({
          name: z.string().min(3).max(80),
          kind: z.enum(["preset", "http"]).default("preset"),
          task_key: z.string().default(""),
          params: z.record(z.unknown()).default({}),
          request_method: z.enum(["GET", "POST", "PATCH", "PUT", "DELETE"]).optional(),
          request_path: z.string().optional(),
          request_query: z.record(z.unknown()).default({}),
          request_headers: z.record(z.unknown()).default({}),
          request_body: z.record(z.unknown()).nullable().optional(),
          schedule_mode: z.enum(["immediate", "one_time", "daily", "weekly", "monthly"]),
          run_at: z.string().datetime().nullable().optional(),
          time_of_day: z.string().nullable().optional(),
          day_of_week: z.number().int().min(0).max(6).nullable().optional(),
          day_of_month: z.number().int().min(1).max(28).nullable().optional(),
          timezone: z.string().optional(),
        })
        .parse(await req.json());

      const task = await createAdminTask({ ...body, created_by: ctx.auth!.userId });
      await emitAudit(ctx.auth!.userId, "task.create", "admin_tasks", task.id, {
        kind: task.kind ?? body.kind,
        task_key: task.task_key,
        request_path: task.request_path ?? null,
      });
      return ok({ task });
    };

export const post_v1_admin_settings_tasks_id_run: RouteHandler = async (_req, ctx, params) => {
      const result = await runAdminTaskNow(params.id);
      await emitAudit(ctx.auth!.userId, "task.run", "admin_tasks", params.id, result);
      return ok(result);
    };

export const post_v1_admin_settings_tasks_id_pause: RouteHandler = async (_req, ctx, params) => {
      const task = await setAdminTaskPaused(params.id, true);
      await emitAudit(ctx.auth!.userId, "task.pause", "admin_tasks", params.id, {});
      return ok({ task });
    };

export const post_v1_admin_settings_tasks_id_resume: RouteHandler = async (_req, ctx, params) => {
      const task = await setAdminTaskPaused(params.id, false);
      await emitAudit(ctx.auth!.userId, "task.resume", "admin_tasks", params.id, {});
      return ok({ task });
    };

export const delete_v1_admin_settings_tasks_id: RouteHandler = async (_req, ctx, params) => {
      const result = await deleteAdminTask(params.id);
      await emitAudit(ctx.auth!.userId, "task.delete", "admin_tasks", params.id, {});
      return ok(result);
    };
