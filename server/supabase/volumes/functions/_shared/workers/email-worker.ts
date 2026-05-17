import { processEmailOutbox } from "../lib/email.ts";

export function startEmailOutboxWorker(): void {
  const tick = async () => {
    try {
      const r = await processEmailOutbox(25);
      if (r.sent > 0 || r.failed > 0) {
        console.log(`[ryvo-email] outbox sent=${r.sent} failed=${r.failed}`);
      }
    } catch (e) {
      console.error("[ryvo-email] outbox worker error:", e);
    }
  };
  void tick();
  setInterval(tick, 10_000);
  console.log("[ryvo-email] Outbox worker started (10s interval)");
}
