import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Navigate, Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { userHasRole } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
export function DriverLoginPage() {
    const navigate = useNavigate();
    const { user, loginDriver } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const loginMutation = useMutation({
        mutationFn: loginDriver,
        onSuccess: () => {
            void navigate("/driver");
        }
    });
    if (userHasRole(user, "driver")) {
        return _jsx(Navigate, { to: "/driver", replace: true });
    }
    return (_jsx("div", { className: "mx-auto max-w-lg", children: _jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { children: "Driver sign-in" }), _jsx(CardDescription, { children: "Approved drivers sign in with email and password after admin review." })] }), _jsxs(CardContent, { className: "space-y-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "driverEmail", children: "Email" }), _jsx(Input, { id: "driverEmail", type: "email", value: email, onChange: (event) => setEmail(event.target.value), placeholder: "driver@example.com" })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "driverPassword", children: "Password" }), _jsx(Input, { id: "driverPassword", type: "password", value: password, onChange: (event) => setPassword(event.target.value), placeholder: "Password" })] }), loginMutation.error ? _jsx("p", { className: "text-sm text-red-600", children: loginMutation.error.message }) : null, _jsx(Button, { className: "w-full", disabled: loginMutation.isPending || !email || !password, onClick: () => loginMutation.mutate({ email, password }), children: "Sign in" }), _jsxs("p", { className: "text-sm text-brand-ink/60", children: ["Need an account?", " ", _jsx(Link, { to: "/driver/signup", className: "font-semibold text-brand-copper hover:underline", children: "Apply to drive" })] })] })] }) }));
}
