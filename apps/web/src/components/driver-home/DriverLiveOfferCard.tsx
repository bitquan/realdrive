import type { Ride } from "@shared/contracts";
import { Navigation } from "lucide-react";
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
    if (mobile) {
      return (
        <div className="py-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-800/60">
            <Navigation className="h-6 w-6 text-slate-500" />
          </div>
          <p className="text-sm text-slate-300">Ready to drive</p>
          <p className="mt-1 text-xs text-slate-500">New requests will appear here without leaving the live work surface.</p>
        </div>
      );
    }

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

  if (mobile) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-white">New Request</h3>
            <p className="mt-1 text-xs text-slate-500">Accepting moves straight into the active trip flow.</p>
          </div>
          <Badge className="border-cyan-500/30 bg-cyan-500/20 text-cyan-300">{countdown ?? "Queued"}</Badge>
        </div>

        <div className="rounded-[1.45rem] border border-slate-700/50 bg-slate-800/60 p-4">
          <div className="mb-4 flex items-center justify-between border-b border-slate-700/50 pb-4">
            <div>
              <div className="mb-1 text-xs text-slate-400">Est. Earnings</div>
              <div className="text-3xl font-bold text-teal-400">{formatMoney(pricing.subtotal)}</div>
            </div>
            <div className="text-right">
              <div className="mb-1 text-xs text-slate-400">Pickup ETA</div>
              <div className="text-2xl font-bold text-white">{offer.estimatedMinutes} min</div>
              <div className="text-xs text-slate-500">{offer.estimatedMiles} mi away</div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="mt-1 flex flex-col items-center gap-1">
                <div className="h-2.5 w-2.5 rounded-full bg-cyan-400 shadow-lg shadow-cyan-400/50" />
                <div className="h-6 w-0.5 bg-slate-700" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-0.5 text-xs font-medium text-cyan-400">Pickup</div>
                <div className="text-sm font-medium text-white">{offer.pickup.address}</div>
                <div className="text-xs text-slate-500">{offer.estimatedMiles} mi away</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="mt-1 h-2.5 w-2.5 rounded-full bg-slate-600" />
              <div className="min-w-0 flex-1">
                <div className="mb-0.5 text-xs text-slate-400">Dropoff</div>
                <div className="text-sm font-medium text-white">{offer.dropoff.address}</div>
                <div className="text-xs text-slate-500">{offer.estimatedMiles} mi • ~{offer.estimatedMinutes} min trip</div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Button className="h-14 w-full rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 text-base font-bold text-white shadow-xl shadow-teal-500/40 hover:from-teal-400 hover:to-cyan-400" disabled={suspended || acceptMutation.isPending} onClick={() => acceptMutation.mutate(offer.id)}>
            {acceptMutation.isPending ? "Accepting..." : "Accept Ride"}
          </Button>
          <Button variant="outline" className="h-12 w-full rounded-xl border-slate-700/50 bg-slate-800/60 text-sm font-medium text-slate-300 hover:bg-slate-800" disabled={declineMutation.isPending} onClick={() => declineMutation.mutate(offer.id)}>
            Decline
          </Button>
        </div>
      </div>
    );
  }

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
