import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { DriverDispatchSettings, PaymentMethod, Ride, RideType } from "@shared/contracts";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AlertTriangle, ArrowRight, MapPinned, Route } from "lucide-react";
import { BottomActionBar, DataField, EntityList } from "@/components/layout/ops-layout";
import { DeferredLiveMap } from "@/components/maps/deferred-live-map";
import { HeadrestPrintTemplate } from "@/components/share/headrest-print-template";
import { ShareQrCard } from "@/components/share/share-qr-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { formatDateTime, formatMoney, formatPaymentMethod } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";

const emptyRateForm = {
  standard: { baseFare: "0", perMile: "0", perMinute: "0", multiplier: "1" },
  suv: { baseFare: "0", perMile: "0", perMinute: "0", multiplier: "1" },
  xl: { baseFare: "0", perMile: "0", perMinute: "0", multiplier: "1" }
};

const paymentMethodOptions: PaymentMethod[] = ["jim", "cashapp", "cash"];

function getRidePricing(ride: Ride) {
  return {
    subtotal: ride.pricing.finalSubtotal ?? ride.pricing.estimatedSubtotal,
    platformDue: ride.pricing.finalPlatformDue ?? ride.pricing.estimatedPlatformDue,
    customerTotal: ride.pricing.finalCustomerTotal ?? ride.pricing.estimatedCustomerTotal
  };
}

