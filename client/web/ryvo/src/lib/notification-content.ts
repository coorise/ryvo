import type { InboxNotification } from "@/services/notification.service";

/** Short preview for table rows. */
export function notificationPreview(n: InboxNotification, maxLen = 120): string {
  const full = notificationBody(n);
  if (full.length <= maxLen) return full;
  return `${full.slice(0, maxLen)}…`;
}

/** Full message body for detail dialog. */
export function notificationBody(n: InboxNotification): string {
  const p = n.payload ?? {};
  if (typeof p.message === "string" && p.message.trim()) return p.message.trim();
  if (typeof p.body === "string" && p.body.trim()) return p.body.trim();

  if (n.type === "support.new_ticket") {
    const subject = typeof p.subject === "string" ? p.subject : "Support";
    return `New support ticket: ${subject}`;
  }
  if (n.type === "support.reply") {
    const subject = typeof p.subject === "string" ? p.subject : "";
    return subject
      ? `Support replied regarding: ${subject}`
      : "You have a new reply on your support ticket.";
  }

  if (typeof p.subject === "string") {
    const extra = typeof p.ticket_id === "string" ? `\nTicket: ${p.ticket_id}` : "";
    return `${p.subject}${extra}`;
  }

  try {
    return JSON.stringify(p, null, 2);
  } catch {
    return n.type;
  }
}

export function notificationTitle(n: InboxNotification): string {
  return n.type.replace(/\./g, " · ");
}
