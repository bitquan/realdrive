import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { CreditCard, ExternalLink, LayoutDashboard, Navigation, Route, Search, Users } from "lucide-react";
import type { Ride, RideStatus } from "@shared/contracts";
import { DeferredLiveMap } from "@/components/maps/deferred-live-map";
import {
  DataField,
  EntityList,
  EntityListItem,
  MetricCard,
  MetricStrip,
  PanelSection,
  SurfaceHeader
} from "@/components/layout/ops-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { formatDateTime, formatMoney, formatPaymentMethod } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";

const ACTIVE_DISPATCH_STATUSES: RideStatus[] = [
  "requested",
  "offered",
  "accepted",
  "en_route",
  "arrived",
  "in_progress"
];

type DispatchQueueBucket = "active" | "scheduled";
type DispatchStatusFilter = "all" | RideStatus;
type DispatchPaymentFilter = "all" | Ride["payment"]["method"];

interface DispatchFilterState {
  search: string;
  status: DispatchStatusFilter;
  paymentMethod: DispatchPaymentFilter;
}

function formatRideStatus(status: RideStatus) {
  return status.replaceAll("_", " ");
}

function rideMatchesFilters(ride: Ride, filters: DispatchFilterState) {
  const searchValue = filters.search.trim().toLowerCase();

  if (filters.status !== "all" && ride.status !== filters.status) {
    return false;
  }

  if (filters.paymentMethod !== "all" && ride.payment.method !== filters.paymentMethod) {
    return false;
  }

  if (!searchValue) {
    return true;
  }

  return [ride.rider.name, ride.driver?.name ?? ""]
    .join(" ")
    .toLowerCase()
    .includes(searchValue);
}

