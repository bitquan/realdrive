import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Navigate, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { userHasRole } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
export function AdminSetupPage() {
    const navigate = useNavigate();
    const { user, setupAdmin } = useAuth();
    const [form, setForm] = useState({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
        createDriverProfile: true,
        phone: "",
        homeState: "",
        homeCity: "",
        makeModel: "",
        plate: "",
        color: "",
        rideType: "standard",
        seats: "4"
    });
    const statusQuery = useQuery({
        queryKey: ["admin-setup-status"],
        queryFn: api.adminSetupStatus
    });
    const setupMutation = useMutation({
        mutationFn: setupAdmin,
        onSuccess: () => {
            void navigate("/admin");
        }
    });
    if (userHasRole(user, "admin")) {
        return _jsx(Navigate, { to: "/admin", replace: true });
    }
    if (statusQuery.data && !statusQuery.data.needsSetup) {
        return _jsx(Navigate, { to: "/admin/login", replace: true });
    }
    const passwordsMatch = form.password === form.confirmPassword;
    const driverProfileComplete = !form.createDriverProfile ||
        (Boolean(form.phone) &&
            form.homeState.length === 2 &&
            Boolean(form.homeCity) &&
            Boolean(form.makeModel) &&
            Boolean(form.plate) &&
            Boolean(form.seats));
    return (_jsx("div", { className: "mx-auto max-w-lg", children: _jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { children: "Set up the first admin" }), _jsx(CardDescription, { children: "Create the first real admin account for this RealDrive workspace. You can also bootstrap your own driver profile now so the same login can switch between admin and driver." })] }), _jsxs(CardContent, { className: "space-y-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "adminSetupName", children: "Full name" }), _jsx(Input, { id: "adminSetupName", value: form.name, onChange: (event) => setForm((current) => ({ ...current, name: event.target.value })), placeholder: "Your name" })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "adminSetupEmail", children: "Email" }), _jsx(Input, { id: "adminSetupEmail", type: "email", value: form.email, onChange: (event) => setForm((current) => ({ ...current, email: event.target.value })), placeholder: "you@example.com" })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "adminSetupPassword", children: "Password" }), _jsx(Input, { id: "adminSetupPassword", type: "password", value: form.password, onChange: (event) => setForm((current) => ({ ...current, password: event.target.value })), placeholder: "At least 8 characters" })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "adminSetupConfirm", children: "Confirm password" }), _jsx(Input, { id: "adminSetupConfirm", type: "password", value: form.confirmPassword, onChange: (event) => setForm((current) => ({ ...current, confirmPassword: event.target.value })), placeholder: "Repeat password" })] }), _jsxs("label", { className: "flex items-center justify-between gap-4 rounded-4xl border border-brand-ink/10 p-4", children: [_jsxs("div", { children: [_jsx("p", { className: "font-semibold", children: "Also create my driver profile" }), _jsx("p", { className: "text-sm text-brand-ink/55", children: "Recommended if you want this first account to switch between admin and driver." })] }), _jsx("input", { type: "checkbox", checked: form.createDriverProfile, onChange: (event) => setForm((current) => ({
                                        ...current,
                                        createDriverProfile: event.target.checked
                                    })) })] }), form.createDriverProfile ? (_jsxs("div", { className: "space-y-4 rounded-4xl border border-brand-ink/10 bg-brand-sand/35 p-4", children: [_jsxs("div", { className: "grid gap-4 md:grid-cols-2", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "adminSetupPhone", children: "Driver phone" }), _jsx(Input, { id: "adminSetupPhone", value: form.phone, onChange: (event) => setForm((current) => ({ ...current, phone: event.target.value })), placeholder: "(555) 555-5555" })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "adminSetupHomeState", children: "Home state" }), _jsx(Input, { id: "adminSetupHomeState", value: form.homeState, maxLength: 2, onChange: (event) => setForm((current) => ({
                                                        ...current,
                                                        homeState: event.target.value.toUpperCase()
                                                    })), placeholder: "VA" })] })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "adminSetupHomeCity", children: "Home city" }), _jsx(Input, { id: "adminSetupHomeCity", value: form.homeCity, onChange: (event) => setForm((current) => ({ ...current, homeCity: event.target.value })), placeholder: "Richmond" })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "adminSetupVehicle", children: "Vehicle make and model" }), _jsx(Input, { id: "adminSetupVehicle", value: form.makeModel, onChange: (event) => setForm((current) => ({ ...current, makeModel: event.target.value })), placeholder: "2020 Toyota Camry" })] }), _jsxs("div", { className: "grid gap-4 md:grid-cols-3", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "adminSetupPlate", children: "Plate" }), _jsx(Input, { id: "adminSetupPlate", value: form.plate, onChange: (event) => setForm((current) => ({ ...current, plate: event.target.value })), placeholder: "ABC-1234" })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "adminSetupColor", children: "Color" }), _jsx(Input, { id: "adminSetupColor", value: form.color, onChange: (event) => setForm((current) => ({ ...current, color: event.target.value })), placeholder: "Black" })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "adminSetupSeats", children: "Seats" }), _jsx(Input, { id: "adminSetupSeats", type: "number", min: 1, max: 12, value: form.seats, onChange: (event) => setForm((current) => ({ ...current, seats: event.target.value })) })] })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "adminSetupRideType", children: "Primary ride type" }), _jsxs("select", { id: "adminSetupRideType", className: "h-11 w-full rounded-2xl border border-brand-ink/15 bg-white px-4 text-sm", value: form.rideType, onChange: (event) => setForm((current) => ({
                                                ...current,
                                                rideType: event.target.value
                                            })), children: [_jsx("option", { value: "standard", children: "Standard" }), _jsx("option", { value: "suv", children: "SUV" }), _jsx("option", { value: "xl", children: "XL" })] })] })] })) : null, !passwordsMatch ? _jsx("p", { className: "text-sm text-red-600", children: "Passwords do not match." }) : null, !driverProfileComplete ? (_jsx("p", { className: "text-sm text-red-600", children: "Complete the driver fields or turn off driver bootstrap." })) : null, setupMutation.error ? _jsx("p", { className: "text-sm text-red-600", children: setupMutation.error.message }) : null, _jsx(Button, { className: "w-full", disabled: setupMutation.isPending ||
                                statusQuery.isLoading ||
                                !statusQuery.data?.needsSetup ||
                                !form.name ||
                                !form.email ||
                                form.password.length < 8 ||
                                !passwordsMatch ||
                                !driverProfileComplete, onClick: () => setupMutation.mutate({
                                name: form.name,
                                email: form.email,
                                password: form.password,
                                createDriverProfile: form.createDriverProfile,
                                driverProfile: form.createDriverProfile
                                    ? {
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
                                    }
                                    : undefined
                            }), children: "Create admin account" })] })] }) }));
}
