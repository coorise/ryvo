import Redis from "ioredis";
import { env } from "./env.ts";

let client: Redis | null = null;

export function getRedis(): Redis {
  if (!client) {
    client = new Redis(env.redisUrl, { maxRetriesPerRequest: 2, lazyConnect: true });
  }
  return client;
}

export async function rateLimit(
  key: string,
  limit: number,
  windowSec: number,
): Promise<{ allowed: boolean; remaining: number }> {
  const redis = getRedis();
  await redis.connect().catch(() => undefined);
  const bucket = `rl:${key}`;
  const count = await redis.incr(bucket);
  if (count === 1) await redis.expire(bucket, windowSec);
  return { allowed: count <= limit, remaining: Math.max(0, limit - count) };
}
