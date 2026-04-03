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
export function AdminLoginPage() {
    const navigate = useNavigate();
    const { user, loginAdmin } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const setupStatusQuery = useQuery({
        queryKey: ["admin-setup-status"],
        queryFn: api.adminSetupStatus
    });
    const loginMutation = useMutation({
        mutationFn: loginAdmin,
        onSuccess: () => {
            void navigate("/admin");
        }
    });
    if (userHasRole(user, "admin")) {
        return _jsx(Navigate, { to: "/admin", replace: true });
    }
    if (setupStatusQuery.data?.needsSetup) {
        return _jsx(Navigate, { to: "/admin/setup", replace: true });
    }
    return (_jsx("div", { className: "mx-auto max-w-lg", children: _jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { children: "Admin sign-in" }), _jsx(CardDescription, { children: "Use the admin account you created during the one-time setup." })] }), _jsxs(CardContent, { className: "space-y-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "adminEmail", children: "Email" }), _jsx(Input, { id: "adminEmail", type: "email", value: email, onChange: (event) => setEmail(event.target.value), placeholder: "you@example.com" })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "adminPassword", children: "Password" }), _jsx(Input, { id: "adminPassword", type: "password", value: password, onChange: (event) => setPassword(event.target.value), placeholder: "Password" })] }), loginMutation.error ? _jsx("p", { className: "text-sm text-red-600", children: loginMutation.error.message }) : null, _jsx(Button, { className: "w-full", disabled: loginMutation.isPending || !email || !password, onClick: () => loginMutation.mutate({ email, password }), children: "Sign in" })] })] }) }));
}
