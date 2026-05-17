import { getAdminClient } from "./supabase.ts";
import { publishEvent, TOPICS } from "./kafka.ts";
import { queueNotification } from "./events.ts";
import { broadcastToUser, broadcastTrip } from "./realtime.ts";

const OFFER_TIMEOUT_MS = 30_000;
const REQUIRED_KYC_DOCS = [
  "national_id",
  "selfie_with_id",
  "driver_license",
  "bank_statement",
] as const;

export async function assertDriverCanGoOnline(driverId: string): Promise<string | null> {
  const db = getAdminClient();
  const { data: profile } = await db
    .from("driver_profiles")
    .select("kyc_status")
    .eq("user_id", driverId)
    .single();
  if (!profile || profile.kyc_status !== "approved") {
    return "Driver KYC must be approved before going online";
  }
  const { data: docs } = await db
    .from("kyc_documents")
    .select("doc_type,status")
    .eq("driver_id", driverId);
  const approved = new Set(
    (docs ?? []).filter((d) => d.status === "approved").map((d) => d.doc_type),
  );
  const hasId = approved.has("national_id") || approved.has("passport");
  if (!hasId) return "Missing approved ID document";
  for (const t of ["selfie_with_id", "driver_license", "bank_statement"] as const) {
    if (!approved.has(t)) return `Missing approved document: ${t}`;
  }
  return null;
}

export async function offerRideToNextDriver(requestId: string): Promise<boolean> {
  const db = getAdminClient();
  const { data: request } = await db
    .from("trip_requests")
    .select("*")
    .eq("id", requestId)
    .single();
  if (!request || !["pending", "offering"].includes(request.status)) return false;

  const { data: drivers } = await db.rpc("match_drivers_for_request", {
    p_request_id: requestId,
  });
  if (!drivers?.length) {
    await db.from("trip_requests").update({ status: "expired" }).eq("id", requestId);
    await queueNotification(request.rider_id, "in_app", "ride.expired", { request_id: requestId });
    await broadcastToUser(request.rider_id, "ride.expired", { request_id: requestId });
    return false;
  }

  const { data: rejected } = await db
    .from("trip_assignments")
    .select("driver_id")
    .eq("request_id", requestId)
    .in("status", ["rejected", "timeout"]);
  const rejectedIds = new Set((rejected ?? []).map((r) => r.driver_id));

  const candidate = (drivers as { driver_id: string }[]).find((d) => !rejectedIds.has(d.driver_id));
  if (!candidate) {
    await db.from("trip_requests").update({ status: "expired" }).eq("id", requestId);
    await queueNotification(request.rider_id, "in_app", "ride.expired", { request_id: requestId });
    return false;
  }

  const timeoutAt = new Date(Date.now() + OFFER_TIMEOUT_MS).toISOString();
  const { data: assignment } = await db
    .from("trip_assignments")
    .insert({
      request_id: requestId,
      driver_id: candidate.driver_id,
      status: "offered",
      timeout_at: timeoutAt,
    })
    .select()
    .single();

  await db
    .from("trip_requests")
    .update({ status: "offering", active_assignment_id: assignment?.id })
    .eq("id", requestId);

  await queueNotification(candidate.driver_id, "in_app", "ride.offer", {
    request_id: requestId,
    assignment_id: assignment?.id,
    expires_at: timeoutAt,
    pickup_address: request.pickup_address,
    estimated_fare: request.estimated_fare,
  });
  await broadcastToUser(candidate.driver_id, "ride.offer", {
    request_id: requestId,
    assignment_id: assignment?.id,
    timeout_at: timeoutAt,
  });
  await broadcastToUser(request.rider_id, "ride.offering", {
    request_id: requestId,
    assignment_id: assignment?.id,
  });

  return true;
}

