import Stripe from "stripe";
import { createServiceRouter } from "../../../../_shared/core/router.ts";
import { ok, fail } from "../../../../_shared/core/response.ts";
import { env } from "../../../../_shared/lib/env.ts";
import { getAdminClient } from "../../../../_shared/lib/supabase.ts";
import { publishEvent, TOPICS } from "../../../../_shared/lib/kafka.ts";
import { requireRole } from "../../../../_shared/middleware/auth.ts";
import { createTripAfterPayment } from "../../../../_shared/lib/trip-flow.ts";

function stripe(): Stripe | null {
  if (!env.stripeSecretKey) return null;
  return new Stripe(env.stripeSecretKey);
}

import type { RouteDef } from "../../../../_shared/core/router.ts";

export const routes: RouteDef[] = [{
    method: "POST",
    path: "/v1/intent",
    auth: true,
    requireVerifiedEmail: true,
    rateLimit: { limit: 5, windowSec: 60, keyPrefix: "payment" },
    handler: async (req, ctx) => {
      const denied = requireRole(ctx.auth!, "client");
      if (denied) return denied;
      const { request_id, amount, currency, idempotency_key } = await req.json();
      if (!request_id) return fail("VALIDATION", "request_id is required", 422);

      const db = getAdminClient();
      const { data: request } = await db
        .from("trip_requests")
        .select("*")
        .eq("id", request_id)
        .eq("rider_id", ctx.auth!.userId)
        .single();

      if (!request) return fail("NOT_FOUND", "Trip request not found", 404);
      if (!["accepted", "awaiting_payment"].includes(request.status)) {
        return fail(
          "PAYMENT_NOT_ALLOWED",
          "Driver must accept the ride before payment",
          422,
{ request_status: request.status },
        );
      }

      const { data: assignment } = await db
        .from("trip_assignments")
        .select("id,status,driver_id")
        .eq("request_id", request_id)
        .eq("status", "accepted")
        .maybeSingle();
      if (!assignment) {
        return fail("NO_ACCEPTED_DRIVER", "No accepted driver for this request", 422);
      }

      const payAmount = amount ?? request.estimated_fare;
      if (!payAmount || payAmount <= 0) {
        return fail("INVALID_AMOUNT", "Invalid fare amount", 422);
      }

      const { data: existing } = await db
        .from("payment_intents")
        .select("*")
        .eq("idempotency_key", idempotency_key)
        .maybeSingle();
      if (existing) return ok({ intent: existing, idempotent: true });

      let providerIntentId: string | null = null;
      const s = stripe();
      if (s) {
        const intent = await s.paymentIntents.create(
{
            amount: Math.round(payAmount * 100),
            currency: (currency ?? "usd").toLowerCase(),
            metadata: { request_id, rider_id: ctx.auth!.userId, driver_id: assignment.driver_id },
          },
{ idempotencyKey: idempotency_key },
        );
        providerIntentId = intent.id;
      }

      await db.from("trip_requests").update({ status: "awaiting_payment" }).eq("id", request_id);

      const { data: intent } = await db
        .from("payment_intents")
        .insert({
          request_id,
          rider_id: ctx.auth!.userId,
          provider: "stripe",
          provider_intent_id: providerIntentId,
          amount: payAmount,
          currency: currency ?? "USD",
          status: "requires_payment",
          idempotency_key,
        })
        .select()
        .single();

      await publishEvent(TOPICS.PAYMENT_INTENT_CREATED, { intent, request_id }, intent?.id);
      return ok({ intent, request_id, driver_id: assignment.driver_id });
    },
  },
{
    method: "POST",
    path: "/v1/webhook/stripe",
    auth: false,
    handler: async (req) => {
      const s = stripe();
      const raw = await req.text();
      let event: Stripe.Event;
      try {
        if (s && env.stripeWebhookSecret) {
          event = s.webhooks.constructEvent(
            raw,
            req.headers.get("stripe-signature") ?? "",
            env.stripeWebhookSecret,
          );
        } else {
          event = JSON.parse(raw) as Stripe.Event;
        }
      } catch {
        return fail("WEBHOOK_INVALID", "Invalid signature", 400);
      }

      const db = getAdminClient();
      if (event.type === "payment_intent.succeeded") {
        const pi = event.data.object as Stripe.PaymentIntent;
        const requestId = pi.metadata?.request_id;
        await db
          .from("payment_intents")
          .update({ status: "succeeded", settled_at: new Date().toISOString() })
          .eq("provider_intent_id", pi.id);

        if (requestId) {
          const tripId = await createTripAfterPayment(requestId);
          if (tripId) {
            await db.from("payment_intents").update({ trip_id: tripId }).eq("provider_intent_id", pi.id);
          }
        }
        await publishEvent(TOPICS.PAYMENT_SETTLED, { provider_intent_id: pi.id, request_id: requestId }, pi.id);
      }
      return ok({ received: true });
    },
  },
{
    method: "POST",
    path: "/v1/confirm-dev",
    auth: true,
    requireVerifiedEmail: true,
    handler: async (req, ctx) => {
      if (env.nodeEnv === "production") {
        return fail("FORBIDDEN", "Dev confirm disabled in production", 403);
      }
      const denied = requireRole(ctx.auth!, "client");
      if (denied) return denied;
      const { request_id } = await req.json();
      if (!request_id) return fail("VALIDATION", "request_id required", 422);

      const db = getAdminClient();
      const { data: request } = await db
        .from("trip_requests")
        .select("*")
        .eq("id", request_id)
        .eq("rider_id", ctx.auth!.userId)
        .single();
      if (!request || request.status !== "awaiting_payment") {
        return fail("INVALID_STATE", "Request must be awaiting_payment", 422);
      }

      await db
        .from("payment_intents")
        .update({ status: "succeeded", settled_at: new Date().toISOString() })
        .eq("request_id", request_id);

      const tripId = await createTripAfterPayment(request_id);
      return ok({ trip_id: tripId, request_id });
    },
  },];