function DispatchDetailCard({
  ride,
  updateRideMutation
}: {
  ride: Ride | null;
  updateRideMutation: {
    isPending: boolean;
    error: Error | null;
    mutate: (input: { rideId: string; paymentStatus?: "pending" | "collected" | "waived"; status?: RideStatus }) => void;
  };
}) {
  if (!ride) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-6 text-sm text-ops-muted">
          Choose an active or scheduled ride to inspect the real route and dispatch controls.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-ops-border-soft/95 bg-[linear-gradient(180deg,rgba(13,17,23,0.96),rgba(9,12,17,0.95))] shadow-panel backdrop-blur">
      <CardContent className="space-y-4 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>{formatRideStatus(ride.status)}</Badge>
          <Badge className="bg-ops-surface">{formatPaymentMethod(ride.payment.method)}</Badge>
          {ride.driver ? <Badge className="bg-ops-surface">{ride.driver.name}</Badge> : null}
        </div>

        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-ops-muted">Selected ride</p>
          <h2 className="mt-2 text-[2rem] font-extrabold tracking-[-0.04em] text-ops-text">{ride.rider.name}</h2>
          <p className="mt-2 text-sm text-ops-muted">
            {formatDateTime(ride.scheduledFor ?? ride.requestedAt)} · {ride.estimatedMiles} miles · {ride.estimatedMinutes} minutes
          </p>
        </div>

        <div className="grid gap-3">
          <DataField label="Pickup" value={ride.pickup.address} />
          <DataField label="Dropoff" value={ride.dropoff.address} />
          <div className="grid gap-3 md:grid-cols-2">
            <DataField
              label="Trip payment"
              value={formatPaymentMethod(ride.payment.method)}
              subtle={`Status: ${ride.payment.status} · chosen by the rider during booking`}
            />
            <DataField
              label="Current location"
              value={
                ride.latestLocation
                  ? `${ride.latestLocation.lat.toFixed(4)}, ${ride.latestLocation.lng.toFixed(4)}`
                  : ride.driver
                    ? "Awaiting first live ping"
                    : "Driver not assigned yet"
              }
              subtle={
                ride.latestLocation
                  ? "Latest live ride ping from the active workflow."
                  : ride.driver
                    ? "Pickup and dropoff route context is still available."
                    : "Dispatch is still looking for the right driver."
              }
            />
            <DataField
              label="Rider"
              value={ride.rider.name}
              subtle={ride.rider.phone ?? ride.rider.email ?? "No rider contact on file"}
            />
            <DataField
              label="Driver"
              value={ride.driver?.name ?? "Awaiting assignment"}
              subtle={ride.driver?.vehicle?.makeModel ?? "No driver assigned yet"}
            />
            <DataField
              label="Customer total"
              value={formatMoney(ride.pricing.finalCustomerTotal ?? ride.pricing.estimatedCustomerTotal)}
            />
            <DataField
              label="Driver subtotal"
              value={formatMoney(ride.pricing.finalSubtotal ?? ride.pricing.estimatedSubtotal)}
              subtle={`Platform due ${formatMoney(ride.pricing.finalPlatformDue ?? ride.pricing.estimatedPlatformDue)}`}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2.5">
          {ride.driver ? (
            <Link
              to={`/admin/drivers?driverId=${ride.driver.id}`}
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-ops-border px-4 text-sm font-semibold text-ops-text transition hover:border-ops-primary/35 hover:bg-ops-panel"
            >
              Open driver settings
            </Link>
          ) : null}

          {ride.payment.status !== "collected" ? (
            <Button
              variant="outline"
              disabled={updateRideMutation.isPending}
              onClick={() =>
                updateRideMutation.mutate({
                  rideId: ride.id,
                  paymentStatus: "collected"
                })
              }
            >
              Mark collected
            </Button>
          ) : null}

          {ride.status !== "canceled" && ride.status !== "completed" ? (
            <Button
              variant="ghost"
              disabled={updateRideMutation.isPending}
              className="border border-ops-destructive/28 text-ops-destructive hover:bg-ops-destructive/10 hover:text-ops-destructive"
              onClick={() =>
                updateRideMutation.mutate({
                  rideId: ride.id,
                  status: "canceled"
                })
              }
            >
              Cancel ride
            </Button>
          ) : null}

          {ride.publicTrackingToken ? (
            <Link
              to={`/track/${ride.publicTrackingToken}`}
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-ops-border px-4 text-sm font-semibold text-ops-text transition hover:border-ops-primary/35 hover:bg-ops-panel"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Open tracking
            </Link>
          ) : null}
        </div>

        {updateRideMutation.error ? <p className="text-sm text-ops-error">{updateRideMutation.error.message}</p> : null}
      </CardContent>
    </Card>
  );
}

