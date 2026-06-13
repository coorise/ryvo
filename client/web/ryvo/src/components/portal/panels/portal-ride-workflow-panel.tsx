"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Car, CreditCard, Loader2, MapPin, X } from "lucide-react";

import { RyvoButton } from "@/components/ryvo/ryvo-button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { paymentService } from "@/services/payment.service";
import { tripService } from "@/services/trip.service";
import type { PortalArea } from "@/configs/portal-nav";

type PortalRideWorkflowPanelProps = {
  area: PortalArea;
  mode?: "incoming" | "driving" | "requesting" | "booking";
};

function uuid() {
  return crypto.randomUUID();
}

export function PortalRideWorkflowPanel({ area, mode = "booking" }: PortalRideWorkflowPanelProps) {
  const { t } = useTranslation();
  const { accessToken } = useAuth();
  const qc = useQueryClient();

  const [pickupAddress, setPickupAddress] = useState("");
  const [dropoffAddress, setDropoffAddress] = useState("");
  const [pickup, setPickup] = useState<{ lat: number; lng: number } | null>(null);
  const [dropoff, setDropoff] = useState<{ lat: number; lng: number } | null>(null);

  const activeQ = useQuery({
    queryKey: ["portal", area, "trip-active"],
    queryFn: () => tripService.getActiveTrip(accessToken),
    enabled: Boolean(accessToken),
    refetchInterval: 5000,
  });

  const phase = activeQ.data?.phase ?? "idle";
  const assignment = activeQ.data?.assignment as Record<string, unknown> | undefined;
  const request = (activeQ.data?.request ?? activeQ.data?.trip) as Record<string, unknown> | undefined;
  const trip = activeQ.data?.trip as Record<string, unknown> | undefined;

  const estimateM = useMutation({
    mutationFn: () => {
      if (!pickup || !dropoff) throw new Error("missing coords");
      return tripService.estimate(accessToken, {
        pickup_lat: pickup.lat,
        pickup_lng: pickup.lng,
        dropoff_lat: dropoff.lat,
        dropoff_lng: dropoff.lng,
        pickup_address: pickupAddress || undefined,
        dropoff_address: dropoffAddress || undefined,
        vehicle_category: "economy",
      });
    },
    onSuccess: (res) => {
      toast.success(t("portal.ride.estimated", { amount: res.estimate.total.toFixed(2) }));
    },
    onError: () => toast.error(t("portal.ride.estimateFailed")),
  });

  const requestM = useMutation({
    mutationFn: () => {
      if (!pickup || !dropoff) throw new Error("missing coords");
      return tripService.requestRide(accessToken, {
        pickup_lat: pickup.lat,
        pickup_lng: pickup.lng,
        dropoff_lat: dropoff.lat,
        dropoff_lng: dropoff.lng,
        pickup_address: pickupAddress || undefined,
        dropoff_address: dropoffAddress || undefined,
        vehicle_category: "economy",
        idempotency_key: uuid(),
      });
    },
    onSuccess: () => {
      toast.success(t("portal.ride.requestSent"));
      void qc.invalidateQueries({ queryKey: ["portal", area, "trip-active"] });
    },
    onError: () => toast.error(t("portal.ride.requestFailed")),
  });

  const acceptM = useMutation({
    mutationFn: (assignmentId: string) => tripService.acceptAssignment(accessToken, assignmentId),
    onSuccess: () => {
      toast.success(t("portal.ride.accepted"));
      void qc.invalidateQueries({ queryKey: ["portal", area, "trip-active"] });
    },
  });

  const rejectM = useMutation({
    mutationFn: (assignmentId: string) => tripService.rejectAssignment(accessToken, assignmentId),
    onSuccess: () => {
      toast.info(t("portal.ride.rejected"));
      void qc.invalidateQueries({ queryKey: ["portal", area, "trip-active"] });
    },
  });

  const payM = useMutation({
    mutationFn: (requestId: string) =>
      paymentService.createIntent(accessToken, {
        request_id: requestId,
        idempotency_key: uuid(),
      }),
    onSuccess: () => {
      toast.success(t("portal.ride.paymentStarted"));
      void qc.invalidateQueries({ queryKey: ["portal", area, "trip-active"] });
    },
    onError: () => toast.error(t("portal.ride.paymentFailed")),
  });

  const cancelM = useMutation({
    mutationFn: (requestId: string) => tripService.cancelRequest(accessToken, requestId),
    onSuccess: () => {
      toast.info(t("portal.ride.cancelled"));
      void qc.invalidateQueries({ queryKey: ["portal", area, "trip-active"] });
    },
  });

  const transitionM = useMutation({
    mutationFn: ({ tripId, status }: { tripId: string; status: string }) =>
      tripService.transitionTrip(accessToken, tripId, status),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["portal", area, "trip-active"] });
    },
  });

  const showBooking = area === "client" && mode === "booking" && (phase === "idle" || phase === "pre_trip");
  const showRequesting = area === "client" && (mode === "requesting" || mode === "booking") && phase === "pre_trip";
  const showIncoming = area === "driver" && (mode === "incoming" || mode === "booking") && phase === "driver_offer";
  const showDriving =
    (mode === "driving" || mode === "booking") &&
    (phase === "active_trip" || phase === "awaiting_payment");

  const requestId = request?.id ? String(request.id) : undefined;
  const assignmentId = assignment?.id ? String(assignment.id) : undefined;
  const tripId = trip?.id ? String(trip.id) : undefined;
  const tripStatus = trip?.status ? String(trip.status) : undefined;

  const driverNextStatus = useMemo(() => {
    if (tripStatus === "driver_en_route") return "driver_arrived";
    if (tripStatus === "driver_arrived") return "rider_picked_up";
    if (tripStatus === "rider_picked_up") return "in_progress";
    if (tripStatus === "in_progress") return "completed";
    return null;
  }, [tripStatus]);

  if (activeQ.isLoading) {
    return (
      <div className="text-muted-foreground flex items-center gap-2 py-4 text-sm">
        <Loader2 className="size-4 animate-spin" /> {t("common.loading")}
      </div>
    );
  }

  if (showIncoming && assignmentId) {
    return (
      <div className="border-primary/40 bg-primary/5 space-y-3 rounded-2xl border p-4">
        <p className="font-semibold">{t("portal.ride.incomingTitle")}</p>
        <p className="text-muted-foreground text-sm">{t("portal.ride.incomingDesc")}</p>
        <div className="flex flex-wrap gap-2">
          <RyvoButton intent="cta" size="sm" disabled={acceptM.isPending} onClick={() => acceptM.mutate(assignmentId)}>
            {t("portal.ride.accept")}
          </RyvoButton>
          <RyvoButton intent="outline" size="sm" disabled={rejectM.isPending} onClick={() => rejectM.mutate(assignmentId)}>
            {t("portal.ride.reject")}
          </RyvoButton>
        </div>
      </div>
    );
  }

  if (showRequesting && requestId && phase === "pre_trip") {
    const status = String(request?.status ?? "pending");
    return (
      <div className="border-border space-y-3 rounded-2xl border p-4">
        <p className="font-semibold">{t("portal.ride.requestingTitle")}</p>
        <p className="text-muted-foreground text-sm">
          {t("portal.ride.requestingStatus", { status })}
        </p>
        {status === "awaiting_payment" ? (
          <RyvoButton intent="cta" size="sm" disabled={payM.isPending} onClick={() => payM.mutate(requestId)}>
            <CreditCard className="size-4" /> {t("portal.ride.payNow")}
          </RyvoButton>
        ) : null}
        <RyvoButton intent="ghost" size="sm" disabled={cancelM.isPending} onClick={() => cancelM.mutate(requestId)}>
          <X className="size-4" /> {t("portal.ride.cancelRequest")}
        </RyvoButton>
      </div>
    );
  }

  if (showDriving && (tripId || phase === "awaiting_payment")) {
    return (
      <div className="border-border space-y-3 rounded-2xl border p-4">
        <p className="flex items-center gap-2 font-semibold">
          <Car className="size-4" /> {t("portal.ride.activeTitle")}
        </p>
        {tripId ? (
          <>
            <p className="text-muted-foreground text-sm">
              {t("portal.ride.tripStatus", { status: tripStatus ?? "active" })}
            </p>
            {area === "driver" && driverNextStatus && tripId ? (
              <RyvoButton
                intent="cta"
                size="sm"
                disabled={transitionM.isPending}
                onClick={() => transitionM.mutate({ tripId, status: driverNextStatus })}
              >
                {t("portal.ride.advance", { status: driverNextStatus })}
              </RyvoButton>
            ) : null}
          </>
        ) : (
          <p className="text-muted-foreground text-sm">{t("portal.ride.awaitingTrip")}</p>
        )}
      </div>
    );
  }

  if (!showBooking) {
    return (
      <p className="text-muted-foreground py-4 text-sm">{t("portal.ride.noActiveWorkflow")}</p>
    );
  }

  return (
    <div className="border-border space-y-3 rounded-2xl border p-4">
      <p className="font-semibold">{t("portal.ride.bookTitle")}</p>
      <p className="text-muted-foreground text-sm">{t("portal.ride.bookHint")}</p>
      <Input
        placeholder={t("portal.ride.pickupPlaceholder")}
        value={pickupAddress}
        onChange={(e) => setPickupAddress(e.target.value)}
      />
      <Input
        placeholder={t("portal.ride.dropoffPlaceholder")}
        value={dropoffAddress}
        onChange={(e) => setDropoffAddress(e.target.value)}
      />
      <div className="grid grid-cols-2 gap-2">
        <RyvoButton
          intent="outline"
          size="sm"
          type="button"
          onClick={() => setPickup({ lat: 45.5017, lng: -73.5673 })}
        >
          <MapPin className="size-4" /> {t("portal.ride.setPickup")}
        </RyvoButton>
        <RyvoButton
          intent="outline"
          size="sm"
          type="button"
          onClick={() => setDropoff({ lat: 45.515, lng: -73.574 })}
        >
          <MapPin className="size-4" /> {t("portal.ride.setDropoff")}
        </RyvoButton>
      </div>
      <div className="flex flex-wrap gap-2">
        <RyvoButton
          intent="outline"
          size="sm"
          disabled={!pickup || !dropoff || estimateM.isPending}
          onClick={() => estimateM.mutate()}
        >
          {t("portal.ride.estimate")}
        </RyvoButton>
        <RyvoButton
          intent="cta"
          size="sm"
          disabled={!pickup || !dropoff || requestM.isPending}
          onClick={() => requestM.mutate()}
        >
          {t("portal.ride.requestRide")}
        </RyvoButton>
      </div>
    </div>
  );
}
