import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { CarFront, CreditCard, ExternalLink, LayoutDashboard, Navigation, Route, Search, TestTubeDiagonal, UserRound, Users } from "lucide-react";
import type { AdminCreateTestRideInput, DriverAccount, Ride, RideStatus } from "@shared/contracts";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { formatDateTime, formatMoney, formatPaymentMethod } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";

const ACTIVE_DISPATCH_STATUSES: RideStatus[] = ["requested", "offered", "accepted", "en_route", "arrived", "in_progress"];

const TEST_RIDE_DRIVER_STEPS: Array<{ status: RideStatus; label: string }> = [
  { status: "en_route", label: "Mark en route" },
  { status: "arrived", label: "Mark arrived" },
  { status: "in_progress", label: "Start trip" },
  { status: "completed", label: "Complete trip" }
];

type DispatchQueueBucket = "active" | "scheduled";
type DispatchWorkspaceTab = "queue" | "test-lab";
type DispatchStatusFilter = "all" | RideStatus;
type DispatchPaymentFilter = "all" | Ride["payment"]["method"];

interface DispatchFilterState {
  search: string;
  status: DispatchStatusFilter;
  paymentMethod: DispatchPaymentFilter;
}

interface TestRideFormState {
  riderName: string;
  riderPhone: string;
  riderEmail: string;
  pickupAddress: string;
  dropoffAddress: string;
  rideType: Ride["rideType"];
  paymentMethod: Ride["payment"]["method"];
  scheduledFor: string;
  label: string;
  targetDriverId: string;
}

const initialTestRideForm: TestRideFormState = {
  riderName: "",
  riderPhone: "",
  riderEmail: "",
  pickupAddress: "",
  dropoffAddress: "",
  rideType: "standard",
  paymentMethod: "cashapp",
  scheduledFor: "",
  label: "",
  targetDriverId: ""
};

function formatRideStatus(status: RideStatus) {
  return status.replaceAll("_", " ");
}

function formatRideType(rideType: Ride["rideType"]) {
  return rideType.toUpperCase();
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

  return [ride.rider.name, ride.driver?.name ?? "", ride.pickup.address, ride.dropoff.address, ride.test.label ?? ""]
    .join(" ")
    .toLowerCase()
    .includes(searchValue);
}

function getTargetedOffer(ride: Ride) {
  if (!ride.test.targetDriverId) {
    return null;
  }

  return ride.offers.find((offer) => offer.driverId === ride.test.targetDriverId) ?? null;
}

