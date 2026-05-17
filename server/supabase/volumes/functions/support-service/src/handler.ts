import { createServiceRouter } from "../../_shared/core/router.ts";
import { ok, fail } from "../../_shared/core/response.ts";
import { getAdminClient } from "../../_shared/lib/supabase.ts";
import { requirePermission } from "../../_shared/middleware/auth.ts";
import { queueNotification } from "../../_shared/lib/events.ts";

export const handle = createServiceRouter("support-service", [
  {
    method: "GET",
    path: "/v1/health",
    handler: async () => ok({ status: "ok", service: "support-service" }),
  },
  {
    method: "POST",
    path: "/v1/tickets",
    auth: true,
    handler: async (req, ctx) => {
      const { subject, category, trip_id } = await req.json();
      const db = getAdminClient();
      const { data, error } = await db
        .from("support_tickets")
        .insert({
          user_id: ctx.auth!.userId,
          subject,
          category: category ?? "complaint",
          trip_id,
          status: "open",
        })
        .select()
        .single();
      if (error) return fail("TICKET_CREATE_FAILED", error.message, 500);

      const dbStaff = getAdminClient();
      const { data: roleRows } = await dbStaff
        .from("roles")
        .select("id")
        .in("name", ["admin", "super_admin", "staff"]);
      const roleIds = (roleRows ?? []).map((r) => r.id);
      const { data: staff } = roleIds.length
        ? await dbStaff.from("user_roles").select("user_id").in("role_id", roleIds)
        : { data: [] };
      for (const s of staff ?? []) {
        if (s.user_id === ctx.auth!.userId) continue;
        await queueNotification(s.user_id, "in_app", "support.new_ticket", {
          ticket_id: data.id,
          subject,
          category: category ?? "complaint",
        });
      }
      return ok({ ticket: data });
    },
  },
  {
    method: "GET",
    path: "/v1/tickets",
    auth: true,
    handler: async (_req, ctx) => {
      const db = getAdminClient();
      const q = db.from("support_tickets").select("*").order("created_at", { ascending: false });
      if (!ctx.auth!.permissions.includes("support:reply")) {
        q.eq("user_id", ctx.auth!.userId);
      }
      const { data } = await q;
      return ok({ tickets: data });
    },
  },
  {
    method: "POST",
    path: "/v1/tickets/:ticket_id/messages",
    auth: true,
    handler: async (req, ctx, params) => {
      const { body, attachments } = await req.json();
      const db = getAdminClient();
      const { data, error } = await db
        .from("ticket_messages")
        .insert({
          ticket_id: params.ticket_id,
          sender_id: ctx.auth!.userId,
          body,
          attachments: attachments ?? [],
        })
        .select()
        .single();
      if (error) return fail("MESSAGE_FAILED", error.message, 500);
      const { data: ticket } = await db
        .from("support_tickets")
        .select("user_id")
        .eq("id", params.ticket_id)
        .single();
      if (ticket && ticket.user_id !== ctx.auth!.userId) {
        await queueNotification(ticket.user_id, "in_app", "support.reply", {
          ticket_id: params.ticket_id,
        });
      }
      return ok({ message: data });
    },
  },
]);
