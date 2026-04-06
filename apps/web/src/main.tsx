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
const AdvertisePage = lazy(() => import("@/pages/advertise-page").then((module) => ({ default: module.AdvertisePage })));
const AdsDisplayPage = lazy(() => import("@/pages/ads-display-page").then((module) => ({ default: module.AdsDisplayPage })));
const AdsVisitPage = lazy(() => import("@/pages/ads-visit-page").then((module) => ({ default: module.AdsVisitPage })));
const TabletAdLoginPage = lazy(() => import("@/pages/tablet-ad-login-page").then((module) => ({ default: module.TabletAdLoginPage })));
const TabletAdKioskPage = lazy(() => import("@/pages/tablet-ad-kiosk-page").then((module) => ({ default: module.TabletAdKioskPage })));
const PublicTrackPage = lazy(() => import("@/pages/public-track-page").then((module) => ({ default: module.PublicTrackPage })));
const RideHistoryPage = lazy(() => import("@/pages/ride-history-page").then((module) => ({ default: module.RideHistoryPage })));
const RideDetailsPage = lazy(() => import("@/pages/ride-details-page").then((module) => ({ default: module.RideDetailsPage })));
const DriverInterestPage = lazy(() => import("@/pages/driver-interest-page").then((module) => ({ default: module.DriverInterestPage })));
const DriverLoginPage = lazy(() => import("@/pages/driver-login-page").then((module) => ({ default: module.DriverLoginPage })));
const DriverDashboardPage = lazy(() => import("@/pages/driver-dashboard-page").then((module) => ({ default: module.DriverDashboardPage })));
const DriverInboxPage = lazy(() => import("@/pages/driver-inbox-page").then((module) => ({ default: module.DriverInboxPage })));
const DriverRidePage = lazy(() => import("@/pages/driver-ride-page").then((module) => ({ default: module.DriverRidePage })));
const MockDriverIdlePage = lazy(() => import("@/pages/mock-driver-idle-page").then((module) => ({ default: module.MockDriverIdlePage })));
const MockDriverOfferPage = lazy(() => import("@/pages/mock-driver-offer-page").then((module) => ({ default: module.MockDriverOfferPage })));
const MockDriverTripPage = lazy(() => import("@/pages/mock-driver-trip-page").then((module) => ({ default: module.MockDriverTripPage })));
const DriverMockPreviewShell = lazy(() => import("@/components/driver-mock/driver-mock-preview-shell").then((module) => ({ default: module.DriverMockPreviewShell })));
const AdminLoginPage = lazy(() => import("@/pages/admin-login-page").then((module) => ({ default: module.AdminLoginPage })));
const AdminSetupPage = lazy(() => import("@/pages/admin-setup-page").then((module) => ({ default: module.AdminSetupPage })));
const AdminDashboardPage = lazy(() => import("@/pages/admin-dashboard-page").then((module) => ({ default: module.AdminDashboardPage })));
const AdminDispatchPage = lazy(() => import("@/pages/admin-dispatch-page").then((module) => ({ default: module.AdminDispatchPage })));
const AdminTeamPage = lazy(() => import("@/pages/admin-team-page").then((module) => ({ default: module.AdminTeamPage })));
const AdminDriversPage = lazy(() => import("@/pages/admin-drivers-page").then((module) => ({ default: module.AdminDriversPage })));
const AdminReportingPage = lazy(() => import("@/pages/admin-reporting-page").then((module) => ({ default: module.AdminReportingPage })));
const AdminRegionsPage = lazy(() => import("@/pages/admin-regions-page").then((module) => ({ default: module.AdminRegionsPage })));
const AdminApiKeysPage = lazy(() => import("@/pages/admin-api-keys-page").then((module) => ({ default: module.AdminApiKeysPage })));
const AdminAdsPage = lazy(() => import("@/pages/admin-ads-page").then((module) => ({ default: module.AdminAdsPage })));
const AdminAdAnalyticsPage = lazy(() => import("@/pages/admin-ad-analytics-page").then((module) => ({ default: module.AdminAdAnalyticsPage })));
const AdminPricingPage = lazy(() => import("@/pages/admin-pricing-page").then((module) => ({ default: module.AdminPricingPage })));
const AdminSharePage = lazy(() => import("@/pages/admin-share-page").then((module) => ({ default: module.AdminSharePage })));
const AdminDuesPage = lazy(() => import("@/pages/admin-dues-page").then((module) => ({ default: module.AdminDuesPage })));
const AdminDataPage = lazy(() => import("@/pages/admin-data-page").then((module) => ({ default: module.AdminDataPage })));
const AdminAuditPage = lazy(() => import("@/pages/admin-audit-page").then((module) => ({ default: module.AdminAuditPage })));
const AdminHelpPage = lazy(() => import("@/pages/admin-help-page").then((module) => ({ default: module.AdminHelpPage })));
const AdminFeatureRequestsPage = lazy(() =>
  import("@/pages/admin-feature-requests-page").then((module) => ({ default: module.AdminFeatureRequestsPage }))
);
const AdminInviteAcceptPage = lazy(() => import("@/pages/admin-invite-accept-page").then((module) => ({ default: module.AdminInviteAcceptPage })));
const CommunityJoinPage = lazy(() => import("@/pages/community-join-page").then((module) => ({ default: module.CommunityJoinPage })));
const CommunityPage = lazy(() => import("@/pages/community-page").then((module) => ({ default: module.CommunityPage })));
const ShareRedirectPage = lazy(() => import("@/pages/share-redirect-page").then((module) => ({ default: module.ShareRedirectPage })));
const RequestFeaturePage = lazy(() => import("@/pages/request-feature-page").then((module) => ({ default: module.RequestFeaturePage })));
const ReportBugPage = lazy(() => import("@/pages/report-bug-page").then((module) => ({ default: module.ReportBugPage })));
const NotificationPreferencesPage = lazy(() =>
  import("@/pages/notification-preferences-page").then((module) => ({ default: module.NotificationPreferencesPage }))
);
const RoadmapPage = lazy(() => import("@/pages/roadmap-page").then((module) => ({ default: module.RoadmapPage })));
const SmsConsentPage = lazy(() => import("@/pages/sms-consent-page").then((module) => ({ default: module.SmsConsentPage })));
const SmsHelpPage = lazy(() => import("@/pages/sms-help-page").then((module) => ({ default: module.SmsHelpPage })));

