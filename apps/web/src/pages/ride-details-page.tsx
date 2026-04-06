import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { CreditCard, Phone, User, Vote } from "lucide-react";
import { DeferredLiveMap } from "@/components/maps/deferred-live-map";
import {
  BottomActionBar,
  DataField,
  MapPanel,
  PanelSection
} from "@/components/layout/ops-layout";
import { RideTimeline } from "@/components/ride/ride-timeline";
import { ShareQrCard } from "@/components/share/share-qr-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { deriveMarketCondition } from "@/lib/market-condition";
import { getSocket } from "@/lib/socket";
import { formatDateTime, formatMoney, formatPaymentMethod } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import { useToast } from "@/providers/toast-provider";

const riderCancelReasonOptions = [
  { value: "plans_changed", label: "Plans changed" },
  { value: "pickup_delay", label: "Pickup taking too long" },
  { value: "wrong_address", label: "Wrong pickup or dropoff" },
  { value: "other", label: "Other reason" }
] as const;

function statusSupportCopy(status: string) {
  if (status === "requested" || status === "offered") {
    return "Dispatch is matching the best nearby driver. Keep this screen open for live updates.";
  }

  if (status === "accepted" || status === "en_route") {
    return "A driver is assigned and heading to pickup. Route and timing stay live on this page.";
  }

  if (status === "arrived") {
    return "Your driver is at pickup. Contact details stay visible here while the trip starts.";
  }

  if (status === "in_progress") {
    return "Trip is in progress. ETA, route, and payment status continue updating in real time.";
  }

  if (status === "completed") {
    return "Trip completed. You can use this history item for support context and follow-up.";
  }

  if (status === "canceled") {
    return "Trip canceled. Cancellation details are kept in your rider history for support review.";
  }

  return "Trip status is updating live from dispatch and driver workflow events.";
}

export function RideDetailsPage() {
  const { rideId = "" } = useParams();
  const { token } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [cancelReason, setCancelReason] = useState<(typeof riderCancelReasonOptions)[number]["value"]>("plans_changed");
  const [cancelNotes, setCancelNotes] = useState("");
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
    mutationFn: () => {
      const selected = riderCancelReasonOptions.find((entry) => entry.value === cancelReason);
      const trimmedNotes = cancelNotes.trim();
      const reason = trimmedNotes ? `${selected?.label ?? cancelReason} — ${trimmedNotes}` : selected?.label ?? cancelReason;
      return api.cancelRide(rideId, token!, { reason });
    },
    onSuccess: (ride) => {
      queryClient.setQueryData(["ride", rideId], ride);
      void queryClient.invalidateQueries({ queryKey: ["rider-rides"] });
      setCancelNotes("");
      toast.success("Ride canceled", "Dispatch and trip state were updated.");
    },
    onError: (error) => {
      toast.error("Unable to cancel ride", error instanceof Error ? error.message : "Please try again.");
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
        <CardContent className="space-y-3 p-6">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  const ride = rideQuery.data;
  const customerTotal = ride.pricing.finalCustomerTotal ?? ride.pricing.estimatedCustomerTotal;
  const isMutable = ride.status !== "completed" && ride.status !== "canceled";
  const requestFeatureUrl = `/request-feature?source=rider_app&rideId=${encodeURIComponent(rideId)}&contextPath=${encodeURIComponent(`/rider/rides/${rideId}`)}`;
  const supportCopy = statusSupportCopy(ride.status);
  const marketCondition = deriveMarketCondition(ride);

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
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-ops-muted">Rider ride</p>
              <h2 className="mt-2 break-words text-[1.5rem] font-extrabold tracking-[-0.04em] text-ops-text sm:text-[1.7rem] xl:text-[2rem]">{ride.rider.name}</h2>
              <p className="mt-2 text-sm text-ops-muted">{formatDateTime(ride.scheduledFor ?? ride.requestedAt)}</p>
            </div>
            <div className="text-left sm:text-right">
              <div className="flex flex-wrap gap-2 sm:justify-end">
                <Badge>{ride.status.replaceAll("_", " ")}</Badge>
                <Badge className={marketCondition.toneClassName}>{marketCondition.label}</Badge>
              </div>
              <p className="mt-1 text-xs text-ops-muted">{marketCondition.detail}</p>
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

            <RideTimeline ride={ride} compact />

            <div className="rounded-[1.4rem] border border-ops-border-soft/90 bg-ops-panel/45 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-ops-muted">Trip trust note</p>
              <p className="mt-2 text-sm leading-6 text-ops-muted">{supportCopy}</p>
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
        {isMutable ? (
          <PanelSection title="Need to cancel this ride?" description="Pick the closest reason so dispatch and support can follow up with accurate context.">
            <div className="grid gap-2 md:grid-cols-2">
              {riderCancelReasonOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setCancelReason(option.value)}
                  className={`rounded-2xl border px-3 py-2 text-left text-sm font-semibold transition ${
                    cancelReason === option.value
                      ? "border-ops-primary/40 bg-ops-primary/15 text-ops-text"
                      : "border-ops-border-soft bg-ops-panel/45 text-ops-muted hover:text-ops-text"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div className="mt-3">
              <Textarea
                value={cancelNotes}
                onChange={(event) => setCancelNotes(event.target.value)}
                maxLength={180}
                className="min-h-24"
                placeholder="Optional details for dispatch support"
              />
            </div>
          </PanelSection>
        ) : null}

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
        <Link
          to={requestFeatureUrl}
          className="inline-flex h-11 items-center justify-center rounded-2xl border border-ops-border bg-[linear-gradient(180deg,rgba(21,26,34,0.96),rgba(12,15,21,0.96))] px-4 text-sm font-semibold text-ops-text transition hover:border-ops-primary/35 hover:bg-ops-panel"
        >
          Request feature
        </Link>
        {isMutable ? (
          <Button
            variant="ghost"
            disabled={cancelMutation.isPending}
            className="h-11 border border-ops-destructive/28 text-ops-destructive hover:bg-ops-destructive/10 hover:text-ops-destructive"
            onClick={() => cancelMutation.mutate()}
          >
            {cancelMutation.isPending ? "Canceling..." : "Cancel ride"}
          </Button>
        ) : null}
      </BottomActionBar>
    </div>
  );
}
