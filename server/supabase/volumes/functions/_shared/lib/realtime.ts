import { getAdminClient } from "./supabase.ts";

export async function broadcastTrip(
  tripId: string,
  event: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const supabase = getAdminClient();
  const channel = supabase.channel(`trip:${tripId}`);
  await channel.subscribe();
  await channel.send({
    type: "broadcast",
    event,
    payload,
  });
  await supabase.removeChannel(channel);
}

export async function broadcastToUser(
  userId: string,
  event: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const supabase = getAdminClient();
  const channel = supabase.channel(`user:${userId}`);
  await channel.subscribe();
  await channel.send({ type: "broadcast", event, payload });
  await supabase.removeChannel(channel);
}
