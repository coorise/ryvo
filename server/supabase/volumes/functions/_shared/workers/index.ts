import { startMatchingConsumer } from "./matching-consumer.ts";
import { startNotificationConsumer } from "./notification-consumer.ts";
import { startAuditConsumer } from "./audit-consumer.ts";
import { startCronScheduler } from "./cron-scheduler.ts";
import { startEmailOutboxWorker } from "./email-worker.ts";

async function safeStart(name: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
    console.log(`[ryvo-workers] ${name} ready`);
  } catch (e) {
    console.error(`[ryvo-workers] ${name} failed (will retry on restart):`, e);
  }
}

export async function startBackgroundWorkers(): Promise<void> {
  startCronScheduler();
  startEmailOutboxWorker();
  await Promise.all([
    safeStart("matching-consumer", startMatchingConsumer),
    safeStart("notification-consumer", startNotificationConsumer),
    safeStart("audit-consumer", startAuditConsumer),
  ]);
}
