import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, CheckCircle2, Clock3, LayoutGrid, Megaphone, Shield, Sparkles, Users } from "lucide-react";
import { PageHero } from "@/components/layout/page-hero";
import { PublicStateNav } from "@/components/rider-home/public-state-nav";
import { RiderFeatureGrid } from "@/components/rider-home/rider-feature-grid";
import { ShareQrCard } from "@/components/share/share-qr-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { cn, userHasRole } from "@/lib/utils";
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

function StateSheet({
  title,
  description,
  children,
  accent = "default",
  compact = false
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  accent?: "default" | "rider" | "more";
  compact?: boolean;
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-[1.45rem] border bg-[linear-gradient(180deg,rgba(22,28,39,0.98),rgba(14,19,30,0.99))] shadow-[0_18px_40px_rgba(2,6,23,0.16),inset_0_1px_0_rgba(255,255,255,0.04)] transition-all duration-200 ease-out md:rounded-[1.6rem] motion-safe:hover:-translate-y-0.5",
        accent === "rider"
          ? "border-emerald-400/16"
          : accent === "more"
            ? "border-white/12"
            : "border-white/10"
      )}
    >
      <div className={cn("border-b border-white/6 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))]", compact ? "px-3.5 pb-2.5 pt-3 md:px-4 md:pb-3 md:pt-3.5" : "px-4 pb-3 pt-3.5 md:px-5 md:pb-3.5 md:pt-4")}>
        <p className="text-[15px] font-semibold tracking-[-0.02em] text-ops-text">{title}</p>
        <p className="mt-1 text-[13px] leading-5 text-ops-muted">{description}</p>
      </div>
      <div className={cn(compact ? "px-3.5 py-3.5 md:px-4 md:py-4" : "px-4 py-4 md:px-5 md:py-4.5")}>{children}</div>
    </section>
  );
}

