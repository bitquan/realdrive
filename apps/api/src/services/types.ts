import type {
  AdminSetupStatusResponse,
  CommunityComment,
  CommunityEligibility,
  CommunityProposal,
  CreateCommunityCommentInput,
  CreateCommunityProposalInput,
  CreateDriverRoleInput,
  DriverAccount,
  DriverBootstrapInput,
  DriverDispatchSettings,
  DriverInterest,
  DriverInterestInput,
  DriverPricingMode,
  DriverProfileUpdateInput,
  DriverRateCard,
  DriverRateCardUpdateInput,
  DuePaymentMethod,
  PaymentStatus,
  PlatformDue,
  PlatformDueStatus,
  PlatformPayoutSettings,
  PricingRule,
  Ride,
  RidePricingSource,
  RideStatus,
  RideType,
  RiderLead,
  RiderLeadInput,
  RouteLocation,
  SessionUser,
  ShareInfo
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
  createDriverAccount(input: {
    name: string;
    email: string;
    phone: string;
    passwordHash: string;
    homeState: string;
    homeCity: string;
    vehicle: {
      makeModel: string;
      plate: string;
      color?: string;
      rideType: RideType;
      seats: number;
    };
  }): Promise<DriverAccount>;
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
  recordLocation(input: {
    rideId: string;
    driverId: string;
    lat: number;
    lng: number;
    heading?: number;
    speed?: number;
    available?: boolean;
  }): Promise<Ride>;
  createRiderLead(
    input: RiderLeadInput & {
      userId?: string | null;
      referredByUserId?: string | null;
      referredByCode?: string | null;
    }
  ): Promise<RiderLead>;
  listRiderLeads(): Promise<RiderLead[]>;
  createDriverInterest(input: DriverInterestInput): Promise<DriverInterest>;
  listDriverInterests(): Promise<DriverInterest[]>;
  listAdminRides(): Promise<Ride[]>;
  listDrivers(): Promise<DriverAccount[]>;
  listDriverApplications(): Promise<DriverAccount[]>;
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
}

export interface MapsService {
  estimateRoute(pickupAddress: string, dropoffAddress: string): Promise<RouteEstimate>;
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