export async function acceptAssignment(
  assignmentId: string,
  driverId: string,
): Promise<{ ok: true; request_id: string } | { error: string; code: string }> {
  const db = getAdminClient();
  const { data: assignment } = await db
    .from("trip_assignments")
    .select("*")
    .eq("id", assignmentId)
    .eq("driver_id", driverId)
    .single();

  if (!assignment) return { error: "Assignment not found", code: "NOT_FOUND" };
  if (assignment.status !== "offered") {
    return { error: `Cannot accept assignment in status ${assignment.status}`, code: "INVALID_STATE" };
  }
  if (assignment.timeout_at && new Date(assignment.timeout_at) < new Date()) {
    return { error: "Offer expired", code: "OFFER_EXPIRED" };
  }

  const { data: tripRequest } = await db
    .from("trip_requests")
    .select("*")
    .eq("id", assignment.request_id)
    .single();

  await db
    .from("trip_assignments")
    .update({ status: "accepted", accepted_at: new Date().toISOString() })
    .eq("id", assignmentId);

  await db
    .from("trip_requests")
    .update({ status: "accepted", active_assignment_id: assignmentId })
    .eq("id", assignment.request_id);

  const riderId = tripRequest?.rider_id;
  if (riderId) {
    await queueNotification(riderId, "in_app", "ride.driver_accepted", {
      request_id: assignment.request_id,
      assignment_id: assignmentId,
      estimated_fare: tripRequest?.estimated_fare,
    });
    await broadcastToUser(riderId, "ride.driver_accepted", {
      request_id: assignment.request_id,
      assignment_id: assignmentId,
      proceed_to_payment: true,
    });
  }

  return { ok: true, request_id: assignment.request_id };
}

export async function rejectAssignment(
  assignmentId: string,
  driverId: string,
): Promise<void> {
  const db = getAdminClient();
  const { data: assignment } = await db
    .from("trip_assignments")
    .select("request_id, status")
    .eq("id", assignmentId)
    .eq("driver_id", driverId)
    .single();
  if (!assignment || assignment.status !== "offered") return;

  const { data: tripRequest } = await db
    .from("trip_requests")
    .select("rider_id")
    .eq("id", assignment.request_id)
    .single();

  await db
    .from("trip_assignments")
    .update({ status: "rejected", rejected_at: new Date().toISOString() })
    .eq("id", assignmentId);

  const riderId = tripRequest?.rider_id;
  if (riderId) {
    await broadcastToUser(riderId, "ride.driver_rejected", {
      request_id: assignment.request_id,
      finding_next: true,
    });
  }

  await offerRideToNextDriver(assignment.request_id);
}

export async function createTripAfterPayment(requestId: string): Promise<string | null> {
  const db = getAdminClient();
  const { data: request } = await db
    .from("trip_requests")
    .select("*")
    .eq("id", requestId)
    .single();
  if (!request || request.status !== "awaiting_payment") return null;

  const { data: assignment } = await db
    .from("trip_assignments")
    .select("*")
    .eq("request_id", requestId)
    .eq("status", "accepted")
    .order("accepted_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!assignment) return null;

  const { data: trip } = await db
    .from("trips")
    .insert({
      request_id: requestId,
      driver_id: assignment.driver_id,
      rider_id: request.rider_id,
      pickup_geom: request.pickup_geom,
      dropoff_geom: request.dropoff_geom,
      status: "driver_en_route",
    })
    .select()
    .single();

  await db.from("trip_requests").update({ status: "paid" }).eq("id", requestId);

  if (trip) {
    await publishEvent(TOPICS.RIDE_TRIP_CREATED, { trip, request_id: requestId }, trip.id);
    await queueNotification(assignment.driver_id, "in_app", "ride.paid", { trip_id: trip.id });
    await queueNotification(request.rider_id, "in_app", "ride.paid", { trip_id: trip.id });
    await broadcastTrip(trip.id, "trip.started", { trip, chat_enabled: true });
    await broadcastToUser(assignment.driver_id, "ride.paid", { trip_id: trip.id });
    await broadcastToUser(request.rider_id, "ride.paid", { trip_id: trip.id });
  }

  return trip?.id ?? null;
}

export async function processExpiredOffers(): Promise<{ expired: number; reoffered: number }> {
  const db = getAdminClient();
  const { data: expiredCount } = await db.rpc("expire_trip_offers");

  const { data: offering } = await db
    .from("trip_requests")
    .select("id")
    .eq("status", "offering");

  let reoffered = 0;
  for (const req of offering ?? []) {
    const { data: activeOffer } = await db
      .from("trip_assignments")
      .select("id")
      .eq("request_id", req.id)
      .eq("status", "offered")
      .maybeSingle();
    if (!activeOffer) {
      const sent = await offerRideToNextDriver(req.id);
      if (sent) reoffered++;
    }
  }

  return { expired: Number(expiredCount ?? 0), reoffered };
}

export { REQUIRED_KYC_DOCS, OFFER_TIMEOUT_MS };
