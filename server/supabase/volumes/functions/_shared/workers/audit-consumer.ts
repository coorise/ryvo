import { createConsumer, TOPICS } from "../lib/kafka.ts";
import { getAdminClient } from "../lib/supabase.ts";

export async function startAuditConsumer(): Promise<void> {
  const consumer = await createConsumer("ryvo-audit-service");
  await consumer.subscribe({ topic: TOPICS.AUDIT_EVENTS, fromBeginning: false });
  await consumer.run({
    eachMessage: async ({ message }) => {
      if (!message.value) return;
      const row = JSON.parse(message.value.toString());
      const db = getAdminClient();
      await db.from("audit_logs").insert({
        actor_id: row.actor_id,
        action: row.action,
        target_type: row.target_type,
        target_id: row.target_id,
        diff: row.diff ?? {},
      });
    },
  });
}
