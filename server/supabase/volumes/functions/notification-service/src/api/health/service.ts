export function healthPayload() {
  return { status: "ok" as const, service: "notification-service" };
}
