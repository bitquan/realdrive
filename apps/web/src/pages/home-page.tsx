import { useDeferredValue, useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  Banknote,
  Car,
  CheckCircle2,
  Clock3,
  CreditCard,
  LayoutPanelTop,
  MapPin,
  Megaphone,
  Route,
  Shield,
  Sparkles,
  Users,
  Wallet
} from "lucide-react";
import type { PublicRideRequest } from "@shared/contracts";
import { PageHero } from "@/components/layout/page-hero";
import { RiderFeatureGrid } from "@/components/rider-home/rider-feature-grid";
import { ShareQrCard } from "@/components/share/share-qr-card";
import { AddressAutocompleteInput } from "@/components/ui/address-autocomplete-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { formatMoney, userHasRole } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";

const homeTabs = [
  {
    id: "book" as const,
    label: "Book",
    description: "Guest booking + quote"
  },
  {
    id: "rider" as const,
    label: "Rider",
    description: "Shell tools + profile"
  },
  {
    id: "more" as const,
    label: "More",
    description: "Access + growth"
  }
];

const SAVED_PLACES_STORAGE_KEY = "realdrive:rider-saved-places:v1";

const rideModeOptions = [
  {
    id: "now" as const,
    title: "Ride now",
    description: "Keep guest booking fast for immediate pickup.",
    icon: Car,
    badge: "Live now"
  },
  {
    id: "scheduled" as const,
    title: "Reserve",
    description: "Open the scheduled booking path without digging through the form.",
    icon: Clock3,
    badge: "Next"
  }
];

const savedPlaceSlots = [
  {
    id: "home" as const,
    title: "Home",
    description: "Quick return destination"
  },
  {
    id: "work" as const,
    title: "Work",
    description: "Commute shortcut"
  }
];

function defaultScheduledTime() {
  const next = new Date();
  next.setMinutes(0, 0, 0);
  next.setHours(next.getHours() + 1);
  const timezoneOffset = next.getTimezoneOffset();
  const local = new Date(next.getTime() - timezoneOffset * 60_000);
  return local.toISOString().slice(0, 16);
}

const paymentMethods = [
  { id: "jim", label: "Pay with Jim", icon: Wallet },
  { id: "cashapp", label: "Cash App", icon: CreditCard },
  { id: "cash", label: "Cash", icon: Banknote }
] as const;

