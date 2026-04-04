import type { ReactNode } from "react";
import Map, { Marker } from "react-map-gl/mapbox";
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

export function LiveMap({
  ride,
  title = "Live trip map",
  height = 360,
  meta
}: {
  ride: Ride;
  title?: string;
  height?: number;
  meta?: ReactNode;
}) {
  const center = midpoint(ride);

  if (!MAPBOX_TOKEN) {
    return (
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {meta ? <p className="mt-2 text-sm text-ops-muted">{meta}</p> : null}
        </CardHeader>
        <CardContent>
          <div className="rounded-3xl border border-dashed border-ops-border bg-ops-panel p-6 text-sm text-ops-muted">
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
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {meta ? <p className="mt-2 text-sm text-ops-muted">{meta}</p> : null}
      </CardHeader>
      <CardContent>
        <div className="overflow-hidden rounded-3xl">
          <Map
            initialViewState={{
              ...center,
              zoom: 11
            }}
            style={{ width: "100%", height }}
            mapStyle="mapbox://styles/mapbox/dark-v11"
            mapboxAccessToken={MAPBOX_TOKEN}
          >
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
      </CardContent>
    </Card>
  );
}
