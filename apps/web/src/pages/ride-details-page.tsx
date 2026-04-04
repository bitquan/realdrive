import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { Clock3, CreditCard, Phone, User } from "lucide-react";
import { DeferredLiveMap } from "@/components/maps/deferred-live-map";
import { ShareQrCard } from "@/components/share/share-qr-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { formatDateTime, formatMoney } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";

export function RideDetailsPage() {
  const { rideId = "" } = useParams();
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const rideQuery = useQuery({
    queryKey: ["ride", rideId],
    queryFn: () => api.getRide(rideId, token!)
  });
  const shareQuery = useQuery({
    queryKey: ["me-share"],
    queryFn: () => api.meShare(token!),
    enabled: Boolean(token)
  });
  const communityQuery = useQuery({
    queryKey: ["community-board"],
    queryFn: () => api.listCommunityProposals(token!),
    enabled: Boolean(token)
  });

  const cancelMutation = useMutation({
    mutationFn: () => api.cancelRide(rideId, token!),
    onSuccess: (ride) => {
      queryClient.setQueryData(["ride", rideId], ride);
      void queryClient.invalidateQueries({ queryKey: ["rider-rides"] });
    }
  });

  useEffect(() => {
    if (!token) {
      return;
    }

    const socket = getSocket(token);
    socket.emit("ride.watch", rideId);

    const refresh = () => {
      void queryClient.invalidateQueries({ queryKey: ["ride", rideId] });
      void queryClient.invalidateQueries({ queryKey: ["rider-rides"] });
    };

    socket.on("ride.status.changed", refresh);
    socket.on("ride.location.updated", refresh);

    return () => {
      socket.off("ride.status.changed", refresh);
      socket.off("ride.location.updated", refresh);
    };
  }, [queryClient, rideId, token]);

  if (!rideQuery.data) {
    return (
      <Card>
        <CardContent className="p-8 text-sm text-ops-muted">Loading ride details...</CardContent>
      </Card>
    );
  }

  const ride = rideQuery.data;
  const customerTotal = ride.pricing.finalCustomerTotal ?? ride.pricing.estimatedCustomerTotal;

  return (
    <div className="grid gap-3.5 md:gap-5 lg:grid-cols-[1.25fr_0.75fr]">
      <DeferredLiveMap ride={ride} />

      <div className="space-y-3.5 md:space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Ride status</CardTitle>
            <CardDescription>Live updates appear here as your driver progresses through the trip.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Badge>{ride.status.replaceAll("_", " ")}</Badge>
              <p className="text-lg font-bold text-ops-text">{formatMoney(customerTotal)}</p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-3xl border border-ops-border-soft bg-gradient-to-b from-ops-panel/70 to-[#121b2a] p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-ops-muted">Pickup</p>
                <p className="mt-2 font-semibold">{ride.pickup.address}</p>
              </div>
              <div className="rounded-3xl border border-ops-border-soft bg-gradient-to-b from-ops-panel/70 to-[#121b2a] p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-ops-muted">Dropoff</p>
                <p className="mt-2 font-semibold">{ride.dropoff.address}</p>
              </div>
            </div>
            <div className="grid gap-3">
              <div className="rounded-3xl border border-ops-border-soft bg-gradient-to-b from-ops-panel/70 to-[#121b2a] p-4">
                <div className="mb-2 flex items-center gap-2 text-ops-muted">
                  <User className="h-4 w-4" />
                  Driver
                </div>
                <p className="font-semibold">{ride.driver?.name ?? "Waiting for assignment"}</p>
                <p className="text-sm text-ops-muted">{ride.driver?.vehicle?.makeModel ?? "Dispatching nearby drivers"}</p>
              </div>
              <div className="rounded-3xl border border-ops-border-soft bg-gradient-to-b from-ops-panel/70 to-[#121b2a] p-4">
                <div className="mb-2 flex items-center gap-2 text-ops-muted">
                  <Clock3 className="h-4 w-4" />
                  Requested
                </div>
                <p className="font-semibold">{formatDateTime(ride.scheduledFor ?? ride.requestedAt)}</p>
                <p className="text-sm text-ops-muted">
                  {ride.estimatedMiles} miles · {ride.estimatedMinutes} minutes
                </p>
              </div>
              <div className="rounded-3xl border border-ops-border-soft bg-gradient-to-b from-ops-panel/70 to-[#121b2a] p-4">
                <div className="mb-2 flex items-center gap-2 text-ops-muted">
                  <CreditCard className="h-4 w-4" />
                  Payment
                </div>
                <p className="font-semibold">{ride.payment.method}</p>
                <p className="text-sm text-ops-muted">Status: {ride.payment.status}</p>
                <p className="text-sm text-ops-muted/80">All-in total: {formatMoney(customerTotal)}</p>
              </div>
            </div>
            {ride.status !== "completed" && ride.status !== "canceled" ? (
              <Button variant="outline" className="w-full border-ops-destructive/35 text-ops-destructive hover:bg-ops-destructive/10" onClick={() => cancelMutation.mutate()}>
                <Phone className="mr-2 h-4 w-4" />
                Cancel ride
              </Button>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Community board</CardTitle>
            <CardDescription>
              Riders can read proposals now and unlock posting, voting, and comments after 51 completed rides.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-4xl border border-ops-border-soft bg-ops-panel/40 p-4 text-sm text-ops-muted">
              {communityQuery.data?.eligibility.reason ?? "You can open the community board from this rider account."}
            </div>
            <Link
              to="/community"
              className="inline-flex w-full items-center justify-center rounded-xl border border-ops-primary/40 bg-ops-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#3b8fff]"
            >
              Open community board
            </Link>
          </CardContent>
        </Card>

        {shareQuery.data ? (
          <ShareQrCard
            title="Your rider referral QR"
            description="Share your personal rider link while your trip is active or after it completes."
            shareUrl={shareQuery.data.shareUrl}
            referralCode={shareQuery.data.referralCode}
            fileName={`realdrive-rider-${shareQuery.data.referralCode.toLowerCase()}`}
          />
        ) : null}
      </div>
    </div>
  );
}
