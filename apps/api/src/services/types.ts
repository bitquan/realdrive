import type {
  AcceptAdminInviteInput,
  AdSubmission,
  AdVisitResolveResponse,
  AddressSuggestion,
  AdminInvite,
  AdminActivityResponse,
  AdminAdsResponse,
  AdminSetupStatusResponse,
  AdminUpdateAdSubmissionInput,
  ApplyDriverAdCreditsInput,
  AdminUpdatePlatformDueBatchInput,
  AdminReviewDriverDocumentInput,
  AdminAuditLog,
  AdminOrderBgCheckInput,
  AdminReportOverview,
  ApiKey,
  CreateApiKeyInput,
  CreateMarketConfigInput,
  CreateMarketRegionInput,
  UpdateMarketRegionInput,
  CommunityComment,
  CommunityEligibility,
  CommunityProposal,
  CreateAdminInviteInput,
  CreateAdSubmissionInput,
  CreateCommunityCommentInput,
  CreateCommunityProposalInput,
  CreateDriverRoleInput,
  AdPricingSettings,
  DriverDueSnapshot,
  DriverAccount,
  DriverAdProgramResponse,
  DriverBootstrapInput,
  DriverOnboardingDocument,
  DriverDispatchSettings,
  DriverIdleLocationInput,
  DriverInterest,
  DriverInterestInput,
  MarketRegion,
  NotificationDeliveryLog,
  NotificationPreference,
  IssueReport,
  IssueReportSource,
  IssueReportStatus,
  DriverPricingMode,
  DriverProfileUpdateInput,
  DriverRateCard,
  DriverRateCardUpdateInput,
  DuePaymentMethod,
  PaymentStatus,
  PlatformDue,
  PlatformDueBatch,
  PlatformRateBenchmarkRule,
  MarketConfig,
  PlatformDueStatus,
  PlatformPayoutSettings,
  PricingRule,
  Ride,
  RidePricingSource,
  RideStatus,
  RideType,
  UpsertPushSubscriptionInput,
  UpdateNotificationPreferenceInput,
  RiderLead,
  RiderLeadInput,
  RouteLocation,
  SessionUser,
  ShareInfo,
  PublicAdDisplayResponse,
  UpdateAdPricingSettingsInput
} from "@shared/contracts";

export interface DriverCandidate extends DriverAccount {
  lat: number | null;
  lng: number | null;
  rating: number;
}

export interface RouteEstimate {
  pickup: RouteLocation;
  dropoff: RouteLocation;
  distanceMiles: number;
  durationMinutes: number;
  provider: "mapbox" | "fallback";
}

export interface CreateRideRecordInput {
  riderId: string;
  rideType: RideType;
  paymentMethod: Ride["payment"]["method"];
  status: RideStatus;
  route: RouteEstimate;
  quotedFare: number;
  estimatedPlatformDue: number;
  estimatedCustomerTotal: number;
  requestedAt: Date | null;
  scheduledFor: Date | null;
  publicTrackingToken?: string;
  referredByUserId?: string | null;
  referredByCode?: string | null;
  platformMarketKey?: string | null;
  estimatedPricingSource?: RidePricingSource;
}

export interface AuthIdentity extends SessionUser {
  passwordHash?: string | null;
}

export interface UpdateRideAdminPatch {
  status?: RideStatus;
  paymentStatus?: PaymentStatus;
  fareOverride?: number | null;
  routeFallbackMiles?: number | null;
  quotedFare?: number;
  estimatedPlatformDue?: number;
  estimatedCustomerTotal?: number;
  finalFare?: number | null;
  finalPlatformDue?: number | null;
  finalCustomerTotal?: number | null;
  finalPricingSource?: RidePricingSource | null;
  paymentCollectedById?: string | null;
  paymentCollectedAt?: Date | null;
}

