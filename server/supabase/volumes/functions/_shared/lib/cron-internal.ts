import { env } from "./env.ts";

/** HMAC for service-to-service calls into ryvo-gateway (same secret as middleware). */
export function signServiceBody(body: string, ts: string): string {
  return new Bun.CryptoHasher("sha256")
    .update(`${ts}.${body}`)
    .update(env.serviceHmacSecret)
    .digest("hex");
}

/** POST a signed JSON body to an internal cron path on this gateway (e.g. `cron-jobs/v1/run/stale-drivers`). */
export async function dispatchSignedCron(path: string, body: string = "{}"): Promise<Response> {
  const ts = String(Date.now());
  const url = `http://127.0.0.1:${env.port}/${path}`;
  return fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-service-timestamp": ts,
      "x-service-signature": signServiceBody(body, ts),
    },
    body,
  });
}
