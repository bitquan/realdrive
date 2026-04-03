import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { formatDateTime, formatMoney } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
function DueEditor({ due, token }) {
    const queryClient = useQueryClient();
    const [status, setStatus] = useState(due.status === "overdue" ? "pending" : due.status);
    const [paymentMethod, setPaymentMethod] = useState(due.paymentMethod ?? "cashapp");
    const [note, setNote] = useState(due.note ?? "");
    useEffect(() => {
        setStatus(due.status === "overdue" ? "pending" : due.status);
        setPaymentMethod(due.paymentMethod ?? "cashapp");
        setNote(due.note ?? "");
    }, [due]);
    const mutation = useMutation({
        mutationFn: () => api.updateAdminDue(due.id, {
            status,
            paymentMethod: status === "paid" ? paymentMethod : null,
            note: note || null
        }, token),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ["admin-dues"] });
            void queryClient.invalidateQueries({ queryKey: ["admin-rides"] });
            void queryClient.invalidateQueries({ queryKey: ["admin-drivers"] });
        }
    });
    return (_jsxs("div", { className: "rounded-4xl border border-brand-ink/10 p-4", children: [_jsxs("div", { className: "flex flex-col gap-4 md:flex-row md:items-start md:justify-between", children: [_jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [_jsx("p", { className: "font-semibold", children: due.driver.name }), _jsx(Badge, { className: due.status === "overdue" ? "border-red-200 bg-red-50 text-red-700" : undefined, children: due.status })] }), _jsx("p", { className: "text-sm text-brand-ink/55", children: due.driver.email ?? due.driver.phone ?? "No contact set" }), _jsx("p", { className: "text-sm text-brand-ink/55", children: due.ride.pickupAddress }), _jsx("p", { className: "text-sm text-brand-ink/55", children: due.ride.dropoffAddress }), _jsxs("p", { className: "text-sm text-brand-ink/45", children: ["Due by ", formatDateTime(due.dueAt)] })] }), _jsxs("div", { className: "text-left md:text-right", children: [_jsx("p", { className: "font-semibold", children: formatMoney(due.amount) }), _jsxs("p", { className: "text-sm text-brand-ink/55", children: ["Driver subtotal: ", formatMoney(due.ride.subtotal)] }), _jsxs("p", { className: "text-sm text-brand-ink/45", children: ["Customer total: ", formatMoney(due.ride.customerTotal)] })] })] }), _jsxs("div", { className: "mt-4 grid gap-4 lg:grid-cols-[0.8fr_0.8fr_1.4fr_auto]", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { children: "Status" }), _jsxs("select", { className: "h-11 w-full rounded-2xl border border-brand-ink/15 bg-white px-4 text-sm", value: status, onChange: (event) => setStatus(event.target.value), children: [_jsx("option", { value: "pending", children: "Pending" }), _jsx("option", { value: "paid", children: "Paid" }), _jsx("option", { value: "waived", children: "Waived" })] })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { children: "Payment method" }), _jsxs("select", { className: "h-11 w-full rounded-2xl border border-brand-ink/15 bg-white px-4 text-sm", value: paymentMethod, onChange: (event) => setPaymentMethod(event.target.value), children: [_jsx("option", { value: "cashapp", children: "Cash App" }), _jsx("option", { value: "zelle", children: "Zelle" }), _jsx("option", { value: "jim", children: "Jim" }), _jsx("option", { value: "cash", children: "Cash" }), _jsx("option", { value: "other", children: "Other" })] })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { children: "Admin note" }), _jsx(Input, { value: note, onChange: (event) => setNote(event.target.value), placeholder: "Optional note for this due" })] }), _jsx("div", { className: "flex items-end", children: _jsx(Button, { disabled: mutation.isPending, onClick: () => mutation.mutate(), children: "Save" }) })] }), mutation.error ? _jsx("p", { className: "mt-3 text-sm text-red-600", children: mutation.error.message }) : null] }));
}
export function AdminDuesPage() {
    const { token } = useAuth();
    const queryClient = useQueryClient();
    const duesQuery = useQuery({
        queryKey: ["admin-dues"],
        queryFn: () => api.listAdminDues(token),
        enabled: Boolean(token)
    });
    const [payoutForm, setPayoutForm] = useState({
        cashAppHandle: "",
        zelleHandle: "",
        jimHandle: "",
        cashInstructions: "",
        otherInstructions: ""
    });
    useEffect(() => {
        if (!duesQuery.data?.payoutSettings) {
            return;
        }
        setPayoutForm({
            cashAppHandle: duesQuery.data.payoutSettings.cashAppHandle ?? "",
            zelleHandle: duesQuery.data.payoutSettings.zelleHandle ?? "",
            jimHandle: duesQuery.data.payoutSettings.jimHandle ?? "",
            cashInstructions: duesQuery.data.payoutSettings.cashInstructions ?? "",
            otherInstructions: duesQuery.data.payoutSettings.otherInstructions ?? ""
        });
    }, [duesQuery.data?.payoutSettings]);
    const payoutMutation = useMutation({
        mutationFn: () => api.updatePlatformPayoutSettings({
            cashAppHandle: payoutForm.cashAppHandle || null,
            zelleHandle: payoutForm.zelleHandle || null,
            jimHandle: payoutForm.jimHandle || null,
            cashInstructions: payoutForm.cashInstructions || null,
            otherInstructions: payoutForm.otherInstructions || null
        }, token),
        onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin-dues"] })
    });
    const dues = duesQuery.data?.dues ?? [];
    const overdueDrivers = duesQuery.data?.overdueDrivers ?? [];
    const outstanding = dues.filter((due) => due.status === "pending" || due.status === "overdue");
    const history = dues.filter((due) => due.status === "paid" || due.status === "waived");
    const outstandingTotal = outstanding.reduce((total, due) => total + due.amount, 0);
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "grid gap-4 md:grid-cols-4", children: [_jsx(Card, { children: _jsxs(CardContent, { className: "p-6", children: [_jsx("p", { className: "text-sm text-brand-ink/55", children: "Outstanding dues" }), _jsx("p", { className: "mt-2 text-3xl font-extrabold", children: formatMoney(outstandingTotal) })] }) }), _jsx(Card, { children: _jsxs(CardContent, { className: "p-6", children: [_jsx("p", { className: "text-sm text-brand-ink/55", children: "Open dues" }), _jsx("p", { className: "mt-2 text-3xl font-extrabold", children: outstanding.length })] }) }), _jsx(Card, { children: _jsxs(CardContent, { className: "p-6", children: [_jsx("p", { className: "text-sm text-brand-ink/55", children: "Overdue drivers" }), _jsx("p", { className: "mt-2 text-3xl font-extrabold", children: overdueDrivers.length })] }) }), _jsx(Card, { children: _jsxs(CardContent, { className: "p-6", children: [_jsx("p", { className: "text-sm text-brand-ink/55", children: "Resolved dues" }), _jsx("p", { className: "mt-2 text-3xl font-extrabold", children: history.length })] }) })] }), _jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { children: "Platform payout instructions" }), _jsx(CardDescription, { children: "Drivers see these instructions in their dues area when they need to send the 5% platform due." })] }), _jsxs(CardContent, { className: "grid gap-4 md:grid-cols-2", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { children: "Cash App handle" }), _jsx(Input, { value: payoutForm.cashAppHandle, onChange: (event) => setPayoutForm((current) => ({ ...current, cashAppHandle: event.target.value })), placeholder: "$realdrive" })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { children: "Zelle handle" }), _jsx(Input, { value: payoutForm.zelleHandle, onChange: (event) => setPayoutForm((current) => ({ ...current, zelleHandle: event.target.value })), placeholder: "you@example.com" })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { children: "Jim handle" }), _jsx(Input, { value: payoutForm.jimHandle, onChange: (event) => setPayoutForm((current) => ({ ...current, jimHandle: event.target.value })), placeholder: "@jim-handle" })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { children: "Cash instructions" }), _jsx(Input, { value: payoutForm.cashInstructions, onChange: (event) => setPayoutForm((current) => ({ ...current, cashInstructions: event.target.value })), placeholder: "Meet in person, text first" })] }), _jsxs("div", { className: "space-y-2 md:col-span-2", children: [_jsx(Label, { children: "Other instructions" }), _jsx(Input, { value: payoutForm.otherInstructions, onChange: (event) => setPayoutForm((current) => ({ ...current, otherInstructions: event.target.value })), placeholder: "Anything drivers should know about manual dues payment" })] }), payoutMutation.error ? _jsx("p", { className: "text-sm text-red-600 md:col-span-2", children: payoutMutation.error.message }) : null, _jsx("div", { className: "md:col-span-2", children: _jsx(Button, { onClick: () => payoutMutation.mutate(), children: "Save payout settings" }) })] })] }), _jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { children: "Overdue drivers" }), _jsx(CardDescription, { children: "These drivers are blocked from new dispatch until all overdue dues are cleared." })] }), _jsx(CardContent, { className: "space-y-4", children: overdueDrivers.length ? (overdueDrivers.map((driver) => (_jsxs("div", { className: "rounded-4xl border border-brand-ink/10 p-4", children: [_jsxs("div", { className: "flex items-center justify-between gap-3", children: [_jsxs("div", { children: [_jsx("p", { className: "font-semibold", children: driver.name }), _jsx("p", { className: "text-sm text-brand-ink/55", children: driver.email ?? driver.phone ?? "No contact set" })] }), _jsxs(Badge, { className: "border-red-200 bg-red-50 text-red-700", children: [driver.overdueCount, " overdue"] })] }), _jsxs("p", { className: "mt-3 text-sm text-brand-ink/60", children: ["Overdue amount: ", formatMoney(driver.overdueAmount)] })] }, driver.driverId)))) : (_jsx("div", { className: "rounded-4xl border border-dashed border-brand-ink/15 p-6 text-sm text-brand-ink/55", children: "No overdue drivers right now." })) })] }), _jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { children: "Outstanding dues" }), _jsx(CardDescription, { children: "Mark dues paid, waived, or back to pending after reviewing manual payment proof." })] }), _jsx(CardContent, { className: "space-y-4", children: outstanding.length ? (outstanding.map((due) => _jsx(DueEditor, { due: due, token: token }, due.id))) : (_jsx("div", { className: "rounded-4xl border border-dashed border-brand-ink/15 p-6 text-sm text-brand-ink/55", children: "No outstanding dues right now." })) })] }), _jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { children: "Resolved history" }), _jsx(CardDescription, { children: "Paid and waived dues stay here as the finance audit trail." })] }), _jsx(CardContent, { className: "space-y-4", children: history.length ? (history.map((due) => (_jsx("div", { className: "rounded-4xl border border-brand-ink/10 p-4", children: _jsxs("div", { className: "flex flex-col gap-3 md:flex-row md:items-center md:justify-between", children: [_jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("p", { className: "font-semibold", children: due.driver.name }), _jsx(Badge, { children: due.status })] }), _jsx("p", { className: "text-sm text-brand-ink/55", children: due.ride.riderName }), _jsxs("p", { className: "text-sm text-brand-ink/45", children: [due.paymentMethod ? `Method: ${due.paymentMethod}` : "No payment method recorded", " \u00B7 Updated", " ", formatDateTime(due.updatedAt)] })] }), _jsx("p", { className: "font-semibold", children: formatMoney(due.amount) })] }) }, due.id)))) : (_jsx("div", { className: "rounded-4xl border border-dashed border-brand-ink/15 p-6 text-sm text-brand-ink/55", children: "Paid or waived dues will appear here." })) })] })] }));
}
