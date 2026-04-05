import type {
  AcceptAdminInviteInput,
  AdPricingSettings,
  AdSubmission,
  AdSubmissionResponse,
  AdVisitResolveResponse,
  AddressSuggestion,
  AdminCreateTestRideInput,
  AdminCreateTestRideResponse,
  AdminInvite,
  AdminInvitesResponse,
  AdminAdsResponse,
  AdminTeamResponse,
  AdminDuesResponse,
  AdminActivityResponse,
  AdminAuditLogsResponse,
  AdminLeadsResponse,
  AdminLogin,
  AdminUpdateAdSubmissionInput,
  AdminReconcilePlatformDueBatchInput,
  AdminReviewDriverDocumentInput,
  AdminSetupInput,
  AdminSetupStatusResponse,
  AdminUpdateCommunityCommentInput,
  AdminUpdateCommunityProposalInput,
  AdminUpdateDriverApprovalInput,
  AdminUpdateDriverInput,
  AdminUpdatePlatformDueBatchInput,
  AdminUpdatePlatformDueInput,
  AdminUpdateRideInput,
  AdminBroadcastNotificationInput,
  AdminOrderBgCheckInput,
  AdminReportOverview,
  ApiKeysResponse,
  CreateApiKeyInput,
  CreateApiKeyResponse,
  CreateMarketRegionInput,
  UpdateMarketRegionInput,
  MarketRegion,
  MarketRegionsResponse,
  AuthOtpRequest,
  AuthOtpVerify,
  CommunityAccessExchangeInput,
  CommunityBoardResponse,
  CommunityComment,
  CommunityCommentsResponse,
  CommunityProposal,
  CommunityVoteInput,
  CreateIssueReportInput,
  CreateAdSubmissionInput,
  CreateMarketConfigInput,
  CreateCommunityCommentInput,
  CreateCommunityProposalInput,
  CreateDriverRoleInput,
  CreateRideInput,
  DriverAccount,
  DriverAdProgramResponse,
  DriverDispatchSettings,
  DriverIdleLocationInput,
  DriverDuesResponse,
  DriverInterest,
  DriverInterestInput,
  DriverLocationInput,
  DriverLoginInput,
  DriverOnboardingDocument,
  DriverProfileUpdateInput,
  DriverRateCard,
  DriverRateCardUpdateInput,
  DriverSignupInput,
  NotificationDeliveryLogsResponse,
  NotificationPreferencesResponse,
  UpdateNotificationPreferenceInput,
  UpsertPushSubscriptionInput,
  IssueReportResponse,
  PlatformDue,
  PlatformDueBatch,
  PlatformRateAutoApplyResponse,
  PlatformRateAutoStatus,
  PlatformRateBenchmarksResponse,
  MarketConfigsResponse,
  PlatformPayoutSettings,
  PricingRule,
  PublicRideRequest,
  PublicRideResponse,
  PublicRideTrackingResponse,
  PublicShareResolveResponse,
  Ride,
  RideQuoteResponse,
  RiderLeadResponse,
  SessionUser,
  ShareInfo,
  CreateAdminInviteInput,
  TrackSiteHeartbeatInput,
  ApplyDriverAdCreditsInput,
  UpdatePlatformPayoutSettingsInput,
  UpdatePlatformRateBenchmarksInput,
  UpdatePlatformRatesInput,
  UpdateAdPricingSettingsInput,
  UpdateDriverAdProgramInput,
  PublicAdDisplayResponse,
  PublicAdPricingResponse,
  UpdateRideStatusInput
} from "@shared/contracts";

const API_URL = import.meta.env.VITE_API_URL ?? "";
const AUTH_STORAGE_KEY = "realdrive.auth";

export interface StoredAuth {
  token: string;
  user: SessionUser;
}

export interface RoadmapFeature {
  id: string;
  title: string;
  description: string;
  category: "rider" | "driver" | "admin" | "shared" | "product";
  area: string;
  phase: "now" | "next" | "later" | "deferred";
  impact: "high" | "medium" | "low";
  order: number;
  voteCount: number;
  userVoted: boolean;
}

