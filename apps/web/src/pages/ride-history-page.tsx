import { useQuery } from "@tanstack/react-query";
import { CalendarClock, CarFront, Clock3, Receipt, Route, ShieldCheck, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { ListRowLink, MetricCard, MetricStrip, PanelSection, SurfaceHeader } from "@/components/layout/ops-layout";
import { RiderMapShell } from "@/components/rider-home/rider-map-shell";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { formatDateTime, formatMoney } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";

export function RideHistoryPage() {
  const { token } = useAuth();
  const ridesQuery = useQuery({
    queryKey: ["rider-rides"],
    queryFn: () => api.listRiderRides(token!)
  });

  function rideSortTime(value: { scheduledFor: string | null; requestedAt: string | null }) {
    const source = value.scheduledFor ?? value.requestedAt;
    return source ? new Date(source).getTime() : 0;
  }

  const rides = [...(ridesQuery.data ?? [])].sort(
    (a, b) => rideSortTime(b) - rideSortTime(a)
  );
  const activeCount = rides.filter((ride) => ["requested", "scheduled", "offered", "accepted", "en_route", "arrived", "in_progress"].includes(ride.status)).length;
  const completedCount = rides.filter((ride) => ride.status === "completed").length;
  const canceledCount = rides.filter((ride) => ride.status === "canceled").length;
  const totalSpend = rides.reduce((total, ride) => total + ride.payment.amountDue, 0);
  const activeRides = rides.filter((ride) => ["requested", "scheduled", "offered", "accepted", "en_route", "arrived", "in_progress"].includes(ride.status));
  const pastRides = rides.filter((ride) => !activeRides.includes(ride));
  const completedRides = rides.filter((ride) => ride.status === "completed");
  const recentCompletedRides = completedRides.slice(0, 3);
  const completedSpend = completedRides.reduce((total, ride) => total + ride.payment.amountDue, 0);
  const nextRide = activeRides[0] ?? rides[0] ?? null;
  const mapRide = nextRide;
  const hasRides = rides.length > 0;

  return (
    <div className="space-y-6">
      <RiderMapShell
        mapRide={mapRide}
        nextRide={nextRide}
        recentRides={rides}
        activeCount={activeCount}
        completedCount={completedCount}
        totalSpend={totalSpend}
        hasRides={hasRides}
      />

      <div className="space-y-3 md:hidden">
        <div className="rounded-[1.7rem] border border-white/10 bg-[linear-gradient(180deg,rgba(13,18,28,0.92),rgba(8,12,18,0.98))] p-4 text-white shadow-[0_22px_60px_rgba(2,6,23,0.32)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Receipts hub preview</p>
              <p className="mt-1 text-base font-semibold">Review completed totals without leaving rider history</p>
            </div>
            <Receipt className="h-4.5 w-4.5 text-teal-300" />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-[1.1rem] border border-white/8 bg-white/[0.04] p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Completed</p>
              <p className="mt-1 text-sm font-semibold text-white">{completedRides.length}</p>
            </div>
            <div className="rounded-[1.1rem] border border-white/8 bg-white/[0.04] p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Totals</p>
              <p className="mt-1 text-sm font-semibold text-white">{formatMoney(completedSpend)}</p>
            </div>
          </div>

          <div className="mt-3 space-y-2">
            {recentCompletedRides.length ? recentCompletedRides.map((ride) => (
              <Link
                key={ride.id}
                to={`/rider/rides/${ride.id}`}
                className="flex items-center justify-between gap-3 rounded-[1.1rem] border border-white/8 bg-white/[0.04] px-3 py-2.5 transition hover:bg-white/[0.07]"
              >
                <div className="min-w-0">
                  <p className="truncate text-[12px] font-semibold text-white">{ride.pickup.address}</p>
                  <p className="truncate text-[11px] text-slate-400">{formatDateTime(ride.scheduledFor ?? ride.requestedAt)}</p>
                </div>
                <p className="shrink-0 text-[11px] font-semibold text-white">{formatMoney(ride.payment.amountDue)}</p>
              </Link>
            )) : (
              <div className="rounded-[1.1rem] border border-dashed border-white/10 px-3 py-3 text-[12px] text-slate-400">
                Completed rides will populate this receipts preview once your trip history grows.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="hidden md:block space-y-6">
      <SurfaceHeader
        eyebrow="Rider queue"
        title="Open every trip from one rider-side home"
        description="This rider surface stays focused on real trips only: live rides, scheduled pickups, completed trips, and follow-up context from one mobile-first queue."
        actions={[{ label: "Book ride", to: "/", icon: CarFront, variant: "primary" }]}
        aside={(
          <div className="hidden rounded-[1.7rem] border border-ops-border-soft bg-ops-panel/55 p-4 text-sm text-ops-muted md:block">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-ops-muted">Rider snapshot</p>
            {nextRide ? (
              <>
                <p className="mt-2 font-semibold text-ops-text">Next trip in view</p>
                <p className="mt-2 leading-6">{nextRide.pickup.address}</p>
                <p className="text-ops-muted">to {nextRide.dropoff.address}</p>
                <p className="mt-3 text-xs uppercase tracking-[0.18em] text-ops-muted">{formatDateTime(nextRide.scheduledFor ?? nextRide.requestedAt)}</p>
              </>
            ) : (
              <>
                <p className="mt-2 font-semibold text-ops-text">No trips yet</p>
                <p className="mt-2 leading-6">Book from the home page, then come back here to track active rides and open full history.</p>
              </>
            )}
          </div>
        )}
      />

      <MetricStrip>
        <MetricCard label="Total rides" value={rides.length} meta="Trip records on this account" icon={Route} />
        <MetricCard label="Live or scheduled" value={activeCount} meta="Trips still in motion or waiting" icon={CalendarClock} tone="primary" />
        <MetricCard className="hidden xl:block" label="Completed" value={completedCount} meta="Finished rider trips" icon={Sparkles} tone="success" />
        <MetricCard className="hidden xl:block" label="Total spend" value={formatMoney(totalSpend)} meta={canceledCount ? `${canceledCount} canceled trip${canceledCount === 1 ? "" : "s"}` : "All recorded ride totals"} icon={Receipt} />
      </MetricStrip>

      {!hasRides ? (
        <PanelSection title="No rider trips yet" description="Book first, then use this rider home to open live trip state, follow-up details, and receipts without extra shell scrolling.">
          <div className="grid gap-3 md:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[1.5rem] border border-ops-border-soft bg-ops-panel/45 p-4 text-sm text-ops-muted">
              <p className="font-semibold text-ops-text">Start from the public booking flow</p>
              <p className="mt-2 leading-6">Guest booking remains open on the home page. After you sign in, active rides and completed receipts show up here automatically.</p>
              <Link to="/" className="mt-4 inline-flex font-semibold text-ops-primary hover:underline">
                Book a ride now
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-1">
              <div className="rounded-[1.45rem] border border-ops-border-soft bg-ops-panel/45 p-4 text-sm text-ops-muted">
                <div className="flex items-center gap-2 text-ops-text">
                  <Clock3 className="h-4 w-4 text-ops-primary" />
                  <p className="font-semibold">Fast rider follow-up</p>
                </div>
                <p className="mt-2 leading-6">Open live ride detail, payment method, and support context from one rider-side queue.</p>
              </div>
              <div className="rounded-[1.45rem] border border-ops-border-soft bg-ops-panel/45 p-4 text-sm text-ops-muted">
                <div className="flex items-center gap-2 text-ops-text">
                  <Route className="h-4 w-4 text-ops-primary" />
                  <p className="font-semibold">Minimal rider shell</p>
                </div>
                <p className="mt-2 leading-6">This home stays compact until there are real trips to show, so you are not forced through extra empty panels.</p>
              </div>
            </div>
          </div>
        </PanelSection>
      ) : null}

      {hasRides ? (
      <PanelSection title="Live and upcoming rides" description="Open the current trip first when you need live map context, driver updates, or rider actions.">
        <div className="space-y-3">
          {activeRides.length ? (
            activeRides.map((ride) => (
              <ListRowLink
                key={ride.id}
                to={`/rider/rides/${ride.id}`}
                title={
                  <>
                    {ride.pickup.address}
                    <span className="mx-2 text-ops-muted">to</span>
                    {ride.dropoff.address}
                  </>
                }
                description={formatDateTime(ride.scheduledFor ?? ride.requestedAt)}
                badge={<Badge>{ride.status.replaceAll("_", " ")}</Badge>}
                meta={formatMoney(ride.payment.amountDue)}
              />
            ))
          ) : (
            <div className="rounded-[1.45rem] border border-dashed border-ops-border p-8 text-center text-sm text-ops-muted">
              <p className="font-semibold text-ops-text">No live rides right now</p>
              <p className="mt-2">When you book a trip or schedule a pickup, it will appear here first.</p>
              <Link to="/" className="mt-4 inline-flex font-semibold text-ops-primary hover:underline">
                Book a ride
              </Link>
            </div>
          )}
        </div>
      </PanelSection>
      ) : null}

      {hasRides ? (
      <PanelSection title="Past rides and receipts" description="Review completed and canceled trips with payment totals and timestamps for support follow-up.">
        <div className="space-y-3">
          {pastRides.length ? (
            pastRides.map((ride) => (
              <ListRowLink
                key={ride.id}
                to={`/rider/rides/${ride.id}`}
                title={
                  <>
                    {ride.pickup.address}
                    <span className="mx-2 text-ops-muted">to</span>
                    {ride.dropoff.address}
                  </>
                }
                description={formatDateTime(ride.scheduledFor ?? ride.requestedAt)}
                badge={<Badge>{ride.status.replaceAll("_", " ")}</Badge>}
                meta={formatMoney(ride.payment.amountDue)}
              />
            ))
          ) : (
            <div className="rounded-[1.45rem] border border-dashed border-ops-border p-8 text-center text-sm text-ops-muted">
              <p className="font-semibold text-ops-text">No past rides yet</p>
              <p className="mt-2">Completed and canceled trips will stay here once your rider history grows.</p>
            </div>
          )}
        </div>
      </PanelSection>
      ) : null}

      {hasRides ? (
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-[1.7rem] border border-ops-border-soft bg-ops-panel/45 p-5 text-sm text-ops-muted">
          <div className="flex items-center gap-2 text-ops-text">
            <Clock3 className="h-4 w-4 text-ops-primary" />
            <p className="font-semibold">Rider follow-up stays fast</p>
          </div>
          <p className="mt-3 leading-6">Use any ride detail to review live route state, payment method, cancellation context, and support-ready trip notes from the same rider experience.</p>
        </div>
        <div className="rounded-[1.7rem] border border-ops-border-soft bg-ops-panel/45 p-5 text-sm text-ops-muted">
          <div className="flex items-center gap-2 text-ops-text">
            <Receipt className="h-4 w-4 text-ops-primary" />
            <p className="font-semibold">Receipt hub preview</p>
          </div>
          <p className="mt-3 leading-6">Completed ride totals, payment context, and follow-up details are being pulled closer to the rider shell instead of staying buried in the full trip list.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[1.3rem] border border-ops-border-soft bg-ops-surface/65 p-4">
              <p className="text-[10px] uppercase tracking-[0.18em] text-ops-muted">Completed rides</p>
              <p className="mt-2 text-xl font-bold text-ops-text">{completedRides.length}</p>
            </div>
            <div className="rounded-[1.3rem] border border-ops-border-soft bg-ops-surface/65 p-4">
              <p className="text-[10px] uppercase tracking-[0.18em] text-ops-muted">Receipt totals</p>
              <p className="mt-2 text-xl font-bold text-ops-text">{formatMoney(completedSpend)}</p>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {recentCompletedRides.length ? recentCompletedRides.map((ride) => (
              <ListRowLink
                key={`receipt-${ride.id}`}
                to={`/rider/rides/${ride.id}`}
                title={ride.dropoff.address}
                description={formatDateTime(ride.scheduledFor ?? ride.requestedAt)}
                badge={<Badge>receipt</Badge>}
                meta={formatMoney(ride.payment.amountDue)}
              />
            )) : (
              <div className="rounded-[1.3rem] border border-dashed border-ops-border p-4 text-sm text-ops-muted">Receipt summaries will appear here after your first completed trip.</div>
            )}
          </div>
        </div>
      </div>
      ) : null}

      {hasRides ? (
      <div className="rounded-[1.7rem] border border-ops-border-soft bg-ops-panel/45 p-5 text-sm text-ops-muted">
        <div className="flex items-center gap-2 text-ops-text">
          <ShieldCheck className="h-4 w-4 text-ops-primary" />
          <p className="font-semibold">Safety toolkit direction</p>
        </div>
        <p className="mt-3 leading-6">Ride detail now keeps trust and support modules closer to the map shell. Next rider steps keep those support actions tighter, shorter, and easier to reach during live trips.</p>
      </div>
      ) : null}
      </div>
    </div>
  );
}
