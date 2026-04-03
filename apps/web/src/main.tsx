import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import { Navigate, Route, BrowserRouter as Router, Routes } from "react-router-dom";
import "./index.css";
import type { Role } from "@shared/contracts";
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

function RequireRole({
  role,
  children
}: {
  role: Role;
  children: React.ReactNode;
}) {
  const { user, loading, switchRole } = useAuth();

  useEffect(() => {
    if (user && userHasRole(user, role) && user.role !== role) {
      switchRole(role);
    }
  }, [role, switchRole, user]);

  if (loading) {
    return <div className="rounded-4xl border border-brand-ink/10 bg-white p-8 text-sm text-brand-ink/55">Loading...</div>;
  }

  if (!user) {
    return <Navigate to={role === "driver" ? "/driver/login" : role === "admin" ? "/admin/login" : "/"} replace />;
  }

  if (!userHasRole(user, role)) {
    return <Navigate to={roleHome(user.role)} replace />;
  }

  return <>{children}</>;
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="rounded-4xl border border-brand-ink/10 bg-white p-8 text-sm text-brand-ink/55">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppProviders>
      <Router>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/track/:token" element={<PublicTrackPage />} />
            <Route path="/drive-with-us" element={<DriverInterestPage />} />
            <Route path="/driver/signup" element={<DriverInterestPage />} />
            <Route path="/share/:referralCode" element={<ShareRedirectPage />} />
            <Route path="/community/join/:token" element={<CommunityJoinPage />} />
            <Route
              path="/community"
              element={
                <RequireAuth>
                  <CommunityPage />
                </RequireAuth>
              }
            />
            <Route
              path="/rider/rides"
              element={
                <RequireRole role="rider">
                  <RideHistoryPage />
                </RequireRole>
              }
            />
            <Route
              path="/rider/rides/:rideId"
              element={
                <RequireRole role="rider">
                  <RideDetailsPage />
                </RequireRole>
              }
            />
            <Route path="/driver/login" element={<DriverLoginPage />} />
            <Route path="/admin/setup" element={<AdminSetupPage />} />
            <Route
              path="/driver"
              element={
                <RequireRole role="driver">
                  <DriverDashboardPage />
                </RequireRole>
              }
            />
            <Route
              path="/driver/rides/:rideId"
              element={
                <RequireRole role="driver">
                  <DriverRidePage />
                </RequireRole>
              }
            />
            <Route path="/admin/login" element={<AdminLoginPage />} />
            <Route
              path="/admin"
              element={
                <RequireRole role="admin">
                  <AdminDashboardPage />
                </RequireRole>
              }
            />
            <Route
              path="/admin/drivers"
              element={
                <RequireRole role="admin">
                  <AdminDriversPage />
                </RequireRole>
              }
            />
            <Route
              path="/admin/pricing"
              element={
                <RequireRole role="admin">
                  <AdminPricingPage />
                </RequireRole>
              }
            />
            <Route
              path="/admin/share"
              element={
                <RequireRole role="admin">
                  <AdminSharePage />
                </RequireRole>
              }
            />
            <Route
              path="/admin/dues"
              element={
                <RequireRole role="admin">
                  <AdminDuesPage />
                </RequireRole>
              }
            />
          </Route>
        </Routes>
      </Router>
    </AppProviders>
  </React.StrictMode>
);
