import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { Clock3, CreditCard, Navigation, UserRound } from "lucide-react";
import { DeferredLiveMap } from "@/components/maps/deferred-live-map";
import {
  BottomActionBar,
  DataField,
  MapPanel
} from "@/components/layout/ops-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { formatMoney, formatPaymentMethod } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";

const nextStatusOrder = {
  accepted: "en_route",
  en_route: "arrived",
  arrived: "in_progress",
  in_progress: "completed"
} as const;

function formatDriverStage(status: string) {
  if (status === "en_route") {
    return "Arriving";
  }

  if (status === "arrived") {
    return "At pickup";
  }

  if (status === "in_progress") {
    return "In trip";
  }

  return status.replaceAll("_", " ");
}

export function DriverRidePage() {
  const { rideId = "" } = useParams();
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const rideQuery = useQuery({
    queryKey: ["driver-ride", rideId],
    queryFn: () => api.getRide(rideId, token!)
  });

  const statusMutation = useMutation({
    mutationFn: (status: keyof typeof nextStatusOrder | "completed") =>
      api.updateRideStatus(rideId, { status }, token!),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["driver-ride", rideId] });
      void queryClient.invalidateQueries({ queryKey: ["driver-active-rides"] });
    }
  });

  useEffect(() => {
    if (!token || !rideQuery.data) {
      return;
    }

    const socket = getSocket(token);
    socket.emit("ride.watch", rideId);

    const refresh = () => {
      void queryClient.invalidateQueries({ queryKey: ["driver-ride", rideId] });
      void queryClient.invalidateQueries({ queryKey: ["driver-active-rides"] });
    };

    socket.on("ride.status.changed", refresh);
    socket.on("ride.location.updated", refresh);

    return () => {
      socket.off("ride.status.changed", refresh);
      socket.off("ride.location.updated", refresh);
    };
  }, [queryClient, rideId, rideQuery.data, token]);

  useEffect(() => {
    if (!token || !rideQuery.data || !navigator.geolocation) {
      return;
    }

    if (!["accepted", "en_route", "arrived", "in_progress"].includes(rideQuery.data.status)) {
      return;
    }

    const interval = window.setInterval(() => {
      navigator.geolocation.getCurrentPosition((position) => {
        void api.sendDriverLocation(
          {
            rideId,
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            heading: position.coords.heading ?? undefined,
            speed: position.coords.speed ?? undefined
          },
          token
        );
      });
    }, 10_000);

    return () => window.clearInterval(interval);
  }, [rideId, rideQuery.data, token]);

  if (!rideQuery.data) {
    return (
      <Card>
        <CardContent className="p-8 text-sm text-ops-muted">Loading ride...</CardContent>
      </Card>
    );
  }

  const ride = rideQuery.data;
  const nextStatus =
    ride.status in nextStatusOrder ? nextStatusOrder[ride.status as keyof typeof nextStatusOrder] : null;
  const subtotal = ride.pricing.finalSubtotal ?? ride.pricing.estimatedSubtotal;
  const platformDue = ride.pricing.finalPlatformDue ?? ride.pricing.estimatedPlatformDue;
  const customerTotal = ride.pricing.finalCustomerTotal ?? ride.pricing.estimatedCustomerTotal;

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="rounded-[1.55rem] border border-ops-border-soft/90 bg-[linear-gradient(180deg,rgba(12,16,23,0.96),rgba(8,11,16,0.94))] px-4 py-4 shadow-soft">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-ops-muted">Active trip</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <p className="text-lg font-semibold text-ops-text">{ride.rider.name}</p>
              <Badge>{formatDriverStage(ride.status)}</Badge>
            </div>
            <p className="mt-2 text-sm text-ops-muted">Keep the route visible and move through the trip with one tap at a time.</p>
          </div>

          <Link
            to="/driver"
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-ops-border bg-[linear-gradient(180deg,rgba(21,26,34,0.96),rgba(12,15,21,0.96))] px-4 text-sm font-semibold text-ops-text transition hover:border-ops-primary/35 hover:bg-ops-panel"
          >
            Back to driver home
          </Link>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.16fr_0.84fr]">
        <DeferredLiveMap
          ride={ride}
          title="Live trip map"
          height={460}
          meta="Route progress stays visible while status changes and location updates continue in the background."
        />

        <MapPanel
          title="Trip cockpit"
          meta="Advance the ride through the live driver lifecycle and keep route context in view."
          footer={
            <div className="grid gap-3 md:grid-cols-3">
              <DataField label="Customer total" value={formatMoney(customerTotal)} />
              <DataField label="Driver subtotal" value={formatMoney(subtotal)} />
              <DataField label="Platform due" value={formatMoney(platformDue)} />
            </div>
          }
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-ops-muted">Driver trip</p>
              <h2 className="mt-2 text-[2rem] font-extrabold tracking-[-0.04em] text-ops-text">{ride.rider.name}</h2>
              <p className="mt-2 text-sm text-ops-muted">{formatDriverStage(ride.status)}</p>
            </div>
            <Badge>{formatDriverStage(ride.status)}</Badge>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <DataField label="Pickup" value={ride.pickup.address} />
            <DataField label="Dropoff" value={ride.dropoff.address} />
            <DataField label="Ride type" value={ride.rideType} />
            <DataField label="Route size" value={`${ride.estimatedMiles} miles`} subtle={`${ride.estimatedMinutes} minutes`} />
          </div>

          <div className="grid gap-3">
            <div className="rounded-[1.4rem] border border-ops-border-soft/90 bg-ops-panel/45 p-4">
              <div className="mb-2 flex items-center gap-2 text-ops-muted">
                <UserRound className="h-4 w-4" />
                Rider
              </div>
              <p className="font-semibold text-ops-text">{ride.rider.name}</p>
              <p className="mt-1 text-sm text-ops-muted">{ride.rider.phone ?? "No rider phone available"}</p>
            </div>

            <div className="rounded-[1.4rem] border border-ops-border-soft/90 bg-ops-panel/45 p-4">
              <div className="mb-2 flex items-center gap-2 text-ops-muted">
                <Clock3 className="h-4 w-4" />
                Timing
              </div>
              <p className="font-semibold text-ops-text">{ride.scheduledFor ?? ride.requestedAt ? new Date(ride.scheduledFor ?? ride.requestedAt!).toLocaleString() : "Now"}</p>
              <p className="mt-1 text-sm text-ops-muted">Keep this page open while the ride is active so live status stays current.</p>
            </div>

            <div className="rounded-[1.4rem] border border-ops-border-soft/90 bg-ops-panel/45 p-4">
              <div className="mb-2 flex items-center gap-2 text-ops-muted">
                <CreditCard className="h-4 w-4" />
                Trip payment
              </div>
              <p className="font-semibold text-ops-text">{formatPaymentMethod(ride.payment.method)}</p>
              <p className="mt-1 text-sm text-ops-muted">
                Chosen by the rider during booking · status {ride.payment.status}
              </p>
              <p className="mt-2 text-sm text-ops-muted/80">
                Customer total {formatMoney(customerTotal)} · driver subtotal {formatMoney(subtotal)} · platform due {formatMoney(platformDue)}
              </p>
            </div>
          </div>
        </MapPanel>
      </div>

      <BottomActionBar>
        <Link
          to="/driver"
          className="inline-flex h-11 items-center justify-center rounded-2xl border border-ops-border bg-[linear-gradient(180deg,rgba(21,26,34,0.96),rgba(12,15,21,0.96))] px-4 text-sm font-semibold text-ops-text transition hover:border-ops-primary/35 hover:bg-ops-panel"
        >
          Driver home
        </Link>
        {nextStatus ? (
          <Button className="h-11" onClick={() => statusMutation.mutate(nextStatus)}>
            <Navigation className="mr-2 h-4 w-4" />
            Mark as {nextStatus.replaceAll("_", " ")}
          </Button>
        ) : (
          <div className="inline-flex h-11 items-center rounded-2xl border border-dashed border-ops-border px-4 text-sm text-ops-muted">
            This ride has reached the end of the workflow.
          </div>
        )}
      </BottomActionBar>
    </div>
  );
}