export function AdminDispatchPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [bucket, setBucket] = useState<DispatchQueueBucket>("active");
  const [selectedRideId, setSelectedRideId] = useState("");
  const [filters, setFilters] = useState<DispatchFilterState>({
    search: "",
    status: "all",
    paymentMethod: "all"
  });

  const ridesQuery = useQuery({
    queryKey: ["admin-rides"],
    queryFn: () => api.listAdminRides(token!),
    enabled: Boolean(token)
  });

  const updateRideMutation = useMutation({
    mutationFn: (input: { rideId: string; paymentStatus?: "pending" | "collected" | "waived"; status?: RideStatus }) =>
      api.updateAdminRide(
        input.rideId,
        {
          paymentStatus: input.paymentStatus,
          status: input.status
        },
        token!
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-rides"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-dues"] });
    }
  });

  const rides = ridesQuery.data ?? [];
  const activeRides = useMemo(
    () => rides.filter((ride) => ACTIVE_DISPATCH_STATUSES.includes(ride.status)),
    [rides]
  );
  const scheduledRides = useMemo(
    () => rides.filter((ride) => ride.status === "scheduled"),
    [rides]
  );
  const filteredActiveRides = useMemo(
    () => activeRides.filter((ride) => rideMatchesFilters(ride, filters)),
    [activeRides, filters]
  );
  const filteredScheduledRides = useMemo(
    () => scheduledRides.filter((ride) => rideMatchesFilters(ride, filters)),
    [scheduledRides, filters]
  );

  useEffect(() => {
    if (bucket === "active" && !filteredActiveRides.length && filteredScheduledRides.length) {
      setBucket("scheduled");
    }

    if (bucket === "scheduled" && !filteredScheduledRides.length && filteredActiveRides.length) {
      setBucket("active");
    }
  }, [bucket, filteredActiveRides.length, filteredScheduledRides.length]);

  useEffect(() => {
    const currentQueue = bucket === "active" ? filteredActiveRides : filteredScheduledRides;
    const alternateQueue = bucket === "active" ? filteredScheduledRides : filteredActiveRides;
    const rideStillVisible = [...currentQueue, ...alternateQueue].some((ride) => ride.id === selectedRideId);

    if (rideStillVisible) {
      return;
    }

    const nextRide = currentQueue[0] ?? alternateQueue[0] ?? null;
    setSelectedRideId(nextRide?.id ?? "");
  }, [bucket, filteredActiveRides, filteredScheduledRides, selectedRideId]);

  const queueRides = bucket === "active" ? filteredActiveRides : filteredScheduledRides;
  const alternateQueue = bucket === "active" ? filteredScheduledRides : filteredActiveRides;
  const selectedRide =
    [...filteredActiveRides, ...filteredScheduledRides].find((ride) => ride.id === selectedRideId) ??
    queueRides[0] ??
    alternateQueue[0] ??
    null;

  const ridesAwaitingCollection = rides.filter(
    (ride) => [...ACTIVE_DISPATCH_STATUSES, "scheduled"].includes(ride.status) && ride.payment.status !== "collected"
  ).length;
  const livePingCount = rides.filter(
    (ride) => [...ACTIVE_DISPATCH_STATUSES, "scheduled"].includes(ride.status) && ride.latestLocation
  ).length;

  return (
    <div className="space-y-6">
      <SurfaceHeader
        eyebrow="Dispatch"
        title="Ride-first admin dispatch"
        description="Monitor real active and scheduled rides, open the live route context, and work from rider-selected trip payment details instead of driver-side payout assumptions."
        actions={[
          { label: "Overview", to: "/admin", icon: LayoutDashboard, variant: "secondary" },
          { label: "Driver settings", to: "/admin/drivers", icon: Users, variant: "secondary" }
        ]}
        aside={
          <div className="rounded-[1.7rem] border border-ops-border-soft bg-ops-panel/55 p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-ops-muted">Dispatch model</p>
            <div className="mt-4 space-y-3 text-sm leading-6 text-ops-muted">
              <p>V1 dispatch is ride-first and does not add a new idle-driver live-location API.</p>
              <p>Pickup, dropoff, and latest driver pings come from the live ride objects already in the system.</p>
              <p>Trip payment method stays locked to the rider booking choice across rider, driver, and admin views.</p>
            </div>
          </div>
        }
      />

      <MetricStrip>
        <MetricCard label="Active rides" value={activeRides.length} meta="Requested through in-progress rides" icon={Route} />
        <MetricCard label="Scheduled rides" value={scheduledRides.length} meta="Future dispatch holds" icon={Navigation} tone="primary" />
        <MetricCard label="Awaiting collection" value={ridesAwaitingCollection} meta="Dispatch rides not marked collected yet" icon={CreditCard} tone="warning" />
        <MetricCard label="Live map pings" value={livePingCount} meta="Selected rides with driver location updates" icon={Navigation} tone="success" />
      </MetricStrip>

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <PanelSection
          title="Ride queue"
          description="Filter only by rider, driver, ride status, and the rider-selected payment method."
          contentClassName="space-y-4"
        >
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ops-muted" />
            <Input
              value={filters.search}
              onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
              placeholder="Search rider or driver"
              className="pl-10"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <select
              value={filters.status}
              onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value as DispatchStatusFilter }))}
              className="h-11 rounded-2xl border border-ops-border bg-[linear-gradient(180deg,rgba(20,24,31,0.96),rgba(13,16,22,0.96))] px-4 text-sm text-ops-text outline-none transition focus:border-ops-primary/70"
            >
              <option value="all">All ride statuses</option>
              <option value="requested">Requested</option>
              <option value="offered">Offered</option>
              <option value="accepted">Accepted</option>
              <option value="en_route">En route</option>
              <option value="arrived">Arrived</option>
              <option value="in_progress">In progress</option>
              <option value="scheduled">Scheduled</option>
            </select>

            <select
              value={filters.paymentMethod}
              onChange={(event) => setFilters((current) => ({ ...current, paymentMethod: event.target.value as DispatchPaymentFilter }))}
              className="h-11 rounded-2xl border border-ops-border bg-[linear-gradient(180deg,rgba(20,24,31,0.96),rgba(13,16,22,0.96))] px-4 text-sm text-ops-text outline-none transition focus:border-ops-primary/70"
            >
              <option value="all">All trip payments</option>
              <option value="jim">Jim</option>
              <option value="cashapp">Cash App</option>
              <option value="cash">Cash</option>
            </select>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant={bucket === "active" ? "default" : "outline"} onClick={() => setBucket("active")}>
              Active ({filteredActiveRides.length})
            </Button>
            <Button variant={bucket === "scheduled" ? "default" : "outline"} onClick={() => setBucket("scheduled")}>
              Scheduled ({filteredScheduledRides.length})
            </Button>
          </div>

          <EntityList className="max-h-[760px] overflow-y-auto pr-1">
            {queueRides.length ? (
              queueRides.map((ride) => (
                <EntityListItem key={ride.id} active={ride.id === selectedRide?.id} onClick={() => setSelectedRideId(ride.id)}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-ops-text">{ride.rider.name}</p>
                      <p className="truncate text-sm text-ops-muted">{ride.driver?.name ?? "Awaiting assignment"}</p>
                    </div>
                    <Badge>{formatRideStatus(ride.status)}</Badge>
                  </div>
                  <p className="mt-3 line-clamp-2 text-sm leading-6 text-ops-text">{ride.pickup.address}</p>
                  <p className="mt-1 line-clamp-2 text-sm leading-6 text-ops-muted">{ride.dropoff.address}</p>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs uppercase tracking-[0.18em] text-ops-muted">
                    <span>{formatPaymentMethod(ride.payment.method)}</span>
                    <span>{formatDateTime(ride.scheduledFor ?? ride.requestedAt)}</span>
                  </div>
                </EntityListItem>
              ))
            ) : (
              <div className="rounded-[1.4rem] border border-dashed border-ops-border p-6 text-sm text-ops-muted">
                No rides match this dispatch queue right now.
              </div>
            )}
          </EntityList>
        </PanelSection>

        <div className="space-y-6">
          <div className="xl:hidden">
            <DispatchDetailCard ride={selectedRide} updateRideMutation={updateRideMutation} />
          </div>

          <div className="relative">
            {selectedRide ? (
              <DeferredLiveMap
                ride={selectedRide}
                title="Live route map"
                height={860}
                meta="Ride-first dispatch uses the selected ride's pickup, dropoff, and latest driver ping when the live workflow has already sent one."
              />
            ) : (
              <Card className="overflow-hidden">
                <CardContent className="flex min-h-[860px] items-center justify-center p-8 text-center text-sm text-ops-muted">
                  Select a ride from the queue to load the live route context here.
                </CardContent>
              </Card>
            )}

            <div className="hidden xl:absolute xl:left-6 xl:top-6 xl:z-10 xl:block xl:w-[440px]">
              <DispatchDetailCard ride={selectedRide} updateRideMutation={updateRideMutation} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
