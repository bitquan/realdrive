import type { Ride } from "@shared/contracts";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { DataField } from "@/components/layout/ops-layout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  formatDriverMilesCompact,
  formatDriverMinutesCompact,
  formatDriverMoneyCompact,
  getDriverRidePricing
} from "@/components/driver-home/driver-home.utils";
import { formatMoney, formatPaymentMethod } from "@/lib/utils";

export interface DriverActiveRideCardProps {
  ride: Ride | null;
  emphasize?: boolean;
  mobileDocked?: boolean;
}

function formatDriverStage(status: Ride["status"]) {
  if (status === "en_route") {
    return "Arriving";
  }

  if (status === "arrived") {
    return "At pickup";
  }

  if (status === "in_progress") {
    return "In trip";
  }

  return status.replaceAll("_", " ");
}

export function DriverActiveRideCard({ ride, emphasize, mobileDocked = false }: DriverActiveRideCardProps) {
  if (!ride) {
    if (mobileDocked) {
      return null;
    }

    return (
      <Card className={emphasize ? "border-ops-primary/30 shadow-soft" : undefined}>
        <CardHeader>
          <CardTitle>Active ride</CardTitle>
          <CardDescription>The current trip always stays one tap away from home.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-[1.45rem] border border-dashed border-ops-border p-5 text-sm text-ops-muted">
            No ride in progress. The next accepted job will appear here.
          </div>
        </CardContent>
      </Card>
    );
  }

  const pricing = getDriverRidePricing(ride);

  if (mobileDocked) {
    return (
      <div className={`rounded-[1.05rem] border px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] ${emphasize ? "border-teal-500/22 bg-teal-500/[0.07]" : "border-white/10 bg-slate-950/26"}`}>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Active ride</p>
              <Badge className="border-white/10 bg-slate-950/70 px-2 py-0.5 text-[11px] text-slate-100">{formatDriverStage(ride.status)}</Badge>
            </div>
            <p className="mt-1 truncate text-sm font-semibold text-white">{ride.rider.name}</p>
            <p className="truncate text-[11px] text-slate-400">{ride.pickup.address}</p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Subtotal</p>
              <p className="mt-1 text-sm font-semibold text-white">{formatDriverMoneyCompact(pricing.subtotal)}</p>
              <p className="text-[11px] text-slate-400">{formatDriverMilesCompact(ride.estimatedMiles)} · {formatDriverMinutesCompact(ride.estimatedMinutes)}</p>
            </div>
            <Link
              to={`/driver/rides/${ride.id}`}
              className="inline-flex h-9 items-center justify-center rounded-lg border border-teal-500/24 bg-teal-500/14 px-3.5 text-sm font-semibold text-white transition hover:bg-teal-500/20"
            >
              Resume
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card className={emphasize ? "border-ops-primary/30 shadow-soft" : undefined}>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>Active ride</CardTitle>
            <CardDescription className="mt-2">Resume the live trip flow without leaving home.</CardDescription>
          </div>
          <Badge>{formatDriverStage(ride.status)}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-lg font-semibold text-ops-text">{ride.rider.name}</p>
          <p className="mt-1 text-sm text-ops-muted">{ride.pickup.address}</p>
          <p className="mt-1 text-sm text-ops-muted">To {ride.dropoff.address}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <DataField label="Current stage" value={formatDriverStage(ride.status)} subtle={`${ride.estimatedMiles} miles · ${ride.estimatedMinutes} minutes`} />
          <DataField label="Driver subtotal" value={formatMoney(pricing.subtotal)} subtle={`Trip payment ${formatPaymentMethod(ride.payment.method)}`} />
        </div>

        <Link
          to={`/driver/rides/${ride.id}`}
          className="inline-flex h-11 w-full items-center justify-center rounded-2xl border border-ops-primary/40 bg-ops-primary px-4 text-sm font-semibold text-white transition hover:bg-[#6887ff]"
        >
          Resume trip
          <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </CardContent>
    </Card>
  );
}
