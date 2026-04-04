import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { Clock3, CreditCard, Phone, User, Vote } from "lucide-react";
import { DeferredLiveMap } from "@/components/maps/deferred-live-map";
import {
  BottomActionBar,
  DataField,
  MapPanel,
  PanelSection
} from "@/components/layout/ops-layout";
import { ShareQrCard } from "@/components/share/share-qr-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { formatDateTime, formatMoney, formatPaymentMethod } from "@/lib/utils";
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
  const isMutable = ride.status !== "completed" && ride.status !== "canceled";

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="grid gap-4 xl:grid-cols-[1.16fr_0.84fr]">
        <DeferredLiveMap
          ride={ride}
          title="Ride route"
          height={460}
          meta="Pickup, dropoff, and driver position stay tied to the live trip state."
        />

        <MapPanel
          title="Rider trip panel"
          meta="This is the real trip state, payment status, and driver assignment for your ride."
          footer={
            <div className="grid gap-3 md:grid-cols-3">
              <DataField label="Current stage" value={ride.status.replaceAll("_", " ")} />
              <DataField label="All-in total" value={formatMoney(customerTotal)} />
              <DataField label="Estimated route" value={`${ride.estimatedMiles} miles`} subtle={`${ride.estimatedMinutes} minutes`} />
            </div>
          }
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-ops-muted">Rider ride</p>
              <h2 className="mt-2 text-[2rem] font-extrabold tracking-[-0.04em] text-ops-text">{ride.rider.name}</h2>
              <p className="mt-2 text-sm text-ops-muted">{formatDateTime(ride.scheduledFor ?? ride.requestedAt)}</p>
            </div>
            <div className="text-right">
              <Badge>{ride.status.replaceAll("_", " ")}</Badge>
              <p className="mt-3 text-2xl font-extrabold tracking-[-0.04em] text-ops-text">{formatMoney(customerTotal)}</p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <DataField label="Pickup" value={ride.pickup.address} />
            <DataField label="Dropoff" value={ride.dropoff.address} />
            <DataField
              label="Driver"
              value={ride.driver?.name ?? "Waiting for assignment"}
              subtle={ride.driver?.vehicle?.makeModel ?? "Dispatching nearby drivers"}
            />
            <DataField
              label="Trip payment"
              value={formatPaymentMethod(ride.payment.method)}
              subtle={`Status: ${ride.payment.status}`}
            />
          </div>

          <div className="grid gap-3">
            <div className="rounded-[1.4rem] border border-ops-border-soft/90 bg-ops-panel/45 p-4">
              <div className="mb-2 flex items-center gap-2 text-ops-muted">
                <User className="h-4 w-4" />
                Driver contact
              </div>
              <p className="font-semibold text-ops-text">{ride.driver?.name ?? "Waiting for assignment"}</p>
              <p className="mt-1 text-sm text-ops-muted">{ride.driver?.vehicle?.makeModel ?? "No vehicle assigned yet"}</p>
              {ride.driver?.phone ? (
                <p className="mt-2 flex items-center gap-2 text-sm text-ops-muted">
                  <Phone className="h-4 w-4" />
                  {ride.driver.phone}
                </p>
              ) : null}
            </div>

            <div className="rounded-[1.4rem] border border-ops-border-soft/90 bg-ops-panel/45 p-4">
              <div className="mb-2 flex items-center gap-2 text-ops-muted">
                <Clock3 className="h-4 w-4" />
                Trip timing
              </div>
              <p className="font-semibold text-ops-text">{formatDateTime(ride.scheduledFor ?? ride.requestedAt)}</p>
              <p className="mt-1 text-sm text-ops-muted">Updates refresh live as dispatch and driver status change.</p>
            </div>

            <div className="rounded-[1.4rem] border border-ops-border-soft/90 bg-ops-panel/45 p-4">
              <div className="mb-2 flex items-center gap-2 text-ops-muted">
                <CreditCard className="h-4 w-4" />
                Trip payment
              </div>
              <p className="font-semibold text-ops-text">{formatPaymentMethod(ride.payment.method)}</p>
              <p className="mt-1 text-sm text-ops-muted">
                Selected during booking · {ride.payment.status}
              </p>
            </div>
          </div>
        </MapPanel>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.72fr_0.28fr]">
        <PanelSection title="Community board" description="Riders can read proposals now and unlock posting, voting, and comments after 51 completed rides.">
          <div className="rounded-[1.45rem] border border-ops-border-soft/90 bg-ops-panel/45 p-4 text-sm leading-6 text-ops-muted">
            {communityQuery.data?.eligibility.reason ?? "You can open the community board from this rider account."}
          </div>
          <div className="mt-4">
            <Link
              to="/community"
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-ops-primary/45 bg-ops-primary px-4 text-sm font-semibold text-white transition hover:bg-[#6887ff]"
            >
              <Vote className="mr-2 h-4 w-4" />
              Open community board
            </Link>
          </div>
        </PanelSection>

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

      <BottomActionBar>
        <Link
          to="/rider/rides"
          className="inline-flex h-11 items-center justify-center rounded-2xl border border-ops-border bg-[linear-gradient(180deg,rgba(21,26,34,0.96),rgba(12,15,21,0.96))] px-4 text-sm font-semibold text-ops-text transition hover:border-ops-primary/35 hover:bg-ops-panel"
        >
          Back to my rides
        </Link>
        {isMutable ? (
          <Button
            variant="ghost"
            className="h-11 border border-ops-destructive/28 text-ops-destructive hover:bg-ops-destructive/10 hover:text-ops-destructive"
            onClick={() => cancelMutation.mutate()}
          >
            Cancel ride
          </Button>
        ) : null}
      </BottomActionBar>
    </div>
  );
}