export interface RoadmapResponse {
  features: RoadmapFeature[];
  totalVotes: number;
}

export interface RoadmapVoteResponse {
  featureId: string;
  voteCount: number;
  userVoted: boolean;
}

export function loadStoredAuth(): StoredAuth | null {
  const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as StoredAuth;
  } catch {
    return null;
  }
}

export function saveStoredAuth(auth: StoredAuth | null) {
  if (!auth) {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
}

export async function apiFetch<T>(path: string, options?: RequestInit, token?: string): Promise<T> {
  const hasBody = options?.body !== undefined;
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        ...(hasBody ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options?.headers ?? {})
      }
    });
  } catch {
    throw new Error("API unavailable. Start the RealDrive API server and try again.");
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(payload?.message ?? "Request failed");
  }

  return response.json() as Promise<T>;
}

export async function apiFetchBlob(path: string, options?: RequestInit, token?: string): Promise<Blob> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers ?? {})
    }
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(payload?.message ?? "Request failed");
  }

  return response.blob();
}

export const api = {
  requestOtp(input: AuthOtpRequest) {
    return apiFetch<{ ok: true; devCode?: string }>("/auth/otp/request", {
      method: "POST",
      body: JSON.stringify(input)
    });
  },
  verifyOtp(input: AuthOtpVerify) {
    return apiFetch<StoredAuth>("/auth/otp/verify", {
      method: "POST",
      body: JSON.stringify(input)
    });
  },
  adminSetupStatus() {
    return apiFetch<AdminSetupStatusResponse>("/admin/setup/status");
  },
  setupAdmin(input: AdminSetupInput) {
    return apiFetch<StoredAuth>("/admin/setup", {
      method: "POST",
      body: JSON.stringify(input)
    });
  },
  loginAdmin(input: AdminLogin) {
    return apiFetch<StoredAuth>("/admin/auth/login", {
      method: "POST",
      body: JSON.stringify(input)
    });
  },
  signupDriver(input: DriverSignupInput) {
    return apiFetch<DriverAccount>("/driver/signup", {
      method: "POST",
      body: JSON.stringify(input)
    });
  },
  loginDriver(input: DriverLoginInput) {
    return apiFetch<StoredAuth>("/driver/auth/login", {
      method: "POST",
      body: JSON.stringify(input)
    });
  },
  acceptAdminInvite(input: AcceptAdminInviteInput) {
    return apiFetch<StoredAuth>("/admin/invite/accept", {
      method: "POST",
      body: JSON.stringify(input)
    });
  },
  exchangeCommunityAccess(input: CommunityAccessExchangeInput) {
    return apiFetch<StoredAuth>("/community/access/exchange", {
      method: "POST",
      body: JSON.stringify(input)
    });
  },
  logout(token?: string) {
    return apiFetch<{ ok: true }>("/auth/logout", { method: "POST" }, token);
  },
  me(token: string) {
    return apiFetch<SessionUser>("/me", undefined, token);
  },
  meShare(token: string) {
    return apiFetch<ShareInfo | null>("/me/share", undefined, token);
  },
  publicPushConfig() {
    return apiFetch<{ enabled: boolean; vapidPublicKey: string | null }>("/public/push/config");
  },
  trackSiteHeartbeat(input: TrackSiteHeartbeatInput) {
    return apiFetch<{ ok: true }>("/public/analytics/heartbeat", {
      method: "POST",
      body: JSON.stringify(input)
    });
  },
  createAdSubmission(input: CreateAdSubmissionInput) {
    return apiFetch<AdSubmissionResponse>("/public/ads/submissions", {
      method: "POST",
      body: JSON.stringify(input)
    });
  },
  getPublicAdPricing() {
    return apiFetch<PublicAdPricingResponse>("/public/ads/pricing");
  },
  getPublicAdDisplay(referralCode: string) {
    return apiFetch<PublicAdDisplayResponse>(`/public/ads/display/${referralCode}`);
  },
  resolveAdVisit(redirectToken: string) {
    return apiFetch<AdVisitResolveResponse>(`/public/ads/visit/${redirectToken}`);
  },
  getNotificationPreferences(token: string) {
    return apiFetch<NotificationPreferencesResponse>("/me/notification-preferences", undefined, token);
  },
  updateNotificationPreferences(input: UpdateNotificationPreferenceInput, token: string) {
    return apiFetch<{ preferences: NotificationPreferencesResponse["preferences"] }>("/me/notification-preferences", {
      method: "PUT",
      body: JSON.stringify(input)
    }, token);
  },
  upsertPushSubscription(input: UpsertPushSubscriptionInput, token: string) {
    return apiFetch<{ ok: true; subscriptionCount: number; subscriptions: NotificationPreferencesResponse["subscriptions"] }>(
      "/me/push-subscriptions",
      {
        method: "POST",
        body: JSON.stringify(input)
      },
      token
    );
  },
  unsubscribePushSubscription(endpoint: string, token: string) {
    return apiFetch<{ ok: true; subscriptionCount: number; subscriptions: NotificationPreferencesResponse["subscriptions"] }>(
      "/me/push-subscriptions/unsubscribe",
      {
        method: "POST",
        body: JSON.stringify({ endpoint })
      },
      token
    );
  },
  sendTestPushNotification(token: string) {
    return apiFetch<{ ok: true; push: { sentCount: number; failedCount: number; pushEnabled: boolean } }>(
      "/me/notifications/test-push",
      {
        method: "POST",
        body: JSON.stringify({})
      },
      token
    );
  },
  listNotificationDeliveryLogs(token: string, limit = 20) {
    const params = new URLSearchParams({ limit: String(limit) });
    return apiFetch<NotificationDeliveryLogsResponse>(`/me/notification-delivery-logs?${params.toString()}`, undefined, token);
  },
  createDriverRole(input: CreateDriverRoleInput, token: string) {
    return apiFetch<DriverAccount>("/me/roles/driver", {
      method: "POST",
      body: JSON.stringify(input)
    }, token);
  },
  quoteRide(input: Omit<CreateRideInput, "paymentMethod" | "scheduledFor"> & { pickupAddress: string; dropoffAddress: string }) {
    return apiFetch<RideQuoteResponse>("/quotes/ride", {
      method: "POST",
      body: JSON.stringify(input)
    });
  },
  addressSuggestions(query: string) {
    const params = new URLSearchParams({ q: query });
    return apiFetch<AddressSuggestion[]>(`/public/address-suggestions?${params.toString()}`);
  },
  publicDrivers() {
    return apiFetch<DriverAccount[]>("/public/drivers");
  },
  createPublicRide(input: PublicRideRequest) {
    return apiFetch<PublicRideResponse>("/public/rides", {
      method: "POST",
      body: JSON.stringify(input)
    });
  },
  getPublicTrack(token: string) {
    return apiFetch<PublicRideTrackingResponse>(`/public/track/${token}`);
  },
  createRiderLead(input: { name: string; email: string; phone?: string; referredByCode?: string }) {
    return apiFetch<RiderLeadResponse>("/public/rider-leads", {
      method: "POST",
      body: JSON.stringify(input)
    });
  },
  createDriverInterest(input: DriverInterestInput) {
    return apiFetch<DriverInterest>("/public/driver-interest", {
      method: "POST",
      body: JSON.stringify(input)
    });
  },
  resolveShare(referralCode: string) {
    return apiFetch<PublicShareResolveResponse>(`/public/share/${referralCode}`);
  },
  createRide(input: CreateRideInput, token: string) {
    return apiFetch<Ride>("/rides", {
      method: "POST",
      body: JSON.stringify(input)
    }, token);
  },
  getRide(id: string, token: string) {
    return apiFetch<Ride>(`/rides/${id}`, undefined, token);
  },
  cancelRide(id: string, token: string) {
    return apiFetch<Ride>(`/rides/${id}/cancel`, { method: "POST" }, token);
  },
  listRiderRides(token: string) {
    return apiFetch<Ride[]>("/rider/rides", undefined, token);
  },
  getDriverProfile(token: string) {
    return apiFetch<DriverAccount>("/driver/profile", undefined, token);
  },
  updateDriverProfile(input: DriverProfileUpdateInput, token: string) {
    return apiFetch<DriverAccount>("/driver/profile", {
      method: "PATCH",
      body: JSON.stringify(input)
    }, token);
  },
  getDriverDispatchSettings(token: string) {
    return apiFetch<DriverDispatchSettings>("/driver/dispatch-settings", undefined, token);
  },
  updateDriverDispatchSettings(input: DriverDispatchSettings, token: string) {
    return apiFetch<DriverDispatchSettings>("/driver/dispatch-settings", {
      method: "PUT",
      body: JSON.stringify(input)
    }, token);
  },
  getDriverRates(token: string) {
    return apiFetch<DriverRateCard>("/driver/rates", undefined, token);
  },
  updateDriverRates(input: DriverRateCardUpdateInput, token: string) {
    return apiFetch<DriverRateCard>("/driver/rates", {
      method: "PUT",
      body: JSON.stringify(input)
    }, token);
  },
  getDriverDues(token: string) {
    return apiFetch<DriverDuesResponse>("/driver/dues", undefined, token);
  },
  getDriverAdProgram(token: string) {
    return apiFetch<DriverAdProgramResponse>("/driver/ad-program", undefined, token);
  },
  updateDriverAdProgram(input: UpdateDriverAdProgramInput, token: string) {
    return apiFetch<DriverAdProgramResponse>("/driver/ad-program", {
      method: "PUT",
      body: JSON.stringify(input)
    }, token);
  },
  listDriverOffers(token: string) {
    return apiFetch<Ride[]>("/driver/offers", undefined, token);
  },
  acceptOffer(rideId: string, token: string) {
    return apiFetch<Ride>(`/driver/offers/${rideId}/accept`, { method: "POST" }, token);
  },
  declineOffer(rideId: string, token: string) {
    return apiFetch<Ride>(`/driver/offers/${rideId}/decline`, { method: "POST" }, token);
  },
  updateDriverAvailability(available: boolean, token: string) {
    return apiFetch<SessionUser>("/driver/availability", {
      method: "POST",
      body: JSON.stringify({ available })
    }, token);
  },
  listActiveDriverRides(token: string) {
    return apiFetch<Ride[]>("/driver/rides/active", undefined, token);
  },
  updateRideStatus(rideId: string, input: UpdateRideStatusInput, token: string) {
    return apiFetch<Ride>(`/driver/rides/${rideId}/status`, {
      method: "POST",
      body: JSON.stringify(input)
    }, token);
  },
  sendDriverLocation(input: DriverLocationInput, token: string) {
    return apiFetch<Ride>("/driver/location", {
      method: "POST",
      body: JSON.stringify(input)
    }, token);
  },
  sendIdleDriverLocation(input: DriverIdleLocationInput, token: string) {
    return apiFetch<SessionUser>("/driver/location/idle", {
      method: "POST",
      body: JSON.stringify(input)
    }, token);
  },
  listAdminRides(token: string) {
    return apiFetch<Ride[]>("/admin/rides", undefined, token);
  },
  createAdminTestRide(input: AdminCreateTestRideInput, token: string) {
    return apiFetch<AdminCreateTestRideResponse>("/admin/test-rides", {
      method: "POST",
      body: JSON.stringify(input)
    }, token);
  },
  listAdminLeads(token: string) {
    return apiFetch<AdminLeadsResponse>("/admin/leads", undefined, token);
  },
  getAdminActivity(token: string, windowMinutes = 30) {
    const params = new URLSearchParams({ windowMinutes: String(windowMinutes) });
    return apiFetch<AdminActivityResponse>(`/admin/data/activity?${params.toString()}`, undefined, token);
  },
  updateAdminRide(rideId: string, input: AdminUpdateRideInput, token: string) {
    return apiFetch<Ride>(`/admin/rides/${rideId}`, {
      method: "PATCH",
      body: JSON.stringify(input)
    }, token);
  },
  listAdminDues(token: string) {
    return apiFetch<AdminDuesResponse>("/admin/dues", undefined, token);
  },
  listAdminAds(token: string) {
    return apiFetch<AdminAdsResponse>("/admin/ads", undefined, token);
  },
  getAdminAdPricing(token: string) {
    return apiFetch<AdPricingSettings>("/admin/ads/pricing", undefined, token);
  },
  updateAdminAdPricing(input: UpdateAdPricingSettingsInput, token: string) {
    return apiFetch<AdPricingSettings>("/admin/ads/pricing", {
      method: "PUT",
      body: JSON.stringify(input)
    }, token);
  },
  updateAdminAd(submissionId: string, input: AdminUpdateAdSubmissionInput, token: string) {
    return apiFetch<AdSubmission>(`/admin/ads/${submissionId}`, {
      method: "PATCH",
      body: JSON.stringify(input)
    }, token);
  },
  applyDriverAdCredits(driverId: string, input: ApplyDriverAdCreditsInput, token: string) {
    return apiFetch<DriverAdProgramResponse>(`/admin/drivers/${driverId}/ad-credits/apply`, {
      method: "POST",
      body: JSON.stringify(input)
    }, token);
  },
  generateDueBatch(driverId: string, token: string) {
    return apiFetch<PlatformDueBatch>(`/admin/dues/generate/${driverId}`, {
      method: "POST"
    }, token);
  },
  reconcileDueBatch(input: AdminReconcilePlatformDueBatchInput, token: string) {
    return apiFetch<PlatformDueBatch>("/admin/dues/reconcile", {
      method: "POST",
      body: JSON.stringify(input)
    }, token);
  },
  updateDueBatch(batchId: string, input: AdminUpdatePlatformDueBatchInput, token: string) {
    return apiFetch<PlatformDueBatch>(`/admin/dues/batches/${batchId}`, {
      method: "PATCH",
      body: JSON.stringify(input)
    }, token);
  },
  updateAdminDue(dueId: string, input: AdminUpdatePlatformDueInput, token: string) {
    return apiFetch<PlatformDue>(`/admin/dues/${dueId}`, {
      method: "PATCH",
      body: JSON.stringify(input)
    }, token);
  },
  getPlatformPayoutSettings(token: string) {
    return apiFetch<PlatformPayoutSettings | null>("/admin/platform-payout-settings", undefined, token);
  },
  updatePlatformPayoutSettings(input: UpdatePlatformPayoutSettingsInput, token: string) {
    return apiFetch<PlatformPayoutSettings>("/admin/platform-payout-settings", {
      method: "PUT",
      body: JSON.stringify(input)
    }, token);
  },
  listDriverApplications(token: string) {
    return apiFetch<DriverAccount[]>("/admin/driver-applications", undefined, token);
  },
  updateDriverApproval(driverId: string, input: AdminUpdateDriverApprovalInput, token: string) {
    return apiFetch<DriverAccount>(`/admin/drivers/${driverId}/approval`, {
      method: "PATCH",
      body: JSON.stringify(input)
    }, token);
  },
  reviewDriverDocument(driverId: string, documentId: string, input: AdminReviewDriverDocumentInput, token: string) {
    return apiFetch<DriverOnboardingDocument>(`/admin/drivers/${driverId}/documents/${documentId}`, {
      method: "PATCH",
      body: JSON.stringify(input)
    }, token);
  },
  downloadDriverDocument(driverId: string, documentId: string, token: string) {
    return apiFetchBlob(`/admin/drivers/${driverId}/documents/${documentId}/file`, undefined, token);
  },
  listDrivers(token: string) {
    return apiFetch<DriverAccount[]>("/admin/drivers", undefined, token);
  },
  updateDriver(driverId: string, input: AdminUpdateDriverInput, token: string) {
    return apiFetch<DriverAccount>(`/admin/drivers/${driverId}`, {
      method: "PATCH",
      body: JSON.stringify(input)
    }, token);
  },
  updateDriverCollector(driverId: string, collectorAdminId: string | null, token: string) {
    return apiFetch<DriverAccount>(`/admin/drivers/${driverId}/collector`, {
      method: "PATCH",
      body: JSON.stringify({ collectorAdminId })
    }, token);
  },
  listAdminInvites(token: string) {
    return apiFetch<AdminInvitesResponse>("/admin/invites", undefined, token);
  },
  getAdminTeam(token: string) {
    return apiFetch<AdminTeamResponse>("/admin/team", undefined, token);
  },
  createAdminInvite(input: CreateAdminInviteInput, token: string) {
    return apiFetch<AdminInvite>("/admin/invites", {
      method: "POST",
      body: JSON.stringify(input)
    }, token);
  },
  revokeAdminInvite(inviteId: string, token: string) {
    return apiFetch<AdminInvite>(`/admin/invites/${inviteId}/revoke`, {
      method: "POST"
    }, token);
  },
  listPlatformRates(token: string) {
    return apiFetch<PricingRule[]>("/admin/platform-rates", undefined, token);
  },
  listMarketConfigs(token: string) {
    return apiFetch<MarketConfigsResponse>("/admin/markets", undefined, token);
  },
  createMarketConfig(input: CreateMarketConfigInput, token: string) {
    return apiFetch<{ marketKey: string; rideTypeCount: number }>("/admin/markets", {
      method: "POST",
      body: JSON.stringify(input)
    }, token);
  },
  updatePlatformRates(input: UpdatePlatformRatesInput, token: string) {
    return apiFetch<PricingRule[]>("/admin/platform-rates", {
      method: "PUT",
      body: JSON.stringify(input)
    }, token);
  },
  listPlatformRateBenchmarks(token: string) {
    return apiFetch<PlatformRateBenchmarksResponse>("/admin/platform-rates/benchmarks", undefined, token);
  },
  updatePlatformRateBenchmarks(input: UpdatePlatformRateBenchmarksInput, token: string) {
    return apiFetch<PlatformRateBenchmarksResponse>("/admin/platform-rates/benchmarks", {
      method: "PUT",
      body: JSON.stringify(input)
    }, token);
  },
  getPlatformRateAutoStatus(token: string) {
    return apiFetch<PlatformRateAutoStatus>("/admin/platform-rates/auto-status", undefined, token);
  },
  applyPlatformRatesAuto(token: string) {
    return apiFetch<PlatformRateAutoApplyResponse>("/admin/platform-rates/auto-apply", {
      method: "POST",
      body: JSON.stringify({})
    }, token);
  },
  listAdminAuditLogs(token: string, query?: { limit?: number; action?: string; entityType?: string }) {
    const params = new URLSearchParams();
    if (query?.limit) {
      params.set("limit", String(query.limit));
    }
    if (query?.action) {
      params.set("action", query.action);
    }
    if (query?.entityType) {
      params.set("entityType", query.entityType);
    }
    const suffix = params.size ? `?${params.toString()}` : "";
    return apiFetch<AdminAuditLogsResponse>(`/admin/audit-logs${suffix}`, undefined, token);
  },
  listCommunityProposals(token: string) {
    return apiFetch<CommunityBoardResponse>("/community/proposals", undefined, token);
  },
  createCommunityProposal(input: CreateCommunityProposalInput, token: string) {
    return apiFetch<CommunityProposal>("/community/proposals", {
      method: "POST",
      body: JSON.stringify(input)
    }, token);
  },
  voteOnCommunityProposal(proposalId: string, input: CommunityVoteInput, token: string) {
    return apiFetch<CommunityProposal>(`/community/proposals/${proposalId}/vote`, {
      method: "POST",
      body: JSON.stringify(input)
    }, token);
  },
  getCommunityComments(proposalId: string, token: string) {
    return apiFetch<CommunityCommentsResponse>(`/community/proposals/${proposalId}/comments`, undefined, token);
  },
  createCommunityComment(proposalId: string, input: CreateCommunityCommentInput, token: string) {
    return apiFetch<CommunityComment>(`/community/proposals/${proposalId}/comments`, {
      method: "POST",
      body: JSON.stringify(input)
    }, token);
  },
  updateCommunityProposal(proposalId: string, input: AdminUpdateCommunityProposalInput, token: string) {
    return apiFetch<CommunityProposal>(`/admin/community/proposals/${proposalId}`, {
      method: "PATCH",
      body: JSON.stringify(input)
    }, token);
  },
  updateCommunityComment(commentId: string, input: AdminUpdateCommunityCommentInput, token: string) {
    return apiFetch<CommunityComment>(`/admin/community/comments/${commentId}`, {
      method: "PATCH",
      body: JSON.stringify(input)
    }, token);
  },
  submitIssueReport(input: CreateIssueReportInput, token: string) {
    return apiFetch<IssueReportResponse>("/issues/report", {
      method: "POST",
      body: JSON.stringify(input)
    }, token);
  },
  getRoadmap(token: string) {
    return apiFetch<RoadmapResponse>("/roadmap", undefined, token);
  },
  voteRoadmapFeature(featureId: string, vote: boolean, token: string) {
    return apiFetch<RoadmapVoteResponse>(`/me/roadmap/vote/${featureId}`, {
      method: "POST",
      body: JSON.stringify({ vote })
    }, token);
  },

  // Market Regions
  listMarketRegions(token: string) {
    return apiFetch<MarketRegionsResponse>("/admin/regions", undefined, token);
  },
  createMarketRegion(input: CreateMarketRegionInput, token: string) {
    return apiFetch<MarketRegion>("/admin/regions", {
      method: "POST",
      body: JSON.stringify(input)
    }, token);
  },
  updateMarketRegion(id: string, input: UpdateMarketRegionInput, token: string) {
    return apiFetch<MarketRegion>(`/admin/regions/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input)
    }, token);
  },
  deleteMarketRegion(id: string, token: string) {
    return apiFetch<void>(`/admin/regions/${id}`, { method: "DELETE" }, token);
  },

  // API Keys
  listApiKeys(token: string) {
    return apiFetch<ApiKeysResponse>("/admin/api-keys", undefined, token);
  },
  createApiKey(input: CreateApiKeyInput, token: string) {
    return apiFetch<CreateApiKeyResponse>("/admin/api-keys", {
      method: "POST",
      body: JSON.stringify(input)
    }, token);
  },
  revokeApiKey(id: string, token: string) {
    return apiFetch<void>(`/admin/api-keys/${id}`, { method: "DELETE" }, token);
  },

  // Reporting
  getReportOverview(token: string, period: "7d" | "30d" | "90d" | "all" = "30d") {
    return apiFetch<AdminReportOverview>(`/admin/reports/overview?period=${period}`, undefined, token);
  },

  // Broadcast notifications
  broadcastNotification(input: AdminBroadcastNotificationInput, token: string) {
    return apiFetch<{ sentCount: number; failedCount: number; targetCount: number }>(
      "/admin/notifications/broadcast",
      { method: "POST", body: JSON.stringify(input) },
      token
    );
  },

  // Driver bg check order
  orderDriverBgCheck(driverId: string, input: AdminOrderBgCheckInput, token: string) {
    return apiFetch<DriverAccount>(`/admin/drivers/${driverId}/bg-check`, {
      method: "POST",
      body: JSON.stringify(input)
    }, token);
  }
};
