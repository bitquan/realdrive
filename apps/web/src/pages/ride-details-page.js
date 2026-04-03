import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { Clock3, CreditCard, Phone, User } from "lucide-react";
import { LiveMap } from "@/components/maps/live-map";
import { ShareQrCard } from "@/components/share/share-qr-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { formatDateTime, formatMoney } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
export function RideDetailsPage() {
    const { rideId = "" } = useParams();
    const { token } = useAuth();
    const queryClient = useQueryClient();
    const rideQuery = useQuery({
        queryKey: ["ride", rideId],
        queryFn: () => api.getRide(rideId, token)
    });
    const shareQuery = useQuery({
        queryKey: ["me-share"],
        queryFn: () => api.meShare(token),
        enabled: Boolean(token)
    });
    const communityQuery = useQuery({
        queryKey: ["community-board"],
        queryFn: () => api.listCommunityProposals(token),
        enabled: Boolean(token)
    });
    const cancelMutation = useMutation({
        mutationFn: () => api.cancelRide(rideId, token),
        onSuccess: (ride) => {
            queryClient.setQueryData(["ride", rideId], ride);
            void queryClient.invalidateQueries({ queryKey: ["rider-rides"] });
        }
    });
    useEffect(() => {
        if (!token) {
            return;
        }
        const socket = getSocket(token);
        socket.emit("ride.watch", rideId);
        const refresh = () => {
            void queryClient.invalidateQueries({ queryKey: ["ride", rideId] });
            void queryClient.invalidateQueries({ queryKey: ["rider-rides"] });
        };
        socket.on("ride.status.changed", refresh);
        socket.on("ride.location.updated", refresh);
        return () => {
            socket.off("ride.status.changed", refresh);
            socket.off("ride.location.updated", refresh);
        };
    }, [queryClient, rideId, token]);
    if (!rideQuery.data) {
        return (_jsx(Card, { children: _jsx(CardContent, { className: "p-8 text-sm text-brand-ink/55", children: "Loading ride details..." }) }));
    }
    const ride = rideQuery.data;
    const customerTotal = ride.pricing.finalCustomerTotal ?? ride.pricing.estimatedCustomerTotal;
    return (_jsxs("div", { className: "grid gap-6 lg:grid-cols-[1.2fr_0.8fr]", children: [_jsx(LiveMap, { ride: ride }), _jsxs("div", { className: "space-y-6", children: [_jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { children: "Ride status" }), _jsx(CardDescription, { children: "Live updates appear here as your driver progresses through the trip." })] }), _jsxs(CardContent, { className: "space-y-4", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx(Badge, { children: ride.status.replaceAll("_", " ") }), _jsx("p", { className: "text-sm text-brand-ink/55", children: formatMoney(customerTotal) })] }), _jsxs("div", { className: "grid gap-3 md:grid-cols-2", children: [_jsxs("div", { className: "rounded-4xl border border-brand-ink/10 p-4", children: [_jsx("p", { className: "text-xs uppercase tracking-[0.22em] text-brand-ink/40", children: "Pickup" }), _jsx("p", { className: "mt-2 font-semibold", children: ride.pickup.address })] }), _jsxs("div", { className: "rounded-4xl border border-brand-ink/10 p-4", children: [_jsx("p", { className: "text-xs uppercase tracking-[0.22em] text-brand-ink/40", children: "Dropoff" }), _jsx("p", { className: "mt-2 font-semibold", children: ride.dropoff.address })] })] }), _jsxs("div", { className: "grid gap-3", children: [_jsxs("div", { className: "rounded-4xl border border-brand-ink/10 p-4", children: [_jsxs("div", { className: "mb-2 flex items-center gap-2 text-brand-ink/50", children: [_jsx(User, { className: "h-4 w-4" }), "Driver"] }), _jsx("p", { className: "font-semibold", children: ride.driver?.name ?? "Waiting for assignment" }), _jsx("p", { className: "text-sm text-brand-ink/55", children: ride.driver?.vehicle?.makeModel ?? "Dispatching nearby drivers" })] }), _jsxs("div", { className: "rounded-4xl border border-brand-ink/10 p-4", children: [_jsxs("div", { className: "mb-2 flex items-center gap-2 text-brand-ink/50", children: [_jsx(Clock3, { className: "h-4 w-4" }), "Requested"] }), _jsx("p", { className: "font-semibold", children: formatDateTime(ride.scheduledFor ?? ride.requestedAt) }), _jsxs("p", { className: "text-sm text-brand-ink/55", children: [ride.estimatedMiles, " miles \u00B7 ", ride.estimatedMinutes, " minutes"] })] }), _jsxs("div", { className: "rounded-4xl border border-brand-ink/10 p-4", children: [_jsxs("div", { className: "mb-2 flex items-center gap-2 text-brand-ink/50", children: [_jsx(CreditCard, { className: "h-4 w-4" }), "Payment"] }), _jsx("p", { className: "font-semibold", children: ride.payment.method }), _jsxs("p", { className: "text-sm text-brand-ink/55", children: ["Status: ", ride.payment.status] }), _jsxs("p", { className: "text-sm text-brand-ink/45", children: ["All-in total: ", formatMoney(customerTotal)] })] })] }), ride.status !== "completed" && ride.status !== "canceled" ? (_jsxs(Button, { variant: "outline", className: "w-full", onClick: () => cancelMutation.mutate(), children: [_jsx(Phone, { className: "mr-2 h-4 w-4" }), "Cancel ride"] })) : null] })] }), _jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { children: "Community board" }), _jsx(CardDescription, { children: "Riders can read proposals now and unlock posting, voting, and comments after 51 completed rides." })] }), _jsxs(CardContent, { className: "space-y-4", children: [_jsx("div", { className: "rounded-4xl border border-brand-ink/10 p-4 text-sm text-brand-ink/60", children: communityQuery.data?.eligibility.reason ?? "You can open the community board from this rider account." }), _jsx(Link, { to: "/community", className: "inline-flex w-full items-center justify-center rounded-2xl bg-brand-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-black", children: "Open community board" })] })] }), shareQuery.data ? (_jsx(ShareQrCard, { title: "Your rider referral QR", description: "Share your personal rider link while your trip is active or after it completes.", shareUrl: shareQuery.data.shareUrl, referralCode: shareQuery.data.referralCode, fileName: `realdrive-rider-${shareQuery.data.referralCode.toLowerCase()}` })) : null] })] }));
}