export interface Store {
  findSessionUserById(userId: string): Promise<SessionUser | null>;
  findUserForOtp(phone: string, role: "rider" | "driver"): Promise<AuthIdentity | null>;
  createRiderIdentity(input: { phone?: string | null; email?: string | null; name: string }): Promise<AuthIdentity>;
  getAdminSetupStatus(): Promise<AdminSetupStatusResponse>;
  setupAdmin(input: {
    name: string;
    email: string;
    passwordHash: string;
    driverProfile?: DriverBootstrapInput | null;
  }): Promise<AuthIdentity>;
  findAdminByEmail(email: string): Promise<AuthIdentity | null>;
  findDriverByEmail(email: string): Promise<AuthIdentity | null>;
  createDriverRole(userId: string, input: CreateDriverRoleInput): Promise<DriverAccount>;
  createDriverAccount(
    input: Omit<CreateDriverRoleInput, "documents"> & {
      name: string;
      email: string;
      passwordHash: string;
      documents: CreateDriverRoleInput["documents"];
    }
  ): Promise<DriverAccount>;
  getDriverAccount(driverId: string): Promise<DriverAccount | null>;
  updateDriverProfile(driverId: string, patch: DriverProfileUpdateInput): Promise<DriverAccount>;
  getDriverDispatchSettings(driverId: string): Promise<DriverDispatchSettings>;
  updateDriverDispatchSettings(driverId: string, settings: DriverDispatchSettings): Promise<DriverDispatchSettings>;
  getDriverRateCard(driverId: string): Promise<DriverRateCard>;
  replaceDriverRateCard(driverId: string, input: DriverRateCardUpdateInput): Promise<DriverRateCard>;
  findUserByReferralCode(referralCode: string): Promise<SessionUser | null>;
  findUserByCommunityAccessToken(token: string): Promise<SessionUser | null>;
  ensureUserReferralCode(userId: string): Promise<SessionUser>;
  ensureUserCommunityAccessToken(userId: string): Promise<string>;
  listPlatformPricingRules(): Promise<PricingRule[]>;
  replacePlatformPricingRules(rules: Omit<PricingRule, "id" | "updatedAt">[]): Promise<PricingRule[]>;
  listPlatformRateBenchmarks(): Promise<PlatformRateBenchmarkRule[]>;
  upsertPlatformRateBenchmarks(rules: Array<Omit<PlatformRateBenchmarkRule, "observedAt">>): Promise<PlatformRateBenchmarkRule[]>;
  listMarketConfigs(): Promise<MarketConfig[]>;
  createMarketConfig(input: CreateMarketConfigInput): Promise<MarketConfig>;
  listAdminAuditLogs(options?: { limit?: number; action?: string; entityType?: string }): Promise<AdminAuditLog[]>;
  createRide(input: CreateRideRecordInput): Promise<Ride>;
  getRideById(rideId: string): Promise<Ride | null>;
  getRideByPublicTrackingToken(token: string): Promise<Ride | null>;
  listRiderRides(riderId: string): Promise<Ride[]>;
  listEligibleDriversForRide(pickup: RouteLocation, pickupStateCode?: string | null): Promise<DriverCandidate[]>;
  createRideOffers(rideId: string, driverIds: string[], expiresAt: Date): Promise<Ride>;
  claimRideOffer(rideId: string, driverId: string, acceptedAt: Date): Promise<Ride | null>;
  applyAcceptedRidePricing(
    rideId: string,
    pricing: {
      finalFare: number | null;
      finalPlatformDue: number | null;
      finalCustomerTotal: number | null;
      finalPricingSource: RidePricingSource | null;
      matchedDriverPricingMode: DriverPricingMode;
    }
  ): Promise<Ride>;
  declineRideOffer(rideId: string, driverId: string): Promise<Ride | null>;
  expireRideOffers(rideId: string): Promise<Ride>;
  listDriverOffers(driverId: string): Promise<Ride[]>;
  listActiveDriverRides(driverId: string): Promise<Ride[]>;
  updateRideStatus(
    rideId: string,
    patch: {
      status: RideStatus;
      finalFare?: number | null;
      finalPlatformDue?: number | null;
      finalCustomerTotal?: number | null;
    }
  ): Promise<Ride>;
  updateRideAdmin(rideId: string, patch: UpdateRideAdminPatch): Promise<Ride>;
  syncPlatformDueForRide(rideId: string): Promise<PlatformDue | null>;
  listDriverDues(driverId: string): Promise<PlatformDue[]>;
  listAllPlatformDues(): Promise<PlatformDue[]>;
  updatePlatformDue(
    dueId: string,
    patch: {
      status: Exclude<PlatformDueStatus, "overdue">;
      paymentMethod?: DuePaymentMethod | null;
      note?: string | null;
      resolvedById?: string | null;
    }
  ): Promise<PlatformDue>;
  getPlatformPayoutSettings(): Promise<PlatformPayoutSettings | null>;
  updatePlatformPayoutSettings(input: Partial<PlatformPayoutSettings>): Promise<PlatformPayoutSettings>;
  markOverduePlatformDues(now?: Date): Promise<PlatformDue[]>;
  driverHasOverdueDues(driverId: string): Promise<boolean>;
  listAdminUsers(): Promise<Array<{ id: string; name: string; email: string | null; phone: string | null; referralCode?: string | null }>>;
  getCollectorPayoutSettings(adminId: string): Promise<PlatformPayoutSettings | null>;
  updateCollectorPayoutSettings(adminId: string, input: Partial<PlatformPayoutSettings>): Promise<PlatformPayoutSettings>;
  listDriverDueBatches(driverId: string): Promise<PlatformDueBatch[]>;
  listAllDueBatches(): Promise<PlatformDueBatch[]>;
  getDriverDueSnapshot(driverId: string): Promise<DriverDueSnapshot>;
  listDriverDueSnapshots(): Promise<DriverDueSnapshot[]>;
  createDueBatchForDriver(
    driverId: string,
    collectorAdminId?: string | null,
    options?: { markOverdue?: boolean; adminNote?: string | null }
  ): Promise<PlatformDueBatch | null>;
  updateDueBatch(
    batchId: string,
    patch: AdminUpdatePlatformDueBatchInput & { resolvedById?: string | null }
  ): Promise<PlatformDueBatch>;
  reconcileDueBatch(
    input: {
      referenceText: string;
      paymentMethod: DuePaymentMethod;
      observedTitle?: string | null;
      observedNote?: string | null;
      adminNote?: string | null;
      resolvedById?: string | null;
    }
  ): Promise<PlatformDueBatch>;
  assignDriverCollector(driverId: string, collectorAdminId: string | null): Promise<DriverAccount>;
  createAdminInvite(inviterId: string, input: CreateAdminInviteInput, baseUrl: string): Promise<AdminInvite>;
  listAdminInvites(inviterId?: string | null, baseUrl?: string): Promise<AdminInvite[]>;
  listAdminTeamUsers(): Promise<SessionUser[]>;
  revokeAdminInvite(inviteId: string, adminId: string, baseUrl?: string): Promise<AdminInvite>;
  acceptAdminInvite(input: AcceptAdminInviteInput & { passwordHash: string }): Promise<AuthIdentity>;
  recordLocation(input: {
    rideId: string;
    driverId: string;
    lat: number;
    lng: number;
    heading?: number;
    speed?: number;
    available?: boolean;
  }): Promise<Ride>;
  recordIdleLocation(driverId: string, input: DriverIdleLocationInput): Promise<SessionUser>;
  createRiderLead(
    input: RiderLeadInput & {
      userId?: string | null;
      referredByUserId?: string | null;
      referredByCode?: string | null;
    }
  ): Promise<RiderLead>;
  listRiderLeads(): Promise<RiderLead[]>;
  createDriverInterest(input: DriverInterestInput): Promise<DriverInterest>;
  createAdSubmission(input: CreateAdSubmissionInput): Promise<AdSubmission>;
  listAdminAds(): Promise<AdminAdsResponse>;
  updateAdSubmission(submissionId: string, input: AdminUpdateAdSubmissionInput): Promise<AdSubmission>;
  getDriverAdProgram(driverId: string): Promise<DriverAdProgramResponse>;
  updateDriverAdProgram(driverId: string, optedIn: boolean): Promise<DriverAdProgramResponse>;
  getPublicAdDisplay(referralCode: string, baseUrl: string): Promise<PublicAdDisplayResponse>;
  resolveAdVisit(redirectToken: string, metadata?: { ipAddress?: string | null; referrer?: string | null; userAgent?: string | null }): Promise<AdVisitResolveResponse>;
  applyDriverAdCredits(driverId: string, input: ApplyDriverAdCreditsInput): Promise<DriverAdProgramResponse>;
  listDriverInterests(): Promise<DriverInterest[]>;
  listAdminRides(): Promise<Ride[]>;
  listDrivers(): Promise<DriverAccount[]>;
  listDriverApplications(): Promise<DriverAccount[]>;
  reviewDriverDocument(
    driverId: string,
    documentId: string,
    input: AdminReviewDriverDocumentInput & { reviewedById: string }
  ): Promise<DriverOnboardingDocument>;
  getDriverDocumentFile(
    driverId: string,
    documentId: string
  ): Promise<{ absolutePath: string; fileName: string; mimeType: string }>;
  updateDriver(
    driverId: string,
    patch: {
      name?: string;
      available?: boolean;
      approvalStatus?: DriverAccount["approvalStatus"];
      homeState?: string | null;
      homeCity?: string | null;
      pricingMode?: DriverPricingMode;
      dispatchSettings?: DriverDispatchSettings;
    }
  ): Promise<DriverAccount>;
  setDriverAvailability(driverId: string, available: boolean): Promise<SessionUser>;
  findDueScheduledRides(releaseBefore: Date): Promise<Ride[]>;
  getCommunityEligibility(user: SessionUser): Promise<CommunityEligibility>;
  listCommunityProposals(viewerId?: string | null): Promise<CommunityProposal[]>;
  createCommunityProposal(
    authorId: string,
    input: CreateCommunityProposalInput
  ): Promise<CommunityProposal>;
  getCommunityProposalById(proposalId: string, viewerId?: string | null): Promise<CommunityProposal | null>;
  voteOnCommunityProposal(
    proposalId: string,
    userId: string,
    choice: "yes" | "no"
  ): Promise<CommunityProposal>;
  listCommunityComments(proposalId: string): Promise<CommunityComment[]>;
  createCommunityComment(
    proposalId: string,
    authorId: string,
    input: CreateCommunityCommentInput
  ): Promise<CommunityComment>;
  updateCommunityProposal(
    proposalId: string,
    patch: {
      pinned?: boolean;
      closed?: boolean;
      hidden?: boolean;
    }
  ): Promise<CommunityProposal>;
  updateCommunityComment(commentId: string, patch: { hidden: boolean }): Promise<CommunityComment>;
  addAuditLog(input: { actorId?: string; action: string; entityType: string; entityId: string; metadata?: unknown }): Promise<void>;
  createIssueReport(input: {
    reporterId: string;
    reporterRole: "rider" | "driver" | "admin";
    source: IssueReportSource;
    summary: string;
    details?: string | null;
    page?: string | null;
    rideId?: string | null;
    metadata?: Record<string, string | number | boolean | null> | null;
  }): Promise<IssueReport>;
  updateIssueReportGitHubSync(
    reportId: string,
    patch: {
      status: IssueReportStatus;
      githubIssueNumber?: number | null;
      githubIssueUrl?: string | null;
      error?: string | null;
    }
  ): Promise<IssueReport>;
  getNotificationPreference(userId: string): Promise<NotificationPreference>;
  updateNotificationPreference(userId: string, input: UpdateNotificationPreferenceInput): Promise<NotificationPreference>;
  upsertPushSubscription(userId: string, input: UpsertPushSubscriptionInput): Promise<void>;
  removePushSubscription(userId: string, endpoint: string): Promise<void>;
  listPushSubscriptions(userId: string): Promise<Array<{
    id: string;
    endpoint: string;
    keys: { p256dh: string; auth: string };
    userAgent: string | null;
    enabled: boolean;
    createdAt: string;
    updatedAt: string;
  }>>;
  listNotificationDeliveryLogs(userId: string, limit?: number): Promise<NotificationDeliveryLog[]>;
  logNotificationDelivery(input: {
    userId: string;
    rideId?: string | null;
    channel: "push" | "sms";
    eventKey: string;
    status: "sent" | "failed" | "skipped";
    errorCode?: string | null;
    errorText?: string | null;
    metadata?: Record<string, string | number | boolean | null> | null;
  }): Promise<void>;
  trackSiteHeartbeat(input: {
    sessionId: string;
    path?: string | null;
    referrer?: string | null;
    userAgent?: string | null;
    userId?: string | null;
    seenAt?: Date;
  }): Promise<void>;
  getAdminActivityOverview(windowMinutes: number): Promise<AdminActivityResponse>;

