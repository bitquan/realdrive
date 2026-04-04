import React, { Suspense, lazy, useEffect } from "react";
import ReactDOM from "react-dom/client";
import { Navigate, Route, BrowserRouter as Router, Routes } from "react-router-dom";
import "./index.css";
import type { Role } from "@shared/contracts";
import { AppShell } from "@/components/layout/app-shell";
import { AppProviders } from "@/providers/app-providers";
import { useAuth } from "@/providers/auth-provider";
import { roleHome, userHasRole } from "@/lib/utils";

const HomePage = lazy(() => import("@/pages/home-page").then((module) => ({ default: module.HomePage })));
const PublicTrackPage = lazy(() => import("@/pages/public-track-page").then((module) => ({ default: module.PublicTrackPage })));
const RideHistoryPage = lazy(() => import("@/pages/ride-history-page").then((module) => ({ default: module.RideHistoryPage })));
const RideDetailsPage = lazy(() => import("@/pages/ride-details-page").then((module) => ({ default: module.RideDetailsPage })));
const DriverInterestPage = lazy(() => import("@/pages/driver-interest-page").then((module) => ({ default: module.DriverInterestPage })));
const DriverLoginPage = lazy(() => import("@/pages/driver-login-page").then((module) => ({ default: module.DriverLoginPage })));
const DriverDashboardPage = lazy(() => import("@/pages/driver-dashboard-page").then((module) => ({ default: module.DriverDashboardPage })));
const DriverRidePage = lazy(() => import("@/pages/driver-ride-page").then((module) => ({ default: module.DriverRidePage })));
const AdminLoginPage = lazy(() => import("@/pages/admin-login-page").then((module) => ({ default: module.AdminLoginPage })));
const AdminSetupPage = lazy(() => import("@/pages/admin-setup-page").then((module) => ({ default: module.AdminSetupPage })));
const AdminDashboardPage = lazy(() => import("@/pages/admin-dashboard-page").then((module) => ({ default: module.AdminDashboardPage })));
const AdminDriversPage = lazy(() => import("@/pages/admin-drivers-page").then((module) => ({ default: module.AdminDriversPage })));
const AdminPricingPage = lazy(() => import("@/pages/admin-pricing-page").then((module) => ({ default: module.AdminPricingPage })));
const AdminSharePage = lazy(() => import("@/pages/admin-share-page").then((module) => ({ default: module.AdminSharePage })));
const AdminDuesPage = lazy(() => import("@/pages/admin-dues-page").then((module) => ({ default: module.AdminDuesPage })));
const CommunityJoinPage = lazy(() => import("@/pages/community-join-page").then((module) => ({ default: module.CommunityJoinPage })));
const CommunityPage = lazy(() => import("@/pages/community-page").then((module) => ({ default: module.CommunityPage })));
const ShareRedirectPage = lazy(() => import("@/pages/share-redirect-page").then((module) => ({ default: module.ShareRedirectPage })));

function PageLoader({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="rounded-4xl border border-brand-ink/10 bg-white p-8 text-sm text-brand-ink/55">Loading...</div>}>
      {children}
    </Suspense>
  );
}

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
            <Route path="/" element={<PageLoader><HomePage /></PageLoader>} />
            <Route path="/track/:token" element={<PageLoader><PublicTrackPage /></PageLoader>} />
            <Route path="/drive-with-us" element={<PageLoader><DriverInterestPage /></PageLoader>} />
            <Route path="/driver/signup" element={<PageLoader><DriverInterestPage /></PageLoader>} />
            <Route path="/share/:referralCode" element={<PageLoader><ShareRedirectPage /></PageLoader>} />
            <Route path="/community/join/:token" element={<PageLoader><CommunityJoinPage /></PageLoader>} />
            <Route
              path="/community"
              element={
                <RequireAuth>
                  <PageLoader><CommunityPage /></PageLoader>
                </RequireAuth>
              }
            />
            <Route
              path="/rider/rides"
              element={
                <RequireRole role="rider">
                  <PageLoader><RideHistoryPage /></PageLoader>
                </RequireRole>
              }
            />
            <Route
              path="/rider/rides/:rideId"
              element={
                <RequireRole role="rider">
                  <PageLoader><RideDetailsPage /></PageLoader>
                </RequireRole>
              }
            />
            <Route path="/driver/login" element={<PageLoader><DriverLoginPage /></PageLoader>} />
            <Route path="/admin/setup" element={<PageLoader><AdminSetupPage /></PageLoader>} />
            <Route
              path="/driver"
              element={
                <RequireRole role="driver">
                  <PageLoader><DriverDashboardPage /></PageLoader>
                </RequireRole>
              }
            />
            <Route
              path="/driver/rides/:rideId"
              element={
                <RequireRole role="driver">
                  <PageLoader><DriverRidePage /></PageLoader>
                </RequireRole>
              }
            />
            <Route path="/admin/login" element={<PageLoader><AdminLoginPage /></PageLoader>} />
            <Route
              path="/admin"
              element={
                <RequireRole role="admin">
                  <PageLoader><AdminDashboardPage /></PageLoader>
                </RequireRole>
              }
            />
            <Route
              path="/admin/drivers"
              element={
                <RequireRole role="admin">
                  <PageLoader><AdminDriversPage /></PageLoader>
                </RequireRole>
              }
            />
            <Route
              path="/admin/pricing"
              element={
                <RequireRole role="admin">
                  <PageLoader><AdminPricingPage /></PageLoader>
                </RequireRole>
              }
            />
            <Route
              path="/admin/share"
              element={
                <RequireRole role="admin">
                  <PageLoader><AdminSharePage /></PageLoader>
                </RequireRole>
              }
            />
            <Route
              path="/admin/dues"
              element={
                <RequireRole role="admin">
                  <PageLoader><AdminDuesPage /></PageLoader>
                </RequireRole>
              }
            />
          </Route>
        </Routes>
      </Router>
    </AppProviders>
  </React.StrictMode>
);
