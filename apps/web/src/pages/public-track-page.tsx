import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { CreditCard, Phone, Share2, User, Vote } from "lucide-react";
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
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { formatDateTime, formatMoney, formatPaymentMethod } from "@/lib/utils";

function statusSupportCopy(status: string) {
  if (status === "requested" || status === "offered") {
    return "Dispatch is still matching a driver. This page refreshes automatically every few seconds.";
  }

  if (status === "accepted" || status === "en_route") {
    return "Driver is assigned and heading to pickup. Contact and route details stay live here.";
  }

  if (status === "arrived") {
    return "Driver reached pickup. Confirm trip handoff and continue watching progress from this link.";
  }

  if (status === "in_progress") {
    return "Trip is active. Route and ETA remain synced with the latest ride status.";
  }

  if (status === "completed") {
    return "Trip completed. Keep this link for history and referral follow-up.";
  }

  if (status === "canceled") {
    return "Trip canceled. This tracking view preserves final trip context for support follow-up.";
  }

  return "Trip status is synced from the live dispatch workflow.";
}

export function PublicTrackPage() {
  const { token = "" } = useParams();
  const trackQuery = useQuery({
    queryKey: ["public-track", token],
    queryFn: () => api.getPublicTrack(token),
    refetchInterval: 10000,
    enabled: Boolean(token)
  });

  if (!trackQuery.data) {
    return (
      <Card>
        <CardContent className="space-y-3 p-6">
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  const { ride, share, communityAccess } = trackQuery.data;
  const supportCopy = statusSupportCopy(ride.status);

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="grid gap-4 xl:grid-cols-[1.16fr_0.84fr]">
        <DeferredLiveMap
          ride={ride}
          title="Live route"
          height={460}
          meta="Keep this page open to watch dispatch progress, driver movement, and pickup timing."
        />

        <MapPanel
          title="Public tracking panel"
          meta="Live rider status, ETA context, and referral follow-up stay in one public tracking workspace."
          footer={
            <div className="grid gap-3 md:grid-cols-3">
              <DataField label="Status" value={ride.status.replaceAll("_", " ")} />
              <DataField label="Total due" value={formatMoney(ride.payment.amountDue)} />
              <DataField label="ETA snapshot" value={`${ride.estimatedMinutes} min`} subtle={`${ride.estimatedMiles} miles`} />
            </div>
          }
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-ops-muted">Public ride tracking</p>
              <h2 className="mt-2 text-[2rem] font-extrabold tracking-[-0.04em] text-ops-text">{ride.rider.name}</h2>
              <p className="mt-2 text-sm text-ops-muted">{formatDateTime(ride.scheduledFor ?? ride.requestedAt)}</p>
            </div>
            <div className="text-right">
              <Badge>{ride.status.replaceAll("_", " ")}</Badge>
              <p className="mt-3 text-2xl font-extrabold tracking-[-0.04em] text-ops-text">{formatMoney(ride.payment.amountDue)}</p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <DataField label="Pickup" value={ride.pickup.address} />
            <DataField label="Dropoff" value={ride.dropoff.address} />
            <DataField
              label="Driver"
              value={ride.driver?.name ?? "Waiting for assignment"}
              subtle={ride.driver?.vehicle?.makeModel ?? "Dispatch is working on your trip"}
            />
            <DataField label="Trip payment" value={formatPaymentMethod(ride.payment.method)} subtle={`Status: ${ride.payment.status}`} />
          </div>

          <div className="grid gap-3">
            <div className="rounded-[1.4rem] border border-ops-border-soft/90 bg-ops-panel/45 p-4">
              <div className="mb-2 flex items-center gap-2 text-ops-muted">
                <User className="h-4 w-4" />
                Driver contact
              </div>
              <p className="font-semibold text-ops-text">{ride.driver?.name ?? "Waiting for assignment"}</p>
              <p className="mt-1 text-sm text-ops-muted">{ride.driver?.vehicle?.makeModel ?? "Dispatch is working on your trip"}</p>
              {ride.driver?.phone ? (
                <p className="mt-2 flex items-center gap-2 text-sm text-ops-muted">
                  <Phone className="h-4 w-4" />
                  {ride.driver.phone}
                </p>
              ) : null}
            </div>

            <RideTimeline ride={ride} compact />

            <div className="rounded-[1.4rem] border border-ops-border-soft/90 bg-ops-panel/45 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-ops-muted">Status clarity</p>
              <p className="mt-2 text-sm leading-6 text-ops-muted">{supportCopy}</p>
            </div>

            <div className="rounded-[1.4rem] border border-ops-border-soft/90 bg-ops-panel/45 p-4">
              <div className="mb-2 flex items-center gap-2 text-ops-muted">
                <CreditCard className="h-4 w-4" />
                Trip payment
              </div>
              <p className="font-semibold text-ops-text">{formatPaymentMethod(ride.payment.method)}</p>
              <p className="mt-1 text-sm text-ops-muted">Selected during booking · {ride.payment.status}</p>
            </div>
          </div>
        </MapPanel>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.72fr_0.28fr]">
        {communityAccess ? (
          <PanelSection title="Community board" description="Use your rider community link to read proposals now and unlock voting later as the rider account grows.">
            <div className="rounded-[1.45rem] border border-ops-border-soft/90 bg-ops-panel/45 p-4 text-sm leading-6 text-ops-muted">
              This button opens the real community exchange flow tied to this rider trip.
            </div>
            <div className="mt-4">
              <Link
                to={`/community/join/${communityAccess.token}`}
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-ops-primary/45 bg-ops-primary px-4 text-sm font-semibold text-white transition hover:bg-[#6887ff]"
              >
                <Vote className="mr-2 h-4 w-4" />
                Open community board
              </Link>
            </div>
          </PanelSection>
        ) : null}

        {share ? (
          <ShareQrCard
            title="Share your rider QR"
            description="Invite another rider with your personal RealDrive link."
            shareUrl={share.shareUrl}
            referralCode={share.referralCode}
            fileName={`realdrive-rider-${share.referralCode.toLowerCase()}`}
          />
        ) : null}
      </div>

      <BottomActionBar>
        {communityAccess ? (
          <Link
            to={`/community/join/${communityAccess.token}`}
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-ops-primary/45 bg-ops-primary px-4 text-sm font-semibold text-white transition hover:bg-[#6887ff]"
          >
            <Vote className="mr-2 h-4 w-4" />
            Community board
          </Link>
        ) : null}
        {share ? (
          <a
            href={share.shareUrl}
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-ops-border bg-[linear-gradient(180deg,rgba(21,26,34,0.96),rgba(12,15,21,0.96))] px-4 text-sm font-semibold text-ops-text transition hover:border-ops-primary/35 hover:bg-ops-panel"
          >
            <Share2 className="mr-2 h-4 w-4" />
            Open rider link
          </a>
        ) : null}
      </BottomActionBar>
    </div>
  );
}
