import { createConsumer, TOPICS } from "../lib/kafka.ts";
import { processRideRequest } from "../../matching-engine/src/handler.ts";

export async function startMatchingConsumer(): Promise<void> {
  const consumer = await createConsumer("ryvo-matching-engine");
  await consumer.subscribe({ topic: TOPICS.RIDE_REQUEST_CREATED, fromBeginning: false });
  await consumer.run({
    eachMessage: async ({ message }) => {
      if (!message.value) return;
      const payload = JSON.parse(message.value.toString());
      const requestId = payload.request?.id ?? payload.id;
      if (requestId) await processRideRequest(requestId);
    },
  });
}
