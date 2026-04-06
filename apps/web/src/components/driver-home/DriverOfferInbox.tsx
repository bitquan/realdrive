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
  mobile?: boolean;
}

export function DriverOfferInbox({
  offers,
  suspended,
  available,
  now,
  acceptMutation,
  declineMutation,
  mobile = false
}: DriverOfferInboxProps) {
  if (mobile) {
    return offers.length ? (
      <div className="space-y-3">
        {offers.map((ride) => {
          const pricing = getDriverRidePricing(ride);
          const countdown = getDriverOfferCountdown(ride, now);

          return (
            <div key={ride.id} className="rounded-[1.35rem] border border-slate-700/50 bg-slate-800/55 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{ride.pickup.address}</p>
                  <p className="mt-1 truncate text-xs text-slate-500">{ride.dropoff.address}</p>
                </div>
                <Badge className="border-slate-700/60 bg-slate-900/70 text-slate-200">{countdown ?? "Queued"}</Badge>
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <div className="rounded-[1rem] border border-slate-700/40 bg-slate-900/35 p-3">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Payout</p>
                  <p className="mt-2 font-semibold text-white">{formatMoney(pricing.subtotal)}</p>
                </div>
                <div className="rounded-[1rem] border border-slate-700/40 bg-slate-900/35 p-3">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Trip size</p>
                  <p className="mt-2 font-semibold text-white">{ride.estimatedMiles} mi · {ride.estimatedMinutes} min</p>
                </div>
              </div>

              <div className="mt-3 flex gap-2">
                <Button className="flex-1" disabled={suspended || acceptMutation.isPending} onClick={() => acceptMutation.mutate(ride.id)}>
                  {acceptMutation.isPending ? "Accepting..." : "Accept"}
                </Button>
                <Button variant="outline" className="flex-1 border-slate-700/50 bg-slate-800/60 text-slate-300 hover:bg-slate-800" disabled={declineMutation.isPending} onClick={() => declineMutation.mutate(ride.id)}>
                  Decline
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    ) : (
      <div className="py-6 text-center">
        <p className="text-sm text-slate-300">{available ? "No offers in the inbox right now." : "Go online to start receiving jobs in the inbox."}</p>
      </div>
    );
  }

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