function Stat({
  icon: Icon,
  label,
  value
}: {
  icon: typeof Car;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-3xl border border-ops-border-soft bg-gradient-to-b from-ops-surface to-[#101827] p-3.5 shadow-panel">
      <div className="flex items-center gap-2.5">
        <div className="rounded-xl bg-ops-panel p-2.5 text-ops-primary">
          <Icon className="h-4.5 w-4.5" />
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-ops-muted">{label}</p>
          <p className="text-base font-semibold">{value}</p>
        </div>
      </div>
    </div>
  );
}

export function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const advertiseUrl = typeof window === "undefined" ? "/advertise" : new URL("/advertise", window.location.origin).toString();
  const [searchParams] = useSearchParams();
  const referredByCode = searchParams.get("ref") ?? undefined;
  const [bookingForm, setBookingForm] = useState({
    riderName: "",
    phone: "",
    email: "",
    pickupAddress: "",
    dropoffAddress: "",
    rideType: "standard" as PublicRideRequest["rideType"],
    paymentMethod: "jim" as PublicRideRequest["paymentMethod"],
    scheduledFor: "",
    scheduleMode: "now" as "now" | "scheduled"
  });
  const [leadForm, setLeadForm] = useState({
    name: "",
    email: "",
    phone: ""
  });
  const [homeTab, setHomeTab] = useState<(typeof homeTabs)[number]["id"]>("book");
  const [savedPlaces, setSavedPlaces] = useState<Record<"home" | "work", string>>({ home: "", work: "" });
  const [savedPlacesReady, setSavedPlacesReady] = useState(false);

  useEffect(() => {
    if (!user) {
      return;
    }

    setBookingForm((current) => ({
      ...current,
      riderName: current.riderName || user.name,
      phone: current.phone || user.phone || "",
      email: current.email || user.email || ""
    }));
  }, [user]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const raw = window.localStorage.getItem(SAVED_PLACES_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Record<"home" | "work", string>>;
        setSavedPlaces({
          home: typeof parsed.home === "string" ? parsed.home : "",
          work: typeof parsed.work === "string" ? parsed.work : ""
        });
      }
    } catch {
      // ignore invalid local data
    }

    setSavedPlacesReady(true);
  }, []);

  useEffect(() => {
    if (!savedPlacesReady || typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(SAVED_PLACES_STORAGE_KEY, JSON.stringify(savedPlaces));
  }, [savedPlaces, savedPlacesReady]);

  const deferredQuoteInput = useDeferredValue({
    pickupAddress: bookingForm.pickupAddress,
    dropoffAddress: bookingForm.dropoffAddress,
    rideType: bookingForm.rideType
  });

  const publicDriversQuery = useQuery({
    queryKey: ["public-drivers"],
    queryFn: api.publicDrivers
  });

  const referredByQuery = useQuery({
    queryKey: ["referral-resolve", referredByCode],
    queryFn: () => api.resolveShare(referredByCode!),
    enabled: Boolean(referredByCode)
  });

  const quoteQuery = useQuery({
    queryKey: ["public-ride-quote", deferredQuoteInput],
    queryFn: () =>
      api.quoteRide({
        pickupAddress: deferredQuoteInput.pickupAddress,
        dropoffAddress: deferredQuoteInput.dropoffAddress,
        rideType: deferredQuoteInput.rideType
      }),
    enabled: deferredQuoteInput.pickupAddress.length > 3 && deferredQuoteInput.dropoffAddress.length > 3
  });

  const bookingMutation = useMutation({
    mutationFn: api.createPublicRide,
    onSuccess: (result) => {
      if (result.ride.publicTrackingToken) {
        void navigate(`/track/${result.ride.publicTrackingToken}`);
      }
    }
  });

  const riderLeadMutation = useMutation({
    mutationFn: api.createRiderLead
  });

  const availableDriver = publicDriversQuery.data?.find((entry) => entry.available) ?? publicDriversQuery.data?.[0];
  const canBook =
    Boolean(bookingForm.riderName) &&
    Boolean(bookingForm.phone) &&
    Boolean(bookingForm.pickupAddress) &&
    Boolean(bookingForm.dropoffAddress) &&
    !bookingMutation.isPending;
  const riderEntryLabel = userHasRole(user, "rider") ? "My rides" : "Rider sign in";
  const riderEntryTo = userHasRole(user, "rider") ? "/rider/rides" : "/rider/login";
  const riderFeatureContext = userHasRole(user, "rider") ? "rider" : "public";

  function setRideMode(mode: "now" | "scheduled") {
    setBookingForm((current) => ({
      ...current,
      scheduleMode: mode,
      scheduledFor: mode === "scheduled" && !current.scheduledFor ? defaultScheduledTime() : current.scheduledFor
    }));
  }

  function saveCurrentDestination(slot: "home" | "work") {
    const destination = bookingForm.dropoffAddress.trim();
    if (!destination) {
      return;
    }

    setSavedPlaces((current) => ({
      ...current,
      [slot]: destination
    }));
  }

  function useSavedDestination(slot: "home" | "work") {
    const destination = savedPlaces[slot].trim();
    if (!destination) {
      return;
    }

    setBookingForm((current) => ({
      ...current,
      dropoffAddress: destination
    }));
  }

  return (
    <div className="space-y-2.5 md:space-y-5">
      <PageHero
        eyebrow="Community-powered rideshare pilot"
        icon={Shield}
        title="Book your ride in under a minute and track everything from one live link."
        description="RealDrive keeps the rider flow simple and guest-first: instant quote, no-login booking, live trip tracking, and personal share links for referral growth."
        aside={(
          <div className="hidden rounded-3xl border border-ops-border-soft bg-gradient-to-b from-ops-panel/85 to-[#121c2d] p-3.5 text-sm text-ops-muted shadow-panel md:block md:p-5">
            <p className="text-[10px] uppercase tracking-[0.2em] text-ops-muted/80">Rider operations snapshot</p>
            <p className="mt-2 font-semibold text-ops-text">What riders get now</p>
            <div className="mt-2.5 space-y-1.5 text-ops-muted">
              <p>Guest booking and live trip tracking.</p>
              <p>Upfront quote before booking confirmation.</p>
              <p>Personal rider share link after booking.</p>
            </div>
            {availableDriver ? (
              <div className="mt-3 rounded-2xl border border-ops-border bg-ops-surface/90 p-3">
                <p className="text-[10px] uppercase tracking-[0.2em] text-ops-muted">Next available driver</p>
                <p className="mt-1.5 font-semibold">{availableDriver.name}</p>
                <p className="text-sm text-ops-muted">{availableDriver.vehicle?.makeModel ?? "Vehicle ready"}</p>
              </div>
            ) : null}
          </div>
        )}
        className="p-4 md:p-7"
      />

      <div className="grid grid-cols-2 gap-2 md:hidden">
        <Stat icon={Car} label="Drivers" value={availableDriver ? "Online" : "Ready"} />
        <Stat icon={Clock3} label="ETA" value={quoteQuery.data ? `${Math.max(5, Math.round(quoteQuery.data.estimatedMinutes / 2))} min` : "Quote"} />
      </div>

      <div className="rounded-3xl border border-ops-border-soft bg-gradient-to-b from-ops-surface to-[#0d1421] p-2 shadow-panel">
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-row sm:flex-wrap">
          <a
            href="#book"
            className="inline-flex w-full items-center justify-center rounded-xl border border-ops-primary/40 bg-ops-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#3b8fff] sm:w-auto"
          >
            Start booking
          </a>
          <Link
            to={riderEntryTo}
            className="inline-flex w-full items-center justify-center rounded-xl border border-ops-border bg-ops-panel px-4 py-2 text-sm font-semibold text-ops-muted transition hover:bg-ops-surface hover:text-ops-text sm:w-auto"
          >
            {riderEntryLabel}
          </Link>
          <div className="col-span-2 grid grid-cols-2 gap-2 sm:flex sm:flex-row sm:gap-2">
            <Link
              to="/tablet/ads/login"
              className="hidden w-full items-center justify-center rounded-xl border border-ops-border bg-ops-panel px-4 py-2 text-sm font-semibold text-ops-muted transition hover:bg-ops-surface hover:text-ops-text md:inline-flex sm:w-auto"
            >
              <LayoutPanelTop className="mr-2 h-4 w-4" />
              Tablet ad login
            </Link>
            <Link
              to="/advertise"
              className="hidden w-full items-center justify-center rounded-xl border border-ops-border bg-ops-panel px-4 py-2 text-sm font-semibold text-ops-muted transition hover:bg-ops-surface hover:text-ops-text md:inline-flex sm:w-auto"
            >
              <Megaphone className="mr-2 h-4 w-4" />
              Post an ad
            </Link>
            <Link
              to="/driver/signup"
              className="inline-flex w-full items-center justify-center rounded-xl border border-ops-border bg-ops-panel px-4 py-2 text-sm font-semibold text-ops-muted transition hover:bg-ops-surface hover:text-ops-text sm:w-auto"
            >
              Driver signup
            </Link>
            <Link
              to={riderEntryTo}
              className="hidden w-full items-center justify-center rounded-xl border border-ops-border bg-ops-panel px-4 py-2 text-sm font-semibold text-ops-muted transition hover:bg-ops-surface hover:text-ops-text md:inline-flex sm:w-auto"
            >
              {riderEntryLabel}
            </Link>
          </div>
        </div>
      </div>

      <div className="space-y-3 md:space-y-4">
        <div className="rounded-[1.5rem] border border-ops-border-soft bg-[linear-gradient(180deg,rgba(14,18,27,0.96),rgba(9,13,20,0.98))] p-2 shadow-panel">
          <div className="grid grid-cols-3 gap-2">
            {homeTabs.map((tab) => {
              const active = homeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setHomeTab(tab.id)}
                  className={`rounded-[1.1rem] border px-3 py-3 text-left transition ${
                    active
                      ? "border-ops-primary/40 bg-ops-primary/14 text-white"
                      : "border-white/8 bg-white/[0.03] text-slate-300 hover:bg-white/[0.06]"
                  }`}
                >
                  <p className="text-sm font-semibold">{tab.label}</p>
                  <p className={`mt-1 text-[11px] leading-4 ${active ? "text-white/80" : "text-slate-500"}`}>{tab.description}</p>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {homeTab === "book" ? (
      <div className="space-y-3.5">
        {referredByQuery.data?.ownerName ? (
          <div className="rounded-4xl border border-ops-primary/20 bg-ops-panel/70 p-4 text-sm text-ops-muted">
            You were referred by <span className="font-semibold">{referredByQuery.data.ownerName}</span>. Your booking
            or email signup will keep that referral attached.
          </div>
        ) : null}

        <div className="hidden grid-cols-2 gap-2 sm:grid sm:grid-cols-3 md:gap-3">
          <Stat icon={Car} label="Driver network" value={availableDriver ? "Drivers online" : "On demand"} />
          <Stat
            icon={Clock3}
            label="ETA preview"
            value={quoteQuery.data ? `${Math.max(5, Math.round(quoteQuery.data.estimatedMinutes / 2))} min` : "From quote"}
          />
          <Stat icon={MapPin} label="Route engine" value={quoteQuery.data?.routeProvider === "mapbox" ? "Mapbox live" : "Fallback ready"} />
        </div>

      <div className="grid gap-3.5 lg:grid-cols-[1.3fr_0.7fr]">
        <Card id="book" className="shadow-elevated">
          <CardHeader>
            <CardTitle className="text-2xl md:text-[2rem]">Book your ride</CardTitle>
            <CardDescription>
              Fast guest checkout for the pilot. No rider login required. You get a tracking link right away and your rider share link after booking.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3.5 md:space-y-5">
            <div className="rounded-3xl border border-ops-primary/24 bg-ops-primary/10 p-4 text-sm text-ops-muted">
              <p className="font-semibold text-ops-text">Guest booking stays primary</p>
              <p className="mt-2">Enter rider contact, pickup, and dropoff. Dispatch and live status updates still work without creating an account.</p>
              {!userHasRole(user, "rider") ? (
                <Link to="/rider/login" className="mt-3 inline-flex font-semibold text-ops-primary hover:underline">
                  Returning rider? Sign in to open your trip history.
                </Link>
              ) : null}
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {rideModeOptions.map(({ id, title, description, icon: Icon, badge }) => {
                const active = bookingForm.scheduleMode === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setRideMode(id)}
                    className={`rounded-[1.6rem] border p-4 text-left transition ${
                      active
                        ? "border-ops-primary/45 bg-ops-primary/12 shadow-soft"
                        : "border-ops-border-soft bg-ops-panel/45 hover:bg-ops-panel/65"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className={`rounded-2xl p-2.5 ${active ? "bg-ops-primary text-white" : "bg-ops-surface text-ops-primary"}`}>
                        <Icon className="h-4.5 w-4.5" />
                      </div>
                      <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${active ? "border-ops-primary/35 bg-ops-primary/12 text-ops-primary" : "border-ops-border-soft text-ops-muted"}`}>
                        {badge}
                      </span>
                    </div>
                    <p className="mt-3 font-semibold text-ops-text">{title}</p>
                    <p className="mt-1 text-sm leading-6 text-ops-muted">{description}</p>
                  </button>
                );
              })}
            </div>

            <div className="rounded-[1.6rem] border border-ops-border-soft bg-ops-panel/45 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ops-muted">Saved places preview</p>
                  <p className="mt-1 font-semibold text-ops-text">Quick-fill your most common destinations</p>
                  <p className="mt-1 text-sm leading-6 text-ops-muted">Save the current dropoff as Home or Work, then reuse it in one tap from this booking shell.</p>
                </div>
                <span className="rounded-full border border-ops-border-soft px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-ops-muted">Pilot</span>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {savedPlaceSlots.map((slot) => {
                  const savedValue = savedPlaces[slot.id];
                  return (
                    <div key={slot.id} className="rounded-[1.35rem] border border-ops-border-soft bg-ops-surface/65 p-3.5">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-ops-text">{slot.title}</p>
                          <p className="text-[11px] text-ops-muted">{slot.description}</p>
                        </div>
                        <MapPin className="h-4 w-4 text-ops-primary" />
                      </div>
                      <p className="mt-3 min-h-[2.75rem] text-sm leading-5 text-ops-muted">{savedValue || "No saved destination yet. Enter a dropoff, then save it here."}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button type="button" variant="outline" disabled={!savedValue} onClick={() => useSavedDestination(slot.id)}>
                          Use destination
                        </Button>
                        <Button type="button" variant="ghost" disabled={!bookingForm.dropoffAddress.trim()} onClick={() => saveCurrentDestination(slot.id)}>
                          {savedValue ? "Replace with current dropoff" : "Save current dropoff"}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3 md:gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="riderName">Full name</Label>
                <Input
                  id="riderName"
                  placeholder="Jordan Smith"
                  value={bookingForm.riderName}
                  onChange={(event) => setBookingForm((current) => ({ ...current, riderName: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="riderPhone">Phone number</Label>
                <Input
                  id="riderPhone"
                  placeholder="(555) 555-5555"
                  value={bookingForm.phone}
                  onChange={(event) => setBookingForm((current) => ({ ...current, phone: event.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="riderEmail">Email for updates and your share link</Label>
              <Input
                id="riderEmail"
                type="email"
                placeholder="optional@example.com"
                value={bookingForm.email}
                onChange={(event) => setBookingForm((current) => ({ ...current, email: event.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pickupAddress">Pickup address</Label>
              <AddressAutocompleteInput
                id="pickupAddress"
                placeholder="123 Main St"
                value={bookingForm.pickupAddress}
                onValueChange={(value) => setBookingForm((current) => ({ ...current, pickupAddress: value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dropoffAddress">Dropoff address</Label>
              <AddressAutocompleteInput
                id="dropoffAddress"
                placeholder="Airport, downtown, hotel, work..."
                value={bookingForm.dropoffAddress}
                onValueChange={(value) => setBookingForm((current) => ({ ...current, dropoffAddress: value }))}
              />
            </div>

            <div className="grid gap-3 md:grid-cols-4 md:gap-4">
              <div className="space-y-2">
                <Label htmlFor="rideType">Ride type</Label>
                <select
                  id="rideType"
                  className="h-10 w-full rounded-xl border border-ops-border bg-gradient-to-b from-ops-panel to-[#111a2a] px-3.5 text-base text-ops-text md:text-sm"
                  value={bookingForm.rideType}
                  onChange={(event) =>
                    setBookingForm((current) => ({
                      ...current,
                      rideType: event.target.value as PublicRideRequest["rideType"]
                    }))
                  }
                >
                  <option value="standard">Standard</option>
                  <option value="suv">SUV</option>
                  <option value="xl">XL / Group</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="scheduleMode">Timing</Label>
                <select
                  id="scheduleMode"
                  className="h-10 w-full rounded-xl border border-ops-border bg-gradient-to-b from-ops-panel to-[#111a2a] px-3.5 text-base text-ops-text md:text-sm"
                  value={bookingForm.scheduleMode}
                  onChange={(event) =>
                    setBookingForm((current) => ({
                      ...current,
                      scheduleMode: event.target.value as "now" | "scheduled"
                    }))
                  }
                >
                  <option value="now">Ride now</option>
                  <option value="scheduled">Schedule later</option>
                </select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="scheduledFor">Scheduled pickup</Label>
                <Input
                  id="scheduledFor"
                  type="datetime-local"
                  disabled={bookingForm.scheduleMode === "now"}
                  value={bookingForm.scheduledFor}
                  onChange={(event) => setBookingForm((current) => ({ ...current, scheduledFor: event.target.value }))}
                />
              </div>
            </div>

            <div className="grid gap-2 md:grid-cols-3 md:gap-2.5">
              {paymentMethods.map(({ id, label, icon: Icon }) => {
                const active = bookingForm.paymentMethod === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() =>
                      setBookingForm((current) => ({
                        ...current,
                        paymentMethod: id
                      }))
                    }
                    className={`rounded-3xl border p-3 text-left transition md:p-3.5 ${
                      active ? "border-ops-primary/50 bg-ops-primary text-white" : "border-ops-border-soft bg-ops-panel/50 text-ops-text hover:bg-ops-panel"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`rounded-xl p-2.5 md:rounded-2xl md:p-3 ${active ? "bg-ops-surface/10" : "bg-ops-surface"}`}>
                        <Icon className="h-4.5 w-4.5 md:h-5 md:w-5" />
                      </div>
                      <div>
                        <p className="font-semibold">{label}</p>
                        <p className={`text-xs ${active ? "text-white/75" : "text-ops-muted"}`}>Collected outside the app</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="rounded-3xl border border-ops-border-soft bg-gradient-to-b from-ops-panel/85 to-[#111a2a] p-4">
              <div className="flex flex-col gap-2.5 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-ops-muted">Estimated all-in fare</p>
                  <p className="text-3xl font-extrabold">{formatMoney(quoteQuery.data?.estimatedCustomerTotal ?? 0)}</p>
                </div>
                <div className="text-sm text-ops-muted">
                  {quoteQuery.data ? (
                    <p>
                      {quoteQuery.data.estimatedMiles} miles · {quoteQuery.data.estimatedMinutes} minutes · {quoteQuery.data.routeProvider}
                    </p>
                  ) : (
                    <p>Enter pickup and dropoff to price the trip with real routing.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="grid gap-2 border-t border-ops-border-soft pt-3 sm:grid-cols-[1fr_auto] sm:items-center sm:gap-3">
              <Button
                className="h-11 w-full"
                disabled={!canBook}
                onClick={() =>
                  bookingMutation.mutate({
                    riderName: bookingForm.riderName,
                    phone: bookingForm.phone,
                    email: bookingForm.email || undefined,
                    pickupAddress: bookingForm.pickupAddress,
                    dropoffAddress: bookingForm.dropoffAddress,
                    rideType: bookingForm.rideType,
                    paymentMethod: bookingForm.paymentMethod,
                    scheduledFor: bookingForm.scheduleMode === "scheduled" && bookingForm.scheduledFor
                      ? new Date(bookingForm.scheduledFor).toISOString()
                      : null,
                    referredByCode
                  })
                }
              >
                <Route className="mr-2 h-4 w-4" />
                Book as guest
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-11"
                onClick={() =>
                  setBookingForm({
                    riderName: user?.name ?? "",
                    phone: user?.phone ?? "",
                    email: user?.email ?? "",
                    pickupAddress: "",
                    dropoffAddress: "",
                    rideType: "standard",
                    paymentMethod: "jim",
                    scheduledFor: "",
                    scheduleMode: "now"
                  })
                }
              >
                Reset
              </Button>
            </div>

            {bookingMutation.error ? (
              <p className="text-sm text-ops-error">{bookingMutation.error.message}</p>
            ) : null}
          </CardContent>
        </Card>

        <div className="space-y-3 md:space-y-4">
          <Card className="border-ops-border shadow-panel">
            <CardHeader>
              <CardTitle className="text-lg">Trip estimate</CardTitle>
              <CardDescription>Use pickup and dropoff to preview your all-in total before confirming.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-ops-muted">
              <div className="rounded-3xl border border-ops-border bg-gradient-to-b from-ops-panel/80 to-[#101827] p-4">
                <p className="text-[10px] uppercase tracking-[0.2em] text-ops-muted/80">All-in fare</p>
                <p className="mt-2 text-2xl font-extrabold text-ops-text">
                  {formatMoney(quoteQuery.data?.estimatedCustomerTotal ?? 0)}
                </p>
                {quoteQuery.data ? (
                  <p className="mt-2">
                    {quoteQuery.data.estimatedMiles} miles · {quoteQuery.data.estimatedMinutes} minutes · {quoteQuery.data.routeProvider}
                  </p>
                ) : (
                  <p className="mt-2">Enter both addresses to load a live quote.</p>
                )}
              </div>
              <div className="rounded-3xl border border-ops-border-soft p-3.5">
                <p className="text-[10px] uppercase tracking-[0.2em] text-ops-muted">Payment model</p>
                <p className="mt-1 text-ops-muted">Cash App, Jim, or cash are collected outside the app.</p>
              </div>
              <div className="rounded-3xl border border-ops-border-soft p-3.5">
                <p className="text-[10px] uppercase tracking-[0.2em] text-ops-muted">Live status trust</p>
                <p className="mt-1 text-ops-muted">After booking, your public tracking link stays synced with dispatch and driver trip state.</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-ops-border-soft/70 bg-gradient-to-b from-[#0f1726] to-[#0d1420]">
            <CardHeader>
              <CardTitle className="text-lg">Save your rider profile</CardTitle>
              <CardDescription>Not ready yet? Save your info and still get your personal rider share link.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {riderLeadMutation.isSuccess ? (
                <div className="rounded-3xl border border-ops-success/25 bg-ops-success/10 p-4 text-sm text-ops-success">
                  <div className="flex items-center gap-2 font-semibold">
                    <CheckCircle2 className="h-4 w-4" />
                    You are on the rider list
                  </div>
                  <p className="mt-2 text-ops-success/85">You can start sharing your link right away.</p>
                </div>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor="leadName">Name</Label>
                <Input
                  id="leadName"
                  placeholder="Jordan Smith"
                  value={leadForm.name}
                  onChange={(event) => setLeadForm((current) => ({ ...current, name: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="leadEmail">Email</Label>
                <Input
                  id="leadEmail"
                  type="email"
                  placeholder="jordan@example.com"
                  value={leadForm.email}
                  onChange={(event) => setLeadForm((current) => ({ ...current, email: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="leadPhone">Phone</Label>
                <Input
                  id="leadPhone"
                  placeholder="Optional"
                  value={leadForm.phone}
                  onChange={(event) => setLeadForm((current) => ({ ...current, phone: event.target.value }))}
                />
              </div>
              <Button
                className="w-full"
                disabled={!leadForm.name || !leadForm.email || riderLeadMutation.isPending}
                onClick={() =>
                  riderLeadMutation.mutate({
                    ...leadForm,
                    phone: leadForm.phone || undefined,
                    referredByCode
                  })
                }
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Save rider profile
              </Button>
              {riderLeadMutation.error ? (
                <p className="text-sm text-ops-error">{riderLeadMutation.error.message}</p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Driver and admin access</CardTitle>
              <CardDescription>Use these for operations while the rider funnel stays public, booking-first, and separate from the in-car tablet display.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-ops-muted">
              <p>Driver signup is live and requires admin approval before ride offers are unlocked.</p>
              <p>Admin controls dispatch approvals, pricing, dues, payout instructions, and ad review.</p>
              <p>Rider referrals are tracked through booking and lead capture links.</p>
              <p>Anyone can submit an ad request, including riders who want to promote a business or offer.</p>
              <p className="pt-2">
                <Link to="/driver/login" className="font-semibold text-ops-primary hover:underline">
                  Approved driver login
                </Link>
                {" · "}
                <Link to="/tablet/ads/login" className="font-semibold text-ops-primary hover:underline">
                  Tablet ad login
                </Link>
                {" · "}
                <Link to="/admin/login" className="font-semibold text-ops-primary hover:underline">
                  Admin login
                </Link>
                {" · "}
                <Link to="/advertise" className="font-semibold text-ops-primary hover:underline">
                  Post an ad
                </Link>
              </p>
            </CardContent>
          </Card>

        </div>
      </div>
      </div>
      ) : null}

      {homeTab === "rider" ? (
      <div className="grid gap-3.5 lg:grid-cols-[1.02fr_0.98fr]">
        <div className="space-y-3 md:space-y-4">
          <div className="rounded-[1.7rem] border border-[#2f9a5d]/28 bg-[linear-gradient(135deg,rgba(25,145,84,0.95),rgba(18,112,72,0.92))] p-4 text-white shadow-[0_20px_50px_rgba(15,118,78,0.28)]">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/72">Rider design phase</p>
                <p className="mt-1 text-[1.15rem] font-semibold tracking-[-0.03em]">Track every ride from one compact shell</p>
                <p className="mt-1.5 text-sm leading-5 text-white/80">
                  Real booking, trip history, alerts, and community tools stay live while future rider features are staged as roadmap-linked cards.
                </p>
              </div>
              <Link
                to={riderEntryTo}
                className="inline-flex shrink-0 items-center gap-1 rounded-full border border-white/18 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/16"
              >
                Open rider shell
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          <RiderFeatureGrid
            context={riderFeatureContext}
            contextPath="/"
            canRequest={Boolean(user)}
            title="Rider mobile grid"
            description="Live rider tools open real routes now, while future tools stay clearly marked and routed into feature intake."
          />

          <Card className="border-ops-border-soft/70 bg-gradient-to-b from-[#0f1726] to-[#0d1420]">
            <CardHeader>
              <CardTitle className="text-lg">Save your rider profile</CardTitle>
              <CardDescription>Keep rider info and your share path together without mixing it into the booking tab.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {riderLeadMutation.isSuccess ? (
                <div className="rounded-3xl border border-ops-success/25 bg-ops-success/10 p-4 text-sm text-ops-success">
                  <div className="flex items-center gap-2 font-semibold">
                    <CheckCircle2 className="h-4 w-4" />
                    You are on the rider list
                  </div>
                  <p className="mt-2 text-ops-success/85">You can start sharing your link right away.</p>
                </div>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor="leadName">Name</Label>
                <Input
                  id="leadName"
                  placeholder="Jordan Smith"
                  value={leadForm.name}
                  onChange={(event) => setLeadForm((current) => ({ ...current, name: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="leadEmail">Email</Label>
                <Input
                  id="leadEmail"
                  type="email"
                  placeholder="jordan@example.com"
                  value={leadForm.email}
                  onChange={(event) => setLeadForm((current) => ({ ...current, email: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="leadPhone">Phone</Label>
                <Input
                  id="leadPhone"
                  placeholder="Optional"
                  value={leadForm.phone}
                  onChange={(event) => setLeadForm((current) => ({ ...current, phone: event.target.value }))}
                />
              </div>
              <Button
                className="w-full"
                disabled={!leadForm.name || !leadForm.email || riderLeadMutation.isPending}
                onClick={() =>
                  riderLeadMutation.mutate({
                    ...leadForm,
                    phone: leadForm.phone || undefined,
                    referredByCode
                  })
                }
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Save rider profile
              </Button>
              {riderLeadMutation.error ? (
                <p className="text-sm text-ops-error">{riderLeadMutation.error.message}</p>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-3 md:space-y-4">
          <Card className="border-ops-border shadow-panel">
            <CardHeader>
              <CardTitle className="text-lg">Rider shell summary</CardTitle>
              <CardDescription>Keep the returning-rider value visible without stacking the whole public page at once.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-ops-muted">
              <div className="rounded-3xl border border-ops-border bg-gradient-to-b from-ops-panel/80 to-[#101827] p-4">
                <p className="text-[10px] uppercase tracking-[0.2em] text-ops-muted/80">Rider focus</p>
                <p className="mt-2 font-semibold text-ops-text">Trips, alerts, saved places, and phased roadmap tiles now live in one tab instead of mixing with every public block.</p>
              </div>
              <div className="rounded-3xl border border-ops-border-soft p-3.5">
                <p className="text-[10px] uppercase tracking-[0.2em] text-ops-muted">Reserve direction</p>
                <p className="mt-1 text-ops-muted">The booking tab still powers real scheduling, but the rider tab keeps future shell modules separate.</p>
              </div>
              <div className="rounded-3xl border border-ops-border-soft p-3.5">
                <p className="text-[10px] uppercase tracking-[0.2em] text-ops-muted">Returning rider access</p>
                <p className="mt-1 text-ops-muted">Use this tab to move riders toward sign-in and profile setup without burying the main booking form.</p>
              </div>
            </CardContent>
          </Card>

          {riderLeadMutation.data?.share ? (
            <ShareQrCard
              title="Your rider referral QR"
              description="Share this from your phone or save the QR for tomorrow’s test."
              shareUrl={riderLeadMutation.data.share.shareUrl}
              referralCode={riderLeadMutation.data.share.referralCode}
              fileName={`realdrive-rider-${riderLeadMutation.data.share.referralCode.toLowerCase()}`}
            />
          ) : null}
        </div>
      </div>
      ) : null}

      {homeTab === "more" ? (
      <div className="grid gap-3.5 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-3 md:space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Driver and admin access</CardTitle>
              <CardDescription>Keep operations links separate from rider booking and rider-shell setup.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-ops-muted">
              <p>Driver signup is live and requires admin approval before ride offers are unlocked.</p>
              <p>Admin controls dispatch approvals, pricing, dues, payout instructions, and ad review.</p>
              <p>Rider referrals are tracked through booking and lead capture links.</p>
              <p>Anyone can submit an ad request, including riders who want to promote a business or offer.</p>
              <p className="pt-2">
                <Link to="/driver/login" className="font-semibold text-ops-primary hover:underline">
                  Approved driver login
                </Link>
                {" · "}
                <Link to="/tablet/ads/login" className="font-semibold text-ops-primary hover:underline">
                  Tablet ad login
                </Link>
                {" · "}
                <Link to="/admin/login" className="font-semibold text-ops-primary hover:underline">
                  Admin login
                </Link>
                {" · "}
                <Link to="/advertise" className="font-semibold text-ops-primary hover:underline">
                  Post an ad
                </Link>
              </p>
            </CardContent>
          </Card>

          <ShareQrCard
            title="Advertise on this screen"
            description="Scan this QR code to open the ad form. Riders, drivers, and local businesses can all submit a screen ad request."
            shareUrl={advertiseUrl}
            fileName="realdrive-advertise-here"
          />
        </div>

        <div className="space-y-3 md:space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>How the growth loop works</CardTitle>
              <CardDescription>Keep the booking flow simple, then let riders and drivers share back into it.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-4xl border border-ops-border-soft p-4">
                <p className="font-semibold">Rider path</p>
                <p className="mt-1 text-sm text-ops-muted">Guest booking, tracking page, and personal rider QR.</p>
              </div>
              <div className="rounded-4xl border border-ops-border-soft p-4">
                <p className="font-semibold">Driver path</p>
                <p className="mt-1 text-sm text-ops-muted">Real signup plus admin approval before anyone can accept rides.</p>
              </div>
              <div className="rounded-4xl border border-ops-border-soft p-4">
                <p className="font-semibold">Referral path</p>
                <p className="mt-1 text-sm text-ops-muted">Both riders and drivers can share links that point back to this rider flow.</p>
              </div>
              <Link
                to="/driver/signup"
                className="inline-flex w-full items-center justify-center rounded-2xl border border-ops-border bg-ops-surface px-4 py-2 text-sm font-semibold text-ops-text transition hover:bg-ops-panel/70"
              >
                <Users className="mr-2 h-4 w-4" />
                Open driver signup page
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
      ) : null}
    </div>
  );
}
