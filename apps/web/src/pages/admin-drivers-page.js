import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
function DriverEditor({ driver }) {
    const { token } = useAuth();
    const queryClient = useQueryClient();
    const [form, setForm] = useState({
        name: driver.name,
        homeState: driver.homeState ?? "",
        homeCity: driver.homeCity ?? "",
        pricingMode: driver.pricingMode,
        localEnabled: driver.dispatchSettings.localEnabled,
        localRadiusMiles: String(driver.dispatchSettings.localRadiusMiles),
        serviceAreaEnabled: driver.dispatchSettings.serviceAreaEnabled,
        serviceAreaStates: driver.dispatchSettings.serviceAreaStates.join(", "),
        nationwideEnabled: driver.dispatchSettings.nationwideEnabled
    });
    useEffect(() => {
        setForm({
            name: driver.name,
            homeState: driver.homeState ?? "",
            homeCity: driver.homeCity ?? "",
            pricingMode: driver.pricingMode,
            localEnabled: driver.dispatchSettings.localEnabled,
            localRadiusMiles: String(driver.dispatchSettings.localRadiusMiles),
            serviceAreaEnabled: driver.dispatchSettings.serviceAreaEnabled,
            serviceAreaStates: driver.dispatchSettings.serviceAreaStates.join(", "),
            nationwideEnabled: driver.dispatchSettings.nationwideEnabled
        });
    }, [driver]);
    const updateMutation = useMutation({
        mutationFn: () => api.updateDriver(driver.id, {
            name: form.name,
            homeState: form.homeState || null,
            homeCity: form.homeCity || null,
            pricingMode: form.pricingMode,
            dispatchSettings: {
                localEnabled: form.localEnabled,
                localRadiusMiles: Number(form.localRadiusMiles) || 1,
                serviceAreaEnabled: form.serviceAreaEnabled,
                serviceAreaStates: form.serviceAreaStates
                    .split(",")
                    .map((state) => state.trim().toUpperCase())
                    .filter(Boolean),
                nationwideEnabled: form.nationwideEnabled
            }
        }, token),
        onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin-drivers"] })
    });
    const approvalMutation = useMutation({
        mutationFn: (approvalStatus) => api.updateDriverApproval(driver.id, { approvalStatus }, token),
        onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin-drivers"] })
    });
    const availabilityMutation = useMutation({
        mutationFn: () => api.updateDriver(driver.id, { available: !driver.available }, token),
        onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin-drivers"] })
    });
    return (_jsxs("div", { className: "rounded-4xl border border-brand-ink/10 p-4", children: [_jsxs("div", { className: "flex flex-col gap-3 md:flex-row md:items-start md:justify-between", children: [_jsxs("div", { children: [_jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [_jsx("p", { className: "font-semibold", children: driver.name }), _jsx(Badge, { children: driver.approvalStatus }), _jsx(Badge, { children: driver.available ? "available" : "offline" }), _jsx(Badge, { children: driver.pricingMode === "platform" ? "platform rates" : "custom rates" })] }), _jsxs("p", { className: "mt-1 text-sm text-brand-ink/55", children: [driver.email ?? "No email", " \u00B7 ", driver.phone ?? "No phone"] }), _jsxs("p", { className: "text-sm text-brand-ink/45", children: [driver.vehicle?.makeModel ?? "No vehicle", " \u00B7 ", driver.vehicle?.plate ?? "No plate"] })] }), _jsxs("div", { className: "flex flex-wrap gap-2", children: [driver.approvalStatus !== "approved" ? (_jsx(Button, { variant: "outline", onClick: () => approvalMutation.mutate("approved"), children: "Approve" })) : null, driver.approvalStatus !== "rejected" ? (_jsx(Button, { variant: "ghost", onClick: () => approvalMutation.mutate("rejected"), children: "Reject" })) : null, _jsx(Button, { variant: "outline", onClick: () => availabilityMutation.mutate(), children: "Toggle availability" })] })] }), _jsxs("div", { className: "mt-5 grid gap-4 lg:grid-cols-2", children: [_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { children: "Name" }), _jsx(Input, { value: form.name, onChange: (event) => setForm((current) => ({ ...current, name: event.target.value })) })] }), _jsxs("div", { className: "grid gap-4 md:grid-cols-2", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { children: "Home state" }), _jsx(Input, { value: form.homeState, maxLength: 2, onChange: (event) => setForm((current) => ({ ...current, homeState: event.target.value.toUpperCase() })) })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { children: "Home city" }), _jsx(Input, { value: form.homeCity, onChange: (event) => setForm((current) => ({ ...current, homeCity: event.target.value })) })] })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { children: "Pricing mode" }), _jsxs("select", { className: "h-11 w-full rounded-2xl border border-brand-ink/15 bg-white px-4 text-sm", value: form.pricingMode, onChange: (event) => setForm((current) => ({
                                            ...current,
                                            pricingMode: event.target.value
                                        })), children: [_jsx("option", { value: "platform", children: "Platform" }), _jsx("option", { value: "custom", children: "Custom" })] })] })] }), _jsxs("div", { className: "space-y-4", children: [_jsxs("label", { className: "flex items-center justify-between rounded-4xl border border-brand-ink/10 p-4", children: [_jsx("span", { className: "font-semibold", children: "Local dispatch" }), _jsx("input", { type: "checkbox", checked: form.localEnabled, onChange: (event) => setForm((current) => ({ ...current, localEnabled: event.target.checked })) })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { children: "Local radius miles" }), _jsx(Input, { type: "number", value: form.localRadiusMiles, onChange: (event) => setForm((current) => ({ ...current, localRadiusMiles: event.target.value })) })] }), _jsxs("label", { className: "flex items-center justify-between rounded-4xl border border-brand-ink/10 p-4", children: [_jsx("span", { className: "font-semibold", children: "Service-area dispatch" }), _jsx("input", { type: "checkbox", checked: form.serviceAreaEnabled, onChange: (event) => setForm((current) => ({ ...current, serviceAreaEnabled: event.target.checked })) })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { children: "Service area states" }), _jsx(Input, { value: form.serviceAreaStates, onChange: (event) => setForm((current) => ({ ...current, serviceAreaStates: event.target.value.toUpperCase() })), placeholder: "VA, NY" })] }), _jsxs("label", { className: "flex items-center justify-between rounded-4xl border border-brand-ink/10 p-4", children: [_jsx("span", { className: "font-semibold", children: "Nationwide dispatch" }), _jsx("input", { type: "checkbox", checked: form.nationwideEnabled, onChange: (event) => setForm((current) => ({ ...current, nationwideEnabled: event.target.checked })) })] })] })] }), updateMutation.error ? _jsx("p", { className: "mt-3 text-sm text-red-600", children: updateMutation.error.message }) : null, _jsx("div", { className: "mt-4", children: _jsx(Button, { onClick: () => updateMutation.mutate(), children: "Save driver settings" }) })] }));
}
export function AdminDriversPage() {
    const { token } = useAuth();
    const driversQuery = useQuery({
        queryKey: ["admin-drivers"],
        queryFn: () => api.listDrivers(token)
    });
    const pending = (driversQuery.data ?? []).filter((driver) => driver.approvalStatus === "pending");
    const approvedOrRejected = (driversQuery.data ?? []).filter((driver) => driver.approvalStatus !== "pending");
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { children: "Pending driver applications" }), _jsx(CardDescription, { children: "Approve new drivers before they can log into the driver app." })] }), _jsx(CardContent, { className: "space-y-4", children: pending.length ? (pending.map((driver) => _jsx(DriverEditor, { driver: driver }, driver.id))) : (_jsx("div", { className: "rounded-4xl border border-dashed border-brand-ink/15 p-6 text-sm text-brand-ink/55", children: "No pending driver applications right now." })) })] }), _jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { children: "All drivers" }), _jsx(CardDescription, { children: "Review approved drivers, reject accounts, and override dispatch or pricing mode settings." })] }), _jsx(CardContent, { className: "space-y-4", children: approvedOrRejected.map((driver) => (_jsx(DriverEditor, { driver: driver }, driver.id))) })] })] }));
}
