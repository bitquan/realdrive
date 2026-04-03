import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import { Navigate, Route, BrowserRouter as Router, Routes } from "react-router-dom";
import "./index.css";
import { AppShell } from "@/components/layout/app-shell";
import { AppProviders } from "@/providers/app-providers";
import { useAuth } from "@/providers/auth-provider";
import { roleHome, userHasRole } from "@/lib/utils";
import { HomePage } from "@/pages/home-page";
import { PublicTrackPage } from "@/pages/public-track-page";
import { RideHistoryPage } from "@/pages/ride-history-page";
import { RideDetailsPage } from "@/pages/ride-details-page";
import { DriverInterestPage } from "@/pages/driver-interest-page";
import { DriverLoginPage } from "@/pages/driver-login-page";
import { DriverDashboardPage } from "@/pages/driver-dashboard-page";
import { DriverRidePage } from "@/pages/driver-ride-page";
import { AdminLoginPage } from "@/pages/admin-login-page";
import { AdminSetupPage } from "@/pages/admin-setup-page";
import { AdminDashboardPage } from "@/pages/admin-dashboard-page";
import { AdminDriversPage } from "@/pages/admin-drivers-page";
import { AdminPricingPage } from "@/pages/admin-pricing-page";
import { AdminSharePage } from "@/pages/admin-share-page";
import { AdminDuesPage } from "@/pages/admin-dues-page";
import { CommunityJoinPage } from "@/pages/community-join-page";
import { CommunityPage } from "@/pages/community-page";
import { ShareRedirectPage } from "@/pages/share-redirect-page";
function RequireRole({ role, children }) {
    const { user, loading, switchRole } = useAuth();
    useEffect(() => {
        if (user && userHasRole(user, role) && user.role !== role) {
            switchRole(role);
        }
    }, [role, switchRole, user]);
    if (loading) {
        return _jsx("div", { className: "rounded-4xl border border-brand-ink/10 bg-white p-8 text-sm text-brand-ink/55", children: "Loading..." });
    }
    if (!user) {
        return _jsx(Navigate, { to: role === "driver" ? "/driver/login" : role === "admin" ? "/admin/login" : "/", replace: true });
    }
    if (!userHasRole(user, role)) {
        return _jsx(Navigate, { to: roleHome(user.role), replace: true });
    }
    return _jsx(_Fragment, { children: children });
}
function RequireAuth({ children }) {
    const { user, loading } = useAuth();
    if (loading) {
        return _jsx("div", { className: "rounded-4xl border border-brand-ink/10 bg-white p-8 text-sm text-brand-ink/55", children: "Loading..." });
    }
    if (!user) {
        return _jsx(Navigate, { to: "/", replace: true });
    }
    return _jsx(_Fragment, { children: children });
}
ReactDOM.createRoot(document.getElementById("root")).render(_jsx(React.StrictMode, { children: _jsx(AppProviders, { children: _jsx(Router, { children: _jsx(Routes, { children: _jsxs(Route, { element: _jsx(AppShell, {}), children: [_jsx(Route, { path: "/", element: _jsx(HomePage, {}) }), _jsx(Route, { path: "/track/:token", element: _jsx(PublicTrackPage, {}) }), _jsx(Route, { path: "/drive-with-us", element: _jsx(DriverInterestPage, {}) }), _jsx(Route, { path: "/driver/signup", element: _jsx(DriverInterestPage, {}) }), _jsx(Route, { path: "/share/:referralCode", element: _jsx(ShareRedirectPage, {}) }), _jsx(Route, { path: "/community/join/:token", element: _jsx(CommunityJoinPage, {}) }), _jsx(Route, { path: "/community", element: _jsx(RequireAuth, { children: _jsx(CommunityPage, {}) }) }), _jsx(Route, { path: "/rider/rides", element: _jsx(RequireRole, { role: "rider", children: _jsx(RideHistoryPage, {}) }) }), _jsx(Route, { path: "/rider/rides/:rideId", element: _jsx(RequireRole, { role: "rider", children: _jsx(RideDetailsPage, {}) }) }), _jsx(Route, { path: "/driver/login", element: _jsx(DriverLoginPage, {}) }), _jsx(Route, { path: "/admin/setup", element: _jsx(AdminSetupPage, {}) }), _jsx(Route, { path: "/driver", element: _jsx(RequireRole, { role: "driver", children: _jsx(DriverDashboardPage, {}) }) }), _jsx(Route, { path: "/driver/rides/:rideId", element: _jsx(RequireRole, { role: "driver", children: _jsx(DriverRidePage, {}) }) }), _jsx(Route, { path: "/admin/login", element: _jsx(AdminLoginPage, {}) }), _jsx(Route, { path: "/admin", element: _jsx(RequireRole, { role: "admin", children: _jsx(AdminDashboardPage, {}) }) }), _jsx(Route, { path: "/admin/drivers", element: _jsx(RequireRole, { role: "admin", children: _jsx(AdminDriversPage, {}) }) }), _jsx(Route, { path: "/admin/pricing", element: _jsx(RequireRole, { role: "admin", children: _jsx(AdminPricingPage, {}) }) }), _jsx(Route, { path: "/admin/share", element: _jsx(RequireRole, { role: "admin", children: _jsx(AdminSharePage, {}) }) }), _jsx(Route, { path: "/admin/dues", element: _jsx(RequireRole, { role: "admin", children: _jsx(AdminDuesPage, {}) }) })] }) }) }) }) }));
