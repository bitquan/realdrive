import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/providers/auth-provider";
export function CommunityJoinPage() {
    const { token = "" } = useParams();
    const navigate = useNavigate();
    const { exchangeCommunityAccess } = useAuth();
    const [started, setStarted] = useState(false);
    const exchangeMutation = useMutation({
        mutationFn: exchangeCommunityAccess,
        onSuccess: () => {
            void navigate("/community", { replace: true });
        }
    });
    useEffect(() => {
        if (!token || started) {
            return;
        }
        setStarted(true);
        exchangeMutation.mutate({ token });
    }, [exchangeMutation, started, token]);
    return (_jsx("div", { className: "mx-auto max-w-lg", children: _jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { children: "Opening your community board" }), _jsx(CardDescription, { children: "This rider link signs you into the community board without OTP so you can keep the same access later." })] }), _jsxs(CardContent, { className: "space-y-4", children: [exchangeMutation.isPending || !started ? (_jsx("p", { className: "text-sm text-brand-ink/60", children: "Checking your community access token now..." })) : null, exchangeMutation.error ? (_jsxs(_Fragment, { children: [_jsx("p", { className: "text-sm text-red-600", children: exchangeMutation.error.message }), _jsxs("div", { className: "flex gap-3", children: [_jsx(Button, { onClick: () => exchangeMutation.mutate({ token }), children: "Try again" }), _jsx(Link, { to: "/", className: "inline-flex items-center justify-center rounded-2xl border border-brand-ink/15 bg-white px-4 py-2 text-sm font-semibold text-brand-ink transition hover:bg-brand-sand/60", children: "Back home" })] })] })) : null] })] }) }));
}
