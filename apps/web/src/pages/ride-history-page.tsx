import { useQuery } from "@tanstack/react-query";
import { CalendarClock, CarFront, Clock3, Receipt, Route, Sparkles } from "lucide-react";
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
            <Route className="h-4 w-4 text-ops-primary" />
            <p className="font-semibold">Your trips stay connected</p>
          </div>
          <p className="mt-3 leading-6">Guest booking remains open on the home page, while signed-in rider history keeps your repeat trips, totals, and live follow-up in one place.</p>
        </div>
      </div>
      ) : null}
      </div>
    </div>
  );
}
