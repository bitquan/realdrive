import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useDeferredValue, useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Banknote, Car, CheckCircle2, Clock3, CreditCard, MapPin, Route, Shield, Sparkles, Users, Wallet } from "lucide-react";
import { ShareQrCard } from "@/components/share/share-qr-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { formatMoney, userHasRole } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
const paymentMethods = [
    { id: "jim", label: "Pay with Jim", icon: Wallet },
    { id: "cashapp", label: "Cash App", icon: CreditCard },
    { id: "cash", label: "Cash", icon: Banknote }
];
function Stat({ icon: Icon, label, value }) {
    return (_jsx("div", { className: "rounded-4xl border border-brand-ink/10 bg-white/90 p-4 shadow-soft", children: _jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "rounded-2xl bg-brand-ink/5 p-3", children: _jsx(Icon, { className: "h-5 w-5" }) }), _jsxs("div", { children: [_jsx("p", { className: "text-xs uppercase tracking-[0.24em] text-brand-ink/45", children: label }), _jsx("p", { className: "text-lg font-semibold", children: value })] })] }) }));
}
export function HomePage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [searchParams] = useSearchParams();
    const referredByCode = searchParams.get("ref") ?? undefined;
    const [bookingForm, setBookingForm] = useState({
        riderName: "",
        phone: "",
        email: "",
        pickupAddress: "",
        dropoffAddress: "",
        rideType: "standard",
        paymentMethod: "jim",
        scheduledFor: "",
        scheduleMode: "now"
    });
    const [leadForm, setLeadForm] = useState({
        name: "",
        email: "",
        phone: ""
    });
    useEffect(() => {
        if (!user) {
            return;
        }
        setBookingForm((current) => ({
            ...current,
            riderName: current.riderName || user.name,
            phone: current.phone || user.phone || "",
            email: current.email || user.email || ""
        }));
    }, [user]);
    const deferredQuoteInput = useDeferredValue({
        pickupAddress: bookingForm.pickupAddress,
        dropoffAddress: bookingForm.dropoffAddress,
        rideType: bookingForm.rideType
    });
    const publicDriversQuery = useQuery({
        queryKey: ["public-drivers"],
        queryFn: api.publicDrivers
    });
    const referredByQuery = useQuery({
        queryKey: ["referral-resolve", referredByCode],
        queryFn: () => api.resolveShare(referredByCode),
        enabled: Boolean(referredByCode)
    });
    const quoteQuery = useQuery({
        queryKey: ["public-ride-quote", deferredQuoteInput],
        queryFn: () => api.quoteRide({
            pickupAddress: deferredQuoteInput.pickupAddress,
            dropoffAddress: deferredQuoteInput.dropoffAddress,
            rideType: deferredQuoteInput.rideType
        }),
        enabled: deferredQuoteInput.pickupAddress.length > 3 && deferredQuoteInput.dropoffAddress.length > 3
    });
    const bookingMutation = useMutation({
        mutationFn: api.createPublicRide,
        onSuccess: (result) => {
            if (result.ride.publicTrackingToken) {
                void navigate(`/track/${result.ride.publicTrackingToken}`);
            }
        }
    });
    const riderLeadMutation = useMutation({
        mutationFn: api.createRiderLead
    });
    const availableDriver = publicDriversQuery.data?.find((entry) => entry.available) ?? publicDriversQuery.data?.[0];
    const canBook = Boolean(bookingForm.riderName) &&
        Boolean(bookingForm.phone) &&
        Boolean(bookingForm.pickupAddress) &&
        Boolean(bookingForm.dropoffAddress) &&
        !bookingMutation.isPending;
    return (_jsxs("div", { className: "space-y-6", children: [_jsx("section", { className: "rounded-[2rem] border border-brand-ink/10 bg-white/90 p-6 shadow-soft md:p-8", children: _jsxs("div", { className: "flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between", children: [_jsxs("div", { className: "max-w-3xl", children: [_jsxs(Badge, { className: "gap-2 border-brand-moss/20 bg-brand-mist", children: [_jsx(Shield, { className: "h-4 w-4" }), "Rider-first launch pilot"] }), _jsx("h1", { className: "mt-5 text-3xl font-extrabold tracking-tight md:text-5xl", children: "Book a RealDrive ride fast, pay outside the app, and share your own rider QR after booking." }), _jsx("p", { className: "mt-4 text-sm leading-6 text-brand-ink/60 md:text-base", children: "This pilot is focused on rider growth first. Guests can book without OTP, track their ride from a link, and get a personal referral QR to share with friends." }), _jsxs("div", { className: "mt-5 flex flex-wrap gap-3", children: [_jsx("a", { href: "#book", className: "inline-flex items-center justify-center rounded-2xl bg-brand-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-black", children: "Book a ride" }), _jsx(Link, { to: "/driver/signup", className: "inline-flex items-center justify-center rounded-2xl border border-brand-ink/15 bg-white px-4 py-2 text-sm font-semibold text-brand-ink transition hover:bg-brand-sand/60", children: "Driver signup" }), userHasRole(user, "rider") ? (_jsx(Link, { to: "/rider/rides", className: "inline-flex items-center justify-center rounded-2xl border border-brand-ink/15 bg-white px-4 py-2 text-sm font-semibold text-brand-ink transition hover:bg-brand-sand/60", children: "Your rides" })) : null] })] }), _jsxs("div", { className: "w-full max-w-sm rounded-4xl border border-brand-ink/10 bg-brand-sand/60 p-5 text-sm shadow-soft", children: [_jsx("p", { className: "font-semibold", children: "Launch mode" }), _jsxs("div", { className: "mt-3 space-y-2 text-brand-ink/65", children: [_jsx("p", { children: "Guest booking is live." }), _jsx("p", { children: "Driver signup is live with admin approval." }), _jsx("p", { children: "Referrals are tracked, not rewarded yet." })] }), availableDriver ? (_jsxs("div", { className: "mt-4 rounded-3xl border border-brand-ink/10 bg-white p-4", children: [_jsx("p", { className: "text-xs uppercase tracking-[0.22em] text-brand-ink/40", children: "Available driver right now" }), _jsx("p", { className: "mt-2 font-semibold", children: availableDriver.name }), _jsx("p", { className: "text-sm text-brand-ink/55", children: availableDriver.vehicle?.makeModel ?? "Vehicle ready" })] })) : null] })] }) }), referredByQuery.data?.ownerName ? (_jsxs("div", { className: "rounded-4xl border border-brand-copper/20 bg-brand-sand/50 p-4 text-sm text-brand-ink/70", children: ["You were referred by ", _jsx("span", { className: "font-semibold", children: referredByQuery.data.ownerName }), ". Your booking or email signup will keep that referral attached."] })) : null, _jsxs("div", { className: "grid gap-4 md:grid-cols-3", children: [_jsx(Stat, { icon: Car, label: "Driver setup", value: availableDriver ? "Owner online" : "On demand" }), _jsx(Stat, { icon: Clock3, label: "Estimated pickup", value: quoteQuery.data ? `${Math.max(5, Math.round(quoteQuery.data.estimatedMinutes / 2))} min` : "Live quotes" }), _jsx(Stat, { icon: MapPin, label: "Routing", value: quoteQuery.data?.routeProvider === "mapbox" ? "Mapbox live" : "Ready with fallback" })] }), _jsxs("div", { className: "grid gap-6 lg:grid-cols-[1.2fr_0.8fr]", children: [_jsxs(Card, { id: "book", children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { className: "text-2xl", children: "Book a ride as a guest" }), _jsx(CardDescription, { children: "No OTP required for the pilot. You will get a tracking link and your own rider referral QR after booking." })] }), _jsxs(CardContent, { className: "space-y-6", children: [_jsxs("div", { className: "grid gap-4 md:grid-cols-3", children: [_jsxs("div", { className: "space-y-2 md:col-span-2", children: [_jsx(Label, { htmlFor: "riderName", children: "Full name" }), _jsx(Input, { id: "riderName", placeholder: "Jordan Smith", value: bookingForm.riderName, onChange: (event) => setBookingForm((current) => ({ ...current, riderName: event.target.value })) })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "riderPhone", children: "Phone number" }), _jsx(Input, { id: "riderPhone", placeholder: "(555) 555-5555", value: bookingForm.phone, onChange: (event) => setBookingForm((current) => ({ ...current, phone: event.target.value })) })] })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "riderEmail", children: "Email for updates and your share link" }), _jsx(Input, { id: "riderEmail", type: "email", placeholder: "optional@example.com", value: bookingForm.email, onChange: (event) => setBookingForm((current) => ({ ...current, email: event.target.value })) })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "pickupAddress", children: "Pickup address" }), _jsx(Input, { id: "pickupAddress", placeholder: "123 Main St", value: bookingForm.pickupAddress, onChange: (event) => setBookingForm((current) => ({ ...current, pickupAddress: event.target.value })) })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "dropoffAddress", children: "Dropoff address" }), _jsx(Input, { id: "dropoffAddress", placeholder: "Airport, downtown, hotel, work...", value: bookingForm.dropoffAddress, onChange: (event) => setBookingForm((current) => ({ ...current, dropoffAddress: event.target.value })) })] }), _jsxs("div", { className: "grid gap-4 md:grid-cols-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "rideType", children: "Ride type" }), _jsxs("select", { id: "rideType", className: "h-11 w-full rounded-2xl border border-brand-ink/15 bg-white px-4 text-sm", value: bookingForm.rideType, onChange: (event) => setBookingForm((current) => ({
                                                            ...current,
                                                            rideType: event.target.value
                                                        })), children: [_jsx("option", { value: "standard", children: "Standard" }), _jsx("option", { value: "suv", children: "SUV" }), _jsx("option", { value: "xl", children: "XL / Group" })] })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "scheduleMode", children: "Timing" }), _jsxs("select", { id: "scheduleMode", className: "h-11 w-full rounded-2xl border border-brand-ink/15 bg-white px-4 text-sm", value: bookingForm.scheduleMode, onChange: (event) => setBookingForm((current) => ({
                                                            ...current,
                                                            scheduleMode: event.target.value
                                                        })), children: [_jsx("option", { value: "now", children: "Ride now" }), _jsx("option", { value: "scheduled", children: "Schedule later" })] })] }), _jsxs("div", { className: "space-y-2 md:col-span-2", children: [_jsx(Label, { htmlFor: "scheduledFor", children: "Scheduled pickup" }), _jsx(Input, { id: "scheduledFor", type: "datetime-local", disabled: bookingForm.scheduleMode === "now", value: bookingForm.scheduledFor, onChange: (event) => setBookingForm((current) => ({ ...current, scheduledFor: event.target.value })) })] })] }), _jsx("div", { className: "grid gap-3 md:grid-cols-3", children: paymentMethods.map(({ id, label, icon: Icon }) => {
                                            const active = bookingForm.paymentMethod === id;
                                            return (_jsx("button", { type: "button", onClick: () => setBookingForm((current) => ({
                                                    ...current,
                                                    paymentMethod: id
                                                })), className: `rounded-4xl border p-4 text-left transition ${active ? "border-brand-ink bg-brand-ink text-white" : "border-brand-ink/10 bg-white hover:bg-brand-sand/45"}`, children: _jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: `rounded-2xl p-3 ${active ? "bg-white/10" : "bg-brand-ink/5"}`, children: _jsx(Icon, { className: "h-5 w-5" }) }), _jsxs("div", { children: [_jsx("p", { className: "font-semibold", children: label }), _jsx("p", { className: `text-xs ${active ? "text-white/75" : "text-brand-ink/55"}`, children: "Collected outside the app" })] })] }) }, id));
                                        }) }), _jsx("div", { className: "rounded-4xl border border-brand-ink/10 bg-brand-sand/35 p-5", children: _jsxs("div", { className: "flex flex-col gap-3 md:flex-row md:items-center md:justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm text-brand-ink/55", children: "Estimated all-in fare" }), _jsx("p", { className: "text-3xl font-extrabold", children: formatMoney(quoteQuery.data?.estimatedCustomerTotal ?? 0) })] }), _jsx("div", { className: "text-sm text-brand-ink/60", children: quoteQuery.data ? (_jsxs("p", { children: [quoteQuery.data.estimatedMiles, " miles \u00B7 ", quoteQuery.data.estimatedMinutes, " minutes \u00B7 ", quoteQuery.data.routeProvider] })) : (_jsx("p", { children: "Enter pickup and dropoff to price the trip with real routing." })) })] }) }), _jsxs("div", { className: "flex flex-col gap-3 sm:flex-row", children: [_jsxs(Button, { className: "h-11 flex-1", disabled: !canBook, onClick: () => bookingMutation.mutate({
                                                    riderName: bookingForm.riderName,
                                                    phone: bookingForm.phone,
                                                    email: bookingForm.email || undefined,
                                                    pickupAddress: bookingForm.pickupAddress,
                                                    dropoffAddress: bookingForm.dropoffAddress,
                                                    rideType: bookingForm.rideType,
                                                    paymentMethod: bookingForm.paymentMethod,
                                                    scheduledFor: bookingForm.scheduleMode === "scheduled" && bookingForm.scheduledFor
                                                        ? new Date(bookingForm.scheduledFor).toISOString()
                                                        : null,
                                                    referredByCode
                                                }), children: [_jsx(Route, { className: "mr-2 h-4 w-4" }), "Book this ride"] }), _jsx(Button, { type: "button", variant: "outline", className: "h-11", onClick: () => setBookingForm({
                                                    riderName: user?.name ?? "",
                                                    phone: user?.phone ?? "",
                                                    email: user?.email ?? "",
                                                    pickupAddress: "",
                                                    dropoffAddress: "",
                                                    rideType: "standard",
                                                    paymentMethod: "jim",
                                                    scheduledFor: "",
                                                    scheduleMode: "now"
                                                }), children: "Reset" })] }), bookingMutation.error ? (_jsx("p", { className: "text-sm text-red-600", children: bookingMutation.error.message })) : null] })] }), _jsxs("div", { className: "space-y-6", children: [_jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { children: "Stay updated by email" }), _jsx(CardDescription, { children: "Not ready to book yet? Leave your info and still get your own rider share link." })] }), _jsxs(CardContent, { className: "space-y-4", children: [riderLeadMutation.isSuccess ? (_jsxs("div", { className: "rounded-4xl border border-green-700/10 bg-green-50 p-4 text-sm text-green-700", children: [_jsxs("div", { className: "flex items-center gap-2 font-semibold", children: [_jsx(CheckCircle2, { className: "h-4 w-4" }), "You are on the rider list"] }), _jsx("p", { className: "mt-2 text-green-700/85", children: "You can start sharing your link right away." })] })) : null, _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "leadName", children: "Name" }), _jsx(Input, { id: "leadName", placeholder: "Jordan Smith", value: leadForm.name, onChange: (event) => setLeadForm((current) => ({ ...current, name: event.target.value })) })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "leadEmail", children: "Email" }), _jsx(Input, { id: "leadEmail", type: "email", placeholder: "jordan@example.com", value: leadForm.email, onChange: (event) => setLeadForm((current) => ({ ...current, email: event.target.value })) })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "leadPhone", children: "Phone" }), _jsx(Input, { id: "leadPhone", placeholder: "Optional", value: leadForm.phone, onChange: (event) => setLeadForm((current) => ({ ...current, phone: event.target.value })) })] }), _jsxs(Button, { className: "w-full", disabled: !leadForm.name || !leadForm.email || riderLeadMutation.isPending, onClick: () => riderLeadMutation.mutate({
                                                    ...leadForm,
                                                    phone: leadForm.phone || undefined,
                                                    referredByCode
                                                }), children: [_jsx(Sparkles, { className: "mr-2 h-4 w-4" }), "Save rider interest"] }), riderLeadMutation.error ? (_jsx("p", { className: "text-sm text-red-600", children: riderLeadMutation.error.message })) : null] })] }), riderLeadMutation.data?.share ? (_jsx(ShareQrCard, { title: "Your rider referral QR", description: "Share this from your phone or save the QR for tomorrow\u2019s test.", shareUrl: riderLeadMutation.data.share.shareUrl, referralCode: riderLeadMutation.data.share.referralCode, fileName: `realdrive-rider-${riderLeadMutation.data.share.referralCode.toLowerCase()}` })) : null, _jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { children: "Why this flow is cheaper" }), _jsx(CardDescription, { children: "Tomorrow\u2019s pilot stays lean while leaving the future driver system intact." })] }), _jsxs(CardContent, { className: "space-y-3 text-sm text-brand-ink/60", children: [_jsx("p", { children: "Guests can book and track without SMS verification, so Twilio can stay off for the pilot." }), _jsx("p", { children: "Real Mapbox routing is still used for pricing and maps because you already have a key." }), _jsx("p", { children: "Drivers share rider-growth links too, and new drivers can now apply for real accounts pending approval." }), _jsxs("p", { className: "pt-2", children: [_jsx(Link, { to: "/driver/login", className: "font-semibold text-brand-copper hover:underline", children: "Approved driver login" }), " · ", _jsx(Link, { to: "/admin/login", className: "font-semibold text-brand-copper hover:underline", children: "Admin login" })] })] })] }), _jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { children: "Public pilot surfaces" }), _jsx(CardDescription, { children: "Use the rider path as the primary promotion channel." })] }), _jsxs(CardContent, { className: "space-y-3", children: [_jsxs("div", { className: "rounded-4xl border border-brand-ink/10 p-4", children: [_jsx("p", { className: "font-semibold", children: "Rider path" }), _jsx("p", { className: "mt-1 text-sm text-brand-ink/55", children: "Guest booking, tracking page, and personal rider QR." })] }), _jsxs("div", { className: "rounded-4xl border border-brand-ink/10 p-4", children: [_jsx("p", { className: "font-semibold", children: "Driver path" }), _jsx("p", { className: "mt-1 text-sm text-brand-ink/55", children: "Real signup plus admin approval before anyone can accept rides." })] }), _jsxs("div", { className: "rounded-4xl border border-brand-ink/10 p-4", children: [_jsx("p", { className: "font-semibold", children: "Referral path" }), _jsx("p", { className: "mt-1 text-sm text-brand-ink/55", children: "Both riders and drivers can share links that point back to this rider flow." })] }), _jsxs(Link, { to: "/driver/signup", className: "inline-flex w-full items-center justify-center rounded-2xl border border-brand-ink/15 bg-white px-4 py-2 text-sm font-semibold text-brand-ink transition hover:bg-brand-sand/60", children: [_jsx(Users, { className: "mr-2 h-4 w-4" }), "Open driver signup page"] })] })] })] })] })] }));
}
