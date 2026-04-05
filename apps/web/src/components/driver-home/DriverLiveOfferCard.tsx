import type { Ride } from "@shared/contracts";
import { DataField } from "@/components/layout/ops-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getDriverRidePricing } from "@/components/driver-home/driver-home.utils";
import { formatMoney, formatPaymentMethod } from "@/lib/utils";

interface RideActionMutation {
  isPending: boolean;
  mutate: (rideId: string) => void;
}

export interface DriverLiveOfferCardProps {
  offer: Ride | null;
  suspended: boolean;
  countdown: string | null;
  acceptMutation: RideActionMutation;
  declineMutation: RideActionMutation;
  mobile?: boolean;
}

export function DriverLiveOfferCard({
  offer,
  suspended,
  countdown,
  acceptMutation,
  declineMutation,
  mobile
}: DriverLiveOfferCardProps) {
  if (!offer) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Live offer</CardTitle>
          <CardDescription>New jobs appear here first, with the inbox just one tap away.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-[1.5rem] border border-dashed border-ops-border p-5 text-sm text-ops-muted">
            No live offer right now. Stay online and keep the map open.
          </div>
        </CardContent>
      </Card>
    );
  }

  const pricing = getDriverRidePricing(offer);

  return (
    <Card className="overflow-hidden border-ops-primary/24 shadow-glow">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>Live offer</CardTitle>
            <CardDescription className="mt-2">Accepting moves straight into the active trip flow.</CardDescription>
          </div>
          <Badge className="border-ops-warning/30 bg-ops-warning/10 text-ops-warning">{countdown ?? "Queued"}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-ops-muted">Pickup</p>
          <p className="mt-2 text-lg font-semibold text-ops-text">{offer.pickup.address}</p>
          <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-ops-muted">Dropoff</p>
          <p className="mt-2 text-sm text-ops-muted">{offer.dropoff.address}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <DataField label="Estimated payout" value={formatMoney(pricing.subtotal)} subtle={`Customer total ${formatMoney(pricing.customerTotal)}`} />
          <DataField label="Trip size" value={`${offer.estimatedMiles} miles`} subtle={`${offer.estimatedMinutes} minutes · ${formatPaymentMethod(offer.payment.method)}`} />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-[1.35rem] border border-ops-border-soft/90 bg-ops-panel/45 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-ops-muted">Ride type</p>
            <p className="mt-3 text-base font-semibold text-ops-text">{offer.rideType.toUpperCase()}</p>
          </div>
          <div className="rounded-[1.35rem] border border-ops-border-soft/90 bg-ops-panel/45 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-ops-muted">Platform due</p>
            <p className="mt-3 text-base font-semibold text-ops-text">{formatMoney(pricing.platformDue)}</p>
          </div>
        </div>

        <div className={`gap-3 ${mobile ? "hidden xl:flex" : "flex"}`}>
          <Button className="flex-1" disabled={suspended || acceptMutation.isPending} onClick={() => acceptMutation.mutate(offer.id)}>
            {acceptMutation.isPending ? "Accepting..." : "Accept and open trip"}
          </Button>
          <Button variant="outline" className="flex-1" disabled={declineMutation.isPending} onClick={() => declineMutation.mutate(offer.id)}>
            Decline
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
