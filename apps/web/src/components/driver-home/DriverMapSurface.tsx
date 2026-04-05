import type { Ride } from "@shared/contracts";
import { MapPinned } from "lucide-react";
import { DataField } from "@/components/layout/ops-layout";
import { DeferredLiveMap } from "@/components/maps/deferred-live-map";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export interface DriverMapSurfaceProps {
  ride: Ride | null;
  statusLabel: string;
  dispatchSummary: string;
  vehicleLabel: string;
}

export function DriverMapSurface({
  ride,
  statusLabel,
  dispatchSummary,
  vehicleLabel
}: DriverMapSurfaceProps) {
  if (ride) {
    return (
      <div className="relative">
        <div className="pointer-events-none absolute left-3 top-3 z-10 hidden flex-wrap gap-2 md:flex xl:hidden">
          <Badge className="border-ops-border-soft bg-[#08101a]/90 text-ops-text">{statusLabel}</Badge>
          <Badge className="border-ops-border-soft bg-[#08101a]/90 text-ops-text">{dispatchSummary}</Badge>
        </div>
        <DeferredLiveMap
          ride={ride}
          title={ride.status === "offered" ? "Live dispatch map" : "Driver route map"}
          height={520}
          meta={ride.status === "offered" ? "Offers and active trips stay attached to a live map-first work surface." : "Pickup, dropoff, and route progress stay visible while you work."}
        />
      </div>
    );
  }

  return (
    <Card className="overflow-hidden border-ops-border-soft/95 bg-[radial-gradient(circle_at_top_left,rgba(90,124,255,0.18),transparent_28%),linear-gradient(180deg,rgba(10,14,20,0.98),rgba(6,9,14,0.96))] shadow-panel">
      <CardHeader className="border-b border-ops-border-soft/80 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Live dispatch map</CardTitle>
            <CardDescription className="mt-2">The map stays reserved as the primary driver surface, even when no offer is live yet.</CardDescription>
          </div>
          <span className="rounded-2xl border border-ops-border-soft bg-ops-panel/75 p-3 text-ops-primary">
            <MapPinned className="h-5 w-5" />
          </span>
        </div>
      </CardHeader>
      <CardContent className="relative min-h-[420px] overflow-hidden p-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(90,124,255,0.12),transparent_20%),radial-gradient(circle_at_82%_32%,rgba(90,124,255,0.08),transparent_24%),linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:auto,auto,38px_38px,38px_38px] opacity-90" />
        <div className="relative z-10 flex h-full flex-col justify-between">
          <div className="hidden flex-wrap gap-2 md:flex">
            <Badge className="border-ops-border-soft bg-[#08101a]/88 text-ops-text">{statusLabel}</Badge>
            <Badge className="border-ops-border-soft bg-[#08101a]/88 text-ops-text">{dispatchSummary}</Badge>
          </div>

          <div className="max-w-xl space-y-4 rounded-[1.9rem] border border-ops-border-soft/90 bg-[#08101a]/78 p-5 shadow-soft backdrop-blur">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-ops-muted">Stand by</p>
            <h2 className="text-[2rem] font-extrabold tracking-[-0.04em] text-ops-text">Ready for the next nearby job.</h2>
            <p className="text-sm leading-6 text-ops-muted">
              Stay signed on and keep this screen open. New offers will land in the live work rail without making you dig through account tools.
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              <DataField label="Dispatch mode" value={dispatchSummary} />
              <DataField label="Vehicle" value={vehicleLabel} />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
