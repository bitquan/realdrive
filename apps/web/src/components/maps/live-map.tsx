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

export function LiveMap({ ride }: { ride: Ride }) {
  const center = midpoint(ride);

  if (!MAPBOX_TOKEN) {
    return (
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>Live trip map</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-3xl border border-dashed border-brand-ink/15 bg-brand-mist p-6 text-sm text-brand-ink/60">
            Mapbox is not configured in this environment. Ride coordinates are still live and stored for dispatch.
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl bg-white p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-brand-ink/40">Pickup</p>
                <p className="mt-2 font-semibold">{ride.pickup.address}</p>
              </div>
              <div className="rounded-2xl bg-white p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-brand-ink/40">Driver</p>
                <p className="mt-2 font-semibold">
                  {ride.latestLocation ? `${ride.latestLocation.lat.toFixed(4)}, ${ride.latestLocation.lng.toFixed(4)}` : "Awaiting driver location"}
                </p>
              </div>
              <div className="rounded-2xl bg-white p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-brand-ink/40">Dropoff</p>
                <p className="mt-2 font-semibold">{ride.dropoff.address}</p>
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
        <CardTitle>Live trip map</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-hidden rounded-3xl">
          <Map
            initialViewState={{
              ...center,
              zoom: 11
            }}
            style={{ width: "100%", height: 360 }}
            mapStyle="mapbox://styles/mapbox/streets-v12"
            mapboxAccessToken={MAPBOX_TOKEN}
          >
            <Marker longitude={ride.pickup.lng} latitude={ride.pickup.lat}>
              <div className="rounded-full bg-brand-copper p-2 text-white shadow-lg">
                <MapPin className="h-4 w-4" />
              </div>
            </Marker>
            <Marker longitude={ride.dropoff.lng} latitude={ride.dropoff.lat}>
              <div className="rounded-full bg-brand-moss p-2 text-white shadow-lg">
                <MapPin className="h-4 w-4" />
              </div>
            </Marker>
            {ride.latestLocation ? (
              <Marker longitude={ride.latestLocation.lng} latitude={ride.latestLocation.lat}>
                <div className="rounded-full bg-brand-ink p-2 text-white shadow-lg">
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
