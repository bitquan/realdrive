import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { LiveMap } from "@/components/maps/live-map";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { formatMoney } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
const nextStatusOrder = {
    accepted: "en_route",
    en_route: "arrived",
    arrived: "in_progress",
    in_progress: "completed"
};
export function DriverRidePage() {
    const { rideId = "" } = useParams();
    const { token } = useAuth();
    const queryClient = useQueryClient();
    const rideQuery = useQuery({
        queryKey: ["driver-ride", rideId],
        queryFn: () => api.getRide(rideId, token)
    });
    const statusMutation = useMutation({
        mutationFn: (status) => api.updateRideStatus(rideId, { status }, token),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ["driver-ride", rideId] });
            void queryClient.invalidateQueries({ queryKey: ["driver-active-rides"] });
        }
    });
    useEffect(() => {
        if (!token || !rideQuery.data) {
            return;
        }
        const socket = getSocket(token);
        socket.emit("ride.watch", rideId);
        const refresh = () => {
            void queryClient.invalidateQueries({ queryKey: ["driver-ride", rideId] });
            void queryClient.invalidateQueries({ queryKey: ["driver-active-rides"] });
        };
        socket.on("ride.status.changed", refresh);
        socket.on("ride.location.updated", refresh);
        return () => {
            socket.off("ride.status.changed", refresh);
            socket.off("ride.location.updated", refresh);
        };
    }, [queryClient, rideId, rideQuery.data, token]);
    useEffect(() => {
        if (!token || !rideQuery.data || !navigator.geolocation) {
            return;
        }
        if (!["accepted", "en_route", "arrived", "in_progress"].includes(rideQuery.data.status)) {
            return;
        }
        const interval = window.setInterval(() => {
            navigator.geolocation.getCurrentPosition((position) => {
                void api.sendDriverLocation({
                    rideId,
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    heading: position.coords.heading ?? undefined,
                    speed: position.coords.speed ?? undefined
                }, token);
            });
        }, 10_000);
        return () => window.clearInterval(interval);
    }, [rideId, rideQuery.data, token]);
    if (!rideQuery.data) {
        return (_jsx(Card, { children: _jsx(CardContent, { className: "p-8 text-sm text-brand-ink/55", children: "Loading ride..." }) }));
    }
    const ride = rideQuery.data;
    const nextStatus = ride.status in nextStatusOrder ? nextStatusOrder[ride.status] : null;
    const subtotal = ride.pricing.finalSubtotal ?? ride.pricing.estimatedSubtotal;
    const platformDue = ride.pricing.finalPlatformDue ?? ride.pricing.estimatedPlatformDue;
    const customerTotal = ride.pricing.finalCustomerTotal ?? ride.pricing.estimatedCustomerTotal;
    return (_jsxs("div", { className: "grid gap-6 lg:grid-cols-[1.2fr_0.8fr]", children: [_jsx(LiveMap, { ride: ride }), _jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { children: "Trip workflow" }), _jsx(CardDescription, { children: "Move the ride through the trip lifecycle and keep location updates flowing." })] }), _jsxs(CardContent, { className: "space-y-4", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("p", { className: "text-lg font-semibold", children: ride.rider.name }), _jsx(Badge, { children: ride.status.replaceAll("_", " ") })] }), _jsxs("div", { className: "rounded-4xl border border-brand-ink/10 p-4", children: [_jsx("p", { className: "text-sm text-brand-ink/55", children: "Pickup" }), _jsx("p", { className: "font-semibold", children: ride.pickup.address })] }), _jsxs("div", { className: "rounded-4xl border border-brand-ink/10 p-4", children: [_jsx("p", { className: "text-sm text-brand-ink/55", children: "Dropoff" }), _jsx("p", { className: "font-semibold", children: ride.dropoff.address })] }), _jsxs("div", { className: "rounded-4xl border border-brand-ink/10 p-4", children: [_jsx("p", { className: "text-sm text-brand-ink/55", children: "Customer total" }), _jsx("p", { className: "font-semibold", children: formatMoney(customerTotal) }), _jsxs("p", { className: "mt-2 text-sm text-brand-ink/55", children: ["Driver subtotal: ", formatMoney(subtotal)] }), _jsxs("p", { className: "text-sm text-brand-ink/55", children: ["Platform due: ", formatMoney(platformDue)] })] }), nextStatus ? (_jsxs(Button, { className: "w-full", onClick: () => statusMutation.mutate(nextStatus), children: ["Mark as ", nextStatus.replaceAll("_", " ")] })) : (_jsx("div", { className: "rounded-4xl border border-dashed border-brand-ink/15 p-4 text-sm text-brand-ink/55", children: "This ride has reached the end of the driver workflow." }))] })] })] }));
}
