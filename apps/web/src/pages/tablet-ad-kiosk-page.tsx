import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Clock3, Expand, MapPinned, Route } from "lucide-react";
import { DeferredLiveMap } from "@/components/maps/deferred-live-map";
import { AdDisplayBoard } from "@/components/ads/ad-display-board";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { formatDateTime, formatMoney, formatPaymentMethod } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";

export function TabletAdKioskPage() {
  const { token, logout } = useAuth();
  const [mapMode, setMapMode] = useState<"hidden" | "mini" | "full">("hidden");
  const shareQuery = useQuery({
    queryKey: ["me-share", "tablet"],
    queryFn: () => api.meShare(token!),
    enabled: Boolean(token)
  });
  const activeRidesQuery = useQuery({
    queryKey: ["driver-active-rides", "tablet"],
    queryFn: () => api.listActiveDriverRides(token!),
    enabled: Boolean(token),
    refetchInterval: 10_000
  });
  const displayQuery = useQuery({
    queryKey: ["tablet-ad-display", shareQuery.data?.referralCode],
    queryFn: () => api.getPublicAdDisplay(shareQuery.data!.referralCode),
    enabled: Boolean(shareQuery.data?.referralCode),
    refetchInterval: 60_000
  });

  const activeRide = activeRidesQuery.data?.[0] ?? null;

  useEffect(() => {
    if (!token || !activeRide || !navigator.geolocation) {
      return;
    }

    if (!["accepted", "en_route", "arrived", "in_progress"].includes(activeRide.status)) {
      return;
    }

    const interval = window.setInterval(() => {
      navigator.geolocation.getCurrentPosition((position) => {
        void api.sendDriverLocation(
          {
            rideId: activeRide.id,
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
  }, [activeRide, token]);

  useEffect(() => {
    if (!activeRide && mapMode !== "hidden") {
      setMapMode("hidden");
    }
  }, [activeRide, mapMode]);

  if (shareQuery.isLoading || displayQuery.isLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-[#04070d] text-sm text-white/70">Loading tablet display…</div>;
  }

  if (shareQuery.error || !shareQuery.data?.referralCode) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#04070d] p-6 text-center text-white">
        <div>
          <p className="text-lg font-semibold">Tablet setup is missing a driver share code.</p>
          <p className="mt-3 text-sm text-white/65">Open the full driver app once, make sure the driver account is active, then try again.</p>
          <Button className="mt-5" onClick={() => void logout()}>
            Sign out
          </Button>
        </div>
      </div>
    );
  }

  if (displayQuery.error || !displayQuery.data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#04070d] p-6 text-center text-white">
        <div>
          <p className="text-lg font-semibold">Unable to load the tablet ad board.</p>
          <p className="mt-3 text-sm text-white/65">{displayQuery.error?.message ?? "The screen is not ready yet."}</p>
          <Button className="mt-5" onClick={() => void logout()}>
            Sign out
          </Button>
        </div>
      </div>
    );
  }

  if (mapMode === "full" && activeRide) {
    return (
      <div className="min-h-screen bg-[#04070d] p-3 text-white md:p-5">
        <div className="mx-auto max-w-[1680px] space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.8rem] border border-white/10 bg-[#090d17] px-5 py-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/45">Tablet trip map</p>
              <h1 className="mt-1 text-2xl font-bold tracking-[-0.03em] text-white">{activeRide.rider.name} · {activeRide.status.replaceAll("_", " ")}</h1>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10" onClick={() => setMapMode("mini")}>
                Collapse map
              </Button>
              <Button variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10" onClick={() => setMapMode("hidden")}>
                Back to ads
              </Button>
              <Button variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10" onClick={() => void logout()}>
                Sign out
              </Button>
            </div>
          </div>

          <DeferredLiveMap
            ride={activeRide}
            title="Live driver route"
            height={620}
            meta="Mapbox route view for the current trip. Keep this open to watch the ride progress across the full route."
          />

          <div className="grid gap-4 lg:grid-cols-4">
            <StatCard label="Pickup" value={activeRide.pickup.address} />
            <StatCard label="Dropoff" value={activeRide.dropoff.address} />
            <StatCard label="Payment" value={formatPaymentMethod(activeRide.payment.method)} subtle={formatMoney(activeRide.payment.amountDue)} />
            <StatCard label="Timing" value={formatDateTime(activeRide.scheduledFor ?? activeRide.requestedAt)} subtle={`${activeRide.estimatedMiles} miles · ${activeRide.estimatedMinutes} min`} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <AdDisplayBoard
        driverName={displayQuery.data.driverName}
        referralCode={displayQuery.data.referralCode}
        shareUrl={shareQuery.data.shareUrl}
        optedIn={displayQuery.data.optedIn}
        items={displayQuery.data.items}
        showDeviceControls
        onSignOut={() => void logout()}
      />

      {activeRide ? (
        <div className="pointer-events-none absolute inset-x-3 bottom-24 z-30 flex justify-end md:inset-x-6 md:bottom-28">
          <div className="pointer-events-auto w-full max-w-[420px] space-y-3">
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" className="border-white/15 bg-[#090d17]/95 text-white hover:bg-[#111827]" onClick={() => setMapMode(mapMode === "mini" ? "hidden" : "mini")}>
                <MapPinned className="mr-2 h-4 w-4" />
                {mapMode === "mini" ? "Hide trip map" : "Show trip map"}
              </Button>
              <Button variant="outline" className="border-white/15 bg-[#090d17]/95 text-white hover:bg-[#111827]" onClick={() => setMapMode("full")}>
                <Expand className="mr-2 h-4 w-4" />
                Fullscreen route
              </Button>
            </div>

            <Card className="border-white/10 bg-[#090d17]/96 text-white shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Route className="h-4 w-4" />
                  Active trip status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <StatCard label="Rider" value={activeRide.rider.name} subtle={activeRide.status.replaceAll("_", " ")} />
                  <StatCard label="Trip total" value={formatMoney(activeRide.payment.amountDue)} subtle={formatPaymentMethod(activeRide.payment.method)} />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <StatCard label="Pickup" value={activeRide.pickup.address} />
                  <StatCard label="Dropoff" value={activeRide.dropoff.address} />
                </div>
                <div className="rounded-[1.2rem] border border-white/10 bg-white/[0.04] p-3 text-sm text-white/70">
                  <div className="flex items-center gap-2 text-white/85">
                    <Clock3 className="h-4 w-4" />
                    <span>{formatDateTime(activeRide.scheduledFor ?? activeRide.requestedAt)}</span>
                  </div>
                  <p className="mt-2">{activeRide.estimatedMiles} miles · {activeRide.estimatedMinutes} minutes</p>
                </div>

                {mapMode === "mini" ? (
                  <DeferredLiveMap
                    ride={activeRide}
                    title="Trip map"
                    height={240}
                    meta="Mini route view for the in-progress trip."
                  />
                ) : null}
              </CardContent>
            </Card>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function StatCard({ label, value, subtle }: { label: string; value: string; subtle?: string }) {
  return (
    <div className="rounded-[1.2rem] border border-white/10 bg-white/[0.04] p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/45">{label}</p>
      <p className="mt-2 line-clamp-2 text-sm font-semibold text-white">{value}</p>
      {subtle ? <p className="mt-1 text-xs text-white/60">{subtle}</p> : null}
    </div>
  );
}

export default TabletAdKioskPage;
