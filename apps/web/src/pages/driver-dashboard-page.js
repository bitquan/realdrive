import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ShareQrCard } from "@/components/share/share-qr-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { formatDateTime, formatMoney } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
const emptyRateForm = {
    standard: { baseFare: "0", perMile: "0", perMinute: "0", multiplier: "1" },
    suv: { baseFare: "0", perMile: "0", perMinute: "0", multiplier: "1" },
    xl: { baseFare: "0", perMile: "0", perMinute: "0", multiplier: "1" }
};
function getRidePricing(ride) {
    return {
        subtotal: ride.pricing.finalSubtotal ?? ride.pricing.estimatedSubtotal,
        platformDue: ride.pricing.finalPlatformDue ?? ride.pricing.estimatedPlatformDue,
        customerTotal: ride.pricing.finalCustomerTotal ?? ride.pricing.estimatedCustomerTotal
    };
}
export function DriverDashboardPage() {
    const { token } = useAuth();
    const queryClient = useQueryClient();
    const profileQuery = useQuery({
        queryKey: ["driver-profile"],
        queryFn: () => api.getDriverProfile(token),
        enabled: Boolean(token)
    });
    const offersQuery = useQuery({
        queryKey: ["driver-offers"],
        queryFn: () => api.listDriverOffers(token),
        enabled: Boolean(token)
    });
    const shareQuery = useQuery({
        queryKey: ["me-share"],
        queryFn: () => api.meShare(token),
        enabled: Boolean(token)
    });
    const activeRidesQuery = useQuery({
        queryKey: ["driver-active-rides"],
        queryFn: () => api.listActiveDriverRides(token),
        enabled: Boolean(token)
    });
    const dispatchQuery = useQuery({
        queryKey: ["driver-dispatch-settings"],
        queryFn: () => api.getDriverDispatchSettings(token),
        enabled: Boolean(token)
    });
    const ratesQuery = useQuery({
        queryKey: ["driver-rates"],
        queryFn: () => api.getDriverRates(token),
        enabled: Boolean(token)
    });
    const duesQuery = useQuery({
        queryKey: ["driver-dues"],
        queryFn: () => api.getDriverDues(token),
        enabled: Boolean(token)
    });
    const communityQuery = useQuery({
        queryKey: ["community-board"],
        queryFn: () => api.listCommunityProposals(token),
        enabled: Boolean(token)
    });
    const [profileForm, setProfileForm] = useState({
        name: "",
        phone: "",
        homeState: "",
        homeCity: "",
        makeModel: "",
        plate: "",
        color: "",
        rideType: "standard",
        seats: "4"
    });
    const [dispatchForm, setDispatchForm] = useState({
        localEnabled: true,
        localRadiusMiles: 25,
        serviceAreaEnabled: true,
        serviceAreaStates: [],
        nationwideEnabled: false
    });
    const [serviceAreaText, setServiceAreaText] = useState("");
    const [rateMode, setRateMode] = useState("platform");
    const [rateForm, setRateForm] = useState(emptyRateForm);
    useEffect(() => {
        if (!profileQuery.data) {
            return;
        }
        setProfileForm({
            name: profileQuery.data.name,
            phone: profileQuery.data.phone ?? "",
            homeState: profileQuery.data.homeState ?? "",
            homeCity: profileQuery.data.homeCity ?? "",
            makeModel: profileQuery.data.vehicle?.makeModel ?? "",
            plate: profileQuery.data.vehicle?.plate ?? "",
            color: profileQuery.data.vehicle?.color ?? "",
            rideType: profileQuery.data.vehicle?.rideType ?? "standard",
            seats: String(profileQuery.data.vehicle?.seats ?? 4)
        });
    }, [profileQuery.data]);
    useEffect(() => {
        if (!dispatchQuery.data) {
            return;
        }
        setDispatchForm(dispatchQuery.data);
        setServiceAreaText(dispatchQuery.data.serviceAreaStates.join(", "));
    }, [dispatchQuery.data]);
    useEffect(() => {
        if (!ratesQuery.data) {
            return;
        }
        setRateMode(ratesQuery.data.pricingMode);
        setRateForm({
            standard: {
                baseFare: String(ratesQuery.data.rules.find((rule) => rule.rideType === "standard")?.baseFare ?? 0),
                perMile: String(ratesQuery.data.rules.find((rule) => rule.rideType === "standard")?.perMile ?? 0),
                perMinute: String(ratesQuery.data.rules.find((rule) => rule.rideType === "standard")?.perMinute ?? 0),
                multiplier: String(ratesQuery.data.rules.find((rule) => rule.rideType === "standard")?.multiplier ?? 1)
            },
            suv: {
                baseFare: String(ratesQuery.data.rules.find((rule) => rule.rideType === "suv")?.baseFare ?? 0),
                perMile: String(ratesQuery.data.rules.find((rule) => rule.rideType === "suv")?.perMile ?? 0),
                perMinute: String(ratesQuery.data.rules.find((rule) => rule.rideType === "suv")?.perMinute ?? 0),
                multiplier: String(ratesQuery.data.rules.find((rule) => rule.rideType === "suv")?.multiplier ?? 1)
            },
            xl: {
                baseFare: String(ratesQuery.data.rules.find((rule) => rule.rideType === "xl")?.baseFare ?? 0),
                perMile: String(ratesQuery.data.rules.find((rule) => rule.rideType === "xl")?.perMile ?? 0),
                perMinute: String(ratesQuery.data.rules.find((rule) => rule.rideType === "xl")?.perMinute ?? 0),
                multiplier: String(ratesQuery.data.rules.find((rule) => rule.rideType === "xl")?.multiplier ?? 1)
            }
        });
    }, [ratesQuery.data]);
    const availabilityMutation = useMutation({
        mutationFn: (available) => api.updateDriverAvailability(available, token),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ["driver-profile"] });
            void queryClient.invalidateQueries({ queryKey: ["driver-dues"] });
        }
    });
    const profileMutation = useMutation({
        mutationFn: () => api.updateDriverProfile({
            name: profileForm.name,
            phone: profileForm.phone,
            homeState: profileForm.homeState,
            homeCity: profileForm.homeCity,
            vehicle: {
                makeModel: profileForm.makeModel,
                plate: profileForm.plate,
                color: profileForm.color || undefined,
                rideType: profileForm.rideType,
                seats: Number(profileForm.seats)
            }
        }, token),
        onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["driver-profile"] })
    });
    const dispatchMutation = useMutation({
        mutationFn: () => api.updateDriverDispatchSettings({
            ...dispatchForm,
            serviceAreaStates: serviceAreaText
                .split(",")
                .map((state) => state.trim().toUpperCase())
                .filter(Boolean)
        }, token),
        onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["driver-dispatch-settings"] })
    });
    const rateMutation = useMutation({
        mutationFn: () => api.updateDriverRates({
            pricingMode: rateMode,
            rules: Object.keys(rateForm).map((rideType) => ({
                rideType,
                baseFare: Number(rateForm[rideType].baseFare),
                perMile: Number(rateForm[rideType].perMile),
                perMinute: Number(rateForm[rideType].perMinute),
                multiplier: Number(rateForm[rideType].multiplier)
            }))
        }, token),
        onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["driver-rates"] })
    });
    const acceptMutation = useMutation({
        mutationFn: (rideId) => api.acceptOffer(rideId, token),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ["driver-offers"] });
            void queryClient.invalidateQueries({ queryKey: ["driver-active-rides"] });
        }
    });
    const declineMutation = useMutation({
        mutationFn: (rideId) => api.declineOffer(rideId, token),
        onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["driver-offers"] })
    });
    useEffect(() => {
        if (!token) {
            return;
        }
        const socket = getSocket(token);
        const refresh = () => {
            void queryClient.invalidateQueries({ queryKey: ["driver-offers"] });
            void queryClient.invalidateQueries({ queryKey: ["driver-active-rides"] });
            void queryClient.invalidateQueries({ queryKey: ["driver-dues"] });
        };
        socket.on("ride.offer", refresh);
        socket.on("ride.status.changed", refresh);
        return () => {
            socket.off("ride.offer", refresh);
            socket.off("ride.status.changed", refresh);
        };
    }, [queryClient, token]);
    const outstandingDues = duesQuery.data?.outstanding ?? [];
    const dueHistory = duesQuery.data?.history ?? [];
    const payoutSettings = duesQuery.data?.payoutSettings;
    const suspended = duesQuery.data?.suspended ?? false;
    const community = communityQuery.data;
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { children: "Driver dashboard" }), _jsx(CardDescription, { children: "Go available, accept work, manage your market settings, and stay current on platform dues." })] }), _jsxs(CardContent, { className: "space-y-4", children: [_jsxs("div", { className: "flex flex-col gap-4 md:flex-row md:items-center md:justify-between", children: [_jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [_jsx("p", { className: "text-lg font-semibold", children: profileQuery.data?.name }), _jsx(Badge, { children: profileQuery.data?.pricingMode === "custom" ? "custom rates" : "platform rates" }), suspended ? _jsx(Badge, { className: "border-red-200 bg-red-50 text-red-700", children: "dues overdue" }) : null] }), _jsx("p", { className: "text-sm text-brand-ink/55", children: profileQuery.data?.homeCity && profileQuery.data?.homeState
                                                    ? `${profileQuery.data.homeCity}, ${profileQuery.data.homeState}`
                                                    : profileQuery.data?.vehicle?.makeModel ?? "Vehicle pending" }), _jsxs("p", { className: "text-sm text-brand-ink/45", children: [dispatchForm.localEnabled ? `Local ${dispatchForm.localRadiusMiles} mi` : "Local off", " \u00B7", " ", dispatchForm.serviceAreaEnabled
                                                        ? `States ${dispatchForm.serviceAreaStates.join(", ") || serviceAreaText || "none"}`
                                                        : "Service area off", " ", "\u00B7 ", dispatchForm.nationwideEnabled ? "Nationwide on" : "Nationwide off"] })] }), _jsx(Button, { variant: profileQuery.data?.available ? "default" : "outline", disabled: availabilityMutation.isPending || (!profileQuery.data?.available && suspended), onClick: () => availabilityMutation.mutate(!profileQuery.data?.available), children: profileQuery.data?.available ? "Set offline" : suspended ? "Clear dues to go available" : "Go available" })] }), suspended ? (_jsx("div", { className: "rounded-4xl border border-amber-500/20 bg-amber-50 p-4 text-sm text-amber-800", children: "You have overdue platform dues. New offers and availability are blocked until an admin marks those dues paid or waived." })) : null] })] }), _jsxs("div", { className: "grid gap-4 md:grid-cols-4", children: [_jsx(Card, { children: _jsxs(CardContent, { className: "p-6", children: [_jsx("p", { className: "text-sm text-brand-ink/55", children: "Incoming offers" }), _jsx("p", { className: "mt-2 text-3xl font-extrabold", children: offersQuery.data?.length ?? 0 })] }) }), _jsx(Card, { children: _jsxs(CardContent, { className: "p-6", children: [_jsx("p", { className: "text-sm text-brand-ink/55", children: "Active rides" }), _jsx("p", { className: "mt-2 text-3xl font-extrabold", children: activeRidesQuery.data?.length ?? 0 })] }) }), _jsx(Card, { children: _jsxs(CardContent, { className: "p-6", children: [_jsx("p", { className: "text-sm text-brand-ink/55", children: "Outstanding dues" }), _jsx("p", { className: "mt-2 text-3xl font-extrabold", children: formatMoney(duesQuery.data?.outstandingTotal ?? 0) })] }) }), _jsx(Card, { children: _jsxs(CardContent, { className: "p-6", children: [_jsx("p", { className: "text-sm text-brand-ink/55", children: "Community access" }), _jsx("p", { className: "mt-2 text-3xl font-extrabold", children: community?.eligibility.canVote ? "Full" : "Read" })] }) })] }), _jsxs("div", { className: "grid gap-6 xl:grid-cols-2", children: [_jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { children: "Profile" }), _jsx(CardDescription, { children: "Keep your contact info and vehicle basics current." })] }), _jsxs(CardContent, { className: "space-y-4", children: [_jsxs("div", { className: "grid gap-4 md:grid-cols-2", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { children: "Name" }), _jsx(Input, { value: profileForm.name, onChange: (event) => setProfileForm((current) => ({ ...current, name: event.target.value })) })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { children: "Phone" }), _jsx(Input, { value: profileForm.phone, onChange: (event) => setProfileForm((current) => ({ ...current, phone: event.target.value })) })] })] }), _jsxs("div", { className: "grid gap-4 md:grid-cols-2", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { children: "Home state" }), _jsx(Input, { value: profileForm.homeState, maxLength: 2, onChange: (event) => setProfileForm((current) => ({ ...current, homeState: event.target.value.toUpperCase() })) })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { children: "Home city" }), _jsx(Input, { value: profileForm.homeCity, onChange: (event) => setProfileForm((current) => ({ ...current, homeCity: event.target.value })) })] })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { children: "Vehicle make and model" }), _jsx(Input, { value: profileForm.makeModel, onChange: (event) => setProfileForm((current) => ({ ...current, makeModel: event.target.value })) })] }), _jsxs("div", { className: "grid gap-4 md:grid-cols-2", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { children: "Plate" }), _jsx(Input, { value: profileForm.plate, onChange: (event) => setProfileForm((current) => ({ ...current, plate: event.target.value })) })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { children: "Color" }), _jsx(Input, { value: profileForm.color, onChange: (event) => setProfileForm((current) => ({ ...current, color: event.target.value })) })] })] }), _jsxs("div", { className: "grid gap-4 md:grid-cols-2", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { children: "Ride type" }), _jsxs("select", { className: "h-11 w-full rounded-2xl border border-brand-ink/15 bg-white px-4 text-sm", value: profileForm.rideType, onChange: (event) => setProfileForm((current) => ({
                                                            ...current,
                                                            rideType: event.target.value
                                                        })), children: [_jsx("option", { value: "standard", children: "Standard" }), _jsx("option", { value: "suv", children: "SUV" }), _jsx("option", { value: "xl", children: "XL" })] })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { children: "Seats" }), _jsx(Input, { type: "number", min: 1, max: 12, value: profileForm.seats, onChange: (event) => setProfileForm((current) => ({ ...current, seats: event.target.value })) })] })] }), profileMutation.error ? _jsx("p", { className: "text-sm text-red-600", children: profileMutation.error.message }) : null, _jsx(Button, { onClick: () => profileMutation.mutate(), children: "Save profile" })] })] }), _jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { children: "Dispatch settings" }), _jsx(CardDescription, { children: "Choose whether you want nearby rides, specific states, or nationwide visibility." })] }), _jsxs(CardContent, { className: "space-y-4", children: [_jsxs("label", { className: "flex items-center justify-between gap-4 rounded-4xl border border-brand-ink/10 p-4", children: [_jsxs("div", { children: [_jsx("p", { className: "font-semibold", children: "Local dispatch" }), _jsx("p", { className: "text-sm text-brand-ink/55", children: "Receive rides inside your live-location radius." })] }), _jsx("input", { type: "checkbox", checked: dispatchForm.localEnabled, onChange: (event) => setDispatchForm((current) => ({ ...current, localEnabled: event.target.checked })) })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { children: "Local radius miles" }), _jsx(Input, { type: "number", min: 1, max: 500, value: dispatchForm.localRadiusMiles, onChange: (event) => setDispatchForm((current) => ({
                                                    ...current,
                                                    localRadiusMiles: Number(event.target.value) || 1
                                                })) })] }), _jsxs("label", { className: "flex items-center justify-between gap-4 rounded-4xl border border-brand-ink/10 p-4", children: [_jsxs("div", { children: [_jsx("p", { className: "font-semibold", children: "Service-area dispatch" }), _jsx("p", { className: "text-sm text-brand-ink/55", children: "Receive rides where the pickup state matches your approved markets." })] }), _jsx("input", { type: "checkbox", checked: dispatchForm.serviceAreaEnabled, onChange: (event) => setDispatchForm((current) => ({ ...current, serviceAreaEnabled: event.target.checked })) })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { children: "Service area states" }), _jsx(Input, { value: serviceAreaText, onChange: (event) => setServiceAreaText(event.target.value.toUpperCase()), placeholder: "VA, NY, NJ" })] }), _jsxs("label", { className: "flex items-center justify-between gap-4 rounded-4xl border border-brand-ink/10 p-4", children: [_jsxs("div", { children: [_jsx("p", { className: "font-semibold", children: "Nationwide dispatch" }), _jsx("p", { className: "text-sm text-brand-ink/55", children: "Receive eligible ride offers from anywhere in the US." })] }), _jsx("input", { type: "checkbox", checked: dispatchForm.nationwideEnabled, onChange: (event) => setDispatchForm((current) => ({ ...current, nationwideEnabled: event.target.checked })) })] }), dispatchMutation.error ? _jsx("p", { className: "text-sm text-red-600", children: dispatchMutation.error.message }) : null, _jsx(Button, { onClick: () => dispatchMutation.mutate(), children: "Save dispatch settings" })] })] })] }), _jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { children: "Pricing" }), _jsx(CardDescription, { children: "Stick with the platform market rate card or switch to your own custom rates. The rider still sees one all-in total." })] }), _jsxs(CardContent, { className: "space-y-6", children: [_jsxs("div", { className: "grid gap-3 md:grid-cols-2", children: [_jsxs("button", { type: "button", onClick: () => setRateMode("platform"), className: `rounded-4xl border p-4 text-left ${rateMode === "platform" ? "border-brand-ink bg-brand-ink text-white" : "border-brand-ink/10 bg-white"}`, children: [_jsx("p", { className: "font-semibold", children: "Use platform market rates" }), _jsx("p", { className: `mt-1 text-sm ${rateMode === "platform" ? "text-white/75" : "text-brand-ink/55"}`, children: "Riders keep the quoted all-in total when you accept." })] }), _jsxs("button", { type: "button", onClick: () => setRateMode("custom"), className: `rounded-4xl border p-4 text-left ${rateMode === "custom" ? "border-brand-ink bg-brand-ink text-white" : "border-brand-ink/10 bg-white"}`, children: [_jsx("p", { className: "font-semibold", children: "Use custom driver rates" }), _jsx("p", { className: `mt-1 text-sm ${rateMode === "custom" ? "text-white/75" : "text-brand-ink/55"}`, children: "The rider sees the platform estimate first, then your final accepted total takes over." })] })] }), Object.keys(rateForm).map((rideType) => (_jsxs("div", { className: "rounded-4xl border border-brand-ink/10 p-4", children: [_jsx("h3", { className: "mb-4 text-lg font-semibold capitalize", children: rideType }), _jsxs("div", { className: "grid gap-4 md:grid-cols-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { children: "Base fare" }), _jsx(Input, { value: rateForm[rideType].baseFare, onChange: (event) => setRateForm((current) => ({
                                                            ...current,
                                                            [rideType]: { ...current[rideType], baseFare: event.target.value }
                                                        })) })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { children: "Per mile" }), _jsx(Input, { value: rateForm[rideType].perMile, onChange: (event) => setRateForm((current) => ({
                                                            ...current,
                                                            [rideType]: { ...current[rideType], perMile: event.target.value }
                                                        })) })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { children: "Per minute" }), _jsx(Input, { value: rateForm[rideType].perMinute, onChange: (event) => setRateForm((current) => ({
                                                            ...current,
                                                            [rideType]: { ...current[rideType], perMinute: event.target.value }
                                                        })) })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { children: "Multiplier" }), _jsx(Input, { value: rateForm[rideType].multiplier, onChange: (event) => setRateForm((current) => ({
                                                            ...current,
                                                            [rideType]: { ...current[rideType], multiplier: event.target.value }
                                                        })) })] })] })] }, rideType))), rateMutation.error ? _jsx("p", { className: "text-sm text-red-600", children: rateMutation.error.message }) : null, _jsx(Button, { onClick: () => rateMutation.mutate(), children: "Save pricing" })] })] }), _jsxs("div", { className: "grid gap-6 lg:grid-cols-2", children: [_jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { children: "Incoming offers" }), _jsx(CardDescription, { children: "First accepted offer wins the trip. New work is blocked when dues are overdue." })] }), _jsxs(CardContent, { className: "space-y-4", children: [offersQuery.data?.map((ride) => {
                                        const pricing = getRidePricing(ride);
                                        return (_jsxs("div", { className: "rounded-4xl border border-brand-ink/10 p-4", children: [_jsxs("div", { className: "flex items-start justify-between gap-3", children: [_jsxs("div", { children: [_jsx("p", { className: "font-semibold", children: ride.pickup.address }), _jsx("p", { className: "text-sm text-brand-ink/55", children: ride.dropoff.address })] }), _jsx(Badge, { children: ride.rideType })] }), _jsxs("p", { className: "mt-3 text-sm text-brand-ink/55", children: [ride.estimatedMiles, " miles \u00B7 ", ride.estimatedMinutes, " minutes"] }), _jsxs("div", { className: "mt-4 grid gap-3 md:grid-cols-3", children: [_jsxs("div", { className: "rounded-3xl border border-brand-ink/10 p-3", children: [_jsx("p", { className: "text-xs uppercase tracking-[0.2em] text-brand-ink/40", children: "Customer total" }), _jsx("p", { className: "mt-1 font-semibold", children: formatMoney(pricing.customerTotal) })] }), _jsxs("div", { className: "rounded-3xl border border-brand-ink/10 p-3", children: [_jsx("p", { className: "text-xs uppercase tracking-[0.2em] text-brand-ink/40", children: "Your subtotal" }), _jsx("p", { className: "mt-1 font-semibold", children: formatMoney(pricing.subtotal) })] }), _jsxs("div", { className: "rounded-3xl border border-brand-ink/10 p-3", children: [_jsx("p", { className: "text-xs uppercase tracking-[0.2em] text-brand-ink/40", children: "Platform due" }), _jsx("p", { className: "mt-1 font-semibold", children: formatMoney(pricing.platformDue) })] })] }), _jsxs("div", { className: "mt-4 flex gap-3", children: [_jsx(Button, { className: "flex-1", disabled: suspended, onClick: () => acceptMutation.mutate(ride.id), children: "Accept" }), _jsx(Button, { variant: "outline", className: "flex-1", onClick: () => declineMutation.mutate(ride.id), children: "Decline" })] })] }, ride.id));
                                    }), !offersQuery.data?.length ? (_jsx("div", { className: "rounded-4xl border border-dashed border-brand-ink/15 p-6 text-center text-sm text-brand-ink/55", children: "No ride offers right now." })) : null] })] }), _jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { children: "Active rides" }), _jsx(CardDescription, { children: "Continue trip workflows, live tracking, and payout visibility." })] }), _jsxs(CardContent, { className: "space-y-4", children: [activeRidesQuery.data?.map((ride) => {
                                        const pricing = getRidePricing(ride);
                                        return (_jsxs(Link, { to: `/driver/rides/${ride.id}`, className: "block rounded-4xl border border-brand-ink/10 p-4 transition hover:bg-brand-sand/35", children: [_jsxs("div", { className: "flex items-center justify-between gap-3", children: [_jsxs("div", { children: [_jsx("p", { className: "font-semibold", children: ride.rider.name }), _jsx("p", { className: "text-sm text-brand-ink/55", children: ride.pickup.address })] }), _jsx(Badge, { children: ride.status.replaceAll("_", " ") })] }), _jsxs("div", { className: "mt-4 grid gap-3 md:grid-cols-3", children: [_jsxs("div", { children: [_jsx("p", { className: "text-xs uppercase tracking-[0.2em] text-brand-ink/40", children: "Customer total" }), _jsx("p", { className: "mt-1 text-sm font-semibold", children: formatMoney(pricing.customerTotal) })] }), _jsxs("div", { children: [_jsx("p", { className: "text-xs uppercase tracking-[0.2em] text-brand-ink/40", children: "Your subtotal" }), _jsx("p", { className: "mt-1 text-sm font-semibold", children: formatMoney(pricing.subtotal) })] }), _jsxs("div", { children: [_jsx("p", { className: "text-xs uppercase tracking-[0.2em] text-brand-ink/40", children: "Platform due" }), _jsx("p", { className: "mt-1 text-sm font-semibold", children: formatMoney(pricing.platformDue) })] })] })] }, ride.id));
                                    }), !activeRidesQuery.data?.length ? (_jsx("div", { className: "rounded-4xl border border-dashed border-brand-ink/15 p-6 text-center text-sm text-brand-ink/55", children: "No active rides yet." })) : null] })] })] }), _jsxs("div", { className: "grid gap-6 xl:grid-cols-[1.1fr_0.9fr]", children: [_jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { children: "Platform dues" }), _jsx(CardDescription, { children: "Drivers keep the subtotal and send the 5% platform due manually within 48 hours of completed rides." })] }), _jsxs(CardContent, { className: "space-y-6", children: [_jsxs("div", { className: "grid gap-4 md:grid-cols-3", children: [_jsxs("div", { className: "rounded-4xl border border-brand-ink/10 p-4", children: [_jsx("p", { className: "text-sm text-brand-ink/55", children: "Outstanding" }), _jsx("p", { className: "mt-2 text-2xl font-extrabold", children: formatMoney(duesQuery.data?.outstandingTotal ?? 0) })] }), _jsxs("div", { className: "rounded-4xl border border-brand-ink/10 p-4", children: [_jsx("p", { className: "text-sm text-brand-ink/55", children: "Overdue count" }), _jsx("p", { className: "mt-2 text-2xl font-extrabold", children: duesQuery.data?.overdueCount ?? 0 })] }), _jsxs("div", { className: "rounded-4xl border border-brand-ink/10 p-4", children: [_jsx("p", { className: "text-sm text-brand-ink/55", children: "Status" }), _jsx("p", { className: "mt-2 text-2xl font-extrabold", children: suspended ? "Suspended" : "Clear" })] })] }), _jsxs("div", { className: "rounded-4xl border border-brand-ink/10 bg-brand-sand/35 p-4 text-sm text-brand-ink/65", children: [_jsx("p", { className: "font-semibold text-brand-ink", children: "Where to send dues" }), _jsxs("div", { className: "mt-3 grid gap-2", children: [_jsxs("p", { children: ["Cash App: ", payoutSettings?.cashAppHandle || "Not set yet"] }), _jsxs("p", { children: ["Zelle: ", payoutSettings?.zelleHandle || "Not set yet"] }), _jsxs("p", { children: ["Jim: ", payoutSettings?.jimHandle || "Not set yet"] }), _jsxs("p", { children: ["Cash: ", payoutSettings?.cashInstructions || "Not set yet"] }), _jsxs("p", { children: ["Other: ", payoutSettings?.otherInstructions || "Not set yet"] })] })] }), _jsxs("div", { className: "space-y-3", children: [_jsx("p", { className: "font-semibold", children: "Outstanding dues" }), outstandingDues.length ? (outstandingDues.map((due) => (_jsx("div", { className: "rounded-4xl border border-brand-ink/10 p-4", children: _jsxs("div", { className: "flex flex-col gap-3 md:flex-row md:items-start md:justify-between", children: [_jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("p", { className: "font-semibold", children: due.ride.pickupAddress }), _jsx(Badge, { children: due.status })] }), _jsx("p", { className: "text-sm text-brand-ink/55", children: due.ride.dropoffAddress }), _jsxs("p", { className: "text-sm text-brand-ink/45", children: ["Due by ", formatDateTime(due.dueAt)] })] }), _jsxs("div", { className: "text-left md:text-right", children: [_jsx("p", { className: "font-semibold", children: formatMoney(due.amount) }), _jsxs("p", { className: "text-sm text-brand-ink/55", children: ["Ride subtotal: ", formatMoney(due.ride.subtotal)] }), _jsxs("p", { className: "text-sm text-brand-ink/45", children: ["Customer paid: ", formatMoney(due.ride.customerTotal)] })] })] }) }, due.id)))) : (_jsx("div", { className: "rounded-4xl border border-dashed border-brand-ink/15 p-6 text-sm text-brand-ink/55", children: "No outstanding dues right now." }))] }), _jsxs("div", { className: "space-y-3", children: [_jsx("p", { className: "font-semibold", children: "Recent due history" }), dueHistory.length ? (dueHistory.slice(0, 5).map((due) => (_jsxs("div", { className: "flex items-center justify-between rounded-4xl border border-brand-ink/10 p-4", children: [_jsxs("div", { children: [_jsx("p", { className: "font-semibold", children: due.ride.riderName }), _jsxs("p", { className: "text-sm text-brand-ink/55", children: [due.status, " \u00B7 ", formatDateTime(due.updatedAt)] })] }), _jsx("p", { className: "font-semibold", children: formatMoney(due.amount) })] }, due.id)))) : (_jsx("div", { className: "rounded-4xl border border-dashed border-brand-ink/15 p-6 text-sm text-brand-ink/55", children: "Paid or waived dues will appear here." }))] })] })] }), _jsxs("div", { className: "space-y-6", children: [_jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { children: "Community board" }), _jsx(CardDescription, { children: "Drivers can create proposals, vote, and comment immediately. Riders unlock those actions after 51 completed rides." })] }), _jsxs(CardContent, { className: "space-y-4", children: [_jsxs("div", { className: "rounded-4xl border border-brand-ink/10 bg-white p-4", children: [_jsx("p", { className: "font-semibold", children: "Your access" }), _jsx("p", { className: "mt-2 text-sm text-brand-ink/60", children: community?.eligibility.reason ?? "You have full community access." })] }), community?.proposals.slice(0, 3).map((proposal) => (_jsxs("div", { className: "rounded-4xl border border-brand-ink/10 p-4", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [_jsx("p", { className: "font-semibold", children: proposal.title }), proposal.pinned ? _jsx(Badge, { children: "pinned" }) : null, proposal.closed ? _jsx(Badge, { className: "bg-brand-ink/5", children: "closed" }) : null] }), _jsx("p", { className: "mt-2 text-sm text-brand-ink/60", children: proposal.body }), _jsxs("p", { className: "mt-3 text-xs uppercase tracking-[0.2em] text-brand-ink/40", children: [proposal.yesVotes, " yes \u00B7 ", proposal.noVotes, " no \u00B7 ", proposal.commentCount, " comments"] })] }, proposal.id))), !community?.proposals.length ? (_jsx("div", { className: "rounded-4xl border border-dashed border-brand-ink/15 p-6 text-sm text-brand-ink/55", children: "No proposals yet. You can start the first one from the community board." })) : null, _jsx(Link, { to: "/community", className: "inline-flex items-center justify-center rounded-2xl bg-brand-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-black", children: "Open community board" })] })] }), shareQuery.data ? (_jsx(ShareQrCard, { title: "Your driver referral QR", description: "Share this rider-growth link from the driver side. It still points riders back to the booking flow.", shareUrl: shareQuery.data.shareUrl, referralCode: shareQuery.data.referralCode, fileName: `realdrive-driver-${shareQuery.data.referralCode.toLowerCase()}` })) : null] })] })] }));
}
