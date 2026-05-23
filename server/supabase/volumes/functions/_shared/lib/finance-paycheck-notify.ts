import { queueNotification } from "./events.ts";
import { getUserEmail } from "./finance-referrals.ts";

const DEFAULT_MESSAGES: Record<string, (reason?: string) => string> = {
  "paycheck.held": (reason) =>
    reason?.trim()
      ? `Your payout has been placed on hold. Reason: ${reason.trim()}`
      : "Your payout has been placed on hold. Contact support if you have questions.",
  "paycheck.resumed": () => "Your payout is back in the queue and will be processed on schedule.",
  "paycheck.cancelled": (reason) =>
    reason?.trim()
      ? `Your payout was cancelled. Reason: ${reason.trim()}`
      : "Your payout was cancelled.",
  "subscription.held": (reason) =>
    reason?.trim()
      ? `Your tariff subscription is on hold. Reason: ${reason.trim()}`
      : "Your tariff subscription is on hold.",
  "subscription.cancelled": (reason) =>
    reason?.trim()
      ? `Your tariff subscription was cancelled. Reason: ${reason.trim()}`
      : "Your tariff subscription was cancelled.",
  "subscription.created": () => "You are now subscribed to a driver tariff package.",
};

export async function notifyDriverFinance(
  userId: string,
  type: string,
  opts?: { reason?: string; notify?: boolean; extra?: Record<string, unknown> },
) {
  if (opts?.notify === false) return;
  const message = DEFAULT_MESSAGES[type]?.(opts?.reason) ?? "Your account was updated.";
  const email = await getUserEmail(userId);
  const payload = {
    message,
    reason: opts?.reason ?? null,
    email,
    ...opts?.extra,
  };
  await queueNotification(userId, "in_app", type, payload);
  await queueNotification(userId, "email", type, { ...payload, subject: "Ryvo — account update" });
}
