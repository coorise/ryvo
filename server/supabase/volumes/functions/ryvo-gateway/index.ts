/**
 * Ryvo unified API gateway — Bun HTTP server (replaces Deno edge-runtime dispatcher).
 * Kong: /functions/v1/{service}/... → http://functions:9000/{service}/...
 */
import { env } from "../_shared/lib/env.ts";
import { startBackgroundWorkers } from "../_shared/workers/index.ts";

import { handle as authHooks } from "../auth-hooks/src/handler.ts";
import { handle as locationIngest } from "../location-ingest/src/handler.ts";
import { handle as tripLifecycle } from "../trip-lifecycle/src/handler.ts";
import { handle as matchingEngine } from "../matching-engine/src/handler.ts";
import { handle as routingEngine } from "../routing-engine/src/handler.ts";
import { handle as paymentGateway } from "../payment-gateway/src/handler.ts";
import { handle as payoutService } from "../payout-service/src/handler.ts";
import { handle as notificationService } from "../notification-service/src/handler.ts";
import { handle as storageService } from "../storage-service/src/handler.ts";
import { handle as kycService } from "../kyc-service/src/handler.ts";
import { handle as couponService } from "../coupon-service/src/handler.ts";
import { handle as supportService } from "../support-service/src/handler.ts";
import { handle as auditService } from "../audit-service/src/handler.ts";
import { handle as geofenceService } from "../geofence-service/src/handler.ts";
import { handle as shiftService } from "../shift-service/src/handler.ts";
import { handle as cronJobs } from "../cron-jobs/src/handler.ts";
import { handle as gdprService } from "../gdpr-service/src/handler.ts";
import { handle as tripChat } from "../trip-chat/src/handler.ts";
import { handle as profileService } from "../profile-service/src/handler.ts";

const services: Record<string, (req: Request) => Promise<Response>> = {
  "auth-hooks": authHooks,
  "location-ingest": locationIngest,
  "trip-lifecycle": tripLifecycle,
  "matching-engine": matchingEngine,
  "routing-engine": routingEngine,
  "payment-gateway": paymentGateway,
  "payout-service": payoutService,
  "notification-service": notificationService,
  "storage-service": storageService,
  "kyc-service": kycService,
  "coupon-service": couponService,
  "support-service": supportService,
  "audit-service": auditService,
  "geofence-service": geofenceService,
  "shift-service": shiftService,
  "cron-jobs": cronJobs,
  "gdpr-service": gdprService,
  "trip-chat": tripChat,
  "profile-service": profileService,
  hello: async () => Response.json("Hello from Ryvo Functions!"),
};

async function fetch(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  const service = parts[0] ?? "";
  const handler = services[service];
  if (!handler) {
    return Response.json(
      { error: { code: "UNKNOWN_SERVICE", message: `Unknown service: ${service}` } },
      { status: 404 },
    );
  }
  return handler(req);
}

console.log(`[ryvo-gateway] Starting on :${env.port}`);
startBackgroundWorkers().catch((e) => console.error("[workers]", e));

Bun.serve({ port: env.port, fetch });