function StateLaunchCard({
  to,
  eyebrow,
  title,
  description,
  cta,
  icon: Icon,
  accent = "default"
}: {
  to: string;
  eyebrow: string;
  title: string;
  description: string;
  cta: string;
  icon: LucideIcon;
  accent?: "default" | "primary" | "success";
}) {
  return (
    <Link
      to={to}
      className={cn(
        "group rounded-[1.35rem] border p-3.5 shadow-panel transition-all duration-200 ease-out active:scale-[0.985] md:rounded-[1.6rem] md:p-4 motion-safe:hover:-translate-y-0.5",
        accent === "primary"
          ? "border-ops-primary/35 bg-[linear-gradient(180deg,rgba(35,105,248,0.2),rgba(14,21,39,0.98))] hover:border-ops-primary/50 hover:bg-ops-primary/12"
          : accent === "success"
            ? "border-white/10 bg-[linear-gradient(180deg,rgba(16,185,129,0.14),rgba(14,21,39,0.98))] hover:border-emerald-400/30"
            : "border-white/10 bg-[linear-gradient(180deg,rgba(32,39,58,0.92),rgba(13,18,29,0.98))] hover:border-white/20"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={cn("text-[10px] font-semibold uppercase tracking-[0.18em]", accent === "primary" ? "text-ops-primary" : accent === "success" ? "text-emerald-300" : "text-slate-400")}>{eyebrow}</p>
          <p className="mt-2 text-lg font-semibold text-ops-text">{title}</p>
        </div>
        <span className={cn("inline-flex rounded-[1rem] border p-2.5 transition-all duration-200", accent === "primary" ? "border-ops-primary/25 bg-ops-primary/12 text-ops-primary" : accent === "success" ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-300" : "border-white/8 bg-white/[0.04] text-slate-300") }>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-1 text-sm leading-6 text-ops-muted">{description}</p>
      <div className={cn("mt-4 inline-flex items-center text-sm font-semibold", accent === "primary" ? "text-ops-primary" : accent === "success" ? "text-emerald-300" : "text-ops-text")}>
        {cta}
        <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
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
  const heroByState: Record<PublicHomeState, { eyebrow: string; title: string; description: string; chips: string[]; asideLabel: string; asideTitle: string; asideItems: string[] }> = {
    home: {
      eyebrow: "Route-driven rider shell",
      title: "Open the right rider path without scrolling through everything.",
      description: "Home is now the launchpad. It should quickly route riders into booking, rider tools, or access flows with less mobile clutter.",
      chips: ["Launchpad", "Book faster", "Less scroll"],
      asideLabel: "Home state",
      asideTitle: "Launch the next step fast",
      asideItems: ["Open booking in one tap.", "Keep rider tools separate.", "Move ops links out of the rider funnel."]
    },
    rider: {
      eyebrow: "Rider state",
      title: "Keep rider tools and profile actions in one compact shell.",
      description: "Trips, profile setup, alerts, and roadmap-backed modules should feel like one guided rider workspace instead of a mixed public page.",
      chips: ["Trip tools", "Profile setup", "Share ready"],
      asideLabel: "Rider state",
      asideTitle: "Returning rider focus",
      asideItems: ["Trips and profile stay together.", "Referral setup stays visible.", "Future tiles stay clearly staged."]
    },
    more: {
      eyebrow: "More routes",
      title: "Keep growth and access links out of the booking path.",
      description: "Driver, admin, and ad routes should still feel native on mobile, but they should not crowd the rider booking flow or rider tools state.",
      chips: ["Access", "Growth", "Ops links"],
      asideLabel: "More state",
      asideTitle: "Separate non-booking routes",
      asideItems: ["Driver access stays isolated.", "Admin and ad links stay grouped.", "Booking remains the primary rider action."]
    }
  };
  const heroContent = heroByState[activeState];
  const moreQuickLinks = [
    {
      to: "/advertise",
      eyebrow: "Mobile ads",
      title: "Post an ad from your phone",
      description: "Open the ad form directly on mobile instead of relying only on the QR handoff.",
      cta: "Open ad form",
      icon: Megaphone,
      accent: "primary" as const
    },
    {
      to: "/driver/signup",
      eyebrow: "Driver access",
      title: "Start driver signup on mobile",
      description: "Keep the live driver application path available from the same More state.",
      cta: "Open signup",
      icon: Users,
      accent: "default" as const
    },
    {
      to: "/roadmap",
      eyebrow: "Product view",
      title: "See what mobile is still missing",
      description: "Open the live roadmap instead of hiding future rider and ops work behind the desktop shell.",
      cta: "View roadmap",
      icon: Sparkles,
      accent: "default" as const
    }
  ];

  return (
    <div className="space-y-2.5 pb-[calc(7rem+env(safe-area-inset-bottom))] md:space-y-4.5 md:pb-0">
      <PublicStateNav />

      <PageHero
        eyebrow={heroContent.eyebrow}
        icon={Shield}
        title={heroContent.title}
        description={heroContent.description}
        compact
        aside={(
          <div className="hidden rounded-3xl border border-ops-border-soft bg-gradient-to-b from-ops-panel/85 to-[#121c2d] p-3.5 text-sm text-ops-muted shadow-panel md:block md:p-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-ops-muted/80">{heroContent.asideLabel}</p>
            <p className="mt-2 font-semibold text-ops-text">{heroContent.asideTitle}</p>
            <div className="mt-2.5 space-y-1.5 text-ops-muted">
              {heroContent.asideItems.map((item) => (
                <p key={item}>{item}</p>
              ))}
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

      <div className="flex flex-wrap gap-2">
        {heroContent.chips.map((chip) => (
          <span key={chip} className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold text-white/85 transition-all duration-200">
            {chip}
          </span>
        ))}
      </div>

      {referredByQuery.data?.ownerName ? (
        <div className="rounded-3xl border border-ops-primary/20 bg-ops-panel/70 px-4 py-3 text-sm text-ops-muted">
          You were referred by <span className="font-semibold text-ops-text">{referredByQuery.data.ownerName}</span>. Your booking or rider signup will keep that referral attached.
        </div>
      ) : null}

      {activeState === "home" ? (
        <div className="space-y-3">
          <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-4 md:gap-3">
            <StateLaunchCard to="/book" eyebrow="Book now" title="Open the live booking screen" description="Jump straight into pickup, dropoff, fare preview, and checkout." cta="Start booking" icon={LayoutGrid} accent="primary" />
            <StateLaunchCard to="/book?mode=scheduled" eyebrow="Reserve" title="Start in scheduled mode" description="Open the booking state with reserve timing already selected." cta="Reserve a ride" icon={Clock3} accent="success" />
            <StateLaunchCard to="/rider" eyebrow="Rider tools" title="Trips, profile, and roadmap tiles" description="Keep rider-facing tools separate from guest booking." cta="Open rider state" icon={Users} />
            <StateLaunchCard to="/more" eyebrow="More access" title="Driver, admin, and ad routes" description="Move operations and growth links away from the booking state." cta="Open more state" icon={Megaphone} />
          </div>

          <div className="grid gap-3 lg:grid-cols-[1.05fr_0.95fr] md:gap-3">
            <StateSheet title="How this split works" description="Each rider/public state now has a clearer job on mobile." compact>
              <div className="grid gap-2.5 sm:grid-cols-3">
                <div className="rounded-[1.2rem] border border-ops-border-soft bg-ops-surface/65 p-3.5">
                  <LayoutGrid className="h-4 w-4 text-ops-primary" />
                  <p className="mt-2.5 font-semibold text-ops-text">Home</p>
                  <p className="mt-1 text-sm leading-5 text-ops-muted">Overview and route launchpad without stacking the entire product.</p>
                </div>
                <div className="rounded-[1.2rem] border border-ops-border-soft bg-ops-surface/65 p-3.5">
                  <Clock3 className="h-4 w-4 text-emerald-300" />
                  <p className="mt-2.5 font-semibold text-ops-text">Book</p>
                  <p className="mt-1 text-sm leading-5 text-ops-muted">Pickup, dropoff, fare estimate, schedule mode, and payment.</p>
                </div>
                <div className="rounded-[1.2rem] border border-ops-border-soft bg-ops-surface/65 p-3.5">
                  <Users className="h-4 w-4 text-ops-primary" />
                  <p className="mt-2.5 font-semibold text-ops-text">Rider + More</p>
                  <p className="mt-1 text-sm leading-5 text-ops-muted">Profile, history entry, growth loops, and ops links stay separated.</p>
                </div>
              </div>
            </StateSheet>

            <StateSheet title="Returning rider access" description="Keep the rider shell one tap away without pulling it into the booking state." compact>
              <div className="space-y-3 text-sm text-ops-muted">
                <div className="rounded-[1.2rem] border border-ops-border-soft p-3.5">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-ops-muted">Rider route</p>
                  <p className="mt-2">Open `/rider` for rider tools, then hand off to sign-in or trip history only when needed.</p>
                </div>
                <Link to={riderEntryTo} className="inline-flex w-full items-center justify-center rounded-2xl border border-ops-border bg-ops-surface px-4 py-3 text-sm font-semibold text-ops-text transition-all duration-200 active:scale-[0.985] hover:bg-ops-panel/70">
                  {riderEntryLabel}
                </Link>
              </div>
            </StateSheet>
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

            <StateSheet title="Save your rider profile" description="Keep rider info and your share path together without mixing it into booking." accent="rider" compact>
              <div className="space-y-4">
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
              </div>
            </StateSheet>
          </div>

          <div className="space-y-3">
            <StateSheet title="Rider shell summary" description="Keep the returning-rider value visible without stacking the full public page." accent="rider" compact>
              <div className="space-y-3 text-sm text-ops-muted">
                <div className="rounded-[1.2rem] border border-ops-border bg-gradient-to-b from-ops-panel/80 to-[#101827] p-3.5">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-ops-muted/80">Rider focus</p>
                  <p className="mt-2 font-semibold text-ops-text">Trips, alerts, saved places, and phased roadmap tiles now live in a separate route instead of mixing with booking.</p>
                </div>
                <div className="rounded-[1.2rem] border border-ops-border-soft p-3.5">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-ops-muted">Returning rider access</p>
                  <p className="mt-1 text-ops-muted">Use this state to move riders toward sign-in and profile setup without burying the booking route.</p>
                </div>
              </div>
            </StateSheet>

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
            <StateSheet title="Post from your phone" description="The ad path is now a real mobile action, not just a QR handoff for another device." accent="more" compact>
              <div className="space-y-3">
                <div className="rounded-[1.2rem] border border-ops-border bg-gradient-to-b from-ops-panel/80 to-[#101827] p-3.5">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-ops-muted/80">Mobile ad flow</p>
                  <p className="mt-2 text-sm leading-5 text-ops-muted">Riders, drivers, and local businesses can now jump straight into the ad submission form on the same phone they are using.</p>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Link
                    to="/advertise"
                    className="inline-flex items-center justify-center rounded-2xl border border-ops-primary/35 bg-ops-primary/12 px-4 py-3 text-sm font-semibold text-ops-primary transition-all duration-200 active:scale-[0.985] hover:bg-ops-primary/18"
                  >
                    <Megaphone className="mr-2 h-4 w-4" />
                    Post an ad now
                  </Link>
                  <Link
                    to="/tablet/ads/login"
                    className="inline-flex items-center justify-center rounded-2xl border border-ops-border bg-ops-surface px-4 py-3 text-sm font-semibold text-ops-text transition-all duration-200 active:scale-[0.985] hover:bg-ops-panel/70"
                  >
                    <ArrowRight className="mr-2 h-4 w-4" />
                    Open tablet ad login
                  </Link>
                </div>
                <p className="text-xs leading-5 text-ops-muted">Keep the QR card for cross-device sharing, but make the direct mobile advertiser flow the primary action.</p>
              </div>
            </StateSheet>

            <StateSheet title="Driver and admin access" description="Keep operations links separate from rider booking and rider setup." accent="more" compact>
              <div className="space-y-3 text-sm text-ops-muted">
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
              </div>
            </StateSheet>

            <ShareQrCard
              title="Advertise on this screen"
              description="Scan this QR code to open the ad form. Riders, drivers, and local businesses can all submit a screen ad request."
              shareUrl={advertiseUrl}
              fileName="realdrive-advertise-here"
            />
          </div>

          <div className="space-y-3">
            <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
              {moreQuickLinks.map((item) => (
                <StateLaunchCard
                  key={item.to}
                  to={item.to}
                  eyebrow={item.eyebrow}
                  title={item.title}
                  description={item.description}
                  cta={item.cta}
                  icon={item.icon}
                  accent={item.accent}
                />
              ))}
            </div>

            <StateSheet title="How the growth loop works" description="Keep the booking flow simple, then let riders and drivers share back into it." accent="more" compact>
              <div className="space-y-3">
                <div className="rounded-[1.2rem] border border-ops-border-soft p-3.5">
                  <p className="font-semibold">Rider path</p>
                  <p className="mt-1 text-sm leading-5 text-ops-muted">Guest booking, tracking page, and personal rider QR.</p>
                </div>
                <div className="rounded-[1.2rem] border border-ops-border-soft p-3.5">
                  <p className="font-semibold">Driver path</p>
                  <p className="mt-1 text-sm leading-5 text-ops-muted">Real signup plus admin approval before anyone can accept rides.</p>
                </div>
                <div className="rounded-[1.2rem] border border-ops-border-soft p-3.5">
                  <p className="font-semibold">Referral path</p>
                  <p className="mt-1 text-sm leading-5 text-ops-muted">Both riders and drivers can share links that point back to the rider flow.</p>
                </div>
                <Link
                  to="/driver/signup"
                  className="inline-flex w-full items-center justify-center rounded-2xl border border-ops-border bg-ops-surface px-4 py-2 text-sm font-semibold text-ops-text transition-all duration-200 active:scale-[0.985] hover:bg-ops-panel/70"
                >
                  <Users className="mr-2 h-4 w-4" />
                  Open driver signup page
                </Link>
                <Link
                  to="/advertise"
                  className="inline-flex w-full items-center justify-center rounded-2xl border border-ops-border bg-ops-surface px-4 py-2 text-sm font-semibold text-ops-text transition-all duration-200 active:scale-[0.985] hover:bg-ops-panel/70"
                >
                  <Megaphone className="mr-2 h-4 w-4" />
                  Open advertise page
                </Link>
              </div>
            </StateSheet>
          </div>
        </div>
      ) : null}
    </div>
  );
}
