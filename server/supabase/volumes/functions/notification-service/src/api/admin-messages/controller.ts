import type { RouteHandler } from "../../../../_shared/core/router.ts";
import { z, emitAudit, fail, getAdminClient, ok, withUpdatedByEmail } from "../deps.ts";

export const get_v1_admin_communication_messages: RouteHandler = async (req, _ctx) => {
  const url = new URL(req.url);
  const audience = url.searchParams.get("audience");
  const db = getAdminClient();
  const q = db
    .from("admin_message_campaigns")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  if (audience && ["clients", "drivers", "all"].includes(audience)) {
    q.eq("audience", audience);
  }
  const { data, error } = await q;
  if (error) return fail("CAMPAIGN_LIST_FAILED", error.message, 500);
  const campaigns = await withUpdatedByEmail(data ?? []);
  return ok({ campaigns });
};

export const get_v1_admin_communication_messages_id: RouteHandler = async (_req, _ctx, params) => {
  const db = getAdminClient();
  const { data, error } = await db
    .from("admin_message_campaigns")
    .select("*")
    .eq("id", params.id)
    .single();
  if (error || !data) return fail("NOT_FOUND", "Campaign not found", 404);
  return ok({ campaign: data });
};

export const post_v1_admin_communication_messages: RouteHandler = async (req, ctx) => {
  const body = z
    .object({
      audience: z.enum(["clients", "drivers", "all"]),
      body_template: z.string().min(1).max(2000),
      send_push: z.boolean().default(true),
      send_email: z.boolean().default(false),
      delay_minutes: z.number().int().min(0).max(60 * 24 * 30).default(0),
      status: z.enum(["draft", "queued", "sent", "cancelled"]).default("sent"),
    })
    .parse(await req.json());
  const now = new Date().toISOString();
  const isDelayed = body.delay_minutes > 0;
  const status = isDelayed ? "queued" : body.status;
  const last_sent_at = !isDelayed && status === "sent" ? now : null;
  const db = getAdminClient();
  const { data, error } = await db
    .from("admin_message_campaigns")
    .insert({
      created_by: ctx.auth!.userId,
      audience: body.audience,
      body_template: body.body_template,
      send_push: body.send_push,
      send_email: body.send_email,
      delay_minutes: body.delay_minutes,
      status,
      last_sent_at,
      updated_at: now,
      updated_by: ctx.auth!.userId,
    })
    .select()
    .single();
  if (error) return fail("CAMPAIGN_CREATE_FAILED", error.message, 500);
  await emitAudit(ctx.auth!.userId, "message_campaign.create", "admin_message_campaigns", data.id, {
    audience: data.audience,
    send_push: data.send_push,
    send_email: data.send_email,
    delay_minutes: data.delay_minutes,
  });
  return ok({ campaign: data });
};

export const patch_v1_admin_communication_messages_id: RouteHandler = async (req, ctx, params) => {
  const body = z
    .object({
      audience: z.enum(["clients", "drivers", "all"]).optional(),
      body_template: z.string().min(1).max(2000).optional(),
      send_push: z.boolean().optional(),
      send_email: z.boolean().optional(),
      delay_minutes: z.number().int().min(0).max(60 * 24 * 30).optional(),
      status: z.enum(["draft", "queued", "sent", "cancelled"]).optional(),
    })
    .parse(await req.json());
  const now = new Date().toISOString();
  const patch: Record<string, unknown> = {
    ...body,
    updated_at: now,
    updated_by: ctx.auth!.userId,
  };
  if (body.status === "sent") {
    const delay = body.delay_minutes ?? 0;
    if (delay > 0) {
      patch.status = "queued";
      patch.last_sent_at = null;
    } else {
      patch.last_sent_at = now;
    }
  } else if (body.status === "draft") {
    patch.last_sent_at = null;
  }
  const db = getAdminClient();
  const { data, error } = await db
    .from("admin_message_campaigns")
    .update(patch)
    .eq("id", params.id)
    .select()
    .single();
  if (error) return fail("CAMPAIGN_UPDATE_FAILED", error.message, 500);
  await emitAudit(ctx.auth!.userId, "message_campaign.update", "admin_message_campaigns", params.id, {});
  return ok({ campaign: data });
};

