import { useEffect, useState } from "react";
import type { Ride } from "@shared/contracts";
import Map, { Marker } from "react-map-gl/mapbox";
import { MapPinned, Navigation } from "lucide-react";
import { DataField } from "@/components/layout/ops-layout";
import { DeferredLiveMap } from "@/components/maps/deferred-live-map";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import "mapbox-gl/dist/mapbox-gl.css";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN ?? "";
const DEFAULT_IDLE_CENTER = {
  longitude: -77.436,
  latitude: 37.5407,
  zoom: 10.4
};

export interface DriverMapSurfaceProps {
  ride: Ride | null;
  statusLabel: string;
  dispatchSummary: string;
  vehicleLabel: string;
  mobileOverlayMode?: boolean;
  mobileFitPaddingBottom?: number;
}

export function DriverMapSurface({
  ride,
  statusLabel,
  dispatchSummary,
  vehicleLabel,
  mobileOverlayMode = false,
  mobileFitPaddingBottom
}: DriverMapSurfaceProps) {
  const [idleCenter, setIdleCenter] = useState(DEFAULT_IDLE_CENTER);
  const mobileShellClass = "relative min-h-[calc(100dvh-10.5rem)] overflow-hidden rounded-[2.25rem] bg-slate-950 shadow-[0_32px_100px_rgba(2,6,23,0.58)] ring-1 ring-white/10";

  useEffect(() => {
    if (ride || !mobileOverlayMode || !navigator.geolocation) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIdleCenter({
          longitude: position.coords.longitude,
          latitude: position.coords.latitude,
          zoom: 11.8
        });
      },
      () => undefined,
      {
        enableHighAccuracy: true,
        maximumAge: 60_000,
        timeout: 8_000
      }
    );
  }, [mobileOverlayMode, ride]);

  if (ride) {
    return (
      <div className="relative">
        <div className={`pointer-events-none absolute left-3 top-3 z-10 flex-wrap gap-2 ${mobileOverlayMode ? "hidden" : "hidden md:flex xl:hidden"}`}>
          <Badge className="border-ops-border-soft bg-[#08101a]/90 text-ops-text">{statusLabel}</Badge>
          <Badge className="border-ops-border-soft bg-[#08101a]/90 text-ops-text">{dispatchSummary}</Badge>
        </div>
        <div className={mobileOverlayMode ? mobileShellClass : undefined}>
          <DeferredLiveMap
            ride={ride}
            title={ride.status === "offered" ? "Live dispatch map" : "Driver route map"}
            height={mobileOverlayMode ? 760 : 520}
            meta={ride.status === "offered" ? "Offers and active trips stay attached to a live map-first work surface." : "Pickup, dropoff, and route progress stay visible while you work."}
            surfaceChrome={mobileOverlayMode ? "bare" : "card"}
            fitPaddingBottom={mobileOverlayMode ? mobileFitPaddingBottom : undefined}
          />
          {mobileOverlayMode ? (
            <>
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_22%_18%,rgba(56,189,248,0.06),transparent_20%),radial-gradient(circle_at_78%_74%,rgba(45,212,191,0.08),transparent_24%)]" />
              <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-slate-950/70 via-slate-950/20 to-transparent" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[46%] bg-gradient-to-t from-slate-950 via-slate-950/82 to-transparent" />
            </>
          ) : null}
        </div>
      </div>
    );
  }

  if (mobileOverlayMode) {
    if (MAPBOX_TOKEN) {
      return (
        <div className={mobileShellClass}>
          <Map
            initialViewState={idleCenter}
            longitude={idleCenter.longitude}
            latitude={idleCenter.latitude}
            zoom={idleCenter.zoom}
            style={{ width: "100%", height: 760 }}
            mapStyle="mapbox://styles/mapbox/dark-v11"
            mapboxAccessToken={MAPBOX_TOKEN}
            attributionControl={false}
          >
            <Marker longitude={idleCenter.longitude} latitude={idleCenter.latitude}>
              <div className="relative">
                <div className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full bg-teal-400/20" />
                <div className="absolute left-1/2 top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full bg-teal-400/25" />
                <div className="relative rounded-full border border-white/30 bg-slate-950/90 p-2.5 text-white shadow-[0_12px_32px_rgba(2,6,23,0.45)]">
                  <Navigation className="h-4 w-4 text-teal-300" />
                </div>
              </div>
            </Marker>
          </Map>

          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_22%_18%,rgba(56,189,248,0.06),transparent_20%),radial-gradient(circle_at_78%_74%,rgba(45,212,191,0.08),transparent_24%)]" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-slate-950/70 via-slate-950/20 to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[46%] bg-gradient-to-t from-slate-950 via-slate-950/82 to-transparent" />
        </div>
      );
    }

    return (
      <div className={mobileShellClass}>
        <div className="absolute inset-0 bg-slate-900" />
        <svg className="absolute inset-0 h-full w-full opacity-30" aria-hidden="true">
          <defs>
            <pattern id="driver-home-grid" width="80" height="80" patternUnits="userSpaceOnUse">
              <path d="M 80 0 L 0 0 0 80" fill="none" stroke="rgb(71, 85, 105)" strokeWidth="0.5" />
            </pattern>
            <pattern id="driver-home-major-grid" width="240" height="240" patternUnits="userSpaceOnUse">
              <rect width="240" height="240" fill="url(#driver-home-grid)" />
              <path d="M 240 0 L 0 0 0 240" fill="none" stroke="rgb(100, 116, 139)" strokeWidth="1.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#driver-home-major-grid)" />
        </svg>

        <div className="absolute left-[9%] top-[14%] h-24 w-32 rounded-sm border border-slate-700/30 bg-slate-800/40" />
        <div className="absolute left-[18%] top-[39%] h-28 w-40 rounded-sm border border-slate-700/30 bg-slate-800/50" />
        <div className="absolute right-[14%] top-[24%] h-32 w-36 rounded-sm border border-slate-700/30 bg-slate-800/40" />
        <div className="absolute bottom-[36%] left-[26%] h-20 w-28 rounded-sm border border-slate-700/30 bg-slate-800/50" />
        <div className="absolute bottom-[43%] right-[19%] h-24 w-32 rounded-sm border border-slate-700/30 bg-slate-800/40" />
        <div className="absolute left-[46%] top-[56%] h-28 w-24 rounded-sm border border-slate-700/30 bg-slate-800/50" />

        <div className="absolute left-0 right-0 top-[35%] h-px bg-gradient-to-r from-transparent via-slate-600/40 to-transparent" />
        <div className="absolute left-0 right-0 top-[60%] h-0.5 bg-gradient-to-r from-transparent via-slate-500/50 to-transparent" />
        <div className="absolute bottom-0 top-0 left-[35%] w-px bg-gradient-to-b from-transparent via-slate-600/40 to-transparent" />
        <div className="absolute bottom-0 top-0 left-[65%] w-0.5 bg-gradient-to-b from-transparent via-slate-500/50 to-transparent" />

        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="relative">
            <div className="absolute h-16 w-16 rounded-full bg-teal-500/20 animate-ping" />
            <div className="absolute left-2 top-2 h-12 w-12 rounded-full bg-teal-500/30" />
            <div className="absolute left-6 top-6 h-4 w-4 rounded-full border-2 border-white bg-teal-400 shadow-lg" />
          </div>
        </div>

        <div className="absolute left-[29%] top-[19%] h-64 w-64 rounded-full bg-cyan-500/5 blur-3xl" />
        <div className="absolute bottom-[18%] right-[24%] h-80 w-80 rounded-full bg-teal-500/5 blur-3xl" />
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-slate-950/72 via-slate-950/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-[46%] bg-gradient-to-t from-slate-950 via-slate-950/78 to-transparent" />
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
