import {
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
import type { PublicRideRequest } from "@shared/contracts";
import { ShareQrCard } from "@/components/share/share-qr-card";
import { Badge } from "@/components/ui/badge";
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
    <div className="rounded-4xl border border-brand-ink/10 bg-white/90 p-4 shadow-soft">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-brand-ink/5 p-3">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-brand-ink/45">{label}</p>
          <p className="text-lg font-semibold">{value}</p>
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
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-brand-ink/10 bg-white/90 p-6 shadow-soft md:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <Badge className="gap-2 border-brand-moss/20 bg-brand-mist">
              <Shield className="h-4 w-4" />
              Rider-first launch pilot
            </Badge>
            <h1 className="mt-5 text-3xl font-extrabold tracking-tight md:text-5xl">
              Book a RealDrive ride fast, pay outside the app, and share your own rider QR after booking.
            </h1>
            <p className="mt-4 text-sm leading-6 text-brand-ink/60 md:text-base">
              This pilot is focused on rider growth first. Guests can book without OTP, track their ride from a
              link, and get a personal referral QR to share with friends.
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <a
                href="#book"
                className="inline-flex items-center justify-center rounded-2xl bg-brand-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-black"
              >
                Book a ride
              </a>
              <Link
                to="/driver/signup"
                className="inline-flex items-center justify-center rounded-2xl border border-brand-ink/15 bg-white px-4 py-2 text-sm font-semibold text-brand-ink transition hover:bg-brand-sand/60"
              >
                Driver signup
              </Link>
              {userHasRole(user, "rider") ? (
                <Link
                  to="/rider/rides"
                  className="inline-flex items-center justify-center rounded-2xl border border-brand-ink/15 bg-white px-4 py-2 text-sm font-semibold text-brand-ink transition hover:bg-brand-sand/60"
                >
                  Your rides
                </Link>
              ) : null}
            </div>
          </div>

          <div className="w-full max-w-sm rounded-4xl border border-brand-ink/10 bg-brand-sand/60 p-5 text-sm shadow-soft">
            <p className="font-semibold">Launch mode</p>
            <div className="mt-3 space-y-2 text-brand-ink/65">
              <p>Guest booking is live.</p>
              <p>Driver signup is live with admin approval.</p>
              <p>Referrals are tracked, not rewarded yet.</p>
            </div>
            {availableDriver ? (
              <div className="mt-4 rounded-3xl border border-brand-ink/10 bg-white p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-brand-ink/40">Available driver right now</p>
                <p className="mt-2 font-semibold">{availableDriver.name}</p>
                <p className="text-sm text-brand-ink/55">{availableDriver.vehicle?.makeModel ?? "Vehicle ready"}</p>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {referredByQuery.data?.ownerName ? (
        <div className="rounded-4xl border border-brand-copper/20 bg-brand-sand/50 p-4 text-sm text-brand-ink/70">
          You were referred by <span className="font-semibold">{referredByQuery.data.ownerName}</span>. Your booking
          or email signup will keep that referral attached.
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <Stat icon={Car} label="Driver setup" value={availableDriver ? "Owner online" : "On demand"} />
        <Stat
          icon={Clock3}
          label="Estimated pickup"
          value={quoteQuery.data ? `${Math.max(5, Math.round(quoteQuery.data.estimatedMinutes / 2))} min` : "Live quotes"}
        />
        <Stat icon={MapPin} label="Routing" value={quoteQuery.data?.routeProvider === "mapbox" ? "Mapbox live" : "Ready with fallback"} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card id="book">
          <CardHeader>
            <CardTitle className="text-2xl">Book a ride as a guest</CardTitle>
            <CardDescription>
              No OTP required for the pilot. You will get a tracking link and your own rider referral QR after booking.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
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

            <div className="space-y-2">
              <Label htmlFor="riderEmail">Email for updates and your share link</Label>
              <Input
                id="riderEmail"
                type="email"
                placeholder="optional@example.com"
                value={bookingForm.email}
                onChange={(event) => setBookingForm((current) => ({ ...current, email: event.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pickupAddress">Pickup address</Label>
              <Input
                id="pickupAddress"
                placeholder="123 Main St"
                value={bookingForm.pickupAddress}
                onChange={(event) => setBookingForm((current) => ({ ...current, pickupAddress: event.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dropoffAddress">Dropoff address</Label>
              <Input
                id="dropoffAddress"
                placeholder="Airport, downtown, hotel, work..."
                value={bookingForm.dropoffAddress}
                onChange={(event) => setBookingForm((current) => ({ ...current, dropoffAddress: event.target.value }))}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="rideType">Ride type</Label>
                <select
                  id="rideType"
                  className="h-11 w-full rounded-2xl border border-brand-ink/15 bg-white px-4 text-sm"
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
                  className="h-11 w-full rounded-2xl border border-brand-ink/15 bg-white px-4 text-sm"
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

            <div className="grid gap-3 md:grid-cols-3">
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
                    className={`rounded-4xl border p-4 text-left transition ${
                      active ? "border-brand-ink bg-brand-ink text-white" : "border-brand-ink/10 bg-white hover:bg-brand-sand/45"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`rounded-2xl p-3 ${active ? "bg-white/10" : "bg-brand-ink/5"}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-semibold">{label}</p>
                        <p className={`text-xs ${active ? "text-white/75" : "text-brand-ink/55"}`}>Collected outside the app</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="rounded-4xl border border-brand-ink/10 bg-brand-sand/35 p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm text-brand-ink/55">Estimated all-in fare</p>
                  <p className="text-3xl font-extrabold">{formatMoney(quoteQuery.data?.estimatedCustomerTotal ?? 0)}</p>
                </div>
                <div className="text-sm text-brand-ink/60">
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

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                className="h-11 flex-1"
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
              <p className="text-sm text-red-600">{bookingMutation.error.message}</p>
            ) : null}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Stay updated by email</CardTitle>
              <CardDescription>Not ready to book yet? Leave your info and still get your own rider share link.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {riderLeadMutation.isSuccess ? (
                <div className="rounded-4xl border border-green-700/10 bg-green-50 p-4 text-sm text-green-700">
                  <div className="flex items-center gap-2 font-semibold">
                    <CheckCircle2 className="h-4 w-4" />
                    You are on the rider list
                  </div>
                  <p className="mt-2 text-green-700/85">You can start sharing your link right away.</p>
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
                Save rider interest
              </Button>
              {riderLeadMutation.error ? (
                <p className="text-sm text-red-600">{riderLeadMutation.error.message}</p>
              ) : null}
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

          <Card>
            <CardHeader>
              <CardTitle>Why this flow is cheaper</CardTitle>
              <CardDescription>Tomorrow’s pilot stays lean while leaving the future driver system intact.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-brand-ink/60">
              <p>Guests can book and track without SMS verification, so Twilio can stay off for the pilot.</p>
              <p>Real Mapbox routing is still used for pricing and maps because you already have a key.</p>
              <p>Drivers share rider-growth links too, and new drivers can now apply for real accounts pending approval.</p>
              <p className="pt-2">
                <Link to="/driver/login" className="font-semibold text-brand-copper hover:underline">
                  Approved driver login
                </Link>
                {" · "}
                <Link to="/admin/login" className="font-semibold text-brand-copper hover:underline">
                  Admin login
                </Link>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Public pilot surfaces</CardTitle>
              <CardDescription>Use the rider path as the primary promotion channel.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-4xl border border-brand-ink/10 p-4">
                <p className="font-semibold">Rider path</p>
                <p className="mt-1 text-sm text-brand-ink/55">Guest booking, tracking page, and personal rider QR.</p>
              </div>
              <div className="rounded-4xl border border-brand-ink/10 p-4">
                <p className="font-semibold">Driver path</p>
                <p className="mt-1 text-sm text-brand-ink/55">Real signup plus admin approval before anyone can accept rides.</p>
              </div>
              <div className="rounded-4xl border border-brand-ink/10 p-4">
                <p className="font-semibold">Referral path</p>
                <p className="mt-1 text-sm text-brand-ink/55">Both riders and drivers can share links that point back to this rider flow.</p>
              </div>
              <Link
                to="/driver/signup"
                className="inline-flex w-full items-center justify-center rounded-2xl border border-brand-ink/15 bg-white px-4 py-2 text-sm font-semibold text-brand-ink transition hover:bg-brand-sand/60"
              >
                <Users className="mr-2 h-4 w-4" />
                Open driver signup page
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
