import {
  useCallback,
  useDeferredValue,
  useEffect,
  useState
} from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Banknote,
  Car,
  CheckCircle2,
  Clock3,
  CreditCard,
  MapPin,
  Route,
  Shield,
  Sparkles,
  Users,
  Wallet
} from "lucide-react";
import type { AddressSuggestion, PublicRideRequest } from "@shared/contracts";
import { PageHero } from "@/components/layout/page-hero";
import { ShareQrCard } from "@/components/share/share-qr-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { formatMoney, userHasRole } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";

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
  const [activeAddressField, setActiveAddressField] = useState<"pickup" | "dropoff" | null>(null);

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

  const deferredQuoteInput = useDeferredValue({
    pickupAddress: bookingForm.pickupAddress,
    dropoffAddress: bookingForm.dropoffAddress,
    rideType: bookingForm.rideType
  });

  const deferredPickupQuery = useDeferredValue(bookingForm.pickupAddress.trim());
  const deferredDropoffQuery = useDeferredValue(bookingForm.dropoffAddress.trim());

  const pickupSuggestionsQuery = useQuery({
    queryKey: ["address-suggestions", "pickup", deferredPickupQuery],
    queryFn: () => api.addressSuggestions(deferredPickupQuery),
    enabled: activeAddressField === "pickup" && deferredPickupQuery.length >= 3
  });

  const dropoffSuggestionsQuery = useQuery({
    queryKey: ["address-suggestions", "dropoff", deferredDropoffQuery],
    queryFn: () => api.addressSuggestions(deferredDropoffQuery),
    enabled: activeAddressField === "dropoff" && deferredDropoffQuery.length >= 3
  });

  const closeAddressSuggestions = useCallback(() => {
    window.setTimeout(() => {
      setActiveAddressField((current) => (current === null ? null : null));
    }, 120);
  }, []);

  const openAddressSuggestions = useCallback((field: "pickup" | "dropoff") => {
    setActiveAddressField(field);
  }, []);

  function applyAddressSuggestion(field: "pickup" | "dropoff", suggestion: AddressSuggestion) {
    setBookingForm((current) => ({
      ...current,
      ...(field === "pickup" ? { pickupAddress: suggestion.address } : { dropoffAddress: suggestion.address })
    }));
    setActiveAddressField(null);
  }

  const pickupSuggestions = activeAddressField === "pickup" ? (pickupSuggestionsQuery.data ?? []) : [];
  const dropoffSuggestions = activeAddressField === "dropoff" ? (dropoffSuggestionsQuery.data ?? []) : [];

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

  return (
    <div className="space-y-3 md:space-y-5">
      <PageHero
        eyebrow="Community-powered rideshare pilot"
        icon={Shield}
        title="Book your ride in under a minute and track everything from one live link."
        description="RealDrive keeps the rider flow simple: instant quote, guest checkout, live trip tracking, and personal share links for referral growth."
        aside={(
          <div className="rounded-3xl border border-ops-border-soft bg-gradient-to-b from-ops-panel/85 to-[#121c2d] p-3.5 text-sm text-ops-muted shadow-panel md:p-5">
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
      />

      <div className="rounded-3xl border border-ops-border-soft bg-gradient-to-b from-ops-surface to-[#0d1421] p-2 shadow-panel">
        <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-row sm:flex-wrap">
          <a
            href="#book"
            className="inline-flex w-full items-center justify-center rounded-xl border border-ops-primary/40 bg-ops-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#3b8fff] sm:w-auto"
          >
            Start booking
          </a>
          <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-row sm:gap-2">
            <Link
              to="/driver/signup"
              className="inline-flex w-full items-center justify-center rounded-xl border border-ops-border bg-ops-panel px-4 py-2 text-sm font-semibold text-ops-muted transition hover:bg-ops-surface hover:text-ops-text sm:w-auto"
            >
              Driver signup
            </Link>
            {userHasRole(user, "rider") ? (
              <Link
                to="/rider/rides"
                className="inline-flex w-full items-center justify-center rounded-xl border border-ops-border bg-ops-panel px-4 py-2 text-sm font-semibold text-ops-muted transition hover:bg-ops-surface hover:text-ops-text sm:w-auto"
              >
                My rides
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      {referredByQuery.data?.ownerName ? (
        <div className="rounded-4xl border border-ops-primary/20 bg-ops-panel/70 p-4 text-sm text-ops-muted">
          You were referred by <span className="font-semibold">{referredByQuery.data.ownerName}</span>. Your booking
          or email signup will keep that referral attached.
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:gap-3">
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
              Fast guest checkout for the pilot. You get a tracking link right away and your rider share link after booking.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3.5 md:space-y-5">
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
              <div className="relative">
                <Input
                  id="pickupAddress"
                  placeholder="123 Main St"
                  value={bookingForm.pickupAddress}
                  onFocus={() => openAddressSuggestions("pickup")}
                  onBlur={closeAddressSuggestions}
                  onChange={(event) => setBookingForm((current) => ({ ...current, pickupAddress: event.target.value }))}
                />
                {activeAddressField === "pickup" && bookingForm.pickupAddress.trim().length >= 3 ? (
                  <div className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-2xl border border-ops-border bg-[linear-gradient(180deg,rgba(20,24,31,0.98),rgba(12,15,21,0.98))] p-1 shadow-elevated">
                    {pickupSuggestionsQuery.isLoading ? (
                      <p className="px-3 py-2 text-sm text-ops-muted">Searching addresses…</p>
                    ) : pickupSuggestions.length ? (
                      pickupSuggestions.map((suggestion) => (
                        <button
                          key={suggestion.id}
                          type="button"
                          onMouseDown={() => applyAddressSuggestion("pickup", suggestion)}
                          className="w-full rounded-xl px-3 py-2 text-left text-sm text-ops-text transition hover:bg-ops-panel"
                        >
                          {suggestion.address}
                        </button>
                      ))
                    ) : (
                      <p className="px-3 py-2 text-sm text-ops-muted">No suggestions yet. Keep typing.</p>
                    )}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dropoffAddress">Dropoff address</Label>
              <div className="relative">
                <Input
                  id="dropoffAddress"
                  placeholder="Airport, downtown, hotel, work..."
                  value={bookingForm.dropoffAddress}
                  onFocus={() => openAddressSuggestions("dropoff")}
                  onBlur={closeAddressSuggestions}
                  onChange={(event) => setBookingForm((current) => ({ ...current, dropoffAddress: event.target.value }))}
                />
                {activeAddressField === "dropoff" && bookingForm.dropoffAddress.trim().length >= 3 ? (
                  <div className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-2xl border border-ops-border bg-[linear-gradient(180deg,rgba(20,24,31,0.98),rgba(12,15,21,0.98))] p-1 shadow-elevated">
                    {dropoffSuggestionsQuery.isLoading ? (
                      <p className="px-3 py-2 text-sm text-ops-muted">Searching addresses…</p>
                    ) : dropoffSuggestions.length ? (
                      dropoffSuggestions.map((suggestion) => (
                        <button
                          key={suggestion.id}
                          type="button"
                          onMouseDown={() => applyAddressSuggestion("dropoff", suggestion)}
                          className="w-full rounded-xl px-3 py-2 text-left text-sm text-ops-text transition hover:bg-ops-panel"
                        >
                          {suggestion.address}
                        </button>
                      ))
                    ) : (
                      <p className="px-3 py-2 text-sm text-ops-muted">No suggestions yet. Keep typing.</p>
                    )}
                  </div>
                ) : null}
              </div>
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
                Book this ride
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
              <CardDescription>Use these for operations while the rider funnel stays public and booking-first.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-ops-muted">
              <p>Driver signup is live and requires admin approval before ride offers are unlocked.</p>
              <p>Admin controls dispatch approvals, pricing, dues, and payout instructions.</p>
              <p>Rider referrals are tracked through booking and lead capture links.</p>
              <p className="pt-2">
                <Link to="/driver/login" className="font-semibold text-ops-primary hover:underline">
                  Approved driver login
                </Link>
                {" · "}
                <Link to="/admin/login" className="font-semibold text-ops-primary hover:underline">
                  Admin login
                </Link>
              </p>
            </CardContent>
          </Card>

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
    </div>
  );
}
