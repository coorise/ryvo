import { createConsumer, TOPICS } from "../lib/kafka.ts";
import { getAdminClient } from "../lib/supabase.ts";
import { sendTemplatedEmail } from "../lib/email.ts";

export async function startNotificationConsumer(): Promise<void> {
  const consumer = await createConsumer("ryvo-notification-service");
  await consumer.subscribe({ topic: TOPICS.NOTIFICATION_SEND, fromBeginning: false });
  await consumer.run({
    eachMessage: async ({ message }) => {
      if (!message.value) return;
      const job = JSON.parse(message.value.toString());
      const db = getAdminClient();

      if (job.channel === "email" && job.payload?.to_email && job.payload?.template_key) {
        try {
          await sendTemplatedEmail(
            job.payload.to_email as string,
            job.payload.template_key as string,
            (job.payload.vars ?? {}) as Record<string, string>,
          );
        } catch (e) {
          console.error("[notification] email send failed:", e);
        }
      }

      await db.from("notifications").insert({
        user_id: job.user_id,
        channel: job.channel,
        type: job.type,
        payload: job.payload ?? {},
        sent_at: new Date().toISOString(),
      });
    },
  });
}
