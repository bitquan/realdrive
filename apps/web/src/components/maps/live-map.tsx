import type { ReactNode } from "react";
import Map, { Layer, Marker, Source } from "react-map-gl/mapbox";
import { MapPin, Navigation } from "lucide-react";
import type { Ride } from "@shared/contracts";
import "mapbox-gl/dist/mapbox-gl.css";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN ?? "";

function midpoint(ride: Ride) {
  return {
    longitude: (ride.pickup.lng + ride.dropoff.lng) / 2,
    latitude: (ride.pickup.lat + ride.dropoff.lat) / 2
  };
}

function getRouteSegments(ride: Ride) {
  const pickup: [number, number] = [ride.pickup.lng, ride.pickup.lat];
  const dropoff: [number, number] = [ride.dropoff.lng, ride.dropoff.lat];
  const current: [number, number] | null = ride.latestLocation ? [ride.latestLocation.lng, ride.latestLocation.lat] : null;

  if (ride.status === "in_progress") {
    return {
      primary: current ? [current, dropoff] : [pickup, dropoff],
      secondary: current ? [pickup, current] : null
    };
  }

  if (["accepted", "en_route", "arrived"].includes(ride.status)) {
    return {
      primary: current ? [current, pickup] : [pickup, dropoff],
      secondary: [pickup, dropoff]
    };
  }

  return {
    primary: [pickup, dropoff],
    secondary: null
  };
}

