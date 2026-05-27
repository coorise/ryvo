import { publishEvent, TOPICS } from "./kafka.ts";
import { getAdminClient } from "./supabase.ts";

export async function emitAudit(
  actorId: string | null,
  action: string,
  targetType: string,
  targetId: string,
  diff: Record<string, unknown> = {},
): Promise<void> {
  const payload = {
    actor_id: actorId,
    action,
    target_type: targetType,
    target_id: targetId,
    diff,
    created_at: new Date().toISOString(),
  };
  await publishEvent(TOPICS.AUDIT_EVENTS, payload, targetId);
  const db = getAdminClient();
  await db.from("audit_logs").insert({
    actor_id: actorId,
    action,
    target_type: targetType,
    target_id: targetId,
    diff,
  });
}

export async function queueNotification(
  userId: string,
  channel: "push" | "sms" | "email" | "in_app",
  type: string,
  payload: Record<string, unknown>,
): Promise<void> {
  await publishEvent(
    TOPICS.NOTIFICATION_SEND,
    { user_id: userId, channel, type, payload },
    userId,
  );
}
