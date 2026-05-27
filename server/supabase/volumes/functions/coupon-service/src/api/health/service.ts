export function healthPayload() {
  return { status: "ok" as const, service: "coupon-service" };
}
