import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import Map, { Marker } from "react-map-gl/mapbox";
import { MapPin, Navigation } from "lucide-react";
import "mapbox-gl/dist/mapbox-gl.css";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN ?? "";
function midpoint(ride) {
    return {
        longitude: (ride.pickup.lng + ride.dropoff.lng) / 2,
        latitude: (ride.pickup.lat + ride.dropoff.lat) / 2
    };
}
export function LiveMap({ ride }) {
    const center = midpoint(ride);
    if (!MAPBOX_TOKEN) {
        return (_jsxs(Card, { className: "overflow-hidden", children: [_jsx(CardHeader, { children: _jsx(CardTitle, { children: "Live trip map" }) }), _jsx(CardContent, { children: _jsxs("div", { className: "rounded-3xl border border-dashed border-brand-ink/15 bg-brand-mist p-6 text-sm text-brand-ink/60", children: ["Mapbox is not configured in this environment. Ride coordinates are still live and stored for dispatch.", _jsxs("div", { className: "mt-4 grid gap-3 md:grid-cols-3", children: [_jsxs("div", { className: "rounded-2xl bg-white p-4", children: [_jsx("p", { className: "text-xs uppercase tracking-[0.18em] text-brand-ink/40", children: "Pickup" }), _jsx("p", { className: "mt-2 font-semibold", children: ride.pickup.address })] }), _jsxs("div", { className: "rounded-2xl bg-white p-4", children: [_jsx("p", { className: "text-xs uppercase tracking-[0.18em] text-brand-ink/40", children: "Driver" }), _jsx("p", { className: "mt-2 font-semibold", children: ride.latestLocation ? `${ride.latestLocation.lat.toFixed(4)}, ${ride.latestLocation.lng.toFixed(4)}` : "Awaiting driver location" })] }), _jsxs("div", { className: "rounded-2xl bg-white p-4", children: [_jsx("p", { className: "text-xs uppercase tracking-[0.18em] text-brand-ink/40", children: "Dropoff" }), _jsx("p", { className: "mt-2 font-semibold", children: ride.dropoff.address })] })] })] }) })] }));
    }
    return (_jsxs(Card, { className: "overflow-hidden", children: [_jsx(CardHeader, { children: _jsx(CardTitle, { children: "Live trip map" }) }), _jsx(CardContent, { children: _jsx("div", { className: "overflow-hidden rounded-3xl", children: _jsxs(Map, { initialViewState: {
                            ...center,
                            zoom: 11
                        }, style: { width: "100%", height: 360 }, mapStyle: "mapbox://styles/mapbox/streets-v12", mapboxAccessToken: MAPBOX_TOKEN, children: [_jsx(Marker, { longitude: ride.pickup.lng, latitude: ride.pickup.lat, children: _jsx("div", { className: "rounded-full bg-brand-copper p-2 text-white shadow-lg", children: _jsx(MapPin, { className: "h-4 w-4" }) }) }), _jsx(Marker, { longitude: ride.dropoff.lng, latitude: ride.dropoff.lat, children: _jsx("div", { className: "rounded-full bg-brand-moss p-2 text-white shadow-lg", children: _jsx(MapPin, { className: "h-4 w-4" }) }) }), ride.latestLocation ? (_jsx(Marker, { longitude: ride.latestLocation.lng, latitude: ride.latestLocation.lat, children: _jsx("div", { className: "rounded-full bg-brand-ink p-2 text-white shadow-lg", children: _jsx(Navigation, { className: "h-4 w-4" }) }) })) : null] }) }) })] }));
}
