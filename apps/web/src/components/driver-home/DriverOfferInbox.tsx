import { useState } from "react";
import type { Ride } from "@shared/contracts";
import { ChevronDown, ChevronUp } from "lucide-react";
import { DataField, EntityList } from "@/components/layout/ops-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  formatDriverMilesCompact,
  formatDriverMinutesCompact,
  formatDriverMoneyCompact,
  getDriverOfferCountdown,
  getDriverOfferCountdownMeta,
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
  shellMode?: "home" | "route";
}

export function DriverOfferInbox({
  offers,
  suspended,
  available,
  now,
  acceptMutation,
  declineMutation,
  mobile = false,
  shellMode = "home"
}: DriverOfferInboxProps) {
  const [expandedRideId, setExpandedRideId] = useState<string | null>(null);

  if (mobile) {
    return offers.length ? (
      <div className="space-y-2">
        {offers.map((ride) => {
          const pricing = getDriverRidePricing(ride);
          const countdown = getDriverOfferCountdown(ride, now);
          const countdownMeta = getDriverOfferCountdownMeta(ride, now);
          const displayPayout = formatDriverMoneyCompact(pricing.subtotal);
          const displayMiles = formatDriverMilesCompact(ride.estimatedMiles);
          const displayMinutes = formatDriverMinutesCompact(ride.estimatedMinutes);
          const expanded = shellMode === "route" && expandedRideId === ride.id;
          const countdownClassName =
            countdownMeta.tone === "expired"
              ? "border-rose-500/25 bg-rose-500/12 text-rose-200"
              : countdownMeta.tone === "warning"
                ? "border-amber-500/25 bg-amber-500/12 text-amber-100"
                : "border-white/8 bg-white/[0.04] text-slate-300";

          if (shellMode === "route") {
            return (
              <div
                key={ride.id}
                className="overflow-hidden rounded-[1.05rem] border border-white/10 bg-[linear-gradient(180deg,rgba(8,13,23,0.94),rgba(5,9,17,0.96))] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
              >
                <div className="flex items-start gap-2 px-3 py-2.5">
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => setExpandedRideId((current) => (current === ride.id ? null : ride.id))}
                  >
                    <div className="flex items-center gap-2">
                      <span className="rounded-full border border-teal-400/18 bg-teal-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-teal-200">
                        {displayPayout}
                      </span>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${countdownClassName}`}>
                        {countdown ?? "Queued"}
                      </span>
                    </div>
                    <p className="mt-1.5 truncate text-[13px] font-semibold text-white">{ride.pickup.address}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] uppercase tracking-[0.14em] text-slate-400">
                      <span>{displayMiles}</span>
                      <span>•</span>
                      <span>{displayMinutes}</span>
                      <span>•</span>
                      <span>{ride.rideType}</span>
                      <span>•</span>
                      <span>{formatPaymentMethod(ride.payment.method)}</span>
                    </div>
                  </button>

                  <div className="flex shrink-0 items-center gap-1.5">
                    <Button
                      className="h-8 rounded-full px-3 text-[11px] font-semibold"
                      disabled={suspended || acceptMutation.isPending || countdownMeta.expired}
                      onClick={() => acceptMutation.mutate(ride.id)}
                    >
                      {countdownMeta.expired ? "Expired" : acceptMutation.isPending ? "..." : "Accept"}
                    </Button>
                    <Button
                      variant="outline"
                      className="h-8 rounded-full border-slate-700/50 bg-slate-800/60 px-3 text-[11px] font-semibold text-slate-300 hover:bg-slate-800"
                      disabled={declineMutation.isPending}
                      onClick={() => declineMutation.mutate(ride.id)}
                    >
                      Decline
                    </Button>
                    <button
                      type="button"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/8 bg-white/[0.04] text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
                      aria-label={expanded ? "Collapse offer details" : "Expand offer details"}
                      onClick={() => setExpandedRideId((current) => (current === ride.id ? null : ride.id))}
                    >
                      {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {expanded ? (
                  <div className="border-t border-white/8 bg-black/10 px-3 pb-3 pt-2.5">
                    <div className="grid gap-2 text-[11px] text-slate-300">
                      <div className="rounded-[0.95rem] border border-white/8 bg-white/[0.02] px-2.5 py-2">
                        <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Offer timing</p>
                        <p className="mt-1 leading-4 text-slate-100">{countdownMeta.detail}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Pickup</p>
                        <p className="mt-1 leading-4 text-slate-100">{ride.pickup.address}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Dropoff</p>
                        <p className="mt-1 leading-4 text-slate-100">{ride.dropoff.address}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 pt-0.5 text-[10px] uppercase tracking-[0.16em] text-slate-400">
                        <span className="rounded-full border border-white/8 bg-white/[0.04] px-2 py-1">Customer {formatMoney(pricing.customerTotal)}</span>
                        <span className="rounded-full border border-white/8 bg-white/[0.04] px-2 py-1">{ride.estimatedMinutes} min</span>
                        <span className="rounded-full border border-white/8 bg-white/[0.04] px-2 py-1">{ride.estimatedMiles} mi</span>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          }

          return (
            <div key={ride.id} className="rounded-[1rem] border border-white/10 bg-slate-950/28 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{ride.pickup.address}</p>
                  <p className="mt-0.5 truncate text-[11px] text-slate-400">{ride.dropoff.address}</p>
                  <p className="mt-1 text-[10px] leading-4 text-slate-500">{countdownMeta.detail}</p>
                </div>
                <Badge className={`px-2 py-1 text-[11px] ${countdownClassName}`}>{countdown ?? "Queued"}</Badge>
              </div>

              <div className="mt-2 flex items-center justify-between gap-3 text-[11px] text-slate-400">
                <span className="rounded-full border border-white/8 bg-white/[0.03] px-2.5 py-1 text-slate-200">{displayPayout}</span>
                <span>{displayMiles} · {displayMinutes}</span>
              </div>

              <div className="mt-2 grid grid-cols-[1fr_auto] gap-2">
                <Button className="h-9 text-sm" disabled={suspended || acceptMutation.isPending || countdownMeta.expired} onClick={() => acceptMutation.mutate(ride.id)}>
                  {countdownMeta.expired ? "Expired" : acceptMutation.isPending ? "Accepting..." : "Accept"}
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
      <div className={`rounded-[1.35rem] border border-dashed px-4 py-6 text-center ${shellMode === "route" ? "border-teal-500/16 bg-slate-950/46" : "border-white/10 bg-slate-950/28"}`}>
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
              const countdownMeta = getDriverOfferCountdownMeta(ride, now);
              const countdownClassName =
                countdownMeta.tone === "expired"
                  ? "border-rose-500/25 bg-rose-500/12 text-rose-200"
                  : countdownMeta.tone === "warning"
                    ? "border-amber-500/25 bg-amber-500/12 text-amber-100"
                    : "border-ops-border-soft bg-ops-panel/80 text-ops-text";

              return (
                <div key={ride.id} className="rounded-[1.45rem] border border-ops-border-soft/90 bg-ops-panel/40 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-ops-text">{ride.pickup.address}</p>
                      <p className="mt-1 truncate text-sm text-ops-muted">{ride.dropoff.address}</p>
                      <p className="mt-2 text-xs leading-5 text-ops-muted">{countdownMeta.detail}</p>
                    </div>
                    <Badge className={countdownClassName}>{countdown ?? "Queued"}</Badge>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <DataField label="Payout" value={formatMoney(pricing.subtotal)} subtle={`Customer total ${formatMoney(pricing.customerTotal)}`} />
                    <DataField label="Trip size" value={`${ride.estimatedMiles} miles`} subtle={`${ride.estimatedMinutes} minutes · ${formatPaymentMethod(ride.payment.method)}`} />
                  </div>

                  <div className="mt-4 flex gap-3">
                    <Button className="flex-1" disabled={suspended || acceptMutation.isPending || countdownMeta.expired} onClick={() => acceptMutation.mutate(ride.id)}>
                      {countdownMeta.expired ? "Offer expired" : acceptMutation.isPending ? "Accepting..." : "Accept"}
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
