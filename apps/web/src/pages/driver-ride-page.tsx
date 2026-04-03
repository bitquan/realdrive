import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { LiveMap } from "@/components/maps/live-map";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { formatMoney } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";

const nextStatusOrder = {
  accepted: "en_route",
  en_route: "arrived",
  arrived: "in_progress",
  in_progress: "completed"
} as const;

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
        <CardContent className="p-8 text-sm text-brand-ink/55">Loading ride...</CardContent>
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
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <LiveMap ride={ride} />
      <Card>
        <CardHeader>
          <CardTitle>Trip workflow</CardTitle>
          <CardDescription>Move the ride through the trip lifecycle and keep location updates flowing.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-lg font-semibold">{ride.rider.name}</p>
            <Badge>{ride.status.replaceAll("_", " ")}</Badge>
          </div>
          <div className="rounded-4xl border border-brand-ink/10 p-4">
            <p className="text-sm text-brand-ink/55">Pickup</p>
            <p className="font-semibold">{ride.pickup.address}</p>
          </div>
          <div className="rounded-4xl border border-brand-ink/10 p-4">
            <p className="text-sm text-brand-ink/55">Dropoff</p>
            <p className="font-semibold">{ride.dropoff.address}</p>
          </div>
          <div className="rounded-4xl border border-brand-ink/10 p-4">
            <p className="text-sm text-brand-ink/55">Customer total</p>
            <p className="font-semibold">{formatMoney(customerTotal)}</p>
            <p className="mt-2 text-sm text-brand-ink/55">Driver subtotal: {formatMoney(subtotal)}</p>
            <p className="text-sm text-brand-ink/55">Platform due: {formatMoney(platformDue)}</p>
          </div>
          {nextStatus ? (
            <Button className="w-full" onClick={() => statusMutation.mutate(nextStatus)}>
              Mark as {nextStatus.replaceAll("_", " ")}
            </Button>
          ) : (
            <div className="rounded-4xl border border-dashed border-brand-ink/15 p-4 text-sm text-brand-ink/55">
              This ride has reached the end of the driver workflow.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
