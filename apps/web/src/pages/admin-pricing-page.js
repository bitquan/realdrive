import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
function emptyRateForm() {
    return {
        standard: { baseFare: "0", perMile: "0", perMinute: "0", multiplier: "1" },
        suv: { baseFare: "0", perMile: "0", perMinute: "0", multiplier: "1" },
        xl: { baseFare: "0", perMile: "0", perMinute: "0", multiplier: "1" }
    };
}
export function AdminPricingPage() {
    const { token } = useAuth();
    const queryClient = useQueryClient();
    const pricingQuery = useQuery({
        queryKey: ["admin-platform-rates"],
        queryFn: () => api.listPlatformRates(token)
    });
    const [markets, setMarkets] = useState({});
    const [newMarketKey, setNewMarketKey] = useState("");
    useEffect(() => {
        if (!pricingQuery.data) {
            return;
        }
        const next = {};
        for (const rule of pricingQuery.data) {
            next[rule.marketKey] ??= emptyRateForm();
            next[rule.marketKey][rule.rideType] = {
                baseFare: String(rule.baseFare),
                perMile: String(rule.perMile),
                perMinute: String(rule.perMinute),
                multiplier: String(rule.multiplier)
            };
        }
        if (!next.DEFAULT) {
            next.DEFAULT = emptyRateForm();
        }
        setMarkets(next);
    }, [pricingQuery.data]);
    const updateMutation = useMutation({
        mutationFn: () => api.updatePlatformRates({
            rules: Object.entries(markets).flatMap(([marketKey, rateForm]) => Object.keys(rateForm).map((rideType) => ({
                marketKey,
                rideType,
                baseFare: Number(rateForm[rideType].baseFare),
                perMile: Number(rateForm[rideType].perMile),
                perMinute: Number(rateForm[rideType].perMinute),
                multiplier: Number(rateForm[rideType].multiplier)
            })))
        }, token),
        onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin-platform-rates"] })
    });
    return (_jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { children: "Platform market rates" }), _jsx(CardDescription, { children: "Configure state-based market pricing and keep `DEFAULT` as the fallback for unmatched pickups." })] }), _jsxs(CardContent, { className: "space-y-6", children: [_jsxs("div", { className: "flex flex-col gap-3 rounded-4xl border border-brand-ink/10 p-4 md:flex-row md:items-end", children: [_jsxs("div", { className: "flex-1 space-y-2", children: [_jsx(Label, { children: "Add market key" }), _jsx(Input, { value: newMarketKey, onChange: (event) => setNewMarketKey(event.target.value.toUpperCase()), placeholder: "VA", maxLength: 10 })] }), _jsx(Button, { variant: "outline", onClick: () => {
                                    if (!newMarketKey || markets[newMarketKey]) {
                                        return;
                                    }
                                    setMarkets((current) => ({
                                        ...current,
                                        [newMarketKey]: emptyRateForm()
                                    }));
                                    setNewMarketKey("");
                                }, children: "Add market" })] }), Object.entries(markets).map(([marketKey, rateForm]) => (_jsxs("div", { className: "rounded-4xl border border-brand-ink/10 p-4", children: [_jsxs("div", { className: "mb-4 flex items-center justify-between gap-3", children: [_jsx("h3", { className: "text-lg font-semibold", children: marketKey }), marketKey !== "DEFAULT" ? (_jsx(Button, { variant: "ghost", onClick: () => setMarkets((current) => {
                                            const next = { ...current };
                                            delete next[marketKey];
                                            return next;
                                        }), children: "Remove" })) : null] }), _jsx("div", { className: "space-y-4", children: Object.keys(rateForm).map((rideType) => (_jsxs("div", { className: "rounded-4xl border border-brand-ink/10 p-4", children: [_jsx("h4", { className: "mb-4 font-semibold capitalize", children: rideType }), _jsxs("div", { className: "grid gap-4 md:grid-cols-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { children: "Base fare" }), _jsx(Input, { value: rateForm[rideType].baseFare, onChange: (event) => setMarkets((current) => ({
                                                                ...current,
                                                                [marketKey]: {
                                                                    ...current[marketKey],
                                                                    [rideType]: { ...current[marketKey][rideType], baseFare: event.target.value }
                                                                }
                                                            })) })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { children: "Per mile" }), _jsx(Input, { value: rateForm[rideType].perMile, onChange: (event) => setMarkets((current) => ({
                                                                ...current,
                                                                [marketKey]: {
                                                                    ...current[marketKey],
                                                                    [rideType]: { ...current[marketKey][rideType], perMile: event.target.value }
                                                                }
                                                            })) })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { children: "Per minute" }), _jsx(Input, { value: rateForm[rideType].perMinute, onChange: (event) => setMarkets((current) => ({
                                                                ...current,
                                                                [marketKey]: {
                                                                    ...current[marketKey],
                                                                    [rideType]: { ...current[marketKey][rideType], perMinute: event.target.value }
                                                                }
                                                            })) })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { children: "Multiplier" }), _jsx(Input, { value: rateForm[rideType].multiplier, onChange: (event) => setMarkets((current) => ({
                                                                ...current,
                                                                [marketKey]: {
                                                                    ...current[marketKey],
                                                                    [rideType]: { ...current[marketKey][rideType], multiplier: event.target.value }
                                                                }
                                                            })) })] })] })] }, `${marketKey}-${rideType}`))) })] }, marketKey))), updateMutation.error ? _jsx("p", { className: "text-sm text-red-600", children: updateMutation.error.message }) : null, _jsx(Button, { onClick: () => updateMutation.mutate(), children: "Save platform rates" })] })] }));
}
