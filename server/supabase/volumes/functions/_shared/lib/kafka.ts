import { Kafka, type Producer, type Consumer } from "kafkajs";
import { env } from "./env.ts";

export const TOPICS = {
  RIDE_REQUEST_CREATED: "ride.request.created",
  RIDE_TRIP_CREATED: "ride.trip.created",
  RIDE_TRIP_STATE_CHANGED: "ride.trip.state_changed",
  RIDE_TRIP_COMPLETED: "ride.trip.completed",
  LOCATION_DRIVER_UPDATED: "location.driver.updated",
  GEO_FENCE_EVENT: "geo.fence.event",
  PAYMENT_INTENT_CREATED: "payment.intent.created",
  PAYMENT_SETTLED: "payment.settled",
  PAYMENT_REFUNDED: "payment.refunded",
  AUDIT_EVENTS: "audit.events",
  NOTIFICATION_SEND: "notification.send",
  KYC_STATUS_CHANGED: "kyc.status_changed",
} as const;

let kafka: Kafka | null = null;
let producer: Producer | null = null;

function getKafka(): Kafka {
  if (!kafka) {
    kafka = new Kafka({ clientId: "ryvo-functions", brokers: [env.kafkaBroker] });
  }
  return kafka;
}

export async function publishEvent(
  topic: string,
  payload: Record<string, unknown>,
  key?: string,
): Promise<void> {
  if (!producer) {
    producer = getKafka().producer();
    await producer.connect();
  }
  await producer.send({
    topic,
    messages: [{ key: key ?? String(payload.id ?? ""), value: JSON.stringify(payload) }],
  });
}

export async function createConsumer(groupId: string): Promise<Consumer> {
  const consumer = getKafka().consumer({ groupId });
  await consumer.connect();
  return consumer;
}
