import type { RouteDef } from "../../../../_shared/core/router.ts";
import { fail, ok } from "../../../../_shared/core/response.ts";
import { getAdminClient } from "../../../../_shared/lib/supabase.ts";
import { queueNotification } from "../../../../_shared/lib/events.ts";
import { z } from "../deps.ts";

export const routes: RouteDef[] = [
  {
    method: "POST",
    path: "/v1/admin/tickets",
    auth: true,
    permissions: ["support:reply"],
    handler: async (req, ctx) => {
      const body = z
        .object({
          user_id: z.string().uuid(),
          subject: z.string().min(1).max(500),
          message: z.string().min(1).max(8000),
          audience: z.enum(["clients", "drivers"]),
        })
        .parse(await req.json());

      const db = getAdminClient();
      const { data: ticket, error: ticketErr } = await db
        .from("support_tickets")
        .insert({
          user_id: body.user_id,
          subject: body.subject,
          category: body.audience === "drivers" ? "driver_support" : "client_support",
          status: "open",
          support_level: 1,
          priority: "medium",
          assignee_id: ctx.auth!.userId,
        })
        .select()
        .single();
      if (ticketErr || !ticket) {
        return fail("TICKET_CREATE_FAILED", ticketErr?.message ?? "Create failed", 500);
      }

      const { data: message, error: msgErr } = await db
        .from("ticket_messages")
        .insert({
          ticket_id: ticket.id,
          sender_id: ctx.auth!.userId,
          body: body.message,
          message_kind: "staff",
        })
        .select()
        .single();
      if (msgErr || !message) {
        return fail("MESSAGE_FAILED", msgErr?.message ?? "Message failed", 500);
      }

      await queueNotification(body.user_id, "in_app", "support.new_ticket", {
        ticket_id: ticket.id,
        subject: body.subject,
      });

      return ok({ ticket, message });
    },
  },
];
