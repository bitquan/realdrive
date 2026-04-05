import type { Ride } from "@shared/contracts";
import { DataField, EntityList } from "@/components/layout/ops-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getDriverOfferCountdown, getDriverRidePricing } from "@/components/driver-home/driver-home.utils";
import { formatMoney, formatPaymentMethod } from "@/lib/utils";

interface RideActionMutation {
  isPending: boolean;
  mutate: (rideId: string) => void;
}

export interface DriverOfferInboxProps {
  offers: Ride[];
  suspended: boolean;
  available: boolean;
  now: number;
  acceptMutation: RideActionMutation;
  declineMutation: RideActionMutation;
}

export function DriverOfferInbox({
  offers,
  suspended,
  available,
  now,
  acceptMutation,
  declineMutation
}: DriverOfferInboxProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Offer inbox</CardTitle>
        <CardDescription>All pending offers stay in one place, ordered from newest to oldest.</CardDescription>
      </CardHeader>
      <CardContent>
        {offers.length ? (
          <EntityList>
            {offers.map((ride) => {
              const pricing = getDriverRidePricing(ride);
              const countdown = getDriverOfferCountdown(ride, now);

              return (
                <div key={ride.id} className="rounded-[1.45rem] border border-ops-border-soft/90 bg-ops-panel/40 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-ops-text">{ride.pickup.address}</p>
                      <p className="mt-1 truncate text-sm text-ops-muted">{ride.dropoff.address}</p>
                    </div>
                    <Badge className="border-ops-border-soft bg-ops-panel/80 text-ops-text">{countdown ?? "Queued"}</Badge>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <DataField label="Payout" value={formatMoney(pricing.subtotal)} subtle={`Customer total ${formatMoney(pricing.customerTotal)}`} />
                    <DataField label="Trip size" value={`${ride.estimatedMiles} miles`} subtle={`${ride.estimatedMinutes} minutes · ${formatPaymentMethod(ride.payment.method)}`} />
                  </div>

                  <div className="mt-4 flex gap-3">
                    <Button className="flex-1" disabled={suspended || acceptMutation.isPending} onClick={() => acceptMutation.mutate(ride.id)}>
                      {acceptMutation.isPending ? "Accepting..." : "Accept"}
                    </Button>
                    <Button variant="outline" className="flex-1" disabled={declineMutation.isPending} onClick={() => declineMutation.mutate(ride.id)}>
                      Decline
                    </Button>
                  </div>
                </div>
              );
            })}
          </EntityList>
        ) : (
          <div className="rounded-[1.45rem] border border-dashed border-ops-border p-5 text-sm text-ops-muted">
            {available ? "No offers in the inbox right now." : "Go online to start receiving jobs in the inbox."}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