function formatDriverStage(status: Ride["status"]) {
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

function formatDispatchSummary(settings: DriverDispatchSettings | undefined) {
  if (!settings) {
    return "Loading dispatch";
  }

  const parts: string[] = [];

  if (settings.localEnabled) {
    parts.push(`Local ${settings.localRadiusMiles} mi`);
  }

  if (settings.serviceAreaEnabled) {
    parts.push(settings.serviceAreaStates.length ? `States ${settings.serviceAreaStates.join(", ")}` : "Service area");
  }

  if (settings.nationwideEnabled) {
    parts.push("Nationwide");
  }

  return parts.length ? parts.join(" · ") : "Dispatch off";
}

function getOfferCountdown(ride: Ride, now: number) {
  const pendingOffer = ride.offers.find((offer) => offer.status === "pending");
  if (!pendingOffer) {
    return null;
  }

  const remainingMs = new Date(pendingOffer.expiresAt).getTime() - now;
  if (remainingMs <= 0) {
    return "Expired";
  }

  const totalSeconds = Math.ceil(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function DriverStatusBar({
  available,
  suspended,
  blockedReason,
  dispatchSummary,
  availabilityPending,
  onToggleAvailability
}: {
  available: boolean;
  suspended: boolean;
  blockedReason: string | null;
  dispatchSummary: string;
  availabilityPending: boolean;
  onToggleAvailability: () => void;
}) {
  const statusLabel = suspended ? "Blocked" : available ? "Online" : "Offline";
  const statusDetail = blockedReason ?? (available ? "Visible for live dispatch." : "Sign on to start receiving nearby jobs.");

  return (
    <section className="sticky top-3 z-20 rounded-[1.7rem] border border-ops-border-soft/90 bg-[linear-gradient(180deg,rgba(12,16,23,0.96),rgba(8,11,16,0.94))] px-4 py-3.5 shadow-elevated backdrop-blur md:top-4 md:px-5 md:py-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={suspended ? "border-ops-destructive/28 bg-ops-destructive/12 text-ops-destructive" : available ? "border-ops-success/28 bg-ops-success/12 text-ops-success" : "border-ops-border-soft bg-ops-panel/80 text-ops-text"}>
              {statusLabel}
            </Badge>
            <Badge className="border-ops-border-soft bg-ops-panel/82 text-ops-text">{dispatchSummary}</Badge>
          </div>
          <p className="mt-2 text-sm text-ops-muted">{statusDetail}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant={available ? "outline" : "default"}
            disabled={availabilityPending || (!available && suspended)}
            onClick={onToggleAvailability}
          >
            {available ? "Go offline" : suspended ? "Blocked from sign-on" : "Go online"}
          </Button>
        </div>
      </div>
    </section>
  );
}

function DriverMapSurface({
  ride,
  statusLabel,
  dispatchSummary,
  vehicleLabel
}: {
  ride: Ride | null;
  statusLabel: string;
  dispatchSummary: string;
  vehicleLabel: string;
}) {
  if (ride) {
    return (
      <div className="relative">
        <div className="pointer-events-none absolute left-3 top-3 z-10 hidden flex-wrap gap-2 md:flex xl:hidden">
          <Badge className="border-ops-border-soft bg-[#08101a]/90 text-ops-text">{statusLabel}</Badge>
          <Badge className="border-ops-border-soft bg-[#08101a]/90 text-ops-text">{dispatchSummary}</Badge>
        </div>
        <DeferredLiveMap
          ride={ride}
          title={ride.status === "offered" ? "Live dispatch map" : "Driver route map"}
          height={520}
          meta={ride.status === "offered" ? "Offers and active trips stay attached to a live map-first work surface." : "Pickup, dropoff, and route progress stay visible while you work."}
        />
      </div>
    );
  }

  return (
    <Card className="overflow-hidden border-ops-border-soft/95 bg-[radial-gradient(circle_at_top_left,rgba(90,124,255,0.18),transparent_28%),linear-gradient(180deg,rgba(10,14,20,0.98),rgba(6,9,14,0.96))] shadow-panel">
      <CardHeader className="border-b border-ops-border-soft/80 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Live dispatch map</CardTitle>
            <CardDescription className="mt-2">The map stays reserved as the primary driver surface, even when no offer is live yet.</CardDescription>
          </div>
          <span className="rounded-2xl border border-ops-border-soft bg-ops-panel/75 p-3 text-ops-primary">
            <MapPinned className="h-5 w-5" />
          </span>
        </div>
      </CardHeader>
      <CardContent className="relative min-h-[420px] overflow-hidden p-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(90,124,255,0.12),transparent_20%),radial-gradient(circle_at_82%_32%,rgba(90,124,255,0.08),transparent_24%),linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:auto,auto,38px_38px,38px_38px] opacity-90" />
        <div className="relative z-10 flex h-full flex-col justify-between">
          <div className="hidden flex-wrap gap-2 md:flex">
            <Badge className="border-ops-border-soft bg-[#08101a]/88 text-ops-text">{statusLabel}</Badge>
            <Badge className="border-ops-border-soft bg-[#08101a]/88 text-ops-text">{dispatchSummary}</Badge>
          </div>

          <div className="max-w-xl space-y-4 rounded-[1.9rem] border border-ops-border-soft/90 bg-[#08101a]/78 p-5 shadow-soft backdrop-blur">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-ops-muted">Stand by</p>
            <h2 className="text-[2rem] font-extrabold tracking-[-0.04em] text-ops-text">Ready for the next nearby job.</h2>
            <p className="text-sm leading-6 text-ops-muted">
              Stay signed on and keep this screen open. New offers will land in the live work rail without making you dig through account tools.
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              <DataField label="Dispatch mode" value={dispatchSummary} />
              <DataField label="Vehicle" value={vehicleLabel} />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DriverLiveOfferCard({
  offer,
  suspended,
  countdown,
  acceptMutation,
  declineMutation,
  mobile
}: {
  offer: Ride | null;
  suspended: boolean;
  countdown: string | null;
  acceptMutation: {
    isPending: boolean;
    mutate: (rideId: string) => void;
  };
  declineMutation: {
    isPending: boolean;
    mutate: (rideId: string) => void;
  };
  mobile?: boolean;
}) {
  if (!offer) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Live offer</CardTitle>
          <CardDescription>New jobs appear here first, with the inbox just one tap away.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-[1.5rem] border border-dashed border-ops-border p-5 text-sm text-ops-muted">
            No live offer right now. Stay online and keep the map open.
          </div>
        </CardContent>
      </Card>
    );
  }

  const pricing = getRidePricing(offer);

  return (
    <Card className="overflow-hidden border-ops-primary/24 shadow-glow">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>Live offer</CardTitle>
            <CardDescription className="mt-2">Accepting moves straight into the active trip flow.</CardDescription>
          </div>
          <Badge className="border-ops-warning/30 bg-ops-warning/10 text-ops-warning">{countdown ?? "Queued"}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-ops-muted">Pickup</p>
          <p className="mt-2 text-lg font-semibold text-ops-text">{offer.pickup.address}</p>
          <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-ops-muted">Dropoff</p>
          <p className="mt-2 text-sm text-ops-muted">{offer.dropoff.address}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <DataField label="Estimated payout" value={formatMoney(pricing.subtotal)} subtle={`Customer total ${formatMoney(pricing.customerTotal)}`} />
          <DataField label="Trip size" value={`${offer.estimatedMiles} miles`} subtle={`${offer.estimatedMinutes} minutes · ${formatPaymentMethod(offer.payment.method)}`} />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-[1.35rem] border border-ops-border-soft/90 bg-ops-panel/45 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-ops-muted">Ride type</p>
            <p className="mt-3 text-base font-semibold text-ops-text">{offer.rideType.toUpperCase()}</p>
          </div>
          <div className="rounded-[1.35rem] border border-ops-border-soft/90 bg-ops-panel/45 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-ops-muted">Platform due</p>
            <p className="mt-3 text-base font-semibold text-ops-text">{formatMoney(pricing.platformDue)}</p>
          </div>
        </div>

        <div className={`gap-3 ${mobile ? "hidden xl:flex" : "flex"}`}>
          <Button className="flex-1" disabled={suspended || acceptMutation.isPending} onClick={() => acceptMutation.mutate(offer.id)}>
            {acceptMutation.isPending ? "Accepting..." : "Accept and open trip"}
          </Button>
          <Button variant="outline" className="flex-1" disabled={declineMutation.isPending} onClick={() => declineMutation.mutate(offer.id)}>
            Decline
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function DriverOfferInbox({
  offers,
  suspended,
  available,
  now,
  acceptMutation,
  declineMutation
}: {
  offers: Ride[];
  suspended: boolean;
  available: boolean;
  now: number;
  acceptMutation: {
    isPending: boolean;
    mutate: (rideId: string) => void;
  };
  declineMutation: {
    isPending: boolean;
    mutate: (rideId: string) => void;
  };
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Offer inbox</CardTitle>
        <CardDescription>All pending offers stay in one place, ordered from newest to oldest.</CardDescription>
      </CardHeader>
      <CardContent>
        {offers.length ? (
          <EntityList>
            {offers.map((ride) => {
              const pricing = getRidePricing(ride);
              const countdown = getOfferCountdown(ride, now);

              return (
                <div key={ride.id} className="rounded-[1.45rem] border border-ops-border-soft/90 bg-ops-panel/40 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-ops-text">{ride.pickup.address}</p>
                      <p className="mt-1 truncate text-sm text-ops-muted">{ride.dropoff.address}</p>
                    </div>
                    <Badge className="border-ops-border-soft bg-ops-panel/80 text-ops-text">{countdown ?? "Queued"}</Badge>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <DataField label="Payout" value={formatMoney(pricing.subtotal)} subtle={`Customer total ${formatMoney(pricing.customerTotal)}`} />
                    <DataField label="Trip size" value={`${ride.estimatedMiles} miles`} subtle={`${ride.estimatedMinutes} minutes · ${formatPaymentMethod(ride.payment.method)}`} />
                  </div>

                  <div className="mt-4 flex gap-3">
                    <Button className="flex-1" disabled={suspended || acceptMutation.isPending} onClick={() => acceptMutation.mutate(ride.id)}>
                      {acceptMutation.isPending ? "Accepting..." : "Accept"}
                    </Button>
                    <Button variant="outline" className="flex-1" disabled={declineMutation.isPending} onClick={() => declineMutation.mutate(ride.id)}>
                      Decline
                    </Button>
                  </div>
                </div>
              );
            })}
          </EntityList>
        ) : (
          <div className="rounded-[1.45rem] border border-dashed border-ops-border p-5 text-sm text-ops-muted">
            {available ? "No offers in the inbox right now." : "Go online to start receiving jobs in the inbox."}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DriverActiveRideCard({ ride, emphasize }: { ride: Ride | null; emphasize?: boolean }) {
  if (!ride) {
    return (
      <Card className={emphasize ? "border-ops-primary/30 shadow-soft" : undefined}>
        <CardHeader>
          <CardTitle>Active ride</CardTitle>
          <CardDescription>The current trip always stays one tap away from home.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-[1.45rem] border border-dashed border-ops-border p-5 text-sm text-ops-muted">
            No ride in progress. The next accepted job will appear here.
          </div>
        </CardContent>
      </Card>
    );
  }

  const pricing = getRidePricing(ride);

  return (
    <Card className={emphasize ? "border-ops-primary/30 shadow-soft" : undefined}>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>Active ride</CardTitle>
            <CardDescription className="mt-2">Resume the live trip flow without leaving home.</CardDescription>
          </div>
          <Badge>{formatDriverStage(ride.status)}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-lg font-semibold text-ops-text">{ride.rider.name}</p>
          <p className="mt-1 text-sm text-ops-muted">{ride.pickup.address}</p>
          <p className="mt-1 text-sm text-ops-muted">To {ride.dropoff.address}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <DataField label="Current stage" value={formatDriverStage(ride.status)} subtle={`${ride.estimatedMiles} miles · ${ride.estimatedMinutes} minutes`} />
          <DataField label="Driver subtotal" value={formatMoney(pricing.subtotal)} subtle={`Trip payment ${formatPaymentMethod(ride.payment.method)}`} />
        </div>

        <Link
          to={`/driver/rides/${ride.id}`}
          className="inline-flex h-11 w-full items-center justify-center rounded-2xl border border-ops-primary/40 bg-ops-primary px-4 text-sm font-semibold text-white transition hover:bg-[#6887ff]"
        >
          Resume trip
          <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </CardContent>
    </Card>
  );
}

function DriverEarningsMini({ projectedTotal, jobsInFlow }: { projectedTotal: number; jobsInFlow: number }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Projected live earnings</CardTitle>
        <CardDescription>Quick visibility for the work already in motion.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
        <DataField label="Projected total" value={formatMoney(projectedTotal)} subtle="Active trips plus the current top offer" />
        <DataField label="Jobs in flow" value={jobsInFlow} subtle="Accepted rides plus the current live offer" />
      </CardContent>
    </Card>
  );
}

function DriverToolsSection({
  open,
  onToggle,
  outstandingTotal,
  children
}: {
  open: boolean;
  onToggle: () => void;
  outstandingTotal: number;
  children: ReactNode;
}) {
  return (
    <Card className="overflow-hidden border-ops-border-soft/95 bg-[linear-gradient(180deg,rgba(12,16,22,0.98),rgba(8,11,16,0.96))] shadow-panel">
      <CardHeader>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Driver tools</CardTitle>
            <CardDescription className="mt-2">Account and platform tools stay available, but no longer crowd the live work surface.</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="border-ops-border-soft bg-ops-panel/75 text-ops-text">Dues {formatMoney(outstandingTotal)}</Badge>
            <Button variant="outline" onClick={onToggle}>{open ? "Hide tools" : "Open tools"}</Button>
          </div>
        </div>
      </CardHeader>
      {open ? <CardContent className="space-y-6">{children}</CardContent> : null}
    </Card>
  );
}

export function DriverDashboardPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const profileQuery = useQuery({
    queryKey: ["driver-profile"],
    queryFn: () => api.getDriverProfile(token!),
    enabled: Boolean(token)
  });
  const offersQuery = useQuery({
    queryKey: ["driver-offers"],
    queryFn: () => api.listDriverOffers(token!),
    enabled: Boolean(token && profileQuery.data?.approvalStatus === "approved" && profileQuery.data?.available),
    retry: false
  });
  const shareQuery = useQuery({
    queryKey: ["me-share"],
    queryFn: () => api.meShare(token!),
    enabled: Boolean(token)
  });
  const activeRidesQuery = useQuery({
    queryKey: ["driver-active-rides"],
    queryFn: () => api.listActiveDriverRides(token!),
    enabled: Boolean(token && profileQuery.data?.approvalStatus === "approved"),
    retry: false
  });
  const dispatchQuery = useQuery({
    queryKey: ["driver-dispatch-settings"],
    queryFn: () => api.getDriverDispatchSettings(token!),
    enabled: Boolean(token)
  });
  const ratesQuery = useQuery({
    queryKey: ["driver-rates"],
    queryFn: () => api.getDriverRates(token!),
    enabled: Boolean(token)
  });
  const duesQuery = useQuery({
    queryKey: ["driver-dues"],
    queryFn: () => api.getDriverDues(token!),
    enabled: Boolean(token)
  });
  const adProgramQuery = useQuery({
    queryKey: ["driver-ad-program"],
    queryFn: () => api.getDriverAdProgram(token!),
    enabled: Boolean(token)
  });
  const communityQuery = useQuery({
    queryKey: ["community-board"],
    queryFn: () => api.listCommunityProposals(token!),
    enabled: Boolean(token)
  });

  const [profileForm, setProfileForm] = useState({
    name: "",
    phone: "",
    homeState: "",
    homeCity: "",
    makeModel: "",
    plate: "",
    color: "",
    rideType: "standard" as RideType,
    seats: "4"
  });
  const [dispatchForm, setDispatchForm] = useState<DriverDispatchSettings>({
    localEnabled: true,
    localRadiusMiles: 25,
    serviceAreaEnabled: true,
    serviceAreaStates: [],
    nationwideEnabled: false
  });
  const [serviceAreaText, setServiceAreaText] = useState("");
  const [rateMode, setRateMode] = useState<"platform" | "custom">("platform");
  const [rateForm, setRateForm] = useState(emptyRateForm);
  const [acceptedPaymentMethods, setAcceptedPaymentMethods] = useState<PaymentMethod[]>(paymentMethodOptions);
  const [offerView, setOfferView] = useState<"live" | "inbox">(searchParams.get("tab") === "inbox" ? "inbox" : "live");
  const [toolsOpen, setToolsOpen] = useState(searchParams.get("tab") === "account");
  const [now, setNow] = useState(() => Date.now());
  const toolsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!profileQuery.data) {
      return;
    }

    setProfileForm({
      name: profileQuery.data.name,
      phone: profileQuery.data.phone ?? "",
      homeState: profileQuery.data.homeState ?? "",
      homeCity: profileQuery.data.homeCity ?? "",
      makeModel: profileQuery.data.vehicle?.makeModel ?? "",
      plate: profileQuery.data.vehicle?.plate ?? "",
      color: profileQuery.data.vehicle?.color ?? "",
      rideType: profileQuery.data.vehicle?.rideType ?? "standard",
      seats: String(profileQuery.data.vehicle?.seats ?? 4)
    });
    setAcceptedPaymentMethods(profileQuery.data.acceptedPaymentMethods?.length ? profileQuery.data.acceptedPaymentMethods : paymentMethodOptions);
  }, [profileQuery.data]);

  useEffect(() => {
    if (!dispatchQuery.data) {
      return;
    }

    setDispatchForm(dispatchQuery.data);
    setServiceAreaText(dispatchQuery.data.serviceAreaStates.join(", "));
  }, [dispatchQuery.data]);

  useEffect(() => {
    if (!ratesQuery.data) {
      return;
    }

    setRateMode(ratesQuery.data.pricingMode);
    setRateForm({
      standard: {
        baseFare: String(ratesQuery.data.rules.find((rule) => rule.rideType === "standard")?.baseFare ?? 0),
        perMile: String(ratesQuery.data.rules.find((rule) => rule.rideType === "standard")?.perMile ?? 0),
        perMinute: String(ratesQuery.data.rules.find((rule) => rule.rideType === "standard")?.perMinute ?? 0),
        multiplier: String(ratesQuery.data.rules.find((rule) => rule.rideType === "standard")?.multiplier ?? 1)
      },
      suv: {
        baseFare: String(ratesQuery.data.rules.find((rule) => rule.rideType === "suv")?.baseFare ?? 0),
        perMile: String(ratesQuery.data.rules.find((rule) => rule.rideType === "suv")?.perMile ?? 0),
        perMinute: String(ratesQuery.data.rules.find((rule) => rule.rideType === "suv")?.perMinute ?? 0),
        multiplier: String(ratesQuery.data.rules.find((rule) => rule.rideType === "suv")?.multiplier ?? 1)
      },
      xl: {
        baseFare: String(ratesQuery.data.rules.find((rule) => rule.rideType === "xl")?.baseFare ?? 0),
        perMile: String(ratesQuery.data.rules.find((rule) => rule.rideType === "xl")?.perMile ?? 0),
        perMinute: String(ratesQuery.data.rules.find((rule) => rule.rideType === "xl")?.perMinute ?? 0),
        multiplier: String(ratesQuery.data.rules.find((rule) => rule.rideType === "xl")?.multiplier ?? 1)
      }
    });
  }, [ratesQuery.data]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const tab = searchParams.get("tab");

    if (tab === "inbox") {
      setOfferView("inbox");
      return;
    }

    setOfferView("live");
  }, [searchParams]);

  useEffect(() => {
    if (searchParams.get("tab") !== "account") {
      return;
    }

    setToolsOpen(true);
    window.requestAnimationFrame(() => {
      toolsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [searchParams]);

  const availabilityMutation = useMutation({
    mutationFn: (available: boolean) => api.updateDriverAvailability(available, token!),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["driver-profile"] });
      void queryClient.invalidateQueries({ queryKey: ["driver-dues"] });
    }
  });

  const profileMutation = useMutation({
    mutationFn: () =>
      api.updateDriverProfile(
        {
          name: profileForm.name,
          phone: profileForm.phone,
          homeState: profileForm.homeState,
          homeCity: profileForm.homeCity,
          acceptedPaymentMethods,
          vehicle: {
            makeModel: profileForm.makeModel,
            plate: profileForm.plate,
            color: profileForm.color || undefined,
            rideType: profileForm.rideType,
            seats: Number(profileForm.seats)
          }
        },
        token!
      ),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["driver-profile"] })
  });

  const dispatchMutation = useMutation({
    mutationFn: () =>
      api.updateDriverDispatchSettings(
        {
          ...dispatchForm,
          serviceAreaStates: serviceAreaText
            .split(",")
            .map((state) => state.trim().toUpperCase())
            .filter(Boolean)
        },
        token!
      ),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["driver-dispatch-settings"] })
  });

  const rateMutation = useMutation({
    mutationFn: () =>
      api.updateDriverRates(
        {
          pricingMode: rateMode,
          rules: (Object.keys(rateForm) as RideType[]).map((rideType) => ({
            rideType,
            baseFare: Number(rateForm[rideType].baseFare),
            perMile: Number(rateForm[rideType].perMile),
            perMinute: Number(rateForm[rideType].perMinute),
            multiplier: Number(rateForm[rideType].multiplier)
          }))
        },
        token!
      ),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["driver-rates"] })
  });

  const acceptMutation = useMutation({
    mutationFn: (rideId: string) => api.acceptOffer(rideId, token!),
    onSuccess: (ride) => {
      void queryClient.invalidateQueries({ queryKey: ["driver-offers"] });
      void queryClient.invalidateQueries({ queryKey: ["driver-active-rides"] });
      void navigate(`/driver/rides/${ride.id}`);
    }
  });

  const declineMutation = useMutation({
    mutationFn: (rideId: string) => api.declineOffer(rideId, token!),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["driver-offers"] })
  });

  const adProgramMutation = useMutation({
    mutationFn: (optedIn: boolean) => api.updateDriverAdProgram({ optedIn }, token!),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["driver-ad-program"] })
  });

  useEffect(() => {
    if (!token) {
      return;
    }

    const socket = getSocket(token);
    const refresh = () => {
      void queryClient.invalidateQueries({ queryKey: ["driver-offers"] });
      void queryClient.invalidateQueries({ queryKey: ["driver-active-rides"] });
      void queryClient.invalidateQueries({ queryKey: ["driver-dues"] });
    };

    socket.on("ride.offer", refresh);
    socket.on("ride.status.changed", refresh);

    return () => {
      socket.off("ride.offer", refresh);
      socket.off("ride.status.changed", refresh);
    };
  }, [queryClient, token]);

  const collectibleAccrued = duesQuery.data?.collectibleAccrued ?? [];
  const openBatches = duesQuery.data?.openBatches ?? [];
  const overdueBatches = duesQuery.data?.overdueBatches ?? [];
  const dueHistory = duesQuery.data?.history ?? [];
  const payoutSettings = duesQuery.data?.payoutSettings;
  const collector = duesQuery.data?.collector;
  const suspended = duesQuery.data?.blocked ?? false;
  const community = communityQuery.data;
  const adProgram = adProgramQuery.data;
  const requestFeatureUrl = `/request-feature?source=driver_app&contextPath=${encodeURIComponent("/driver")}`;
  const offers = offersQuery.data ?? [];
  const activeRides = activeRidesQuery.data ?? [];
  const liveOffer = offers[0] ?? null;
  const activeRide = activeRides[0] ?? null;
  const mapRide = activeRide ?? liveOffer;
  const requestedTab = searchParams.get("tab");
  const projectedLiveEarnings = useMemo(() => {
    const activeSubtotal = activeRides.reduce((total, ride) => total + getRidePricing(ride).subtotal, 0);
    const liveOfferSubtotal = liveOffer ? getRidePricing(liveOffer).subtotal : 0;
    return Number((activeSubtotal + liveOfferSubtotal).toFixed(2));
  }, [activeRides, liveOffer]);
  const jobsInFlow = activeRides.length + (liveOffer ? 1 : 0);
  const dispatchSummary = formatDispatchSummary(dispatchQuery.data);
  const statusLabel = suspended ? "Blocked" : profileQuery.data?.available ? "Online" : "Offline";
  const hasActiveTrip = activeRides.length > 0;

  function updateDriverHomeTab(tab: "home" | "inbox" | "ride" | "account") {
    const params = new URLSearchParams(searchParams);
    params.set("tab", tab);
    setSearchParams(params, { replace: true });
  }

  return (
    <div className="space-y-5 md:space-y-6">
      <DriverStatusBar
        available={Boolean(profileQuery.data?.available)}
        suspended={suspended}
        blockedReason={duesQuery.data?.blockedReason ?? null}
        dispatchSummary={dispatchSummary}
        availabilityPending={availabilityMutation.isPending}
        onToggleAvailability={() => availabilityMutation.mutate(!profileQuery.data?.available)}
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(360px,0.95fr)] xl:items-start">
        <div className="min-w-0 space-y-4">
          <DriverMapSurface
            ride={mapRide}
            statusLabel={statusLabel}
            dispatchSummary={dispatchSummary}
            vehicleLabel={profileQuery.data?.vehicle?.makeModel ?? "Vehicle pending"}
          />
        </div>

        <div className="min-w-0 xl:sticky xl:top-24">
          <div className="xl:hidden -mt-7 rounded-t-[2rem] border border-ops-border-soft/90 bg-[linear-gradient(180deg,rgba(10,14,20,0.98),rgba(8,11,16,0.96))] p-4 shadow-elevated backdrop-blur">
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-white/12" />

            <div className="grid grid-cols-2 gap-2 rounded-[1.35rem] border border-ops-border-soft/90 bg-ops-panel/40 p-1.5">
              <button
                type="button"
                onClick={() => {
                  setOfferView("live");
                  updateDriverHomeTab("home");
                }}
                className={`rounded-[1rem] px-3 py-2 text-sm font-semibold transition ${offerView === "live" ? "bg-ops-primary text-white" : "text-ops-muted hover:bg-ops-panel/80 hover:text-ops-text"}`}
              >
                Live
              </button>
              <button
                type="button"
                onClick={() => {
                  setOfferView("inbox");
                  updateDriverHomeTab("inbox");
                }}
                className={`rounded-[1rem] px-3 py-2 text-sm font-semibold transition ${offerView === "inbox" ? "bg-ops-primary text-white" : "text-ops-muted hover:bg-ops-panel/80 hover:text-ops-text"}`}
              >
                Inbox
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {offerView === "live" ? (
                <DriverLiveOfferCard
                  offer={liveOffer}
                  suspended={suspended}
                  countdown={liveOffer ? getOfferCountdown(liveOffer, now) : null}
                  acceptMutation={acceptMutation}
                  declineMutation={declineMutation}
                  mobile
                />
              ) : (
                <DriverOfferInbox
                  offers={offers}
                  suspended={suspended}
                  available={Boolean(profileQuery.data?.available)}
                  now={now}
                  acceptMutation={acceptMutation}
                  declineMutation={declineMutation}
                />
              )}

              <DriverActiveRideCard ride={activeRide} emphasize={requestedTab === "ride" || (!liveOffer && hasActiveTrip)} />
              <DriverEarningsMini projectedTotal={projectedLiveEarnings} jobsInFlow={jobsInFlow} />

              {offerView === "live" && liveOffer ? (
                <BottomActionBar className="xl:hidden">
                  <Button className="flex-1" disabled={suspended || acceptMutation.isPending} onClick={() => acceptMutation.mutate(liveOffer.id)}>
                    {acceptMutation.isPending ? "Accepting..." : "Accept"}
                  </Button>
                  <Button variant="outline" className="flex-1" disabled={declineMutation.isPending} onClick={() => declineMutation.mutate(liveOffer.id)}>
                    Decline
                  </Button>
                </BottomActionBar>
              ) : null}
            </div>
          </div>

          <div className="hidden space-y-4 xl:block">
            <div className="rounded-[1.7rem] border border-ops-border-soft/90 bg-[linear-gradient(180deg,rgba(12,16,23,0.98),rgba(8,11,16,0.96))] p-5 shadow-panel">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-ops-muted">Work rail</p>
                  <h2 className="mt-1 text-[1.6rem] font-extrabold tracking-[-0.04em] text-ops-text">Driver cockpit</h2>
                </div>
                <Badge className="border-ops-border-soft bg-ops-panel/82 text-ops-text">{statusLabel}</Badge>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 rounded-[1.35rem] border border-ops-border-soft/90 bg-ops-panel/40 p-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setOfferView("live");
                    updateDriverHomeTab("home");
                  }}
                  className={`rounded-[1rem] px-3 py-2 text-sm font-semibold transition ${offerView === "live" ? "bg-ops-primary text-white" : "text-ops-muted hover:bg-ops-panel/80 hover:text-ops-text"}`}
                >
                  Live
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOfferView("inbox");
                    updateDriverHomeTab("inbox");
                  }}
                  className={`rounded-[1rem] px-3 py-2 text-sm font-semibold transition ${offerView === "inbox" ? "bg-ops-primary text-white" : "text-ops-muted hover:bg-ops-panel/80 hover:text-ops-text"}`}
                >
                  Inbox
                </button>
              </div>
            </div>

            {offerView === "live" ? (
              <DriverLiveOfferCard
                offer={liveOffer}
                suspended={suspended}
                countdown={liveOffer ? getOfferCountdown(liveOffer, now) : null}
                acceptMutation={acceptMutation}
                declineMutation={declineMutation}
              />
            ) : (
              <DriverOfferInbox
                offers={offers}
                suspended={suspended}
                available={Boolean(profileQuery.data?.available)}
                now={now}
                acceptMutation={acceptMutation}
                declineMutation={declineMutation}
              />
            )}

            <DriverActiveRideCard ride={activeRide} emphasize={requestedTab === "ride" || (!liveOffer && hasActiveTrip)} />
            <DriverEarningsMini projectedTotal={projectedLiveEarnings} jobsInFlow={jobsInFlow} />
          </div>
        </div>
      </div>

      <div ref={toolsRef} id="driver-tools">
        <DriverToolsSection open={toolsOpen} onToggle={() => setToolsOpen((current) => !current)} outstandingTotal={duesQuery.data?.outstandingTotal ?? 0}>
          <div className="mb-1 flex flex-wrap items-center justify-between gap-3 rounded-[1.45rem] border border-ops-border-soft/90 bg-ops-panel/35 px-4 py-3 text-sm text-ops-muted">
            <div className="flex flex-wrap items-center gap-2 text-ops-text">
              <Route className="h-4 w-4 text-ops-primary" />
              {profileQuery.data?.homeCity && profileQuery.data?.homeState
                ? `${profileQuery.data.homeCity}, ${profileQuery.data.homeState}`
                : profileQuery.data?.vehicle?.makeModel ?? "Vehicle pending"}
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge className="border-ops-border-soft bg-ops-panel/75 text-ops-text">{profileQuery.data?.pricingMode === "custom" ? "custom rates" : "platform rates"}</Badge>
              {suspended ? <Badge className="border-ops-destructive/28 bg-ops-destructive/12 text-ops-destructive">dues overdue</Badge> : null}
              <Link
                to={requestFeatureUrl}
                className="inline-flex items-center text-xs font-semibold text-ops-primary transition hover:text-[#82a0ff]"
              >
                <AlertTriangle className="mr-1.5 h-3.5 w-3.5" />
                Request feature
              </Link>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Keep your contact info and vehicle basics current.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={profileForm.name} onChange={(event) => setProfileForm((current) => ({ ...current, name: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={profileForm.phone} onChange={(event) => setProfileForm((current) => ({ ...current, phone: event.target.value }))} />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Home state</Label>
                <Input
                  value={profileForm.homeState}
                  maxLength={2}
                  onChange={(event) => setProfileForm((current) => ({ ...current, homeState: event.target.value.toUpperCase() }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Home city</Label>
                <Input value={profileForm.homeCity} onChange={(event) => setProfileForm((current) => ({ ...current, homeCity: event.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Vehicle make and model</Label>
              <Input value={profileForm.makeModel} onChange={(event) => setProfileForm((current) => ({ ...current, makeModel: event.target.value }))} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Plate</Label>
                <Input value={profileForm.plate} onChange={(event) => setProfileForm((current) => ({ ...current, plate: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <Input value={profileForm.color} onChange={(event) => setProfileForm((current) => ({ ...current, color: event.target.value }))} />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Ride type</Label>
                <select
                  className="h-11 w-full rounded-2xl border border-ops-border bg-ops-surface px-4 text-sm"
                  value={profileForm.rideType}
                  onChange={(event) =>
                    setProfileForm((current) => ({
                      ...current,
                      rideType: event.target.value as RideType
                    }))
                  }
                >
                  <option value="standard">Standard</option>
                  <option value="suv">SUV</option>
                  <option value="xl">XL</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Seats</Label>
                <Input
                  type="number"
                  min={1}
                  max={12}
                  value={profileForm.seats}
                  onChange={(event) => setProfileForm((current) => ({ ...current, seats: event.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Accepted rider payments</Label>
              <div className="grid gap-2 sm:grid-cols-3">
                {paymentMethodOptions.map((method) => {
                  const active = acceptedPaymentMethods.includes(method);

                  return (
                    <button
                      key={method}
                      type="button"
                      onClick={() => {
                        if (active && acceptedPaymentMethods.length === 1) {
                          return;
                        }

                        setAcceptedPaymentMethods((current) =>
                          current.includes(method)
                            ? current.filter((entry) => entry !== method)
                            : [...current, method]
                        );
                      }}
                      className={`rounded-3xl border px-3 py-3 text-left transition ${
                        active
                          ? "border-ops-primary/45 bg-ops-primary text-white"
                          : "border-ops-border-soft bg-ops-surface text-ops-text hover:bg-ops-panel"
                      }`}
                    >
                      <p className="font-semibold">{formatPaymentMethod(method)}</p>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-ops-muted">Riders selecting a disabled method will be asked to choose one you accept.</p>
            </div>
            {profileMutation.error ? <p className="text-sm text-ops-error">{profileMutation.error.message}</p> : null}
            <Button onClick={() => profileMutation.mutate()}>Save profile</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dispatch settings</CardTitle>
            <CardDescription>Choose whether you want nearby rides, specific states, or nationwide visibility.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-center justify-between gap-4 rounded-4xl border border-ops-border-soft p-4">
              <div>
                <p className="font-semibold">Local dispatch</p>
                <p className="text-sm text-ops-muted">Receive rides inside your live-location radius.</p>
              </div>
              <input
                type="checkbox"
                checked={dispatchForm.localEnabled}
                onChange={(event) => setDispatchForm((current) => ({ ...current, localEnabled: event.target.checked }))}
              />
            </label>
            <div className="space-y-2">
              <Label>Local radius miles</Label>
              <Input
                type="number"
                min={1}
                max={500}
                value={dispatchForm.localRadiusMiles}
                onChange={(event) =>
                  setDispatchForm((current) => ({
                    ...current,
                    localRadiusMiles: Number(event.target.value) || 1
                  }))
                }
              />
            </div>
            <label className="flex items-center justify-between gap-4 rounded-4xl border border-ops-border-soft p-4">
              <div>
                <p className="font-semibold">Service-area dispatch</p>
                <p className="text-sm text-ops-muted">Receive rides where the pickup state matches your approved markets.</p>
              </div>
              <input
                type="checkbox"
                checked={dispatchForm.serviceAreaEnabled}
                onChange={(event) => setDispatchForm((current) => ({ ...current, serviceAreaEnabled: event.target.checked }))}
              />
            </label>
            <div className="space-y-2">
              <Label>Service area states</Label>
              <Input
                value={serviceAreaText}
                onChange={(event) => setServiceAreaText(event.target.value.toUpperCase())}
                placeholder="VA, NY, NJ"
              />
            </div>
            <label className="flex items-center justify-between gap-4 rounded-4xl border border-ops-border-soft p-4">
              <div>
                <p className="font-semibold">Nationwide dispatch</p>
                <p className="text-sm text-ops-muted">Receive eligible ride offers from anywhere in the US.</p>
              </div>
              <input
                type="checkbox"
                checked={dispatchForm.nationwideEnabled}
                onChange={(event) => setDispatchForm((current) => ({ ...current, nationwideEnabled: event.target.checked }))}
              />
            </label>
            {dispatchMutation.error ? <p className="text-sm text-ops-error">{dispatchMutation.error.message}</p> : null}
            <Button onClick={() => dispatchMutation.mutate()}>Save dispatch settings</Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pricing</CardTitle>
          <CardDescription>
            Stick with the platform market rate card or switch to your own custom rates. The rider still sees one
            all-in total.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-3 md:grid-cols-2">
            <button
              type="button"
              onClick={() => setRateMode("platform")}
              className={`rounded-4xl border p-4 text-left ${rateMode === "platform" ? "border-ops-primary/45 bg-ops-primary text-white" : "border-ops-border-soft bg-ops-surface"}`}
            >
              <p className="font-semibold">Use platform market rates</p>
              <p className={`mt-1 text-sm ${rateMode === "platform" ? "text-white/75" : "text-ops-muted"}`}>
                Riders keep the quoted all-in total when you accept.
              </p>
            </button>
            <button
              type="button"
              onClick={() => setRateMode("custom")}
              className={`rounded-4xl border p-4 text-left ${rateMode === "custom" ? "border-ops-primary/45 bg-ops-primary text-white" : "border-ops-border-soft bg-ops-surface"}`}
            >
              <p className="font-semibold">Use custom driver rates</p>
              <p className={`mt-1 text-sm ${rateMode === "custom" ? "text-white/75" : "text-ops-muted"}`}>
                The rider sees the platform estimate first, then your final accepted total takes over.
              </p>
            </button>
          </div>

          {(Object.keys(rateForm) as RideType[]).map((rideType) => (
            <div key={rideType} className="rounded-4xl border border-ops-border-soft p-4">
              <h3 className="mb-4 text-lg font-semibold capitalize">{rideType}</h3>
              <div className="grid gap-4 md:grid-cols-4">
                <div className="space-y-2">
                  <Label>Base fare</Label>
                  <Input
                    value={rateForm[rideType].baseFare}
                    onChange={(event) =>
                      setRateForm((current) => ({
                        ...current,
                        [rideType]: { ...current[rideType], baseFare: event.target.value }
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Per mile</Label>
                  <Input
                    value={rateForm[rideType].perMile}
                    onChange={(event) =>
                      setRateForm((current) => ({
                        ...current,
                        [rideType]: { ...current[rideType], perMile: event.target.value }
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Per minute</Label>
                  <Input
                    value={rateForm[rideType].perMinute}
                    onChange={(event) =>
                      setRateForm((current) => ({
                        ...current,
                        [rideType]: { ...current[rideType], perMinute: event.target.value }
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Multiplier</Label>
                  <Input
                    value={rateForm[rideType].multiplier}
                    onChange={(event) =>
                      setRateForm((current) => ({
                        ...current,
                        [rideType]: { ...current[rideType], multiplier: event.target.value }
                      }))
                    }
                  />
                </div>
              </div>
            </div>
          ))}
          {rateMutation.error ? <p className="text-sm text-ops-error">{rateMutation.error.message}</p> : null}
          <Button onClick={() => rateMutation.mutate()}>Save pricing</Button>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Platform dues</CardTitle>
            <CardDescription>
              Only completed trips create collectible dues. Pay against the live batch code and use that code in the payment title, note, or both when the app allows it.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-4xl border border-ops-border-soft p-4">
                <p className="text-sm text-ops-muted">Collectible total</p>
                <p className="mt-2 text-2xl font-extrabold">{formatMoney(duesQuery.data?.outstandingTotal ?? 0)}</p>
              </div>
              <div className="rounded-4xl border border-ops-border-soft p-4">
                <p className="text-sm text-ops-muted">Open batches</p>
                <p className="mt-2 text-2xl font-extrabold">{openBatches.length + overdueBatches.length}</p>
              </div>
              <div className="rounded-4xl border border-ops-border-soft p-4">
                <p className="text-sm text-ops-muted">Status</p>
                <p className="mt-2 text-2xl font-extrabold">{suspended ? "Suspended" : "Clear"}</p>
              </div>
            </div>

            <div className="rounded-4xl border border-ops-border-soft bg-ops-panel/55 p-4 text-sm text-ops-muted">
              <p className="font-semibold text-ops-text">Collector dues instructions</p>
              <p className="mt-2 text-sm leading-6 text-ops-muted">
                Trip payment method comes from the rider booking choice. These instructions are only for platform dues batches.
              </p>
              <div className="mt-3 grid gap-2">
                <p>Collector: {collector?.name ?? "Unassigned"}</p>
                <p>Cash App: {payoutSettings?.cashAppHandle || "Not set yet"}</p>
                <p>Zelle: {payoutSettings?.zelleHandle || "Not set yet"}</p>
                <p>Jim: {payoutSettings?.jimHandle || "Not set yet"}</p>
                <p>Cash: {payoutSettings?.cashInstructions || "Not set yet"}</p>
                <p>Other: {payoutSettings?.otherInstructions || "Not set yet"}</p>
              </div>
            </div>

            <div className="space-y-3">
              <p className="font-semibold">Current payable batches</p>
              {[...overdueBatches, ...openBatches].length ? (
                [...overdueBatches, ...openBatches].map((batch) => (
                  <div key={batch.id} className="rounded-4xl border border-ops-border-soft p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{batch.referenceCode}</p>
                          <Badge>{batch.status}</Badge>
                        </div>
                        <p className="text-sm text-ops-muted">{batch.dues.length} completed trips in this batch</p>
                        <p className="text-sm text-ops-muted/80">Due by {formatDateTime(batch.dueAt)}</p>
                      </div>
                      <div className="text-left md:text-right">
                        <p className="font-semibold">{formatMoney(batch.amount)}</p>
                        <p className="text-sm text-ops-muted">Use {batch.referenceCode} in title, note, or both</p>
                        <p className="text-sm text-ops-muted/80">
                          {batch.paymentMethod ? `Last recorded method ${batch.paymentMethod}` : "Waiting for reconciliation"}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-4xl border border-dashed border-ops-border p-6 text-sm text-ops-muted">
                  No open dues batches right now.
                </div>
              )}
            </div>

            <div className="space-y-3">
              <p className="font-semibold">Completed-trip dues ready to collect</p>
              {collectibleAccrued.length ? (
                collectibleAccrued.map((due) => (
                  <div key={due.id} className="flex items-center justify-between rounded-4xl border border-ops-border-soft p-4">
                    <div>
                      <p className="font-semibold">{due.ride.riderName}</p>
                      <p className="text-sm text-ops-muted">{due.ride.pickupAddress}</p>
                    </div>
                    <p className="font-semibold">{formatMoney(due.amount)}</p>
                  </div>
                ))
              ) : (
                <div className="rounded-4xl border border-dashed border-ops-border p-6 text-sm text-ops-muted">
                  No unbatched completed-trip dues right now.
                </div>
              )}
            </div>

            <div className="space-y-3">
              <p className="font-semibold">Recent due history</p>
              {dueHistory.length ? (
                dueHistory.slice(0, 5).map((batch) => (
                  <div key={batch.id} className="flex items-center justify-between rounded-4xl border border-ops-border-soft p-4">
                    <div>
                      <p className="font-semibold">{batch.referenceCode}</p>
                      <p className="text-sm text-ops-muted">{batch.status} · {formatDateTime(batch.updatedAt)}</p>
                    </div>
                    <p className="font-semibold">{formatMoney(batch.amount)}</p>
                  </div>
                ))
              ) : (
                <div className="rounded-4xl border border-dashed border-ops-border p-6 text-sm text-ops-muted">
                  Paid or waived dues will appear here.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Community board</CardTitle>
              <CardDescription>
                Drivers can create proposals, vote, and comment immediately. Riders unlock those actions after 51
                completed rides.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-4xl border border-ops-border-soft bg-ops-surface p-4">
                <p className="font-semibold">Your access</p>
                <p className="mt-2 text-sm text-ops-muted">
                  {community?.eligibility.reason ?? "You have full community access."}
                </p>
              </div>
              {community?.proposals.slice(0, 3).map((proposal) => (
                <div key={proposal.id} className="rounded-4xl border border-ops-border-soft p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{proposal.title}</p>
                    {proposal.pinned ? <Badge>pinned</Badge> : null}
                    {proposal.closed ? <Badge className="bg-ops-surface">closed</Badge> : null}
                  </div>
                  <p className="mt-2 text-sm text-ops-muted">{proposal.body}</p>
                  <p className="mt-3 text-xs uppercase tracking-[0.2em] text-ops-muted">
                    {proposal.yesVotes} yes · {proposal.noVotes} no · {proposal.commentCount} comments
                  </p>
                </div>
              ))}
              {!community?.proposals.length ? (
                <div className="rounded-4xl border border-dashed border-ops-border p-6 text-sm text-ops-muted">
                  No proposals yet. You can start the first one from the community board.
                </div>
              ) : null}
              <Link
                to="/community"
                className="inline-flex items-center justify-center rounded-2xl border border-ops-primary/40 bg-ops-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#3b8fff]"
              >
                Open community board
              </Link>
            </CardContent>
          </Card>

          {shareQuery.data ? (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Ad dues offset</CardTitle>
                  <CardDescription>
                    Opt in if you want paid ad scans tracked for manual dues offset. If scans do not happen, dues stay the same.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-4xl border border-ops-border-soft p-4">
                      <p className="text-sm text-ops-muted">Program</p>
                      <p className="mt-2 text-2xl font-extrabold">{adProgram?.enrollment.optedIn ? "On" : "Off"}</p>
                    </div>
                    <div className="rounded-4xl border border-ops-border-soft p-4">
                      <p className="text-sm text-ops-muted">Pending offset</p>
                      <p className="mt-2 text-2xl font-extrabold">{formatMoney(adProgram?.summary.pendingTotal ?? 0)}</p>
                    </div>
                    <div className="rounded-4xl border border-ops-border-soft p-4">
                      <p className="text-sm text-ops-muted">Tracked scans</p>
                      <p className="mt-2 text-2xl font-extrabold">{adProgram?.summary.scanCount ?? 0}</p>
                    </div>
                  </div>
                  <div className="rounded-4xl border border-ops-border-soft bg-ops-panel/55 p-4 text-sm text-ops-muted">
                    <p>
                      Available ads: <span className="font-semibold text-ops-text">{adProgram?.summary.activeAdCount ?? 0}</span>
                    </p>
                    <p className="mt-2">
                      Applied credits: <span className="font-semibold text-ops-text">{formatMoney(adProgram?.summary.appliedTotal ?? 0)}</span>
                    </p>
                    <p className="mt-2">
                      Public preview: <span className="font-semibold text-ops-text">/ads/display/{shareQuery.data.referralCode}</span>
                    </p>
                    <p className="mt-2">
                      Tablet mode login: <span className="font-semibold text-ops-text">/tablet/ads/login</span>
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button disabled={adProgramMutation.isPending} onClick={() => adProgramMutation.mutate(!adProgram?.enrollment.optedIn)}>
                      {adProgram?.enrollment.optedIn ? "Disable ad program" : "Enable ad program"}
                    </Button>
                    <Link
                      to="/tablet/ads"
                      className="inline-flex h-11 items-center justify-center rounded-2xl border border-ops-border bg-ops-panel px-4 text-sm font-semibold text-ops-text transition hover:border-ops-primary/35 hover:bg-ops-surface"
                    >
                      Open tablet mode
                    </Link>
                    <Link
                      to={`/ads/display/${shareQuery.data.referralCode}`}
                      className="inline-flex h-11 items-center justify-center rounded-2xl border border-ops-border bg-ops-panel px-4 text-sm font-semibold text-ops-text transition hover:border-ops-primary/35 hover:bg-ops-surface"
                    >
                      Open public preview
                    </Link>
                  </div>
                  {adProgramMutation.error ? <p className="text-sm text-ops-error">{adProgramMutation.error.message}</p> : null}
                </CardContent>
              </Card>

              <ShareQrCard
                title="Your driver referral QR"
                description="Share this rider-growth link from the driver side. It still points riders back to the booking flow."
                shareUrl={shareQuery.data.shareUrl}
                referralCode={shareQuery.data.referralCode}
                fileName={`realdrive-driver-${shareQuery.data.referralCode.toLowerCase()}`}
              />

              <HeadrestPrintTemplate
                title="Headrest rider flyer"
                shareUrl={shareQuery.data.shareUrl}
                fileName={`realdrive-headrest-${shareQuery.data.referralCode.toLowerCase()}`}
              />
            </div>
          ) : null}
        </div>
      </div>
        </DriverToolsSection>
      </div>
    </div>
  );
}
