import type { Ride } from "@shared/contracts";
import { DataField, EntityList } from "@/components/layout/ops-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  formatDriverMilesCompact,
  formatDriverMinutesCompact,
  formatDriverMoneyCompact,
  getDriverOfferCountdown,
  getDriverRidePricing
} from "@/components/driver-home/driver-home.utils";
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
      <div className="space-y-2">
        {offers.map((ride) => {
          const pricing = getDriverRidePricing(ride);
          const countdown = getDriverOfferCountdown(ride, now);
          const displayPayout = formatDriverMoneyCompact(pricing.subtotal);
          const displayMiles = formatDriverMilesCompact(ride.estimatedMiles);
          const displayMinutes = formatDriverMinutesCompact(ride.estimatedMinutes);

          return (
            <div key={ride.id} className="rounded-[1rem] border border-white/10 bg-slate-950/28 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{ride.pickup.address}</p>
                  <p className="mt-0.5 truncate text-[11px] text-slate-400">{ride.dropoff.address}</p>
                </div>
                <Badge className="border-white/10 bg-slate-950/70 px-2 py-1 text-[11px] text-slate-200">{countdown ?? "Queued"}</Badge>
              </div>

              <div className="mt-2 flex items-center justify-between gap-3 text-[11px] text-slate-400">
                <span className="rounded-full border border-white/8 bg-white/[0.03] px-2.5 py-1 text-slate-200">{displayPayout}</span>
                <span>{displayMiles} · {displayMinutes}</span>
              </div>

              <div className="mt-2 grid grid-cols-[1fr_auto] gap-2">
                <Button className="h-9 text-sm" disabled={suspended || acceptMutation.isPending} onClick={() => acceptMutation.mutate(ride.id)}>
                  {acceptMutation.isPending ? "Accepting..." : "Accept"}
                </Button>
                <Button variant="outline" className="h-9 min-w-[88px] border-slate-700/50 bg-slate-800/60 px-3.5 text-sm text-slate-300 hover:bg-slate-800" disabled={declineMutation.isPending} onClick={() => declineMutation.mutate(ride.id)}>
                  Decline
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    ) : (
      <div className="rounded-[1.35rem] border border-dashed border-white/10 bg-slate-950/28 px-4 py-6 text-center">
        <p className="text-sm text-slate-200">{available ? "No offers in the inbox right now." : "Go online to start receiving jobs in the inbox."}</p>
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
