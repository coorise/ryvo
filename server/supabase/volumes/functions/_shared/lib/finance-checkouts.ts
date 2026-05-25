import { queueNotification } from "./events.ts";
import { getUserEmail } from "./finance-referrals.ts";
import { getAdminClient } from "./supabase.ts";

export type CheckoutReminderInput = {
  message: string;
  send_email: boolean;
  send_push: boolean;
  delay_minutes: number;
};

async function deliverCheckoutRecovery(
  clientId: string,
  message: string,
  channels: { email: boolean; push: boolean },
) {
  const email = await getUserEmail(clientId);
  const payload = {
    message,
    email,
    subject: "Complete your Ryvo booking",
  };

  if (channels.push) {
    await queueNotification(clientId, "in_app", "checkout.recovery", payload);
    await queueNotification(clientId, "push", "checkout.recovery", payload);
  }

  if (channels.email && email.includes("@")) {
    await queueNotification(clientId, "email", "checkout.recovery", {
      ...payload,
      to_email: email,
      custom_body: `<p>${message.replace(/</g, "&lt;").replace(/\n/g, "<br/>")}</p>`,
      use_custom_body: true,
    });
  }
}

export async function processDueCheckoutReminders() {
  const db = getAdminClient();
  const now = new Date().toISOString();
  const { data: due } = await db
    .from("checkout_recovery_reminders")
    .select("*")
    .eq("status", "pending")
    .lte("send_at", now)
    .limit(50);

  for (const row of due ?? []) {
    try {
      await deliverCheckoutRecovery(row.client_id, row.message, {
        email: row.send_email,
        push: row.send_push,
      });
      await db
        .from("checkout_recovery_reminders")
        .update({ status: "sent", sent_at: now })
        .eq("id", row.id);
    } catch (e) {
      console.error("[checkout-reminder]", row.id, e);
    }
  }
}

export async function deleteCheckoutSession(id: string) {
  const db = getAdminClient();
  const { error } = await db.from("checkout_sessions").delete().eq("id", id);
  if (error) throw new Error(error.message);
  return { deleted: true };
}

export async function scheduleCheckoutRecovery(
  sessionId: string,
  createdBy: string,
  input: CheckoutReminderInput,
) {
  const db = getAdminClient();
  const { data: session, error: loadErr } = await db
    .from("checkout_sessions")
    .select("id, client_id, status")
    .eq("id", sessionId)
    .maybeSingle();
  if (loadErr) throw new Error(loadErr.message);
  if (!session) throw new Error("Checkout session not found");
  if (session.status !== "abandoned") {
    throw new Error("Recovery reminders are only for abandoned checkouts");
  }

  const sendAt = new Date(Date.now() + input.delay_minutes * 60_000).toISOString();

  const { data: reminder, error } = await db
    .from("checkout_recovery_reminders")
    .insert({
      checkout_session_id: sessionId,
      client_id: session.client_id,
      message: input.message.trim(),
      send_email: input.send_email,
      send_push: input.send_push,
      send_at: sendAt,
      created_by: createdBy,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);

  if (input.delay_minutes <= 0) {
    await deliverCheckoutRecovery(session.client_id, input.message.trim(), {
      email: input.send_email,
      push: input.send_push,
    });
    await db
      .from("checkout_recovery_reminders")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .eq("id", reminder.id);
  } else {
    await processDueCheckoutReminders();
  }

  return reminder;
}
