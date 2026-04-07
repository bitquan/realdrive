import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { ArrowRight, CheckCircle2, Clock3, LayoutGrid, Megaphone, Shield, Sparkles, Users } from "lucide-react";
import { PageHero } from "@/components/layout/page-hero";
import { PublicStateNav } from "@/components/rider-home/public-state-nav";
import { RiderFeatureGrid } from "@/components/rider-home/rider-feature-grid";
import { ShareQrCard } from "@/components/share/share-qr-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { userHasRole } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";

type PublicHomeState = "home" | "rider" | "more";

function getPublicState(pathname: string): PublicHomeState {
  if (pathname === "/rider") {
    return "rider";
  }

  if (pathname === "/more") {
    return "more";
  }

  return "home";
}

export function HomePage() {
  const { user } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const advertiseUrl = typeof window === "undefined" ? "/advertise" : new URL("/advertise", window.location.origin).toString();
  const referredByCode = searchParams.get("ref") ?? undefined;
  const activeState = getPublicState(location.pathname);
  const [leadForm, setLeadForm] = useState({
    name: "",
    email: "",
    phone: ""
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

  const riderLeadMutation = useMutation({
    mutationFn: api.createRiderLead
  });

  const availableDriver = publicDriversQuery.data?.find((entry) => entry.available) ?? publicDriversQuery.data?.[0];
  const riderEntryLabel = userHasRole(user, "rider") ? "My rides" : "Rider sign in";
  const riderEntryTo = userHasRole(user, "rider") ? "/rider/rides" : "/rider/login";
  const riderFeatureContext = userHasRole(user, "rider") ? "rider" : "public";

  return (
    <div className="space-y-2.5 pb-24 md:space-y-5 md:pb-0">
      <PublicStateNav />

      <PageHero
        eyebrow="Route-driven rider shell"
        icon={Shield}
        title="Split the rider flow into clear mobile states instead of one long page."
        description="Use Home for overview, Book for pickup and destination, Rider for tools and profile setup, and More for access and growth links."
        compact
        aside={(
          <div className="hidden rounded-3xl border border-ops-border-soft bg-gradient-to-b from-ops-panel/85 to-[#121c2d] p-3.5 text-sm text-ops-muted shadow-panel md:block md:p-4.5">
            <p className="text-[10px] uppercase tracking-[0.2em] text-ops-muted/80">Live public shell</p>
            <p className="mt-2 font-semibold text-ops-text">Current snapshot</p>
            <div className="mt-2.5 space-y-1.5 text-ops-muted">
              <p>Dedicated `/book` state for mobile-first booking.</p>
              <p>`/rider` keeps tools and rider setup separate.</p>
              <p>`/more` keeps access and growth links out of booking.</p>
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

      {referredByQuery.data?.ownerName ? (
        <div className="rounded-3xl border border-ops-primary/20 bg-ops-panel/70 px-4 py-3 text-sm text-ops-muted">
          You were referred by <span className="font-semibold text-ops-text">{referredByQuery.data.ownerName}</span>. Your booking or rider signup will keep that referral attached.
        </div>
      ) : null}

      {activeState === "home" ? (
        <div className="space-y-3">
          <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-4 md:gap-3">
            <Link
              to="/book"
              className="rounded-[1.35rem] border border-ops-primary/35 bg-[linear-gradient(180deg,rgba(35,105,248,0.2),rgba(14,21,39,0.98))] p-3.5 shadow-panel transition hover:border-ops-primary/50 hover:bg-ops-primary/12 md:rounded-[1.6rem] md:p-4"
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ops-primary">Book now</p>
              <p className="mt-2 text-lg font-semibold text-ops-text">Open the live booking screen</p>
              <p className="mt-1 text-sm leading-6 text-ops-muted">Jump straight into pickup, dropoff, fare preview, and checkout.</p>
              <div className="mt-4 inline-flex items-center text-sm font-semibold text-ops-primary">
                Start booking
                <ArrowRight className="ml-2 h-4 w-4" />
              </div>
            </Link>

            <Link
              to="/book?mode=scheduled"
              className="rounded-[1.35rem] border border-white/10 bg-[linear-gradient(180deg,rgba(16,185,129,0.14),rgba(14,21,39,0.98))] p-3.5 shadow-panel transition hover:border-emerald-400/30 md:rounded-[1.6rem] md:p-4"
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300">Reserve</p>
              <p className="mt-2 text-lg font-semibold text-ops-text">Start in scheduled mode</p>
              <p className="mt-1 text-sm leading-6 text-ops-muted">Open the booking state with reserve timing already selected.</p>
              <div className="mt-4 inline-flex items-center text-sm font-semibold text-emerald-300">
                Reserve a ride
                <Clock3 className="ml-2 h-4 w-4" />
              </div>
            </Link>

            <Link
              to="/rider"
              className="rounded-[1.35rem] border border-white/10 bg-[linear-gradient(180deg,rgba(32,39,58,0.92),rgba(13,18,29,0.98))] p-3.5 shadow-panel transition hover:border-white/20 md:rounded-[1.6rem] md:p-4"
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Rider tools</p>
              <p className="mt-2 text-lg font-semibold text-ops-text">Trips, profile, and roadmap tiles</p>
              <p className="mt-1 text-sm leading-6 text-ops-muted">Keep rider-facing tools separate from guest booking.</p>
              <div className="mt-4 inline-flex items-center text-sm font-semibold text-ops-text">
                Open rider state
                <ArrowRight className="ml-2 h-4 w-4" />
              </div>
            </Link>

            <Link
              to="/more"
              className="rounded-[1.35rem] border border-white/10 bg-[linear-gradient(180deg,rgba(32,39,58,0.92),rgba(13,18,29,0.98))] p-3.5 shadow-panel transition hover:border-white/20 md:rounded-[1.6rem] md:p-4"
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">More access</p>
              <p className="mt-2 text-lg font-semibold text-ops-text">Driver, admin, and ad routes</p>
              <p className="mt-1 text-sm leading-6 text-ops-muted">Move operations and growth links away from the booking state.</p>
              <div className="mt-4 inline-flex items-center text-sm font-semibold text-ops-text">
                Open more state
                <ArrowRight className="ml-2 h-4 w-4" />
              </div>
            </Link>
          </div>

          <div className="grid gap-3 lg:grid-cols-[1.05fr_0.95fr] md:gap-3.5">
            <Card className="border-ops-border shadow-panel">
              <CardHeader>
                <CardTitle>How this split works</CardTitle>
                <CardDescription>Each rider/public state now has a clearer job on mobile.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-3xl border border-ops-border-soft bg-ops-surface/65 p-4">
                  <LayoutGrid className="h-4 w-4 text-ops-primary" />
                  <p className="mt-3 font-semibold text-ops-text">Home</p>
                  <p className="mt-1 text-sm leading-6 text-ops-muted">Overview and route launchpad without stacking the entire product.</p>
                </div>
                <div className="rounded-3xl border border-ops-border-soft bg-ops-surface/65 p-4">
                  <Clock3 className="h-4 w-4 text-emerald-300" />
                  <p className="mt-3 font-semibold text-ops-text">Book</p>
                  <p className="mt-1 text-sm leading-6 text-ops-muted">Pickup, dropoff, fare estimate, schedule mode, and payment.</p>
                </div>
                <div className="rounded-3xl border border-ops-border-soft bg-ops-surface/65 p-4">
                  <Users className="h-4 w-4 text-ops-primary" />
                  <p className="mt-3 font-semibold text-ops-text">Rider + More</p>
                  <p className="mt-1 text-sm leading-6 text-ops-muted">Profile, history entry, growth loops, and ops links stay separated.</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-ops-border-soft/70 bg-gradient-to-b from-[#0f1726] to-[#0d1420]">
              <CardHeader>
                <CardTitle>Returning rider access</CardTitle>
                <CardDescription>Keep the rider shell one tap away without pulling it into the booking state.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-ops-muted">
                <div className="rounded-3xl border border-ops-border-soft p-3.5">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-ops-muted">Rider route</p>
                  <p className="mt-2">Open `/rider` for rider tools, then hand off to sign-in or trip history only when needed.</p>
                </div>
                <Link to={riderEntryTo} className="inline-flex w-full items-center justify-center rounded-2xl border border-ops-border bg-ops-surface px-4 py-3 text-sm font-semibold text-ops-text transition hover:bg-ops-panel/70">
                  {riderEntryLabel}
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : null}

      {activeState === "rider" ? (
        <div className="grid gap-3 lg:grid-cols-[1.02fr_0.98fr] md:gap-3.5">
          <div className="space-y-3">
            <div className="rounded-[1.45rem] border border-[#2f9a5d]/28 bg-[linear-gradient(135deg,rgba(25,145,84,0.95),rgba(18,112,72,0.92))] p-3.5 text-white shadow-[0_20px_50px_rgba(15,118,78,0.28)] md:rounded-[1.7rem] md:p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/72">Rider state</p>
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
              contextPath="/rider"
              canRequest={Boolean(user)}
              title="Rider mobile grid"
              description="Live rider tools open real routes now, while future tools stay clearly marked and routed into feature intake."
            />

            <Card className="border-ops-border-soft/70 bg-gradient-to-b from-[#0f1726] to-[#0d1420]">
              <CardHeader>
                <CardTitle className="text-lg">Save your rider profile</CardTitle>
                <CardDescription>Keep rider info and your share path together without mixing it into booking.</CardDescription>
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
                {riderLeadMutation.error ? <p className="text-sm text-ops-error">{riderLeadMutation.error.message}</p> : null}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-3">
            <Card className="border-ops-border shadow-panel">
              <CardHeader>
                <CardTitle className="text-lg">Rider shell summary</CardTitle>
                <CardDescription>Keep the returning-rider value visible without stacking the full public page.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-ops-muted">
                <div className="rounded-3xl border border-ops-border bg-gradient-to-b from-ops-panel/80 to-[#101827] p-4">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-ops-muted/80">Rider focus</p>
                  <p className="mt-2 font-semibold text-ops-text">Trips, alerts, saved places, and phased roadmap tiles now live in a separate route instead of mixing with booking.</p>
                </div>
                <div className="rounded-3xl border border-ops-border-soft p-3.5">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-ops-muted">Returning rider access</p>
                  <p className="mt-1 text-ops-muted">Use this state to move riders toward sign-in and profile setup without burying the booking route.</p>
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

      {activeState === "more" ? (
        <div className="grid gap-3 lg:grid-cols-[0.95fr_1.05fr] md:gap-3.5">
          <div className="space-y-3">
            <Card>
              <CardHeader>
                <CardTitle>Driver and admin access</CardTitle>
                <CardDescription>Keep operations links separate from rider booking and rider setup.</CardDescription>
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

          <div className="space-y-3">
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
                  <p className="mt-1 text-sm text-ops-muted">Both riders and drivers can share links that point back to the rider flow.</p>
                </div>
                <Link
                  to="/driver/signup"
                  className="inline-flex w-full items-center justify-center rounded-2xl border border-ops-border bg-ops-surface px-4 py-2 text-sm font-semibold text-ops-text transition hover:bg-ops-panel/70"
                >
                  <Users className="mr-2 h-4 w-4" />
                  Open driver signup page
                </Link>
                <Link
                  to="/advertise"
                  className="inline-flex w-full items-center justify-center rounded-2xl border border-ops-border bg-ops-surface px-4 py-2 text-sm font-semibold text-ops-text transition hover:bg-ops-panel/70"
                >
                  <Megaphone className="mr-2 h-4 w-4" />
                  Open advertise page
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : null}
    </div>
  );
}