  // Roadmap feature voting
  createRoadmapFeatureVote(userId: string, featureId: string): Promise<void>;
  removeRoadmapFeatureVote(userId: string, featureId: string): Promise<void>;
  hasUserVotedForFeature(userId: string, featureId: string): Promise<boolean>;
  getFeatureVoteCount(featureId: string): Promise<number>;

  // Market regions (full multi-city config)
  listMarketRegions(): Promise<MarketRegion[]>;
  createMarketRegion(input: CreateMarketRegionInput): Promise<MarketRegion>;
  updateMarketRegion(id: string, input: UpdateMarketRegionInput): Promise<MarketRegion>;
  deleteMarketRegion(id: string): Promise<void>;

  // API keys
  listApiKeys(ownerId: string): Promise<ApiKey[]>;
  createApiKey(input: CreateApiKeyInput & { ownerId: string; keyHash: string; keyPrefix: string }): Promise<ApiKey>;
  revokeApiKey(id: string): Promise<void>;
  findApiKeyByHash(hash: string): Promise<ApiKey | null>;
  touchApiKeyLastUsed(id: string): Promise<void>;

  // Admin reporting
  getAdminReportOverview(period: "7d" | "30d" | "90d" | "all"): Promise<AdminReportOverview>;

  // Driver background check
  orderDriverBgCheck(driverId: string, input: AdminOrderBgCheckInput): Promise<DriverAccount>;

  // Stripe webhook settlement
  resolveStripeDue(stripeCheckoutSessionId: string): Promise<void>;

  // Broadcast notification targets
  listUserIdsForBroadcast(roles: Array<"rider" | "driver">): Promise<string[]>;
  getAdPricingSettings(): Promise<AdPricingSettings>;
  updateAdPricingSettings(input: UpdateAdPricingSettingsInput): Promise<AdPricingSettings>;
}

export interface MapsService {
  estimateRoute(pickupAddress: string, dropoffAddress: string): Promise<RouteEstimate>;
  autocompleteAddress(query: string): Promise<AddressSuggestion[]>;
}

export interface OtpService {
  requestCode(phone: string): Promise<{ ok: true; devCode?: string }>;
  verifyCode(phone: string, code: string): Promise<boolean>;
}

export interface RideEventPublisher {
  rideOffered(ride: Ride, driverIds: string[]): void;
  rideUpdated(ride: Ride): void;
  rideLocationUpdated(ride: Ride): void;
  driverAvailabilityChanged(driver: SessionUser): void;
}

export interface ShareContext {
  share: ShareInfo | null;
}
