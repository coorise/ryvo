/**
 * Ryvo unified API gateway — Bun HTTP server (replaces Deno edge-runtime dispatcher).
 * Kong: /functions/v1/{service}/... → http://functions:9000/{service}/...
 *
 * Services are lazy-loaded so the HTTP listener comes up quickly on constrained VPS hosts.
 */
import { env } from "../_shared/lib/env.ts";

type Handler = (req: Request) => Promise<Response>;

const serviceLoaders: Record<string, () => Promise<Handler>> = {
  "auth-hooks": () => import("../auth-hooks/src/handler.ts").then((m) => m.handle),
  "location-ingest": () => import("../location-ingest/src/handler.ts").then((m) => m.handle),
  "trip-lifecycle": () => import("../trip-lifecycle/src/handler.ts").then((m) => m.handle),
  "matching-engine": () => import("../matching-engine/src/handler.ts").then((m) => m.handle),
  "routing-engine": () => import("../routing-engine/src/handler.ts").then((m) => m.handle),
  "payment-gateway": () => import("../payment-gateway/src/handler.ts").then((m) => m.handle),
  "payout-service": () => import("../payout-service/src/handler.ts").then((m) => m.handle),
  "notification-service": () => import("../notification-service/src/handler.ts").then((m) => m.handle),
  "storage-service": () => import("../storage-service/src/handler.ts").then((m) => m.handle),
  "kyc-service": () => import("../kyc-service/src/handler.ts").then((m) => m.handle),
  "coupon-service": () => import("../coupon-service/src/handler.ts").then((m) => m.handle),
  "support-service": () => import("../support-service/src/handler.ts").then((m) => m.handle),
  "audit-service": () => import("../audit-service/src/handler.ts").then((m) => m.handle),
  "geofence-service": () => import("../geofence-service/src/handler.ts").then((m) => m.handle),
  "shift-service": () => import("../shift-service/src/handler.ts").then((m) => m.handle),
  "cron-jobs": () => import("../cron-jobs/src/handler.ts").then((m) => m.handle),
  "gdpr-service": () => import("../gdpr-service/src/handler.ts").then((m) => m.handle),
  "trip-chat": () => import("../trip-chat/src/handler.ts").then((m) => m.handle),
  "profile-service": () => import("../profile-service/src/handler.ts").then((m) => m.handle),
};

const handlerCache = new Map<string, Handler>();

/** Preload admin-critical services so first browser request does not hit a cold import timeout. */
const WARMUP_SERVICES = [
  "auth-hooks",
  "profile-service",
  "notification-service",
  "audit-service",
] as const;

async function resolveHandler(service: string): Promise<Handler | undefined> {
  if (service === "hello") {
    return async () => Response.json("Hello from Ryvo Functions!");
  }
  const cached = handlerCache.get(service);
  if (cached) return cached;
  const loader = serviceLoaders[service];
  if (!loader) return undefined;
  const handler = await loader();
  handlerCache.set(service, handler);
  return handler;
}

async function fetch(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  const service = parts[0] ?? "";
  try {
    const handler = await resolveHandler(service);
    if (!handler) {
      return Response.json(
        { error: { code: "UNKNOWN_SERVICE", message: `Unknown service: ${service}` } },
        { status: 404 },
      );
    }
    return await handler(req);
  } catch (e) {
    console.error(`[ryvo-gateway] ${service} error:`, e);
    return Response.json(
      {
        error: {
          code: "SERVICE_UNAVAILABLE",
          message: e instanceof Error ? e.message : "Service failed to load",
        },
      },
      { status: 503 },
    );
  }
}

function warmupServices() {
  void Promise.all(WARMUP_SERVICES.map((s) => resolveHandler(s)))
    .then(() => console.log(`[ryvo-gateway] warmed ${WARMUP_SERVICES.join(", ")}`))
    .catch((e) => console.error("[ryvo-gateway] warmup failed", e));
}

console.log(`[ryvo-gateway] Starting on :${env.port}`);
Bun.serve({ port: env.port, fetch });
console.log(`[ryvo-gateway] Listening on :${env.port}`);
warmupServices();

if (process.env.RYVO_DISABLE_WORKERS !== "1") {
  setTimeout(() => {
    import("../_shared/workers/index.ts")
      .then(({ startBackgroundWorkers }) => startBackgroundWorkers())
      .catch((e) => console.error("[workers]", e));
  }, 5_000);
} else {
  console.log("[ryvo-gateway] background workers disabled (RYVO_DISABLE_WORKERS=1)");
}
