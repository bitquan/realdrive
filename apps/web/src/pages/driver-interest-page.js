import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, Route, Shield } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
export function DriverInterestPage() {
    const [form, setForm] = useState({
        name: "",
        email: "",
        password: "",
        phone: "",
        homeState: "",
        homeCity: "",
        makeModel: "",
        plate: "",
        color: "",
        rideType: "standard",
        seats: "4"
    });
    const signupMutation = useMutation({
        mutationFn: api.signupDriver
    });
    return (_jsxs("div", { className: "grid gap-6 lg:grid-cols-[1.1fr_0.9fr]", children: [_jsxs("section", { className: "rounded-[2rem] border border-brand-ink/10 bg-white/90 p-6 shadow-soft md:p-8", children: [_jsxs("div", { className: "inline-flex items-center gap-2 rounded-full border border-brand-moss/20 bg-brand-mist px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-brand-ink/55", children: [_jsx(Route, { className: "h-4 w-4" }), "Driver application"] }), _jsx("h1", { className: "mt-5 text-3xl font-extrabold tracking-tight md:text-5xl", children: "Apply to drive with RealDrive" }), _jsx("p", { className: "mt-4 max-w-2xl text-sm leading-6 text-brand-ink/60 md:text-base", children: "Drivers can sign up normally now. New accounts stay pending until an admin approves them, then you can log in and accept rides from your own market." }), _jsxs("div", { className: "mt-8 grid gap-4 md:grid-cols-2", children: [_jsxs("div", { className: "rounded-4xl border border-brand-ink/10 bg-brand-sand/40 p-5", children: [_jsx("p", { className: "font-semibold", children: "How approval works" }), _jsx("p", { className: "mt-2 text-sm text-brand-ink/60", children: "Your application creates a real driver account, but dispatch stays locked until an admin approves you." })] }), _jsxs("div", { className: "rounded-4xl border border-brand-ink/10 bg-brand-sand/40 p-5", children: [_jsx("p", { className: "font-semibold", children: "What you can control later" }), _jsx("p", { className: "mt-2 text-sm text-brand-ink/60", children: "After approval, you can set local, service-area, or nationwide dispatch and choose platform or custom rates." })] })] })] }), _jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { children: "Driver signup" }), _jsx(CardDescription, { children: "Submit your account, home market, and vehicle details." })] }), _jsxs(CardContent, { className: "space-y-4", children: [signupMutation.isSuccess ? (_jsxs("div", { className: "rounded-4xl border border-green-700/10 bg-green-50 p-5 text-green-700", children: [_jsxs("div", { className: "flex items-center gap-2 font-semibold", children: [_jsx(CheckCircle2, { className: "h-5 w-5" }), "Driver account created"] }), _jsx("p", { className: "mt-2 text-sm text-green-700/85", children: "Your account is pending admin approval. Once approved, you can sign in from the driver app." }), _jsx("p", { className: "mt-3 text-sm", children: _jsx(Link, { to: "/driver/login", className: "font-semibold text-green-800 underline underline-offset-2", children: "Go to driver login" }) })] })) : null, _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "driverName", children: "Full name" }), _jsx(Input, { id: "driverName", value: form.name, onChange: (event) => setForm((current) => ({ ...current, name: event.target.value })), placeholder: "Marcus Reed" })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "driverEmail", children: "Email" }), _jsx(Input, { id: "driverEmail", type: "email", value: form.email, onChange: (event) => setForm((current) => ({ ...current, email: event.target.value })), placeholder: "marcus@example.com" })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "driverPassword", children: "Password" }), _jsx(Input, { id: "driverPassword", type: "password", value: form.password, onChange: (event) => setForm((current) => ({ ...current, password: event.target.value })), placeholder: "At least 8 characters" })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "driverPhone", children: "Phone" }), _jsx(Input, { id: "driverPhone", value: form.phone, onChange: (event) => setForm((current) => ({ ...current, phone: event.target.value })), placeholder: "(555) 210-1991" })] }), _jsxs("div", { className: "grid gap-4 md:grid-cols-2", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "homeState", children: "Home state" }), _jsx(Input, { id: "homeState", value: form.homeState, onChange: (event) => setForm((current) => ({ ...current, homeState: event.target.value.toUpperCase() })), placeholder: "VA", maxLength: 2 })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "homeCity", children: "Home city" }), _jsx(Input, { id: "homeCity", value: form.homeCity, onChange: (event) => setForm((current) => ({ ...current, homeCity: event.target.value })), placeholder: "Richmond" })] })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "vehicleModel", children: "Vehicle make and model" }), _jsx(Input, { id: "vehicleModel", value: form.makeModel, onChange: (event) => setForm((current) => ({ ...current, makeModel: event.target.value })), placeholder: "2020 Toyota Camry" })] }), _jsxs("div", { className: "grid gap-4 md:grid-cols-2", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "vehiclePlate", children: "Plate" }), _jsx(Input, { id: "vehiclePlate", value: form.plate, onChange: (event) => setForm((current) => ({ ...current, plate: event.target.value })), placeholder: "ABC-1234" })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "vehicleColor", children: "Color" }), _jsx(Input, { id: "vehicleColor", value: form.color, onChange: (event) => setForm((current) => ({ ...current, color: event.target.value })), placeholder: "Black" })] })] }), _jsxs("div", { className: "grid gap-4 md:grid-cols-2", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "vehicleRideType", children: "Primary ride type" }), _jsxs("select", { id: "vehicleRideType", className: "h-11 w-full rounded-2xl border border-brand-ink/15 bg-white px-4 text-sm", value: form.rideType, onChange: (event) => setForm((current) => ({
                                                    ...current,
                                                    rideType: event.target.value
                                                })), children: [_jsx("option", { value: "standard", children: "Standard" }), _jsx("option", { value: "suv", children: "SUV" }), _jsx("option", { value: "xl", children: "XL" })] })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "vehicleSeats", children: "Seats" }), _jsx(Input, { id: "vehicleSeats", type: "number", min: 1, max: 12, value: form.seats, onChange: (event) => setForm((current) => ({ ...current, seats: event.target.value })) })] })] }), _jsxs(Button, { className: "w-full", disabled: signupMutation.isPending ||
                                    !form.name ||
                                    !form.email ||
                                    form.password.length < 8 ||
                                    !form.phone ||
                                    form.homeState.length !== 2 ||
                                    !form.homeCity ||
                                    !form.makeModel ||
                                    !form.plate ||
                                    !form.seats, onClick: () => signupMutation.mutate({
                                    name: form.name,
                                    email: form.email,
                                    password: form.password,
                                    phone: form.phone,
                                    homeState: form.homeState,
                                    homeCity: form.homeCity,
                                    vehicle: {
                                        makeModel: form.makeModel,
                                        plate: form.plate,
                                        color: form.color || undefined,
                                        rideType: form.rideType,
                                        seats: Number(form.seats)
                                    }
                                }), children: [_jsx(Shield, { className: "mr-2 h-4 w-4" }), "Create driver account"] }), signupMutation.error ? (_jsx("p", { className: "text-sm text-red-600", children: signupMutation.error.message })) : null] })] })] }));
}
