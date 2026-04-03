import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { CalendarClock, ChevronRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { formatDateTime, formatMoney } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
export function RideHistoryPage() {
    const { token } = useAuth();
    const ridesQuery = useQuery({
        queryKey: ["rider-rides"],
        queryFn: () => api.listRiderRides(token)
    });
    return (_jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { children: "Your rides" }), _jsx(CardDescription, { children: "Review active, scheduled, and completed trips." })] }), _jsxs(CardContent, { className: "space-y-4", children: [ridesQuery.data?.map((ride) => (_jsxs(Link, { to: `/rider/rides/${ride.id}`, className: "flex items-center justify-between rounded-4xl border border-brand-ink/10 p-4 transition hover:bg-brand-sand/40", children: [_jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("p", { className: "font-semibold", children: ride.pickup.address }), _jsx(ChevronRight, { className: "h-4 w-4 text-brand-ink/35" }), _jsx("p", { className: "font-semibold", children: ride.dropoff.address })] }), _jsxs("div", { className: "flex items-center gap-2 text-sm text-brand-ink/55", children: [_jsx(CalendarClock, { className: "h-4 w-4" }), formatDateTime(ride.scheduledFor ?? ride.requestedAt)] })] }), _jsxs("div", { className: "text-right", children: [_jsx(Badge, { children: ride.status.replaceAll("_", " ") }), _jsx("p", { className: "mt-2 text-sm font-semibold", children: formatMoney(ride.payment.amountDue) })] })] }, ride.id))), !ridesQuery.data?.length ? (_jsx("div", { className: "rounded-4xl border border-dashed border-brand-ink/15 p-8 text-center text-sm text-brand-ink/55", children: "No rides yet. Book your first trip from the rider home page." })) : null] })] }));
}
