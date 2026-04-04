import { useQuery } from "@tanstack/react-query";
import { CalendarClock, Route } from "lucide-react";
import { ListRowLink, MetricCard, MetricStrip, PanelSection, SurfaceHeader } from "@/components/layout/ops-layout";
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

  const rides = ridesQuery.data ?? [];
  const activeCount = rides.filter((ride) => ["requested", "scheduled", "offered", "accepted", "en_route", "arrived", "in_progress"].includes(ride.status)).length;
  const completedCount = rides.filter((ride) => ride.status === "completed").length;
  const totalSpend = rides.reduce((total, ride) => total + ride.payment.amountDue, 0);

  return (
    <div className="space-y-6">
      <SurfaceHeader
        eyebrow="Rider history"
        title="Open every trip from one rider queue"
        description="This page stays focused on real rides only: active, scheduled, completed, and canceled trips that already exist in your account."
      />

      <MetricStrip>
        <MetricCard label="Total rides" value={rides.length} meta="Trip records on this account" icon={Route} />
        <MetricCard label="Active or scheduled" value={activeCount} meta="Trips still in motion or waiting" icon={CalendarClock} tone="primary" />
        <MetricCard label="Completed" value={completedCount} meta="Finished rider trips" icon={Route} tone="success" />
        <MetricCard label="Total spend" value={formatMoney(totalSpend)} meta="All recorded ride totals" icon={Route} />
      </MetricStrip>

      <PanelSection title="Ride queue" description="Tap into any ride to open the live detail panel and trip map.">
        <div className="space-y-3">
          {rides.length ? (
            rides.map((ride) => (
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
              No rides yet. Book your first trip from the rider home page.
            </div>
          )}
        </div>
      </PanelSection>
    </div>
  );
}
