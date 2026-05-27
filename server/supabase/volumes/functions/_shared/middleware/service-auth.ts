import { env } from "../lib/env.ts";
import { fail } from "../core/response.ts";

export function verifyServiceSignature(req: Request, rawBody: string): Response | null {
  const sig = req.headers.get("x-service-signature");
  const ts = req.headers.get("x-service-timestamp");
  if (!sig || !ts) return fail("UNAUTHORIZED", "Missing service signature", 401);
  const age = Math.abs(Date.now() - Number(ts));
  if (Number.isNaN(age) || age > 60_000) {
    return fail("UNAUTHORIZED", "Stale service timestamp", 401);
  }
  const expected = new Bun.CryptoHasher("sha256")
    .update(`${ts}.${rawBody}`)
    .update(env.serviceHmacSecret)
    .digest("hex");
  if (sig !== expected) return fail("UNAUTHORIZED", "Invalid service signature", 401);
  return null;
}