export const post_v1_admin_communication_messages_id_send: RouteHandler = async (req, ctx, params) => {
  const overrides = z
    .object({
      audience: z.enum(["clients", "drivers", "all"]).optional(),
      body_template: z.string().min(1).max(2000).optional(),
      send_push: z.boolean().optional(),
      send_email: z.boolean().optional(),
      delay_minutes: z.number().int().min(0).max(60 * 24 * 30).optional(),
    })
    .parse(await req.json().catch(() => ({})));
  const db = getAdminClient();
  const { data: existing, error: loadErr } = await db
    .from("admin_message_campaigns")
    .select("*")
    .eq("id", params.id)
    .single();
  if (loadErr || !existing) return fail("NOT_FOUND", "Campaign not found", 404);
  const merged = { ...existing, ...overrides };
  const now = new Date().toISOString();
  const isDelayed = (merged.delay_minutes ?? 0) > 0;
  const status = isDelayed ? "queued" : "sent";
  const patch = {
    audience: merged.audience,
    body_template: merged.body_template,
    send_push: merged.send_push,
    send_email: merged.send_email,
    delay_minutes: merged.delay_minutes,
    status,
    last_sent_at: isDelayed ? null : now,
    updated_at: now,
    updated_by: ctx.auth!.userId,
  };
  const { data, error } = await db
    .from("admin_message_campaigns")
    .update(patch)
    .eq("id", params.id)
    .select()
    .single();
  if (error) return fail("CAMPAIGN_SEND_FAILED", error.message, 500);
  await emitAudit(ctx.auth!.userId, "message_campaign.send", "admin_message_campaigns", params.id, {
    status,
  });
  return ok({ campaign: data });
};

export const post_v1_admin_communication_messages_id_resend: RouteHandler = async (_req, ctx, params) => {
  const db = getAdminClient();
  const { data: src, error: loadErr } = await db
    .from("admin_message_campaigns")
    .select("*")
    .eq("id", params.id)
    .single();
  if (loadErr || !src) return fail("NOT_FOUND", "Campaign not found", 404);
  const now = new Date().toISOString();
  const { data, error } = await db
    .from("admin_message_campaigns")
    .insert({
      created_by: ctx.auth!.userId,
      audience: src.audience,
      body_template: src.body_template,
      send_push: src.send_push,
      send_email: src.send_email,
      delay_minutes: 0,
      status: "sent",
      last_sent_at: now,
      updated_at: now,
      updated_by: ctx.auth!.userId,
    })
    .select()
    .single();
  if (error) return fail("CAMPAIGN_RESEND_FAILED", error.message, 500);
  await emitAudit(ctx.auth!.userId, "message_campaign.resend", "admin_message_campaigns", data.id, {
    source_id: params.id,
  });
  return ok({ campaign: data });
};

export const delete_v1_admin_communication_messages_id: RouteHandler = async (_req, ctx, params) => {
  const db = getAdminClient();
  const { data, error } = await db.from("admin_message_campaigns").delete().eq("id", params.id);
  if (error) return fail("CAMPAIGN_DELETE_FAILED", error.message, 500);
  await emitAudit(ctx.auth!.userId, "message_campaign.delete", "admin_message_campaigns", params.id, {});
  return ok({ deleted: true, result: data ?? [] });
};

export type RouteHandlers = {
  get_v1_admin_communication_messages: typeof get_v1_admin_communication_messages;
  get_v1_admin_communication_messages_id: typeof get_v1_admin_communication_messages_id;
  post_v1_admin_communication_messages: typeof post_v1_admin_communication_messages;
  patch_v1_admin_communication_messages_id: typeof patch_v1_admin_communication_messages_id;
  post_v1_admin_communication_messages_id_send: typeof post_v1_admin_communication_messages_id_send;
  post_v1_admin_communication_messages_id_resend: typeof post_v1_admin_communication_messages_id_resend;
  delete_v1_admin_communication_messages_id: typeof delete_v1_admin_communication_messages_id;
};