function getNextTestRideStep(status: RideStatus) {
  return TEST_RIDE_DRIVER_STEPS.find((step) => {
    if (status === "accepted") return step.status === "en_route";
    if (status === "en_route") return step.status === "arrived";
    if (status === "arrived") return step.status === "in_progress";
    if (status === "in_progress") return step.status === "completed";
    return false;
  }) ?? null;
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
          {ride.test.isTest ? <Badge className="bg-amber-500/20 text-amber-200">Test ride</Badge> : null}
          {ride.driver ? <Badge className="bg-ops-surface">{ride.driver.name}</Badge> : null}
        </div>

        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-ops-muted">Selected ride</p>
          <h2 className="mt-2 text-[2rem] font-extrabold tracking-[-0.04em] text-ops-text">{ride.rider.name}</h2>
          <p className="mt-2 text-sm text-ops-muted">
            {formatDateTime(ride.scheduledFor ?? ride.requestedAt)} · {ride.estimatedMiles} miles · {ride.estimatedMinutes} minutes
          </p>
          {ride.test.label ? <p className="mt-2 text-sm text-amber-200">{ride.test.label}</p> : null}
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
            <DataField label="Rider" value={ride.rider.name} subtle={ride.rider.phone ?? ride.rider.email ?? "No rider contact on file"} />
            <DataField label="Driver" value={ride.driver?.name ?? "Awaiting assignment"} subtle={ride.driver?.vehicle?.makeModel ?? "No driver assigned yet"} />
            <DataField label="Customer total" value={formatMoney(ride.pricing.finalCustomerTotal ?? ride.pricing.estimatedCustomerTotal)} />
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
            <Button variant="outline" disabled={updateRideMutation.isPending} onClick={() => updateRideMutation.mutate({ rideId: ride.id, paymentStatus: "collected" })}>
              Mark collected
            </Button>
          ) : null}

          {ride.status !== "canceled" && ride.status !== "completed" ? (
            <Button
              variant="ghost"
              disabled={updateRideMutation.isPending}
              className="border border-ops-destructive/28 text-ops-destructive hover:bg-ops-destructive/10 hover:text-ops-destructive"
              onClick={() => updateRideMutation.mutate({ rideId: ride.id, status: "canceled" })}
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

function TestRideSplitView({
  ride,
  drivers,
  updateRideMutation,
  trackingUrl
}: {
  ride: Ride | null;
  drivers: DriverAccount[];
  updateRideMutation: {
    isPending: boolean;
    error: Error | null;
    mutate: (input: { rideId: string; paymentStatus?: "pending" | "collected" | "waived"; status?: RideStatus }) => void;
  };
  trackingUrl: string | null;
}) {
  if (!ride) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-ops-muted">
          Create or select a test ride to open the rider-on-top and driver-on-bottom workflow monitor.
        </CardContent>
      </Card>
    );
  }

  const targetedDriver = ride.test.targetDriverId ? drivers.find((driver) => driver.id === ride.test.targetDriverId) ?? null : null;
  const targetedOffer = getTargetedOffer(ride);
  const nextStep = getNextTestRideStep(ride.status);

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden border-ops-border-soft/95 bg-[linear-gradient(180deg,rgba(13,17,23,0.96),rgba(9,12,17,0.95))]">
        <CardHeader className="border-b border-ops-border-soft/80 bg-ops-panel/40">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-ops-text">
                <UserRound className="h-5 w-5" />
                Rider screen
              </CardTitle>
              <CardDescription>
                What the rider side should be experiencing while this test job moves through the live dispatch flow.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge>{formatRideStatus(ride.status)}</Badge>
              <Badge className="bg-amber-500/20 text-amber-200">Test ride</Badge>
              <Badge className="bg-ops-surface">{formatRideType(ride.rideType)}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 p-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="grid gap-3 md:grid-cols-2">
            <DataField label="Rider" value={ride.rider.name} subtle={ride.rider.phone ?? ride.rider.email ?? "Test rider profile"} />
            <DataField label="Rider message" value={ride.driver ? `Driver ${ride.driver.name} is attached.` : "Dispatch is matching a driver."} subtle={ride.test.label ?? "No test label added"} />
            <DataField label="Pickup" value={ride.pickup.address} />
            <DataField label="Dropoff" value={ride.dropoff.address} />
            <DataField label="Trip total" value={formatMoney(ride.pricing.finalCustomerTotal ?? ride.pricing.estimatedCustomerTotal)} subtle={`${ride.estimatedMiles} miles · ${ride.estimatedMinutes} minutes`} />
            <DataField label="Tracking" value={trackingUrl ?? "Tracking link unavailable"} subtle={ride.publicTrackingToken ? "Open the public tracking view for the rider perspective." : "Generated after public token assignment."} />
          </div>

          <div className="space-y-3 rounded-[1.5rem] border border-ops-border-soft/80 bg-ops-panel/40 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-ops-muted">Rider checkpoints</p>
            <div className="space-y-3 text-sm text-ops-muted">
              <p>1. Ride request placed with real addresses and live fare routing.</p>
              <p>2. Dispatch status: <span className="font-semibold text-ops-text">{formatRideStatus(ride.status)}</span>.</p>
              <p>3. Payment method shown to rider: <span className="font-semibold text-ops-text">{formatPaymentMethod(ride.payment.method)}</span>.</p>
              <p>4. Driver contact appears after acceptance and updates continue from the live ride object.</p>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              {trackingUrl ? (
                <a
                  href={trackingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-11 items-center justify-center rounded-2xl border border-ops-border px-4 text-sm font-semibold text-ops-text transition hover:border-ops-primary/35 hover:bg-ops-panel"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open rider tracking
                </a>
              ) : null}
              {ride.status !== "canceled" && ride.status !== "completed" ? (
                <Button variant="outline" disabled={updateRideMutation.isPending} onClick={() => updateRideMutation.mutate({ rideId: ride.id, status: "canceled" })}>
                  Cancel test ride
                </Button>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-ops-border-soft/95 bg-[linear-gradient(180deg,rgba(13,17,23,0.96),rgba(9,12,17,0.95))]">
        <CardHeader className="border-b border-ops-border-soft/80 bg-ops-panel/40">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-ops-text">
                <CarFront className="h-5 w-5" />
                Driver screen
              </CardTitle>
              <CardDescription>
                What the driver side should be seeing, including targeted-driver routing, offer state, and next workflow step.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              {targetedDriver ? <Badge className="bg-ops-surface">Targeted: {targetedDriver.name}</Badge> : <Badge className="bg-ops-surface">Area dispatch</Badge>}
              {targetedOffer ? <Badge>{targetedOffer.status}</Badge> : null}
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 p-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="grid gap-3 md:grid-cols-2">
            <DataField label="Assigned driver" value={ride.driver?.name ?? targetedDriver?.name ?? "Waiting for a driver"} subtle={ride.driver?.vehicle?.makeModel ?? targetedDriver?.vehicle?.makeModel ?? "No driver attached yet"} />
            <DataField
              label="Offer status"
              value={targetedOffer?.status ?? (ride.status === "offered" ? "pending offers" : formatRideStatus(ride.status))}
              subtle={targetedDriver ? `Driver availability: ${targetedDriver.available ? "available" : "offline"}` : "Dispatch follows live eligible-driver coverage in the pickup area."}
            />
            <DataField label="Accepted rider payment" value={formatPaymentMethod(ride.payment.method)} subtle="Drivers must accept this rider-selected payment type to receive the job." />
            <DataField label="Driver payout view" value={formatMoney(ride.pricing.finalSubtotal ?? ride.pricing.estimatedSubtotal)} subtle={`Platform due ${formatMoney(ride.pricing.finalPlatformDue ?? ride.pricing.estimatedPlatformDue)}`} />
            <DataField label="Route" value={`${ride.estimatedMiles} miles`} subtle={`${ride.estimatedMinutes} minutes · ${ride.pickup.address}`} />
            <DataField label="Live status" value={formatRideStatus(ride.status)} subtle={ride.latestLocation ? `Last ping ${formatDateTime(ride.latestLocation.createdAt)}` : "No live driver ping yet"} />
          </div>

          <div className="space-y-3 rounded-[1.5rem] border border-ops-border-soft/80 bg-ops-panel/40 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-ops-muted">Driver controls</p>
            <div className="space-y-3 text-sm text-ops-muted">
              <p>
                {targetedDriver
                  ? `This test job is pinned to ${targetedDriver.name} so you can validate one real driver account end-to-end.`
                  : "This test job follows normal nearby-driver dispatch for the pickup area."}
              </p>
              <p>Offer count: <span className="font-semibold text-ops-text">{ride.offers.length}</span></p>
              <p>Accepted at: <span className="font-semibold text-ops-text">{formatDateTime(ride.acceptedAt)}</span></p>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              {targetedDriver ? (
                <Link
                  to={`/admin/drivers?driverId=${targetedDriver.id}`}
                  className="inline-flex h-11 items-center justify-center rounded-2xl border border-ops-border px-4 text-sm font-semibold text-ops-text transition hover:border-ops-primary/35 hover:bg-ops-panel"
                >
                  Open driver account
                </Link>
              ) : null}
              {nextStep ? (
                <Button disabled={updateRideMutation.isPending} onClick={() => updateRideMutation.mutate({ rideId: ride.id, status: nextStep.status })}>
                  {nextStep.label}
                </Button>
              ) : null}
              {ride.payment.status !== "collected" ? (
                <Button variant="outline" disabled={updateRideMutation.isPending} onClick={() => updateRideMutation.mutate({ rideId: ride.id, paymentStatus: "collected" })}>
                  Mark payment collected
                </Button>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      {updateRideMutation.error ? <p className="text-sm text-ops-error">{updateRideMutation.error.message}</p> : null}
    </div>
  );
}

export function AdminDispatchPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [workspaceTab, setWorkspaceTab] = useState<DispatchWorkspaceTab>("queue");
  const [bucket, setBucket] = useState<DispatchQueueBucket>("active");
  const [selectedRideId, setSelectedRideId] = useState("");
  const [selectedTestRideId, setSelectedTestRideId] = useState("");
  const [trackingUrl, setTrackingUrl] = useState<string | null>(null);
  const [filters, setFilters] = useState<DispatchFilterState>({ search: "", status: "all", paymentMethod: "all" });
  const [testRideForm, setTestRideForm] = useState<TestRideFormState>(initialTestRideForm);

  const ridesQuery = useQuery({
    queryKey: ["admin-rides"],
    queryFn: () => api.listAdminRides(token!),
    enabled: Boolean(token)
  });

  const driversQuery = useQuery({
    queryKey: ["admin-drivers"],
    queryFn: () => api.listDrivers(token!),
    enabled: Boolean(token)
  });

  const updateRideMutation = useMutation({
    mutationFn: (input: { rideId: string; paymentStatus?: "pending" | "collected" | "waived"; status?: RideStatus }) =>
      api.updateAdminRide(input.rideId, { paymentStatus: input.paymentStatus, status: input.status }, token!),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-rides"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-dues"] });
    }
  });

  const createTestRideMutation = useMutation({
    mutationFn: (input: AdminCreateTestRideInput) => api.createAdminTestRide(input, token!),
    onSuccess: (result) => {
      setWorkspaceTab("test-lab");
      setSelectedTestRideId(result.ride.id);
      setSelectedRideId(result.ride.id);
      setTrackingUrl(result.trackingUrl);
      setTestRideForm(initialTestRideForm);
      void queryClient.invalidateQueries({ queryKey: ["admin-rides"] });
    }
  });

  const rides = ridesQuery.data ?? [];
  const drivers = driversQuery.data ?? [];
  const activeRides = useMemo(() => rides.filter((ride) => ACTIVE_DISPATCH_STATUSES.includes(ride.status)), [rides]);
  const scheduledRides = useMemo(() => rides.filter((ride) => ride.status === "scheduled"), [rides]);
  const filteredActiveRides = useMemo(() => activeRides.filter((ride) => rideMatchesFilters(ride, filters)), [activeRides, filters]);
  const filteredScheduledRides = useMemo(() => scheduledRides.filter((ride) => rideMatchesFilters(ride, filters)), [scheduledRides, filters]);
  const testRides = useMemo(() => rides.filter((ride) => ride.test.isTest).filter((ride) => rideMatchesFilters(ride, filters)), [rides, filters]);

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

  useEffect(() => {
    if (!testRides.some((ride) => ride.id === selectedTestRideId)) {
      setSelectedTestRideId(testRides[0]?.id ?? "");
    }
  }, [selectedTestRideId, testRides]);

  const queueRides = bucket === "active" ? filteredActiveRides : filteredScheduledRides;
  const alternateQueue = bucket === "active" ? filteredScheduledRides : filteredActiveRides;
  const selectedRide = [...filteredActiveRides, ...filteredScheduledRides].find((ride) => ride.id === selectedRideId) ?? queueRides[0] ?? alternateQueue[0] ?? null;
  const selectedTestRide = testRides.find((ride) => ride.id === selectedTestRideId) ?? testRides[0] ?? null;

  useEffect(() => {
    if (selectedTestRide?.publicTrackingToken) {
      setTrackingUrl(`${window.location.origin}/track/${selectedTestRide.publicTrackingToken}`);
    } else if (!createTestRideMutation.isPending) {
      setTrackingUrl(null);
    }
  }, [createTestRideMutation.isPending, selectedTestRide]);

  const ridesAwaitingCollection = rides.filter((ride) => [...ACTIVE_DISPATCH_STATUSES, "scheduled"].includes(ride.status) && ride.payment.status !== "collected").length;
  const livePingCount = rides.filter((ride) => [...ACTIVE_DISPATCH_STATUSES, "scheduled"].includes(ride.status) && ride.latestLocation).length;
  const openTestRideCount = testRides.filter((ride) => !["completed", "canceled", "expired"].includes(ride.status)).length;

  function handleCreateTestRide() {
    createTestRideMutation.mutate({
      riderName: testRideForm.riderName,
      riderPhone: testRideForm.riderPhone || undefined,
      riderEmail: testRideForm.riderEmail || undefined,
      pickupAddress: testRideForm.pickupAddress,
      dropoffAddress: testRideForm.dropoffAddress,
      rideType: testRideForm.rideType,
      paymentMethod: testRideForm.paymentMethod,
      scheduledFor: testRideForm.scheduledFor ? new Date(testRideForm.scheduledFor).toISOString() : undefined,
      label: testRideForm.label || undefined,
      targetDriverId: testRideForm.targetDriverId || undefined
    });
  }

  return (
    <div className="space-y-6">
      <SurfaceHeader
        eyebrow="Dispatch"
        title="Ride-first admin dispatch"
        description="Monitor live queues, spin up real test jobs with real addresses, and keep rider and driver workflow checks in one admin workspace."
        actions={[
          { label: "Overview", to: "/admin", icon: LayoutDashboard, variant: "secondary" },
          { label: "Driver settings", to: "/admin/drivers", icon: Users, variant: "secondary" }
        ]}
        aside={
          <div className="rounded-[1.7rem] border border-ops-border-soft bg-ops-panel/55 p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-ops-muted">Dispatch model</p>
            <div className="mt-4 space-y-3 text-sm leading-6 text-ops-muted">
              <p>V1 dispatch stays ride-first and reuses the live ride, offer, payment, and tracking system already in production.</p>
              <p>Test rides are clearly labeled, can target one approved driver account, and still use real address routing and pricing.</p>
              <p>The split-screen lab keeps rider context on top and driver context on bottom so admin can validate both sides together.</p>
            </div>
          </div>
        }
      />

      <MetricStrip>
        <MetricCard label="Active rides" value={activeRides.length} meta="Requested through in-progress rides" icon={Route} />
        <MetricCard label="Scheduled rides" value={scheduledRides.length} meta="Future dispatch holds" icon={Navigation} tone="primary" />
        <MetricCard label="Awaiting collection" value={ridesAwaitingCollection} meta="Dispatch rides not marked collected yet" icon={CreditCard} tone="warning" />
        <MetricCard label="Live map pings" value={livePingCount} meta="Selected rides with driver location updates" icon={Navigation} tone="success" />
        <MetricCard label="Open test rides" value={openTestRideCount} meta="Split-view checks still in motion" icon={TestTubeDiagonal} tone="primary" />
      </MetricStrip>

      <div className="flex flex-wrap gap-2">
        <Button variant={workspaceTab === "queue" ? "default" : "outline"} onClick={() => setWorkspaceTab("queue")}>
          Dispatch queue
        </Button>
        <Button variant={workspaceTab === "test-lab" ? "default" : "outline"} onClick={() => setWorkspaceTab("test-lab")}>
          Test lab
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="relative sm:col-span-2 xl:col-span-2">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ops-muted" />
          <Input value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} placeholder="Search rider, driver, address, or test label" className="pl-10" />
        </div>

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
          <option value="completed">Completed</option>
          <option value="canceled">Canceled</option>
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

      {workspaceTab === "queue" ? (
        <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <PanelSection title="Ride queue" description="Filter by rider, driver, ride status, payment method, and test labels without leaving the live dispatch view." contentClassName="space-y-4">
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
                      <div className="flex flex-wrap gap-2">
                        {ride.test.isTest ? <Badge className="bg-amber-500/20 text-amber-200">Test</Badge> : null}
                        <Badge>{formatRideStatus(ride.status)}</Badge>
                      </div>
                    </div>
                    <p className="mt-3 line-clamp-2 text-sm leading-6 text-ops-text">{ride.pickup.address}</p>
                    <p className="mt-1 line-clamp-2 text-sm leading-6 text-ops-muted">{ride.dropoff.address}</p>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs uppercase tracking-[0.18em] text-ops-muted">
                      <span>{formatPaymentMethod(ride.payment.method)}</span>
                      <span>{formatDateTime(ride.scheduledFor ?? ride.requestedAt)}</span>
                    </div>
                    {ride.test.label ? <p className="mt-2 text-xs text-amber-200">{ride.test.label}</p> : null}
                  </EntityListItem>
                ))
              ) : (
                <div className="rounded-[1.4rem] border border-dashed border-ops-border p-6 text-sm text-ops-muted">No rides match this dispatch queue right now.</div>
              )}
            </EntityList>
          </PanelSection>

          <div className="space-y-6">
            <div className="xl:hidden">
              <DispatchDetailCard ride={selectedRide} updateRideMutation={updateRideMutation} />
            </div>

            <div className="relative">
              {selectedRide ? (
                <DeferredLiveMap ride={selectedRide} title="Live route map" height={860} meta="Ride-first dispatch uses the selected ride's pickup, dropoff, and latest driver ping when the live workflow has already sent one." />
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
      ) : (
        <div className="grid gap-6 xl:grid-cols-[390px_minmax(0,1fr)]">
          <div className="space-y-6">
            <Card className="overflow-hidden border-ops-border-soft/95 bg-[linear-gradient(180deg,rgba(13,17,23,0.96),rgba(9,12,17,0.95))]">
              <CardHeader>
                <CardTitle className="text-ops-text">Create test job</CardTitle>
                <CardDescription>Create a real ride with real routing, label it for testing, and optionally pin it to one approved driver account.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
                  <div className="space-y-2">
                    <Label htmlFor="test-rider-name">Rider name</Label>
                    <Input id="test-rider-name" value={testRideForm.riderName} onChange={(event) => setTestRideForm((current) => ({ ...current, riderName: event.target.value }))} placeholder="QA rider" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="test-label">Test label</Label>
                    <Input id="test-label" value={testRideForm.label} onChange={(event) => setTestRideForm((current) => ({ ...current, label: event.target.value }))} placeholder="Driver acceptance check" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="test-rider-phone">Rider phone</Label>
                    <Input id="test-rider-phone" value={testRideForm.riderPhone} onChange={(event) => setTestRideForm((current) => ({ ...current, riderPhone: event.target.value }))} placeholder="Optional" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="test-rider-email">Rider email</Label>
                    <Input id="test-rider-email" type="email" value={testRideForm.riderEmail} onChange={(event) => setTestRideForm((current) => ({ ...current, riderEmail: event.target.value }))} placeholder="Optional" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="test-pickup-address">Pickup address</Label>
                  <Input id="test-pickup-address" value={testRideForm.pickupAddress} onChange={(event) => setTestRideForm((current) => ({ ...current, pickupAddress: event.target.value }))} placeholder="123 Main St, Atlanta, GA" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="test-dropoff-address">Dropoff address</Label>
                  <Input id="test-dropoff-address" value={testRideForm.dropoffAddress} onChange={(event) => setTestRideForm((current) => ({ ...current, dropoffAddress: event.target.value }))} placeholder="456 Peachtree Rd, Atlanta, GA" />
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
                  <div className="space-y-2">
                    <Label htmlFor="test-ride-type">Ride type</Label>
                    <select id="test-ride-type" value={testRideForm.rideType} onChange={(event) => setTestRideForm((current) => ({ ...current, rideType: event.target.value as Ride["rideType"] }))} className="h-11 w-full rounded-2xl border border-ops-border bg-[linear-gradient(180deg,rgba(20,24,31,0.96),rgba(13,16,22,0.96))] px-4 text-sm text-ops-text outline-none transition focus:border-ops-primary/70">
                      <option value="standard">Standard</option>
                      <option value="suv">SUV</option>
                      <option value="xl">XL</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="test-payment-method">Payment method</Label>
                    <select id="test-payment-method" value={testRideForm.paymentMethod} onChange={(event) => setTestRideForm((current) => ({ ...current, paymentMethod: event.target.value as Ride["payment"]["method"] }))} className="h-11 w-full rounded-2xl border border-ops-border bg-[linear-gradient(180deg,rgba(20,24,31,0.96),rgba(13,16,22,0.96))] px-4 text-sm text-ops-text outline-none transition focus:border-ops-primary/70">
                      <option value="cashapp">Cash App</option>
                      <option value="jim">Jim</option>
                      <option value="cash">Cash</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="test-scheduled-for">Schedule for</Label>
                    <Input id="test-scheduled-for" type="datetime-local" value={testRideForm.scheduledFor} onChange={(event) => setTestRideForm((current) => ({ ...current, scheduledFor: event.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="test-target-driver">Target one driver account</Label>
                    <select id="test-target-driver" value={testRideForm.targetDriverId} onChange={(event) => setTestRideForm((current) => ({ ...current, targetDriverId: event.target.value }))} className="h-11 w-full rounded-2xl border border-ops-border bg-[linear-gradient(180deg,rgba(20,24,31,0.96),rgba(13,16,22,0.96))] px-4 text-sm text-ops-text outline-none transition focus:border-ops-primary/70">
                      <option value="">Use normal area dispatch</option>
                      {drivers.filter((driver) => driver.approvalStatus === "approved").map((driver) => (
                        <option key={driver.id} value={driver.id}>
                          {driver.name} · {driver.homeCity ?? "Unknown city"}, {driver.homeState ?? "--"}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="rounded-[1.4rem] border border-ops-border-soft/80 bg-ops-panel/40 p-4 text-sm text-ops-muted">
                  If you target a driver, the test ride only dispatches to that approved driver account. Leave it empty to let any live eligible driver in the area receive the job.
                </div>

                {createTestRideMutation.error ? <p className="text-sm text-ops-error">{createTestRideMutation.error.message}</p> : null}

                <Button disabled={createTestRideMutation.isPending} onClick={handleCreateTestRide} className="w-full">
                  {createTestRideMutation.isPending ? "Creating test ride..." : "Create test ride"}
                </Button>
              </CardContent>
            </Card>

            <PanelSection title="Open test rides" description="Pick a test ride to inspect both rider and driver flow states together.">
              <EntityList className="max-h-[540px] overflow-y-auto pr-1">
                {testRides.length ? (
                  testRides.map((ride) => {
                    const targetedDriver = ride.test.targetDriverId ? drivers.find((driver) => driver.id === ride.test.targetDriverId) : null;

                    return (
                      <EntityListItem key={ride.id} active={ride.id === selectedTestRide?.id} onClick={() => setSelectedTestRideId(ride.id)}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-ops-text">{ride.test.label || ride.rider.name}</p>
                            <p className="truncate text-sm text-ops-muted">{ride.pickup.address}</p>
                          </div>
                          <Badge className="bg-amber-500/20 text-amber-200">Test</Badge>
                        </div>
                        <p className="mt-3 line-clamp-2 text-sm leading-6 text-ops-text">{ride.dropoff.address}</p>
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs uppercase tracking-[0.18em] text-ops-muted">
                          <span>{formatRideStatus(ride.status)}</span>
                          <span>{formatDateTime(ride.scheduledFor ?? ride.requestedAt)}</span>
                        </div>
                        <p className="mt-2 text-xs text-ops-muted">{targetedDriver ? `Targeted driver: ${targetedDriver.name}` : `Offers sent: ${ride.offers.length}`}</p>
                      </EntityListItem>
                    );
                  })
                ) : (
                  <div className="rounded-[1.4rem] border border-dashed border-ops-border p-6 text-sm text-ops-muted">No test rides match the current filters.</div>
                )}
              </EntityList>
            </PanelSection>
          </div>

          <div className="space-y-6">
            {selectedTestRide ? (
              <DeferredLiveMap ride={selectedTestRide} title="Test ride live route" height={360} meta="This uses the same live pickup, dropoff, and driver pings that power the production dispatch workspace." />
            ) : null}

            <TestRideSplitView ride={selectedTestRide} drivers={drivers} updateRideMutation={updateRideMutation} trackingUrl={trackingUrl} />
          </div>
        </div>
      )}
    </div>
  );
}
