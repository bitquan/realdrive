import { type ReactNode, useDeferredValue, useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  Banknote,
  Car,
  Circle,
  Clock3,
  CreditCard,
  MapPin,
  Mail,
  Navigation,
  Phone,
  Route,
  Sparkles,
  UserRound,
  Wallet
} from "lucide-react";
import type { PublicRideRequest } from "@shared/contracts";
import { PublicStateNav } from "@/components/rider-home/public-state-nav";
import { AddressAutocompleteInput } from "@/components/ui/address-autocomplete-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { cn, formatMoney, userHasRole } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";

const SAVED_PLACES_STORAGE_KEY = "realdrive:rider-saved-places:v1";

const rideModeOptions = [
  {
    id: "now" as const,
    title: "Ride now",
    description: "Immediate pickup with live quote updates.",
    icon: Car,
    badge: "Now"
  },
  {
    id: "scheduled" as const,
    title: "Reserve",
    description: "Lock in a later pickup without leaving the booking screen.",
    icon: Clock3,
    badge: "Later"
  }
];

const paymentMethods = [
  { id: "jim", label: "Jim", icon: Wallet },
  { id: "cashapp", label: "Cash App", icon: CreditCard },
  { id: "cash", label: "Cash", icon: Banknote }
] as const;

const savedPlaceSlots = [
  {
    id: "home" as const,
    title: "Home",
    description: "Quick return"
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

function BookingStep({
  step,
  title,
  description,
  meta,
  state = "idle",
  allowOverflow = false,
  children
}: {
  step: string;
  title: string;
  description: string;
  meta?: string;
  state?: "idle" | "active" | "complete";
  allowOverflow?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      className={cn(
        allowOverflow ? "overflow-visible" : "overflow-hidden",
        "rounded-[1.45rem] border bg-[linear-gradient(180deg,rgba(22,28,39,0.98),rgba(14,19,30,0.99))] shadow-[0_18px_40px_rgba(2,6,23,0.16),inset_0_1px_0_rgba(255,255,255,0.04)] transition-all duration-300 ease-out md:rounded-[1.6rem]",
        state === "active"
          ? "border-ops-primary/22 shadow-[0_22px_44px_rgba(54,91,255,0.12),inset_0_1px_0_rgba(255,255,255,0.05)]"
          : state === "complete"
            ? "border-emerald-400/16"
            : "border-white/10"
      )}
    >
      <div className="border-b border-white/6 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] px-3.5 pb-3 pt-3.5 md:px-4 md:pb-3.5 md:pt-4">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-[1.05rem] border text-[11px] font-semibold shadow-[0_10px_24px_rgba(54,91,255,0.18)] transition-all duration-300",
              state === "complete"
                ? "border-emerald-400/30 bg-[linear-gradient(180deg,rgba(16,185,129,0.26),rgba(16,185,129,0.12))] text-white"
                : state === "active"
                  ? "border-ops-primary/35 bg-[linear-gradient(180deg,rgba(54,91,255,0.24),rgba(54,91,255,0.12))] text-white"
                  : "border-white/10 bg-white/[0.04] text-ops-muted"
            )}
          >
            {step}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[15px] font-semibold tracking-[-0.02em] text-ops-text">{title}</p>
              {meta ? (
                <span className="rounded-full border border-white/8 bg-white/[0.04] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-ops-muted">
                  {meta}
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-[13px] leading-5 text-ops-muted">{description}</p>
          </div>
        </div>
      </div>
      <div className={cn("px-3 py-3 md:px-4 md:py-3.5", allowOverflow && "relative z-10")}>{children}</div>
    </section>
  );
}

function BookingFieldRow({
  icon: Icon,
  label,
  hint,
  children,
  accent = "default",
  active = false
}: {
  icon: typeof UserRound;
  label: string;
  hint?: string;
  children: ReactNode;
  accent?: "default" | "pickup" | "dropoff";
  active?: boolean;
}) {
  const accentClassName =
    accent === "pickup"
      ? "border-emerald-400/28 bg-emerald-400/12 text-emerald-200"
      : accent === "dropoff"
        ? "border-ops-primary/30 bg-ops-primary/14 text-ops-primary"
        : "border-white/8 bg-white/[0.04] text-ops-muted";

  return (
    <div
      className={cn(
        "rounded-[1.1rem] border bg-ops-surface/55 px-2.5 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] transition-all duration-200 ease-out md:rounded-[1.15rem] md:px-3 md:py-3",
        active ? "border-white/16 shadow-[0_12px_30px_rgba(2,6,23,0.12),inset_0_1px_0_rgba(255,255,255,0.03)]" : "border-white/8"
      )}
    >
      <div className="flex items-start gap-2 md:gap-2.5">
        <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.95rem] border md:h-9 md:w-9 md:rounded-[1rem] ${accentClassName}`}>
          <Icon className="h-3.5 w-3.5 md:h-4 md:w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex items-center justify-between gap-2 md:mb-2">
            <Label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ops-muted">{label}</Label>
            {hint ? <span className="text-[10px] text-ops-muted md:text-[11px]">{hint}</span> : null}
          </div>
          <div className={cn("transition-all duration-200", active ? "opacity-100" : "opacity-95")}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export function BookPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const referredByCode = searchParams.get("ref") ?? undefined;
  const [pickupSuggestionsOpen, setPickupSuggestionsOpen] = useState(false);
  const [dropoffSuggestionsOpen, setDropoffSuggestionsOpen] = useState(false);
  const [savedPlaces, setSavedPlaces] = useState<Record<"home" | "work", string>>({ home: "", work: "" });
  const [savedPlacesReady, setSavedPlacesReady] = useState(false);
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

  useEffect(() => {
    const mode = searchParams.get("mode");

    if (mode === "scheduled") {
      setBookingForm((current) => ({
        ...current,
        scheduleMode: "scheduled",
        scheduledFor: current.scheduledFor || defaultScheduledTime()
      }));
      return;
    }

    if (mode === "now") {
      setBookingForm((current) => ({
        ...current,
        scheduleMode: "now"
      }));
    }
  }, [searchParams]);

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

  const availableDriver = publicDriversQuery.data?.find((entry) => entry.available) ?? publicDriversQuery.data?.[0];
  const riderEntryLabel = userHasRole(user, "rider") ? "My rides" : "Rider sign in";
  const riderEntryTo = userHasRole(user, "rider") ? "/rider/rides" : "/rider/login";
  const canBook =
    Boolean(bookingForm.riderName) &&
    Boolean(bookingForm.phone) &&
    Boolean(bookingForm.pickupAddress) &&
    Boolean(bookingForm.dropoffAddress) &&
    !bookingMutation.isPending;
  const tripSummary = quoteQuery.data
    ? `${quoteQuery.data.estimatedMiles} mi · ${quoteQuery.data.estimatedMinutes} min`
    : bookingForm.scheduleMode === "scheduled"
      ? "Reserved trip"
      : "Ready when you are";
  const heroFare = quoteQuery.data ? formatMoney(quoteQuery.data.estimatedCustomerTotal) : "$0.00";
  const timingLabel = bookingForm.scheduleMode === "scheduled" ? "Reserve" : "Ride now";
  const contactComplete = Boolean(bookingForm.riderName.trim()) && Boolean(bookingForm.phone.trim());
  const routeComplete = Boolean(bookingForm.pickupAddress.trim()) && Boolean(bookingForm.dropoffAddress.trim());
  const tripComplete = bookingForm.scheduleMode === "scheduled" ? Boolean(bookingForm.scheduledFor) : true;
  const payComplete = Boolean(bookingForm.paymentMethod);
  const activeStep = !contactComplete ? "contact" : !routeComplete ? "route" : !tripComplete ? "trip" : !payComplete ? "pay" : "pay";
  const quoteLoading = quoteQuery.isFetching && !quoteQuery.data;
  const quoteRefreshing = quoteQuery.isFetching && Boolean(quoteQuery.data);
  const trayState = bookingMutation.isPending ? "submitting" : canBook ? "ready" : quoteLoading || quoteRefreshing ? "estimating" : "draft";
  const dispatchLabel = bookingMutation.isPending ? "Sending" : quoteLoading || quoteRefreshing ? "Checking" : "Ready";
  const ctaLabel = bookingMutation.isPending ? "Booking…" : quoteLoading ? "Estimating…" : "Book as guest";
  const routeSuggestionsVisible =
    (pickupSuggestionsOpen && bookingForm.pickupAddress.trim().length >= 3) ||
    (dropoffSuggestionsOpen && bookingForm.dropoffAddress.trim().length >= 3);

  function setRideMode(mode: "now" | "scheduled") {
    setBookingForm((current) => ({
      ...current,
      scheduleMode: mode,
      scheduledFor: mode === "scheduled" && !current.scheduledFor ? defaultScheduledTime() : current.scheduledFor
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

  function submitBooking() {
    bookingMutation.mutate({
      riderName: bookingForm.riderName,
      phone: bookingForm.phone,
      email: bookingForm.email || undefined,
      pickupAddress: bookingForm.pickupAddress,
      dropoffAddress: bookingForm.dropoffAddress,
      rideType: bookingForm.rideType,
      paymentMethod: bookingForm.paymentMethod,
      scheduledFor:
        bookingForm.scheduleMode === "scheduled" && bookingForm.scheduledFor
          ? new Date(bookingForm.scheduledFor).toISOString()
          : null,
      referredByCode
    });
  }

  function resetBookingForm() {
    setBookingForm({
      riderName: user?.name ?? "",
      phone: user?.phone ?? "",
      email: user?.email ?? "",
      pickupAddress: "",
      dropoffAddress: "",
      rideType: "standard",
      paymentMethod: "jim",
      scheduledFor: "",
      scheduleMode: searchParams.get("mode") === "scheduled" ? "scheduled" : "now"
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 pb-[calc(11.25rem+env(safe-area-inset-bottom))] md:gap-5 md:pb-2">
      <PublicStateNav />

      {referredByQuery.data?.ownerName ? (
        <div className="rounded-3xl border border-ops-primary/22 bg-ops-primary/10 px-4 py-3 text-sm text-ops-muted transition-all duration-300">
          You were referred by <span className="font-semibold text-ops-text">{referredByQuery.data.ownerName}</span>. This booking keeps that share attached.
        </div>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr] md:gap-3.5">
        <div className="relative px-1 sm:px-0">
          <div className="pointer-events-none absolute bottom-8 left-0 top-9 hidden w-px bg-gradient-to-b from-white/0 via-white/12 to-white/0 sm:block" />
          <div className="pointer-events-none absolute bottom-8 right-0 top-9 hidden w-px bg-gradient-to-b from-white/0 via-white/12 to-white/0 sm:block" />
          <div className="pointer-events-none absolute inset-x-5 top-2 h-20 rounded-[1.8rem] border border-white/6 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0))] sm:hidden" />
          <section className="relative isolate overflow-hidden rounded-[1.85rem] border border-white/10 bg-[linear-gradient(180deg,rgba(14,19,29,0.99),rgba(9,13,22,0.99))] shadow-[0_24px_70px_rgba(2,6,23,0.34)] ring-1 ring-white/5 transition-all duration-300 ease-out md:rounded-[2rem] motion-safe:hover:-translate-y-0.5">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.07),transparent_60%)]" />
            <div className="border-b border-white/6 bg-[radial-gradient(circle_at_top,rgba(61,110,255,0.22),transparent_48%),linear-gradient(135deg,rgba(16,185,129,0.16),rgba(14,116,144,0.12),rgba(15,23,42,0.98))] px-4 pb-4 pt-3.5 md:px-5 md:pb-5 md:pt-4.5">
            <div className="mx-auto mb-3 h-1 w-12 rounded-full bg-white/12 md:hidden" />
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-100/70">Mobile booking state</p>
                <h1 className="mt-1 text-[1.22rem] font-semibold tracking-[-0.04em] text-white md:text-[1.65rem]">Book like a native app flow.</h1>
                <p className="mt-1.5 text-sm leading-5 text-emerald-50/80 md:leading-6">
                  Four tight steps. One persistent action bar. No extra page clutter.
                </p>
              </div>

              <div className="hidden rounded-2xl border border-white/10 bg-white/8 px-3 py-2 text-right text-xs text-white/80 sm:block">
                <p className="font-semibold text-white">{availableDriver ? availableDriver.name : "Dispatch ready"}</p>
                <p>{availableDriver?.vehicle?.makeModel ?? "Driver network live"}</p>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.08] px-3 py-1.5 text-[11px] font-semibold text-white transition-all duration-200 active:scale-[0.98]">
                <Sparkles className="mr-1.5 h-3.5 w-3.5 text-emerald-200" />
                Live dispatch
              </span>
              <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[11px] text-white/80 transition-all duration-200">
                {timingLabel}
              </span>
              <span className={cn("inline-flex items-center rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[11px] text-white/80 transition-all duration-200", quoteLoading || quoteRefreshing ? "animate-pulse" : "")}>
                {tripSummary}
              </span>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              <div className={cn("rounded-[1.15rem] border border-white/10 bg-white/8 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-all duration-300", quoteLoading ? "animate-pulse" : quoteRefreshing ? "opacity-80" : "opacity-100")}>
                <p className="text-[10px] uppercase tracking-[0.18em] text-white/55">Fare</p>
                <p className="mt-1 text-sm font-semibold text-white">{heroFare}</p>
              </div>
              <div className={cn("rounded-[1.15rem] border border-white/10 bg-white/8 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-all duration-300", quoteLoading ? "animate-pulse" : quoteRefreshing ? "opacity-80" : "opacity-100")}>
                <p className="text-[10px] uppercase tracking-[0.18em] text-white/55">Trip</p>
                <p className="mt-1 text-xs font-semibold text-white sm:text-sm">{tripSummary}</p>
              </div>
              <div className="rounded-[1.15rem] border border-white/10 bg-white/8 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-all duration-300">
                <p className="text-[10px] uppercase tracking-[0.18em] text-white/55">Mode</p>
                <p className="mt-1 text-xs font-semibold text-white sm:text-sm">{timingLabel}</p>
              </div>
            </div>
          </div>

          <div className="relative space-y-3 bg-[linear-gradient(180deg,rgba(13,18,28,0.96),rgba(9,13,22,0.98))] px-3 pb-3 pt-3.5 md:space-y-3.5 md:px-4 md:pb-4 md:pt-4">
            <div className="grid gap-2 sm:grid-cols-2">
              {rideModeOptions.map(({ id, title, description, icon: Icon, badge }) => {
                const active = bookingForm.scheduleMode === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setRideMode(id)}
                    className={`rounded-[1.3rem] border p-3 text-left transition-all duration-200 ease-out active:scale-[0.985] md:rounded-[1.45rem] md:p-3.5 ${
                      active
                        ? "border-ops-primary/40 bg-[linear-gradient(180deg,rgba(54,91,255,0.18),rgba(54,91,255,0.08))] shadow-[0_16px_32px_rgba(54,91,255,0.14)] motion-safe:hover:-translate-y-0.5"
                        : "border-ops-border-soft bg-[linear-gradient(180deg,rgba(19,24,34,0.92),rgba(15,19,28,0.92))] hover:bg-ops-panel/65 motion-safe:hover:-translate-y-0.5"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className={`rounded-[1rem] p-2.5 shadow-[0_10px_24px_rgba(2,6,23,0.16)] ${active ? "bg-ops-primary text-white" : "bg-ops-surface text-ops-primary"}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${active ? "border-ops-primary/35 bg-white/[0.08] text-white" : "border-ops-border-soft text-ops-muted"}`}>
                        {badge}
                      </span>
                    </div>
                    <p className="mt-3 font-semibold text-ops-text">{title}</p>
                    <p className="mt-1 text-[13px] leading-5 text-ops-muted md:text-sm">{description}</p>
                  </button>
                );
              })}
            </div>

            <BookingStep step="1" title="Contact" description="Add the rider details dispatch will use for updates." meta="Required" state={contactComplete ? "complete" : activeStep === "contact" ? "active" : "idle"}>
              <div className="space-y-2.5">
                <BookingFieldRow icon={UserRound} label="Full name" active={activeStep === "contact"}>
                  <Input
                    id="book-riderName"
                    placeholder="Jordan Smith"
                    value={bookingForm.riderName}
                    className="h-11 rounded-[1rem] border-white/10 bg-gradient-to-b from-ops-panel to-[#111a2a] px-4 shadow-none transition-all duration-200 focus:border-ops-primary/45 focus:ring-0"
                    onChange={(event) => setBookingForm((current) => ({ ...current, riderName: event.target.value }))}
                  />
                </BookingFieldRow>

                <BookingFieldRow icon={Phone} label="Phone number" active={activeStep === "contact"}>
                  <Input
                    id="book-riderPhone"
                    placeholder="(555) 555-5555"
                    value={bookingForm.phone}
                    className="h-11 rounded-[1rem] border-white/10 bg-gradient-to-b from-ops-panel to-[#111a2a] px-4 shadow-none transition-all duration-200 focus:border-ops-primary/45 focus:ring-0"
                    onChange={(event) => setBookingForm((current) => ({ ...current, phone: event.target.value }))}
                  />
                </BookingFieldRow>

                <BookingFieldRow icon={Mail} label="Email" hint="Optional" active={activeStep === "contact"}>
                  <Input
                    id="book-riderEmail"
                    type="email"
                    placeholder="optional@example.com"
                    value={bookingForm.email}
                    className="h-11 rounded-[1rem] border-white/10 bg-gradient-to-b from-ops-panel to-[#111a2a] px-4 shadow-none transition-all duration-200 focus:border-ops-primary/45 focus:ring-0"
                    onChange={(event) => setBookingForm((current) => ({ ...current, email: event.target.value }))}
                  />
                </BookingFieldRow>
              </div>
            </BookingStep>

            <BookingStep step="2" title="Route" description="Set pickup and dropoff to generate the live trip estimate." meta="Quote" state={routeComplete ? "complete" : activeStep === "route" ? "active" : "idle"} allowOverflow>
              <div className={cn("rounded-[1.15rem] border bg-ops-surface/55 p-2.5 transition-all duration-300 md:p-3", routeSuggestionsVisible ? "pb-[16rem] md:pb-[14rem]" : undefined, activeStep === "route" ? "border-white/14 shadow-[0_16px_32px_rgba(2,6,23,0.12)]" : "border-white/8")}>
                <div className="relative space-y-2.5">
                  <div className="pointer-events-none absolute left-[1rem] top-9 bottom-9 w-px bg-gradient-to-b from-emerald-300/50 via-white/12 to-ops-primary/50 md:left-[1.1rem] md:top-10 md:bottom-10" />

                  <BookingFieldRow icon={Navigation} label="Pickup" hint="Start" accent="pickup" active={activeStep === "route"}>
                    <AddressAutocompleteInput
                      id="book-pickupAddress"
                      placeholder="123 Main St"
                      value={bookingForm.pickupAddress}
                      onOpenChange={setPickupSuggestionsOpen}
                      inputClassName="h-10 rounded-[0.95rem] border-white/10 bg-gradient-to-b from-ops-panel to-[#111a2a] px-3 text-[0.95rem] shadow-none transition-all duration-200 focus:border-ops-primary/45 focus:ring-0 md:h-11 md:rounded-[1rem] md:px-4 md:text-base"
                      onValueChange={(value) => setBookingForm((current) => ({ ...current, pickupAddress: value }))}
                    />
                  </BookingFieldRow>

                  <BookingFieldRow icon={Circle} label="Dropoff" hint="End" accent="dropoff" active={activeStep === "route"}>
                    <AddressAutocompleteInput
                      id="book-dropoffAddress"
                      placeholder="Airport, downtown, hotel, work..."
                      value={bookingForm.dropoffAddress}
                      onOpenChange={setDropoffSuggestionsOpen}
                      inputClassName="h-10 rounded-[0.95rem] border-white/10 bg-gradient-to-b from-ops-panel to-[#111a2a] px-3 text-[0.95rem] shadow-none transition-all duration-200 focus:border-ops-primary/45 focus:ring-0 md:h-11 md:rounded-[1rem] md:px-4 md:text-base"
                      onValueChange={(value) => setBookingForm((current) => ({ ...current, dropoffAddress: value }))}
                    />
                  </BookingFieldRow>
                </div>
              </div>
            </BookingStep>

            <BookingStep step="3" title="Trip" description="Choose the vehicle type and confirm whether this is ride-now or reserve." meta={timingLabel} state={tripComplete && routeComplete ? "complete" : activeStep === "trip" ? "active" : "idle"}>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className={cn("rounded-[1.15rem] border bg-ops-surface/55 p-3 transition-all duration-200", activeStep === "trip" ? "border-white/14" : "border-white/8")}>
                  <Label htmlFor="book-rideType">Ride type</Label>
                  <select
                    id="book-rideType"
                    className="mt-2 h-10 w-full rounded-xl border border-ops-border bg-gradient-to-b from-ops-panel to-[#111a2a] px-3.5 text-base text-ops-text outline-none transition-all duration-200 focus:border-ops-primary/45 sm:text-sm"
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

                <div className={cn("rounded-[1.15rem] border bg-ops-surface/55 p-3 transition-all duration-200", activeStep === "trip" ? "border-white/14" : "border-white/8")}>
                  <p className="text-sm font-medium text-ops-text">Timing</p>
                  <p className="mt-2 text-sm text-ops-muted">
                    {bookingForm.scheduleMode === "scheduled"
                      ? "Reserve is on. Pick the exact time below."
                      : "Ride now is on. Dispatch can route the trip right away."}
                  </p>
                </div>
              </div>

              {bookingForm.scheduleMode === "scheduled" ? (
                <div className="mt-3 space-y-2 rounded-[1.15rem] border border-white/10 bg-ops-surface/55 p-3 transition-all duration-300">
                  <Label htmlFor="book-scheduledFor">Scheduled pickup</Label>
                  <Input
                    id="book-scheduledFor"
                    type="datetime-local"
                    value={bookingForm.scheduledFor}
                    className="transition-all duration-200"
                    onChange={(event) => setBookingForm((current) => ({ ...current, scheduledFor: event.target.value }))}
                  />
                </div>
              ) : (
                <div className="mt-3 rounded-[1.15rem] border border-white/8 bg-ops-surface/55 px-3.5 py-3 text-sm text-ops-muted transition-all duration-300">
                  Dispatch sees this as a ride-now request as soon as you confirm.
                </div>
              )}
            </BookingStep>

            <BookingStep step="4" title="Pay" description="Pick the handoff method, then save common destinations if you need them." meta="Finish" state={canBook ? "complete" : activeStep === "pay" ? "active" : "idle"}>
              <div className="grid grid-cols-3 gap-2">
                {paymentMethods.map(({ id, label, icon: Icon }) => {
                  const active = bookingForm.paymentMethod === id;

                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setBookingForm((current) => ({ ...current, paymentMethod: id }))}
                      className={`rounded-2xl border p-2.5 text-left transition-all duration-200 ease-out active:scale-[0.985] md:p-3 ${
                        active ? "border-ops-primary/50 bg-ops-primary text-white shadow-[0_12px_28px_rgba(54,91,255,0.18)]" : "border-white/8 bg-ops-surface/55 text-ops-text hover:bg-ops-panel"
                      }`}
                    >
                      <div className={`inline-flex rounded-xl p-2 ${active ? "bg-white/10" : "bg-ops-surface"}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <p className="mt-2 text-[13px] font-semibold md:text-sm">{label}</p>
                    </button>
                  );
                })}
              </div>

              <div className="mt-3 rounded-[1.15rem] border border-ops-border-soft bg-ops-panel/45 p-3 transition-all duration-300">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ops-muted">Saved places</p>
                    <p className="mt-1 text-sm font-semibold text-ops-text">Reuse Home or Work</p>
                  </div>
                  <MapPin className="h-4 w-4 text-ops-primary" />
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  {savedPlaceSlots.map((slot) => {
                    const savedValue = savedPlaces[slot.id];

                    return (
                      <div key={slot.id} className="rounded-2xl border border-ops-border-soft bg-ops-surface/75 p-2.5 transition-all duration-200 md:p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="font-semibold text-ops-text">{slot.title}</p>
                            <p className="text-[11px] text-ops-muted">{slot.description}</p>
                          </div>
                          <Button type="button" variant="ghost" className="h-8 px-2.5 text-xs" disabled={!bookingForm.dropoffAddress.trim()} onClick={() => saveCurrentDestination(slot.id)}>
                            Save
                          </Button>
                        </div>
                        <p className="mt-2 min-h-[2.5rem] text-xs leading-5 text-ops-muted">{savedValue || "Save the current destination here."}</p>
                        <Button type="button" variant="outline" className="mt-2 h-9 w-full" disabled={!savedValue} onClick={() => useSavedDestination(slot.id)}>
                          Use {slot.title}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </BookingStep>
          </div>
          </section>
        </div>

        <div className="hidden space-y-3 lg:block">
          <Card className="border-ops-border shadow-panel">
            <CardHeader>
              <CardTitle className="text-lg">Trip estimate</CardTitle>
              <CardDescription>Keep fare, rider access, and booking actions together.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3.5">
              <div className="rounded-[1.35rem] border border-ops-primary/22 bg-ops-primary/10 p-3.5 md:rounded-[1.5rem] md:p-4">
                <p className="text-[10px] uppercase tracking-[0.18em] text-ops-muted">Estimated all-in fare</p>
                <p className="mt-2 text-3xl font-extrabold text-ops-text">{formatMoney(quoteQuery.data?.estimatedCustomerTotal ?? 0)}</p>
                <p className="mt-2 text-sm text-ops-muted">
                  {quoteQuery.data
                    ? `${quoteQuery.data.estimatedMiles} miles · ${quoteQuery.data.estimatedMinutes} minutes · ${quoteQuery.data.routeProvider}`
                    : "Enter both addresses to load a live quote."}
                </p>
              </div>

              <div className="rounded-[1.35rem] border border-ops-border-soft bg-ops-surface/65 p-3.5 text-sm text-ops-muted md:rounded-[1.5rem] md:p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-ops-text">Rider access</p>
                  <Sparkles className="h-4 w-4 text-ops-primary" />
                </div>
                <div className="mt-3 space-y-2">
                  <Link to={riderEntryTo} className="inline-flex w-full items-center justify-between rounded-2xl border border-ops-border bg-ops-panel px-3.5 py-3 text-sm font-semibold text-ops-text transition hover:bg-ops-surface">
                    {riderEntryLabel}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link to="/" className="inline-flex w-full items-center justify-between rounded-2xl border border-ops-border bg-ops-panel px-3.5 py-3 text-sm font-semibold text-ops-text transition hover:bg-ops-surface">
                    Back to overview
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>

              <div className="grid gap-2 border-t border-ops-border-soft pt-1">
                <Button
                  className="h-11 w-full"
                  disabled={!canBook}
                  onClick={submitBooking}
                >
                  <Route className="mr-2 h-4 w-4" />
                  {bookingMutation.isPending ? "Booking…" : "Book as guest"}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="h-11"
                  onClick={resetBookingForm}
                >
                  Reset form
                </Button>

                {bookingMutation.error ? <p className="text-sm text-ops-error">{bookingMutation.error.message}</p> : null}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-[calc(5.35rem+env(safe-area-inset-bottom))] z-20 px-3 md:hidden">
        <div className="mx-auto max-w-md rounded-[1.45rem] border border-white/10 bg-[linear-gradient(180deg,rgba(13,18,28,0.97),rgba(8,12,20,0.98))] p-2.5 shadow-[0_24px_48px_rgba(2,6,23,0.28)] backdrop-blur-2xl transition-all duration-300 ease-out">
          <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-white/10" />
          <div className="flex items-center justify-between gap-3 px-1 pb-2">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.18em] text-ops-muted">Estimate</p>
              <p className="truncate text-sm font-semibold text-ops-text">{formatMoney(quoteQuery.data?.estimatedCustomerTotal ?? 0)}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-[0.16em] text-ops-muted">{timingLabel}</p>
              <p className="text-[11px] text-ops-muted">{tripSummary}</p>
            </div>
          </div>
          <div className={cn(
            "mb-2 flex items-center justify-between rounded-[1.05rem] border px-3 py-2 transition-all duration-300",
            bookingMutation.isPending
              ? "border-ops-primary/28 bg-ops-primary/10 shadow-[0_12px_30px_rgba(54,91,255,0.12)]"
              : quoteLoading || quoteRefreshing
                ? "border-white/12 bg-white/[0.06]"
                : "border-white/8 bg-white/[0.04]"
          )}>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ops-muted">Dispatch</p>
              <p className="truncate text-xs font-semibold text-ops-text">{availableDriver ? availableDriver.name : "Driver network live"}</p>
            </div>
            <span className={cn(
              "rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] transition-all duration-300",
              bookingMutation.isPending
                ? "border-ops-primary/40 bg-ops-primary/18 text-white animate-pulse"
                : quoteLoading || quoteRefreshing
                  ? "border-white/12 bg-white/[0.08] text-white/85"
                  : "border-ops-primary/30 bg-ops-primary/12 text-ops-primary"
            )}>
              {dispatchLabel}
            </span>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-11 w-[5.4rem] shrink-0 rounded-[1rem] border-white/10 bg-white/[0.03] px-0 text-ops-text transition-all duration-200 active:scale-[0.98]"
              onClick={resetBookingForm}
            >
              Reset
            </Button>
            <Button
              className={cn(
                "h-11 flex-1 rounded-[1rem] transition-all duration-300 active:scale-[0.985] disabled:scale-100",
                trayState === "ready"
                  ? "shadow-[0_16px_32px_rgba(54,91,255,0.24)]"
                  : trayState === "submitting"
                    ? "shadow-[0_12px_28px_rgba(54,91,255,0.18)] animate-pulse"
                    : "shadow-[0_10px_22px_rgba(54,91,255,0.14)]"
              )}
              disabled={!canBook}
              onClick={submitBooking}
            >
              <Route className="mr-2 h-4 w-4" />
              {ctaLabel}
            </Button>
          </div>
          {bookingMutation.error ? <p className="px-1 pt-2 text-xs text-ops-error">{bookingMutation.error.message}</p> : null}
        </div>
      </div>
    </div>
  );
}