export function LiveMap({
  ride,
  title = "Live trip map",
  height = 360,
  meta,
  surfaceChrome = "card"
}: {
  ride: Ride;
  title?: string;
  height?: number;
  meta?: ReactNode;
  surfaceChrome?: "card" | "bare";
}) {
  const center = midpoint(ride);
  const routeSegments = getRouteSegments(ride);

  const renderFallbackMap = () => {
    if (surfaceChrome === "bare") {
      return (
        <div className="relative overflow-hidden bg-[#040814] text-white" style={{ height }}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(45,212,191,0.1),transparent_18%),radial-gradient(circle_at_82%_28%,rgba(56,189,248,0.08),transparent_20%),linear-gradient(180deg,rgba(2,6,23,0.08),rgba(2,6,23,0.45))]" />
          <svg className="absolute inset-0 h-full w-full opacity-30" aria-hidden="true">
            <defs>
              <pattern id="driver-shell-grid-fallback" width="72" height="72" patternUnits="userSpaceOnUse">
                <path d="M 72 0 L 0 0 0 72" fill="none" stroke="rgb(71, 85, 105)" strokeWidth="0.45" />
              </pattern>
              <pattern id="driver-shell-major-grid-fallback" width="216" height="216" patternUnits="userSpaceOnUse">
                <rect width="216" height="216" fill="url(#driver-shell-grid-fallback)" />
                <path d="M 216 0 L 0 0 0 216" fill="none" stroke="rgb(100, 116, 139)" strokeWidth="1.1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#driver-shell-major-grid-fallback)" />
          </svg>

          <div className="absolute left-[9%] top-[15%] h-24 w-32 rounded-sm border border-slate-700/25 bg-slate-800/35" />
          <div className="absolute right-[12%] top-[22%] h-28 w-36 rounded-sm border border-slate-700/25 bg-slate-800/35" />
          <div className="absolute left-[18%] top-[46%] h-20 w-28 rounded-sm border border-slate-700/25 bg-slate-800/45" />
          <div className="absolute bottom-[34%] right-[20%] h-24 w-32 rounded-sm border border-slate-700/25 bg-slate-800/40" />

          <div className="absolute left-0 right-0 top-[37%] h-px bg-gradient-to-r from-transparent via-slate-500/40 to-transparent" />
          <div className="absolute left-0 right-0 top-[59%] h-0.5 bg-gradient-to-r from-transparent via-slate-500/45 to-transparent" />
          <div className="absolute bottom-0 top-0 left-[36%] w-px bg-gradient-to-b from-transparent via-slate-500/40 to-transparent" />
          <div className="absolute bottom-0 top-0 left-[68%] w-0.5 bg-gradient-to-b from-transparent via-slate-500/45 to-transparent" />

          <svg className="absolute inset-[12%] h-[76%] w-[76%]" viewBox="0 0 100 100" aria-hidden="true">
            {ride.status === "in_progress" ? (
              <>
                <path d="M 28 76 Q 44 60 51 56" fill="none" stroke="rgba(148,163,184,0.35)" strokeWidth="2.5" strokeDasharray="5 5" strokeLinecap="round" />
                <path d="M 51 56 Q 66 46 78 24" fill="none" stroke="rgba(45,212,191,0.88)" strokeWidth="3.5" strokeLinecap="round" />
              </>
            ) : (
              <>
                <path d="M 40 44 Q 58 36 78 24" fill="none" stroke="rgba(148,163,184,0.35)" strokeWidth="2.5" strokeDasharray="5 5" strokeLinecap="round" />
                <path d="M 52 66 Q 46 58 40 44" fill="none" stroke="rgba(45,212,191,0.88)" strokeWidth="3.5" strokeLinecap="round" />
              </>
            )}
          </svg>

          <div className="absolute left-[37%] top-[34%] h-3 w-3 rounded-full bg-cyan-400 shadow-[0_0_24px_rgba(34,211,238,0.55)]" />
          <div className="absolute right-[19%] top-[19%] h-3 w-3 rounded-full bg-teal-400 shadow-[0_0_24px_rgba(45,212,191,0.55)]" />

          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="relative">
              <div className="absolute -inset-5 rounded-full bg-white/6 blur-xl" />
              <div className="absolute h-16 w-16 rounded-full bg-teal-500/18 animate-pulse" />
              <div className="absolute left-2 top-2 h-12 w-12 rounded-full bg-teal-500/24" />
              <div className="absolute left-6 top-6 h-4 w-4 rounded-full border-2 border-white bg-teal-400 shadow-[0_0_20px_rgba(45,212,191,0.45)]" />
            </div>
          </div>

          <div className="absolute left-4 top-4 rounded-full border border-white/10 bg-slate-950/70 px-3 py-1.5 text-[11px] font-medium tracking-[0.02em] text-slate-300 backdrop-blur-xl">
            Live dispatch map preview
          </div>

          <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-slate-950/72 via-slate-950/20 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-[42%] bg-gradient-to-t from-slate-950 via-slate-950/72 to-transparent" />
        </div>
      );
    }

    return (
      <div className="rounded-[1.9rem] border border-dashed border-ops-border bg-ops-panel p-6 text-sm text-ops-muted">
        Mapbox is not configured in this environment. Ride coordinates are still live and stored for dispatch.
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-ops-border-soft bg-ops-surface p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-ops-muted">Pickup</p>
            <p className="mt-2 font-semibold text-ops-text">{ride.pickup.address}</p>
          </div>
          <div className="rounded-2xl border border-ops-border-soft bg-ops-surface p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-ops-muted">Driver</p>
            <p className="mt-2 font-semibold text-ops-text">
              {ride.latestLocation ? `${ride.latestLocation.lat.toFixed(4)}, ${ride.latestLocation.lng.toFixed(4)}` : "Awaiting driver location"}
            </p>
          </div>
          <div className="rounded-2xl border border-ops-border-soft bg-ops-surface p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-ops-muted">Dropoff</p>
            <p className="mt-2 font-semibold text-ops-text">{ride.dropoff.address}</p>
          </div>
        </div>
      </div>
    );
  };

  const renderMapCanvas = () => (
    <div className={surfaceChrome === "bare" ? "h-full overflow-hidden" : "overflow-hidden rounded-[1.9rem]"}>
      <Map
        initialViewState={{
          ...center,
          zoom: 11
        }}
        style={{ width: "100%", height }}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        mapboxAccessToken={MAPBOX_TOKEN}
      >
        {routeSegments.secondary && routeSegments.secondary.length > 1 ? (
          <Source
            id={`driver-route-secondary-${ride.id}`}
            type="geojson"
            data={{
              type: "Feature",
              properties: {},
              geometry: { type: "LineString", coordinates: routeSegments.secondary }
            }}
          >
            <Layer
              id={`driver-route-secondary-layer-${ride.id}`}
              type="line"
              paint={{
                "line-color": "rgba(148,163,184,0.58)",
                "line-width": 4,
                "line-dasharray": [2, 2]
              }}
            />
          </Source>
        ) : null}

        {routeSegments.primary && routeSegments.primary.length > 1 ? (
          <Source
            id={`driver-route-primary-${ride.id}`}
            type="geojson"
            data={{
              type: "Feature",
              properties: {},
              geometry: { type: "LineString", coordinates: routeSegments.primary }
            }}
          >
            <Layer
              id={`driver-route-primary-casing-layer-${ride.id}`}
              type="line"
              paint={{
                "line-color": "rgba(15,23,42,0.95)",
                "line-width": 10,
                "line-opacity": 0.88
              }}
            />
            <Layer
              id={`driver-route-primary-glow-layer-${ride.id}`}
              type="line"
              paint={{
                "line-color": "rgba(34,211,238,0.48)",
                "line-width": 8,
                "line-blur": 1.4,
                "line-opacity": 0.92
              }}
            />
            <Layer
              id={`driver-route-primary-layer-${ride.id}`}
              type="line"
              paint={{
                "line-color": "rgba(45,212,191,0.94)",
                "line-width": 5,
                "line-blur": 0.35
              }}
            />
          </Source>
        ) : null}

        <Marker longitude={ride.pickup.lng} latitude={ride.pickup.lat}>
          <div className="rounded-full bg-ops-primary p-2 text-white shadow-lg">
            <MapPin className="h-4 w-4" />
          </div>
        </Marker>
        <Marker longitude={ride.dropoff.lng} latitude={ride.dropoff.lat}>
          <div className="rounded-full bg-ops-success p-2 text-white shadow-lg">
            <MapPin className="h-4 w-4" />
          </div>
        </Marker>
        {ride.latestLocation ? (
          <Marker longitude={ride.latestLocation.lng} latitude={ride.latestLocation.lat}>
            <div className="rounded-full bg-ops-text p-2 text-ops-bg shadow-lg">
              <Navigation className="h-4 w-4" />
            </div>
          </Marker>
        ) : null}
      </Map>
    </div>
  );

  if (!MAPBOX_TOKEN) {
    if (surfaceChrome === "bare") {
      return renderFallbackMap();
    }

    return (
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {meta ? <p className="mt-2 text-sm text-ops-muted">{meta}</p> : null}
        </CardHeader>
        <CardContent>{renderFallbackMap()}</CardContent>
      </Card>
    );
  }

  if (surfaceChrome === "bare") {
    return renderMapCanvas();
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {meta ? <p className="mt-2 text-sm text-ops-muted">{meta}</p> : null}
      </CardHeader>
      <CardContent>{renderMapCanvas()}</CardContent>
    </Card>
  );
}
