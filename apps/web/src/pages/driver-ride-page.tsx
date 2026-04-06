import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { ArrowRight, Clock3, CreditCard, MapPinned, Navigation, Route, UserRound } from "lucide-react";
import { DeferredLiveMap } from "@/components/maps/deferred-live-map";
import { DataField } from "@/components/layout/ops-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  formatDriverMilesCompact,
  formatDriverMinutesCompact,
  formatDriverMoneyCompact
} from "@/components/driver-home/driver-home.utils";
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

function formatStageAction(status: keyof typeof nextStatusOrder | "completed") {
  return formatDriverStage(status).replace(/^./, (value) => value.toUpperCase());
}

function getStageSupportCopy(status: string) {
  if (status === "accepted") {
    return "Head toward pickup and keep the route in view while location updates continue.";
  }

  if (status === "en_route") {
    return "You are almost at pickup. Keep the rider details close and mark arrival as soon as you stop.";
  }

  if (status === "arrived") {
    return "Pickup is live. The next tap should move this trip into the in-vehicle stage.";
  }

  if (status === "in_progress") {
    return "Dropoff is now the only priority. Keep the trip action visible until completion.";
  }

  if (status === "completed") {
    return "This trip is finished. You can return home and pick up the next job from the work surface.";
  }

  return "Keep the route visible and move through the trip with one tap at a time.";
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
      <Card className="overflow-hidden border-ops-border-soft/95 bg-[radial-gradient(circle_at_top_left,rgba(90,124,255,0.18),transparent_28%),linear-gradient(180deg,rgba(10,14,20,0.98),rgba(6,9,14,0.96))] shadow-panel">
        <CardContent className="p-8 text-sm text-ops-muted">Loading live trip...</CardContent>
      </Card>
    );
  }

  const ride = rideQuery.data;
  const nextStatus =
    ride.status in nextStatusOrder ? nextStatusOrder[ride.status as keyof typeof nextStatusOrder] : null;
  const subtotal = ride.pricing.finalSubtotal ?? ride.pricing.estimatedSubtotal;
  const platformDue = ride.pricing.finalPlatformDue ?? ride.pricing.estimatedPlatformDue;
  const customerTotal = ride.pricing.finalCustomerTotal ?? ride.pricing.estimatedCustomerTotal;
  const stageLabel = formatDriverStage(ride.status);
  const nextActionLabel = nextStatus ? formatStageAction(nextStatus) : null;
  const supportCopy = getStageSupportCopy(ride.status);
  const compactTripSize = `${formatDriverMilesCompact(ride.estimatedMiles)} · ${formatDriverMinutesCompact(ride.estimatedMinutes)}`;
  const compactSubtotal = formatDriverMoneyCompact(subtotal);
  const timingLabel = ride.scheduledFor ?? ride.requestedAt ? new Date(ride.scheduledFor ?? ride.requestedAt!).toLocaleString() : "Now";

  return (
    <div className="space-y-5 md:space-y-6">
      <div className="xl:hidden">
        <div className="-mx-4 md:mx-0">
          <div className="relative isolate min-h-[calc(100dvh-10.5rem)] overflow-hidden rounded-[2.25rem] bg-slate-950 shadow-[0_32px_100px_rgba(2,6,23,0.58)] ring-1 ring-white/10">
            <DeferredLiveMap
              ride={ride}
              title="Driver route map"
              height={780}
              meta="Pickup, dropoff, and live trip progress stay attached to the same map-first work surface you started from on home."
              surfaceChrome="bare"
            />

            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_22%_18%,rgba(56,189,248,0.06),transparent_20%),radial-gradient(circle_at_78%_74%,rgba(45,212,191,0.08),transparent_24%)]" />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-slate-950/72 via-slate-950/20 to-transparent" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[46%] bg-gradient-to-t from-slate-950 via-slate-950/82 to-transparent" />

            <div className="pointer-events-none absolute inset-x-0 top-0 z-20 px-3 pt-3">
              <div className="flex items-start justify-between gap-2">
                <div className="pointer-events-auto flex max-w-[68%] flex-col gap-1.5">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/72 px-3.5 py-2 shadow-[0_18px_44px_rgba(2,6,23,0.35)] backdrop-blur-2xl">
                    <span className="h-2 w-2 rounded-full bg-teal-400 shadow-lg shadow-teal-400/45" />
                    <span className="truncate text-sm font-medium text-white">{stageLabel}</span>
                  </div>
                  <div className="rounded-full border border-white/8 bg-slate-950/56 px-3.5 py-1.5 text-[11px] text-slate-300 shadow-[0_14px_32px_rgba(2,6,23,0.24)] backdrop-blur-xl">
                    <span className="block truncate">{compactTripSize}</span>
                  </div>
                </div>

                <div className="pointer-events-auto flex flex-col items-end gap-1.5">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/68 px-3 py-2 shadow-[0_18px_44px_rgba(2,6,23,0.32)] backdrop-blur-2xl">
                    <CreditCard className="h-3.5 w-3.5 text-teal-400" />
                    <span className="text-sm font-semibold text-white">{compactSubtotal}</span>
                  </div>
                  <div className="rounded-full border border-white/8 bg-slate-950/56 px-3 py-1.5 text-[11px] text-slate-300 shadow-[0_14px_32px_rgba(2,6,23,0.24)] backdrop-blur-xl">
                    {formatPaymentMethod(ride.payment.method)}
                  </div>
                </div>
              </div>
            </div>

            <div className="absolute inset-x-0 bottom-[calc(4.8rem+env(safe-area-inset-bottom))] z-20 px-3">
              <div className="overflow-hidden rounded-[1.7rem] border border-white/10 bg-[linear-gradient(180deg,rgba(12,18,29,0.78),rgba(6,10,18,0.94))] shadow-[0_24px_64px_rgba(2,6,23,0.54)] backdrop-blur-2xl">
                <div className="flex justify-center pb-1.5 pt-2.5">
                  <div className="h-1 w-10 rounded-full bg-slate-700" />
                </div>

                <div className="max-h-[calc(100dvh-18rem)] overflow-y-auto overscroll-contain px-4 pb-3.5">
                  <div className="mb-3 rounded-[1.1rem] border border-white/8 bg-white/[0.03] p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">Active trip</p>
                        <p className="mt-1 text-[1.2rem] font-semibold tracking-[-0.02em] text-white">{stageLabel}</p>
                        <p className="mt-1 text-xs text-slate-300">{ride.rider.name}</p>
                      </div>
                      <Badge className="border-white/10 bg-slate-950/70 text-slate-100">{ride.payment.status}</Badge>
                    </div>
                    <p className="mt-2 max-w-[16rem] text-[11px] leading-4 text-slate-400">{supportCopy}</p>
                  </div>

                  <div className="rounded-[1.1rem] border border-white/10 bg-slate-950/28 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Trip control</p>
                      <span className="text-[11px] font-medium text-slate-400">{compactTripSize}</span>
                    </div>
                    <div className="space-y-2.5">
                      <div className="flex items-start gap-2.5 rounded-[0.95rem] bg-white/[0.02] px-2.5 py-2">
                        <div className="mt-1 flex flex-col items-center gap-1">
                          <div className="h-2.5 w-2.5 rounded-full bg-cyan-400 shadow-lg shadow-cyan-400/50" />
                          <div className="h-5 w-0.5 bg-white/10" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="mb-0.5 text-[11px] font-medium text-cyan-400">Pickup</div>
                          <div className="text-sm font-medium leading-4.5 text-white">{ride.pickup.address}</div>
                        </div>
                      </div>

                      <div className="flex items-start gap-2.5 rounded-[0.95rem] bg-white/[0.02] px-2.5 py-2">
                        <div className="mt-1 h-2.5 w-2.5 rounded-full bg-slate-600" />
                        <div className="min-w-0 flex-1">
                          <div className="mb-0.5 text-[11px] text-slate-400">Dropoff</div>
                          <div className="text-sm font-medium leading-4.5 text-white">{ride.dropoff.address}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-2.5 grid grid-cols-2 gap-2">
                    <div className="rounded-[0.95rem] border border-white/8 bg-white/[0.03] px-3 py-2.5">
                      <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Timing</div>
                      <div className="mt-1 text-sm font-semibold text-white">{compactTripSize}</div>
                      <div className="mt-0.5 text-[11px] text-slate-400">{timingLabel}</div>
                    </div>
                    <div className="rounded-[0.95rem] border border-white/8 bg-white/[0.03] px-3 py-2.5">
                      <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Payment</div>
                      <div className="mt-1 text-sm font-semibold text-white">{formatPaymentMethod(ride.payment.method)}</div>
                      <div className="mt-0.5 text-[11px] text-slate-400">Customer {formatDriverMoneyCompact(customerTotal)}</div>
                    </div>
                  </div>

                  {nextStatus ? (
                    <div className="mt-2.5 space-y-2 rounded-[1rem] border border-teal-500/16 bg-teal-500/[0.07] p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Next action</p>
                          <p className="mt-1 text-sm font-semibold text-white">Mark as {nextActionLabel}</p>
                        </div>
                        <Badge className="border-white/10 bg-slate-950/60 text-slate-100">{stageLabel}</Badge>
                      </div>
                      <Button className="h-11 w-full rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 text-sm font-bold text-white shadow-xl shadow-teal-500/30 hover:from-teal-400 hover:to-cyan-400" disabled={statusMutation.isPending} onClick={() => statusMutation.mutate(nextStatus)}>
                        <Navigation className="mr-2 h-4 w-4" />
                        {statusMutation.isPending ? "Updating trip..." : `Mark as ${nextActionLabel}`}
                      </Button>
                      {statusMutation.error ? <p className="text-sm text-ops-error">{statusMutation.error.message}</p> : null}
                    </div>
                  ) : (
                    <div className="mt-2.5 rounded-[1rem] border border-dashed border-white/10 p-3 text-sm text-slate-400">
                      This ride has reached the end of the workflow.
                    </div>
                  )}

                  <div className="mt-2.5 grid grid-cols-[1fr_auto] gap-2">
                    <Link
                      to="/driver"
                      className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-700/50 bg-slate-800/60 px-4 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
                    >
                      Driver home
                    </Link>
                    <div className="inline-flex h-10 items-center rounded-xl border border-white/8 bg-white/[0.03] px-3.5 text-[11px] text-slate-300">
                      {ride.rider.phone ?? "No rider phone"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="hidden xl:block">
        <Card className="overflow-hidden border-ops-border-soft/90 bg-[radial-gradient(circle_at_top_left,rgba(90,124,255,0.18),transparent_30%),linear-gradient(180deg,rgba(12,16,23,0.98),rgba(8,11,16,0.96))] shadow-panel">
          <CardContent className="p-4 md:p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-ops-muted">Trip in motion</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <h1 className="text-[1.7rem] font-extrabold tracking-[-0.04em] text-ops-text md:text-[2.1rem]">{ride.rider.name}</h1>
                  <Badge className="border-ops-primary/30 bg-ops-primary/12 text-ops-primary">{stageLabel}</Badge>
                </div>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-ops-muted">{supportCopy}</p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge className="border-ops-border-soft bg-[#08101a]/88 text-ops-text">{ride.estimatedMiles} miles · {ride.estimatedMinutes} minutes</Badge>
                  <Badge className="border-ops-border-soft bg-[#08101a]/88 text-ops-text">{formatPaymentMethod(ride.payment.method)}</Badge>
                  <Badge className="border-ops-border-soft bg-[#08101a]/88 text-ops-text">{ride.rideType.toUpperCase()}</Badge>
                </div>
              </div>

              <div className="flex w-full flex-col gap-2 md:w-auto md:min-w-[220px]">
                <Link
                  to="/driver"
                  className="inline-flex h-11 items-center justify-center rounded-2xl border border-ops-border bg-[linear-gradient(180deg,rgba(21,26,34,0.96),rgba(12,15,21,0.96))] px-4 text-sm font-semibold text-ops-text transition hover:border-ops-primary/35 hover:bg-ops-panel"
                >
                  Back to driver home
                </Link>
                {nextActionLabel ? (
                  <div className="rounded-[1.25rem] border border-ops-primary/18 bg-ops-primary/10 px-4 py-3 text-sm text-ops-text">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-ops-muted">Next action</p>
                    <p className="mt-2 font-semibold text-white">Mark as {nextActionLabel}</p>
                  </div>
                ) : (
                  <div className="rounded-[1.25rem] border border-dashed border-ops-border px-4 py-3 text-sm text-ops-muted">
                    This ride has reached the end of the workflow.
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <DataField label="Pickup" value={ride.pickup.address} />
              <DataField label="Dropoff" value={ride.dropoff.address} />
              <DataField label="Driver subtotal" value={formatMoney(subtotal)} subtle={`Platform due ${formatMoney(platformDue)}`} />
              <DataField label="Customer total" value={formatMoney(customerTotal)} subtle={`Payment ${ride.payment.status}`} />
            </div>
          </CardContent>
        </Card>

        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.18fr)_minmax(360px,0.82fr)] xl:items-start">
        <div className="min-w-0 space-y-4">
          <div className="relative">
            <div className="pointer-events-none absolute left-3 top-3 z-10 hidden flex-wrap gap-2 md:flex xl:hidden">
              <Badge className="border-ops-border-soft bg-[#08101a]/90 text-ops-text">{stageLabel}</Badge>
              <Badge className="border-ops-border-soft bg-[#08101a]/90 text-ops-text">{ride.estimatedMiles} miles · {ride.estimatedMinutes} minutes</Badge>
            </div>
            <DeferredLiveMap
              ride={ride}
              title="Driver route map"
              height={520}
              meta="Pickup, dropoff, and live trip progress stay attached to the same map-first work surface you started from on home."
            />
          </div>
        </div>

        <div className="min-w-0 space-y-4 xl:sticky xl:top-24">
          <Card className="overflow-hidden border-ops-border-soft/90 bg-[linear-gradient(180deg,rgba(12,16,23,0.98),rgba(8,11,16,0.96))] shadow-panel">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-ops-muted">Work rail</p>
                  <CardTitle className="mt-2 text-[1.6rem] font-extrabold tracking-[-0.04em]">Trip cockpit</CardTitle>
                  <CardDescription className="mt-2">A focused continuation of the driver home work surface while the trip is active.</CardDescription>
                </div>
                <span className="rounded-2xl border border-ops-border-soft bg-ops-panel/78 p-3 text-ops-primary">
                  <MapPinned className="h-5 w-5" />
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-[1.45rem] border border-ops-primary/18 bg-ops-primary/10 p-4 shadow-soft">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-ops-muted">Current stage</p>
                    <p className="mt-2 text-[1.45rem] font-extrabold tracking-[-0.04em] text-white">{stageLabel}</p>
                    <p className="mt-2 text-sm leading-6 text-ops-muted">{supportCopy}</p>
                  </div>
                  <Badge className="border-ops-primary/30 bg-[#08101a]/88 text-ops-text">{ride.payment.status}</Badge>
                </div>
              </div>

              {nextStatus ? (
                <div className="space-y-3 rounded-[1.45rem] border border-ops-border-soft/90 bg-ops-panel/45 p-4">
                  <div className="flex items-center gap-2 text-ops-muted">
                    <Navigation className="h-4 w-4" />
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em]">Next step</p>
                  </div>
                  <p className="text-lg font-semibold text-ops-text">Mark as {nextActionLabel}</p>
                  <Button className="h-11 w-full" disabled={statusMutation.isPending} onClick={() => statusMutation.mutate(nextStatus)}>
                    <Navigation className="mr-2 h-4 w-4" />
                    {statusMutation.isPending ? "Updating trip..." : `Mark as ${nextActionLabel}`}
                  </Button>
                  {statusMutation.error ? <p className="text-sm text-ops-error">{statusMutation.error.message}</p> : null}
                </div>
              ) : (
                <div className="rounded-[1.45rem] border border-dashed border-ops-border p-4 text-sm text-ops-muted">
                  This ride has reached the end of the workflow.
                </div>
              )}

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1">
                <div className="rounded-[1.4rem] border border-ops-border-soft/90 bg-ops-panel/45 p-4">
                  <div className="mb-2 flex items-center gap-2 text-ops-muted">
                    <Route className="h-4 w-4" />
                    Route
                  </div>
                  <div className="space-y-3">
                    <DataField label="Pickup" value={ride.pickup.address} />
                    <DataField label="Dropoff" value={ride.dropoff.address} />
                  </div>
                </div>

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
                  <p className="mt-1 text-sm text-ops-muted">Keep this page open while the ride is active so the live trip state stays current.</p>
                </div>

                <div className="rounded-[1.4rem] border border-ops-border-soft/90 bg-ops-panel/45 p-4">
                  <div className="mb-2 flex items-center gap-2 text-ops-muted">
                    <CreditCard className="h-4 w-4" />
                    Trip payment
                  </div>
                  <p className="font-semibold text-ops-text">{formatPaymentMethod(ride.payment.method)}</p>
                  <p className="mt-1 text-sm text-ops-muted">Chosen by the rider during booking · status {ride.payment.status}</p>
                  <p className="mt-2 text-sm text-ops-muted/80">Customer total {formatMoney(customerTotal)} · driver subtotal {formatMoney(subtotal)} · platform due {formatMoney(platformDue)}</p>
                </div>
              </div>

              <Link
                to="/driver"
                className="hidden h-11 items-center justify-center rounded-2xl border border-ops-border bg-[linear-gradient(180deg,rgba(21,26,34,0.96),rgba(12,15,21,0.96))] px-4 text-sm font-semibold text-ops-text transition hover:border-ops-primary/35 hover:bg-ops-panel xl:inline-flex"
              >
                Return to driver home
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
      </div>
    </div>
  );
}