declare global {
  interface Window {
    __REALDRIVE_MARK_BOOTED__?: () => void;
  }
}

type ErrorBoundaryProps = {
  children: React.ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
};

class AppErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error("RealDrive failed to render", error);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="flex min-h-screen items-center justify-center bg-[#05070b] px-4 py-8 text-ops-text">
        <div className="w-full max-w-md rounded-[2rem] border border-ops-border bg-[linear-gradient(180deg,rgba(17,21,29,0.98),rgba(11,14,20,0.98))] p-6 shadow-panel">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-ops-muted">RealDrive</p>
          <h1 className="mt-3 text-2xl font-extrabold tracking-[-0.04em] text-ops-text">This device hit a loading issue.</h1>
          <p className="mt-3 text-sm leading-6 text-ops-muted">
            Try reloading once. If the problem continues, reopen the page from Safari and make sure low-power or content-blocking rules are not stopping scripts.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 inline-flex h-11 items-center justify-center rounded-2xl border border-ops-primary/40 bg-ops-primary/15 px-4 text-sm font-semibold text-ops-text transition hover:bg-ops-primary/25"
          >
            Reload app
          </button>
        </div>
      </div>
    );
  }
}

function PageLoader({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="rounded-4xl border border-ops-border-soft bg-ops-surface p-8 text-sm text-ops-muted">Loading...</div>}>
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
    return <div className="rounded-4xl border border-ops-border-soft bg-ops-surface p-8 text-sm text-ops-muted">Loading...</div>;
  }

  if (!user) {
    return <Navigate to={role === "driver" ? "/driver/login" : role === "admin" ? "/admin/login" : "/"} replace />;
  }

  if (role === "driver" && userHasRole(user, "driver") && user.approvalStatus !== "approved") {
    return <Navigate to="/driver/signup" replace />;
  }

  if (!userHasRole(user, role)) {
    return <Navigate to={roleHome(user.role)} replace />;
  }

  return <>{children}</>;
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="rounded-4xl border border-ops-border-soft bg-ops-surface p-8 text-sm text-ops-muted">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function RequireDriverTablet({ children }: { children: React.ReactNode }) {
  const { user, loading, switchRole } = useAuth();

  useEffect(() => {
    if (user && userHasRole(user, "driver") && user.role !== "driver") {
      switchRole("driver");
    }
  }, [switchRole, user]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-[#04070d] text-sm text-white/70">Loading display…</div>;
  }

  if (!user) {
    return <Navigate to="/tablet/ads/login" replace />;
  }

  if (userHasRole(user, "driver") && user.approvalStatus !== "approved") {
    return <Navigate to="/driver/signup" replace />;
  }

  if (!userHasRole(user, "driver")) {
    return <Navigate to={roleHome(user.role)} replace />;
  }

  return <>{children}</>;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <AppProviders>
        <Router>
          <Routes>
          <Route path="/__mock/driver" element={<PageLoader><DriverMockPreviewShell /></PageLoader>}>
            <Route index element={<Navigate to="idle" replace />} />
            <Route path="idle" element={<PageLoader><MockDriverIdlePage /></PageLoader>} />
            <Route path="offer" element={<PageLoader><MockDriverOfferPage /></PageLoader>} />
            <Route path="trip" element={<PageLoader><MockDriverTripPage /></PageLoader>} />
          </Route>
          <Route path="/tablet/ads/login" element={<PageLoader><TabletAdLoginPage /></PageLoader>} />
          <Route path="/ads/display/:referralCode" element={<PageLoader><AdsDisplayPage /></PageLoader>} />
          <Route path="/ads/visit/:redirectToken" element={<PageLoader><AdsVisitPage /></PageLoader>} />
          <Route
            path="/tablet/ads"
            element={
              <RequireDriverTablet>
                <PageLoader><TabletAdKioskPage /></PageLoader>
              </RequireDriverTablet>
            }
          />
          <Route path="/" element={<AppShell />}>
            <Route index element={<PageLoader><HomePage /></PageLoader>} />
            <Route path="advertise" element={<PageLoader><AdvertisePage /></PageLoader>} />
            <Route path="track/:token" element={<PageLoader><PublicTrackPage /></PageLoader>} />
            <Route path="drive-with-us" element={<PageLoader><DriverInterestPage /></PageLoader>} />
            <Route path="driver/signup" element={<PageLoader><DriverInterestPage /></PageLoader>} />
            <Route path="share/:referralCode" element={<PageLoader><ShareRedirectPage /></PageLoader>} />
            <Route path="sms-consent" element={<PageLoader><SmsConsentPage /></PageLoader>} />
            <Route path="sms-help" element={<PageLoader><SmsHelpPage /></PageLoader>} />
            <Route path="community/join/:token" element={<PageLoader><CommunityJoinPage /></PageLoader>} />
            <Route
              path="community"
              element={
                <RequireAuth>
                  <PageLoader><CommunityPage /></PageLoader>
                </RequireAuth>
              }
            />
            <Route
              path="request-feature"
              element={
                <RequireAuth>
                  <PageLoader><RequestFeaturePage /></PageLoader>
                </RequireAuth>
              }
            />
            <Route
              path="report-bug"
              element={
                <RequireAuth>
                  <PageLoader><ReportBugPage /></PageLoader>
                </RequireAuth>
              }
            />
            <Route
              path="notifications"
              element={
                <RequireAuth>
                  <PageLoader><NotificationPreferencesPage /></PageLoader>
                </RequireAuth>
              }
            />
            <Route
              path="roadmap"
              element={
                <RequireAuth>
                  <PageLoader><RoadmapPage /></PageLoader>
                </RequireAuth>
              }
            />
            <Route
              path="rider/rides"
              element={
                <RequireRole role="rider">
                  <PageLoader><RideHistoryPage /></PageLoader>
                </RequireRole>
              }
            />
            <Route
              path="rider/rides/:rideId"
              element={
                <RequireRole role="rider">
                  <PageLoader><RideDetailsPage /></PageLoader>
                </RequireRole>
              }
            />
            <Route path="driver/login" element={<PageLoader><DriverLoginPage /></PageLoader>} />
            <Route path="admin/setup" element={<PageLoader><AdminSetupPage /></PageLoader>} />
            <Route path="admin/invite/:token" element={<PageLoader><AdminInviteAcceptPage /></PageLoader>} />
            <Route
              path="driver"
              element={
                <RequireRole role="driver">
                  <PageLoader><DriverDashboardPage /></PageLoader>
                </RequireRole>
              }
            />
            <Route
              path="driver/inbox"
              element={
                <RequireRole role="driver">
                  <PageLoader><DriverInboxPage /></PageLoader>
                </RequireRole>
              }
            />
            <Route
              path="driver/rides/:rideId"
              element={
                <RequireRole role="driver">
                  <PageLoader><DriverRidePage /></PageLoader>
                </RequireRole>
              }
            />
            <Route path="admin/login" element={<PageLoader><AdminLoginPage /></PageLoader>} />
            <Route
              path="admin"
              element={
                <RequireRole role="admin">
                  <PageLoader><AdminDashboardPage /></PageLoader>
                </RequireRole>
              }
            />
            <Route
              path="admin/dispatch"
              element={
                <RequireRole role="admin">
                  <PageLoader><AdminDispatchPage /></PageLoader>
                </RequireRole>
              }
            />
            <Route
              path="admin/team"
              element={
                <RequireRole role="admin">
                  <PageLoader><AdminTeamPage /></PageLoader>
                </RequireRole>
              }
            />
            <Route
              path="admin/drivers"
              element={
                <RequireRole role="admin">
                  <PageLoader><AdminDriversPage /></PageLoader>
                </RequireRole>
              }
            />
            <Route
              path="admin/reports"
              element={
                <RequireRole role="admin">
                  <PageLoader><AdminReportingPage /></PageLoader>
                </RequireRole>
              }
            />
            <Route
              path="admin/regions"
              element={
                <RequireRole role="admin">
                  <PageLoader><AdminRegionsPage /></PageLoader>
                </RequireRole>
              }
            />
            <Route
              path="admin/api-keys"
              element={
                <RequireRole role="admin">
                  <PageLoader><AdminApiKeysPage /></PageLoader>
                </RequireRole>
              }
            />
            <Route
              path="admin/ads/analytics"
              element={
                <RequireRole role="admin">
                  <PageLoader><AdminAdAnalyticsPage /></PageLoader>
                </RequireRole>
              }
            />
            <Route
              path="admin/ads"
              element={
                <RequireRole role="admin">
                  <PageLoader><AdminAdsPage /></PageLoader>
                </RequireRole>
              }
            />
            <Route
              path="admin/pricing"
              element={
                <RequireRole role="admin">
                  <PageLoader><AdminPricingPage /></PageLoader>
                </RequireRole>
              }
            />
            <Route
              path="admin/share"
              element={
                <RequireRole role="admin">
                  <PageLoader><AdminSharePage /></PageLoader>
                </RequireRole>
              }
            />
            <Route
              path="admin/help"
              element={
                <RequireRole role="admin">
                  <PageLoader><AdminHelpPage /></PageLoader>
                </RequireRole>
              }
            />
            <Route
              path="admin/feature-requests"
              element={
                <RequireRole role="admin">
                  <PageLoader><AdminFeatureRequestsPage /></PageLoader>
                </RequireRole>
              }
            />
            <Route
              path="admin/dues"
              element={
                <RequireRole role="admin">
                  <PageLoader><AdminDuesPage /></PageLoader>
                </RequireRole>
              }
            />
            <Route
              path="admin/data"
              element={
                <RequireRole role="admin">
                  <PageLoader><AdminDataPage /></PageLoader>
                </RequireRole>
              }
            />
            <Route
              path="admin/audit"
              element={
                <RequireRole role="admin">
                  <PageLoader><AdminAuditPage /></PageLoader>
                </RequireRole>
              }
            />
          </Route>
          </Routes>
        </Router>
      </AppProviders>
    </AppErrorBoundary>
  </React.StrictMode>
);

window.__REALDRIVE_MARK_BOOTED__?.();
