import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { CalendarClock, ChevronRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your rides</CardTitle>
        <CardDescription>Review active, scheduled, and completed trips.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {ridesQuery.data?.map((ride) => (
          <Link
            key={ride.id}
            to={`/rider/rides/${ride.id}`}
            className="flex items-center justify-between rounded-4xl border border-ops-border-soft bg-ops-panel/40 p-4 transition hover:bg-ops-panel"
          >
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <p className="font-semibold">{ride.pickup.address}</p>
                <ChevronRight className="h-4 w-4 text-ops-muted/80" />
                <p className="font-semibold">{ride.dropoff.address}</p>
              </div>
              <div className="flex items-center gap-2 text-sm text-ops-muted">
                <CalendarClock className="h-4 w-4" />
                {formatDateTime(ride.scheduledFor ?? ride.requestedAt)}
              </div>
            </div>
            <div className="text-right">
              <Badge>{ride.status.replaceAll("_", " ")}</Badge>
              <p className="mt-2 text-sm font-semibold">{formatMoney(ride.payment.amountDue)}</p>
            </div>
          </Link>
        ))}
        {!ridesQuery.data?.length ? (
          <div className="rounded-4xl border border-dashed border-ops-border p-8 text-center text-sm text-ops-muted">
            No rides yet. Book your first trip from the rider home page.
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
