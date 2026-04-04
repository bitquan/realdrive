import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { Clock3, CreditCard, Phone, Share2, User, Vote } from "lucide-react";
import { PageHero } from "@/components/layout/page-hero";
import { DeferredLiveMap } from "@/components/maps/deferred-live-map";
import { ShareQrCard } from "@/components/share/share-qr-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { formatDateTime, formatMoney } from "@/lib/utils";

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
        <CardContent className="p-8 text-sm text-brand-ink/55">Loading trip tracking...</CardContent>
      </Card>
    );
  }

  const { ride, share, communityAccess } = trackQuery.data;

  return (
    <div className="space-y-5 md:space-y-6">
      <PageHero
        eyebrow="Live trip tracking"
        icon={Share2}
        title="Track your ride live from this link"
        description="Keep this page open to follow status, route progress, pickup details, and driver updates in real time without signing in."
      />

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <DeferredLiveMap ride={ride} />

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Ride status</CardTitle>
              <CardDescription>Updates refresh automatically while dispatch and driver status change.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Badge>{ride.status.replaceAll("_", " ")}</Badge>
                <p className="text-sm text-brand-ink/55">{formatMoney(ride.payment.amountDue)}</p>
              </div>
              <p className="text-sm text-brand-ink/60">
                Current stage: <span className="font-semibold text-brand-ink">{ride.status.replaceAll("_", " ")}</span>
              </p>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-4xl border border-brand-ink/10 p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-brand-ink/40">Pickup</p>
                  <p className="mt-2 font-semibold">{ride.pickup.address}</p>
                </div>
                <div className="rounded-4xl border border-brand-ink/10 p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-brand-ink/40">Dropoff</p>
                  <p className="mt-2 font-semibold">{ride.dropoff.address}</p>
                </div>
              </div>

              <div className="grid gap-3">
                <div className="rounded-4xl border border-brand-ink/10 p-4">
                  <div className="mb-2 flex items-center gap-2 text-brand-ink/50">
                    <User className="h-4 w-4" />
                    Driver
                  </div>
                  <p className="font-semibold">{ride.driver?.name ?? "Waiting for assignment"}</p>
                  <p className="text-sm text-brand-ink/55">
                    {ride.driver?.vehicle?.makeModel ?? "Dispatch is working on your trip"}
                  </p>
                  {ride.driver?.phone ? (
                    <p className="mt-2 flex items-center gap-2 text-sm text-brand-ink/55">
                      <Phone className="h-4 w-4" />
                      {ride.driver.phone}
                    </p>
                  ) : null}
                </div>

                <div className="rounded-4xl border border-brand-ink/10 p-4">
                  <div className="mb-2 flex items-center gap-2 text-brand-ink/50">
                    <Clock3 className="h-4 w-4" />
                    Timing
                  </div>
                  <p className="font-semibold">{formatDateTime(ride.scheduledFor ?? ride.requestedAt)}</p>
                  <p className="text-sm text-brand-ink/55">
                    {ride.estimatedMiles} miles · {ride.estimatedMinutes} minutes
                  </p>
                </div>

                <div className="rounded-4xl border border-brand-ink/10 p-4">
                  <div className="mb-2 flex items-center gap-2 text-brand-ink/50">
                    <CreditCard className="h-4 w-4" />
                    Payment
                  </div>
                  <p className="font-semibold">{ride.payment.method}</p>
                  <p className="text-sm text-brand-ink/55">Collected outside the app · {ride.payment.status}</p>
                  <p className="mt-1 text-sm text-brand-ink/45">
                    All-in total: {formatMoney(ride.payment.amountDue)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {communityAccess ? (
            <Card>
              <CardHeader>
                <CardTitle>Community board</CardTitle>
                <CardDescription>
                  Use your rider community link to read proposals now and unlock voting once you become a heavy rider.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link
                  to={`/community/join/${communityAccess.token}`}
                  className="inline-flex items-center justify-center rounded-2xl bg-brand-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-black"
                >
                  <Vote className="mr-2 h-4 w-4" />
                  Open community board
                </Link>
              </CardContent>
            </Card>
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
      </div>
    </div>
  );
}
