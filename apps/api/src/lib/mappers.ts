import {
  CommunityVoteChoice as DbCommunityVoteChoice,
  DriverApprovalStatus as DbDriverApprovalStatus,
  DriverInterestStatus as DbDriverInterestStatus,
  DriverOnboardingDocumentStatus as DbDriverOnboardingDocumentStatus,
  DriverOnboardingDocumentType as DbDriverOnboardingDocumentType,
  DriverPricingMode as DbDriverPricingMode,
  DuePaymentMethod as DbDuePaymentMethod,
  PaymentMethod as DbPaymentMethod,
  PaymentStatus as DbPaymentStatus,
  PlatformDueBatchStatus as DbPlatformDueBatchStatus,
  PlatformDueStatus as DbPlatformDueStatus,
  Prisma,
  RideOfferStatus as DbRideOfferStatus,
  RidePricingSource as DbRidePricingSource,
  RideStatus as DbRideStatus,
  RideType as DbRideType,
  Role as DbRole
} from "@prisma/client";
import type {
  CommunityComment,
  CommunityProposal,
  CollectorAdminSummary,
  DriverDueSnapshot,
  DriverAccount,
  DriverDispatchSettings,
  DriverDocumentStatus,
  DriverDocumentType,
  DriverOnboardingDocument,
  DriverInterest,
  DriverInterestStatus,
  DriverPricingMode,
  DriverRateCard,
  DriverRateRule,
  DuePaymentMethod,
  PaymentMethod,
  PaymentStatus,
  PlatformDue,
  PlatformDueBatch,
  PlatformDueBatchStatus,
  PlatformDueStatus,
  PlatformPayoutSettings,
  PricingRule,
  Ride,
  RideOffer,
  RideOfferStatus,
  RidePricingSource,
  RideStatus,
  RideType,
  RiderLead,
  RouteLocation,
  SessionUser
} from "@shared/contracts";

const rideTypeMap = {
  standard: DbRideType.STANDARD,
  suv: DbRideType.SUV,
  xl: DbRideType.XL
} satisfies Record<RideType, DbRideType>;

const paymentMethodMap = {
  jim: DbPaymentMethod.JIM,
  cashapp: DbPaymentMethod.CASHAPP,
  cash: DbPaymentMethod.CASH
} satisfies Record<PaymentMethod, DbPaymentMethod>;

const paymentStatusMap = {
  pending: DbPaymentStatus.PENDING,
  collected: DbPaymentStatus.COLLECTED,
  waived: DbPaymentStatus.WAIVED
} satisfies Record<PaymentStatus, DbPaymentStatus>;

const duePaymentMethodMap = {
  cashapp: DbDuePaymentMethod.CASHAPP,
  zelle: DbDuePaymentMethod.ZELLE,
  jim: DbDuePaymentMethod.JIM,
  cash: DbDuePaymentMethod.CASH,
  other: DbDuePaymentMethod.OTHER,
  stripe: DbDuePaymentMethod.STRIPE
} satisfies Record<DuePaymentMethod, DbDuePaymentMethod>;

const platformDueStatusMap = {
  pending: DbPlatformDueStatus.PENDING,
  paid: DbPlatformDueStatus.PAID,
  waived: DbPlatformDueStatus.WAIVED,
  overdue: DbPlatformDueStatus.OVERDUE
} satisfies Record<PlatformDueStatus, DbPlatformDueStatus>;

const platformDueBatchStatusMap = {
  open: DbPlatformDueBatchStatus.OPEN,
  paid: DbPlatformDueBatchStatus.PAID,
  waived: DbPlatformDueBatchStatus.WAIVED,
  overdue: DbPlatformDueBatchStatus.OVERDUE,
  void: DbPlatformDueBatchStatus.VOID
} satisfies Record<PlatformDueBatchStatus, DbPlatformDueBatchStatus>;

const rideStatusMap = {
  draft: DbRideStatus.DRAFT,
  requested: DbRideStatus.REQUESTED,
  scheduled: DbRideStatus.SCHEDULED,
  offered: DbRideStatus.OFFERED,
  accepted: DbRideStatus.ACCEPTED,
  en_route: DbRideStatus.EN_ROUTE,
  arrived: DbRideStatus.ARRIVED,
  in_progress: DbRideStatus.IN_PROGRESS,
  completed: DbRideStatus.COMPLETED,
  canceled: DbRideStatus.CANCELED,
  expired: DbRideStatus.EXPIRED
} satisfies Record<RideStatus, DbRideStatus>;

const roleMap = {
  rider: DbRole.RIDER,
  driver: DbRole.DRIVER,
  admin: DbRole.ADMIN
} as const;

const rideOfferStatusMap = {
  pending: DbRideOfferStatus.PENDING,
  accepted: DbRideOfferStatus.ACCEPTED,
  declined: DbRideOfferStatus.DECLINED,
  expired: DbRideOfferStatus.EXPIRED
} satisfies Record<RideOfferStatus, DbRideOfferStatus>;

const driverInterestStatusMap = {
  pending: DbDriverInterestStatus.PENDING,
  approved: DbDriverInterestStatus.APPROVED,
  rejected: DbDriverInterestStatus.REJECTED
} satisfies Record<DriverInterestStatus, DbDriverInterestStatus>;

const driverApprovalStatusMap = {
  pending: DbDriverApprovalStatus.PENDING,
  approved: DbDriverApprovalStatus.APPROVED,
  rejected: DbDriverApprovalStatus.REJECTED
} satisfies Record<DriverAccount["approvalStatus"], DbDriverApprovalStatus>;

const driverPricingModeMap = {
  platform: DbDriverPricingMode.PLATFORM,
  custom: DbDriverPricingMode.CUSTOM
} satisfies Record<DriverPricingMode, DbDriverPricingMode>;

const driverDocumentTypeMap = {
  insurance: DbDriverOnboardingDocumentType.INSURANCE,
  registration: DbDriverOnboardingDocumentType.REGISTRATION,
  background_check: DbDriverOnboardingDocumentType.BACKGROUND_CHECK,
  mvr: DbDriverOnboardingDocumentType.MVR
} satisfies Record<DriverDocumentType, DbDriverOnboardingDocumentType>;

const driverDocumentStatusMap = {
  pending: DbDriverOnboardingDocumentStatus.PENDING,
  approved: DbDriverOnboardingDocumentStatus.APPROVED,
  rejected: DbDriverOnboardingDocumentStatus.REJECTED
} satisfies Record<DriverDocumentStatus, DbDriverOnboardingDocumentStatus>;

const ridePricingSourceMap = {
  platform_market: DbRidePricingSource.PLATFORM_MARKET,
  driver_custom: DbRidePricingSource.DRIVER_CUSTOM,
  admin_override: DbRidePricingSource.ADMIN_OVERRIDE
} satisfies Record<RidePricingSource, DbRidePricingSource>;

const communityVoteChoiceMap = {
  yes: DbCommunityVoteChoice.YES,
  no: DbCommunityVoteChoice.NO
} as const;

export function toDbRole(role: SessionUser["role"]): DbRole {
  return roleMap[role];
}

export function fromDbRole(role: DbRole): SessionUser["role"] {
  return role.toLowerCase() as SessionUser["role"];
}

export function toDbRideType(rideType: RideType): DbRideType {
  return rideTypeMap[rideType];
}

export function fromDbRideType(rideType: DbRideType): RideType {
  return rideType.toLowerCase() as RideType;
}

export function toDbPaymentMethod(method: PaymentMethod): DbPaymentMethod {
  return paymentMethodMap[method];
}

export function fromDbPaymentMethod(method: DbPaymentMethod): PaymentMethod {
  return method.toLowerCase() as PaymentMethod;
}

export function toDbPaymentStatus(status: PaymentStatus): DbPaymentStatus {
  return paymentStatusMap[status];
}

export function fromDbPaymentStatus(status: DbPaymentStatus): PaymentStatus {
  return status.toLowerCase() as PaymentStatus;
}

export function toDbDuePaymentMethod(method: DuePaymentMethod): DbDuePaymentMethod {
  return duePaymentMethodMap[method];
}

export function fromDbDuePaymentMethod(method: DbDuePaymentMethod): DuePaymentMethod {
  return method.toLowerCase() as DuePaymentMethod;
}

export function toDbPlatformDueStatus(status: PlatformDueStatus): DbPlatformDueStatus {
  return platformDueStatusMap[status];
}

export function fromDbPlatformDueStatus(status: DbPlatformDueStatus): PlatformDueStatus {
  return status.toLowerCase() as PlatformDueStatus;
}

export function toDbPlatformDueBatchStatus(status: PlatformDueBatchStatus): DbPlatformDueBatchStatus {
  return platformDueBatchStatusMap[status];
}

export function fromDbPlatformDueBatchStatus(status: DbPlatformDueBatchStatus): PlatformDueBatchStatus {
  return status.toLowerCase() as PlatformDueBatchStatus;
}

export function toDbRideStatus(status: RideStatus): DbRideStatus {
  return rideStatusMap[status];
}

export function fromDbRideStatus(status: DbRideStatus): RideStatus {
  return status.toLowerCase() as RideStatus;
}

export function toDbRideOfferStatus(status: RideOfferStatus): DbRideOfferStatus {
  return rideOfferStatusMap[status];
}

export function fromDbRideOfferStatus(status: DbRideOfferStatus): RideOfferStatus {
  return status.toLowerCase() as RideOfferStatus;
}

export function fromDbDriverInterestStatus(status: DbDriverInterestStatus): DriverInterestStatus {
  return status.toLowerCase() as DriverInterestStatus;
}

export function toDbDriverInterestStatus(status: DriverInterestStatus): DbDriverInterestStatus {
  return driverInterestStatusMap[status];
}

export function fromDbDriverApprovalStatus(status: DbDriverApprovalStatus): DriverAccount["approvalStatus"] {
  return status.toLowerCase() as DriverAccount["approvalStatus"];
}

export function toDbDriverApprovalStatus(status: DriverAccount["approvalStatus"]): DbDriverApprovalStatus {
  return driverApprovalStatusMap[status];
}

export function fromDbDriverPricingMode(mode: DbDriverPricingMode): DriverPricingMode {
  return mode.toLowerCase() as DriverPricingMode;
}

export function toDbDriverPricingMode(mode: DriverPricingMode): DbDriverPricingMode {
  return driverPricingModeMap[mode];
}

export function fromDbDriverDocumentType(type: DbDriverOnboardingDocumentType): DriverDocumentType {
  return type.toLowerCase() as DriverDocumentType;
}

export function toDbDriverDocumentType(type: DriverDocumentType): DbDriverOnboardingDocumentType {
  return driverDocumentTypeMap[type];
}

export function fromDbDriverDocumentStatus(status: DbDriverOnboardingDocumentStatus): DriverDocumentStatus {
  return status.toLowerCase() as DriverDocumentStatus;
}

export function toDbDriverDocumentStatus(status: DriverDocumentStatus): DbDriverOnboardingDocumentStatus {
  return driverDocumentStatusMap[status];
}

export function fromDbRidePricingSource(source: DbRidePricingSource): RidePricingSource {
  return source.toLowerCase() as RidePricingSource;
}

export function toDbRidePricingSource(source: RidePricingSource): DbRidePricingSource {
  return ridePricingSourceMap[source];
}

export function fromDbCommunityVoteChoice(choice: DbCommunityVoteChoice): "yes" | "no" {
  return choice.toLowerCase() as "yes" | "no";
}

export function toDbCommunityVoteChoice(choice: "yes" | "no"): DbCommunityVoteChoice {
  return communityVoteChoiceMap[choice];
}

export function decimalToNumber(value: Prisma.Decimal | number | null): number | null {
  if (value === null) {
    return null;
  }

  return Number(value);
}

export function toIso(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

type VehicleRecord = {
  id: string;
  makeModel: string;
  plate: string;
  color: string | null;
  rideType: DbRideType;
  seats: number;
};

type DriverProfileRecord = {
  collectorAdminId: string | null;
  collectorAdmin?: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    referralCode: string | null;
  } | null;
  approved: boolean;
  approvalStatus: DbDriverApprovalStatus;
  available: boolean;
  homeState: string | null;
  homeCity: string | null;
  currentLat: number | null;
  currentLng: number | null;
  rating: number;
  pricingMode: DbDriverPricingMode;
  acceptedPaymentMethods: DbPaymentMethod[];
  localDispatchEnabled: boolean;
  localRadiusMiles: number;
  serviceAreaDispatchEnabled: boolean;
  serviceAreaStates: string[];
  nationwideDispatchEnabled: boolean;
  bgCheckExternalId: string | null;
  bgCheckOrderedAt: Date | null;
  vehicle?: VehicleRecord | null;
};

type DriverRateCardRecord = {
  id: string;
  rideType: DbRideType;
  baseFare: Prisma.Decimal | number;
  perMile: Prisma.Decimal | number;
  perMinute: Prisma.Decimal | number;
  multiplier: Prisma.Decimal | number;
  updatedAt: Date;
};

type DriverDocumentRecord = {
  id: string;
  driverId: string;
  type: DbDriverOnboardingDocumentType;
  status: DbDriverOnboardingDocumentStatus;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  reviewNote: string | null;
  reviewedAt: Date | null;
  reviewedById: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type UserWithDriver = {
  id: string;
  role: DbRole;
  roles?: DbRole[];
  name: string;
  phone: string | null;
  email: string | null;
  referralCode: string | null;
  createdAt?: Date;
  driverProfile?: DriverProfileRecord | null;
  driverRateCards?: DriverRateCardRecord[];
  driverDocuments?: DriverDocumentRecord[];
};

function mapCollectorAdminSummary(
  user?:
    | {
        id: string;
        name: string;
        email: string | null;
        phone: string | null;
        referralCode?: string | null;
      }
    | null
): CollectorAdminSummary | null {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    referralCode: user.referralCode ?? null
  };
}

function mapVehicle(vehicle?: VehicleRecord | null) {
  if (!vehicle) {
    return null;
  }

  return {
    id: vehicle.id,
    makeModel: vehicle.makeModel,
    plate: vehicle.plate,
    color: vehicle.color,
    rideType: fromDbRideType(vehicle.rideType),
    seats: vehicle.seats
  };
}

function mapRoles(role: DbRole, roles?: DbRole[]) {
  const uniqueRoles = roles?.length ? roles : [role];
  return Array.from(new Set(uniqueRoles.map((entry) => fromDbRole(entry))));
}

export function mapDispatchSettings(profile: DriverProfileRecord): DriverDispatchSettings {
  return {
    localEnabled: profile.localDispatchEnabled,
    localRadiusMiles: profile.localRadiusMiles,
    serviceAreaEnabled: profile.serviceAreaDispatchEnabled,
    serviceAreaStates: profile.serviceAreaStates.map((state) => state.toUpperCase()),
    nationwideEnabled: profile.nationwideDispatchEnabled
  };
}

const requiredDriverDocumentTypes: DriverDocumentType[] = [
  "insurance",
  "registration",
  "background_check",
  "mvr"
];

export function mapDriverOnboardingDocument(document: DriverDocumentRecord): DriverOnboardingDocument {
  return {
    id: document.id,
    driverId: document.driverId,
    type: fromDbDriverDocumentType(document.type),
    status: fromDbDriverDocumentStatus(document.status),
    fileName: document.fileName,
    mimeType: document.mimeType,
    fileSizeBytes: document.fileSizeBytes,
    reviewNote: document.reviewNote,
    reviewedAt: toIso(document.reviewedAt),
    reviewedById: document.reviewedById,
    uploadedAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString(),
    downloadPath: `/admin/drivers/${document.driverId}/documents/${document.id}/file`
  };
}

function mapDriverDocumentReviewSummary(documents: DriverOnboardingDocument[]) {
  const submittedTypes = documents.map((document) => document.type);
  const approvedTypes = documents
    .filter((document) => document.status === "approved")
    .map((document) => document.type);
  const rejectedTypes = documents
    .filter((document) => document.status === "rejected")
    .map((document) => document.type);
  const missingTypes = requiredDriverDocumentTypes.filter((type) => !submittedTypes.includes(type));
  const pendingCount = documents.filter((document) => document.status === "pending").length;

  return {
    requiredTypes: requiredDriverDocumentTypes,
    submittedTypes,
    approvedTypes,
    missingTypes,
    rejectedTypes,
    pendingCount,
    readyForApproval:
      missingTypes.length === 0 &&
      requiredDriverDocumentTypes.every((type) => approvedTypes.includes(type))
  };
}

export function mapSessionUser(user: UserWithDriver): SessionUser {
  const acceptedPaymentMethods = user.driverProfile?.acceptedPaymentMethods?.map(fromDbPaymentMethod);

  return {
    id: user.id,
    role: fromDbRole(user.role),
    roles: mapRoles(user.role, user.roles),
    name: user.name,
    phone: user.phone,
    email: user.email,
    referralCode: user.referralCode,
    approved: user.driverProfile?.approved,
    approvalStatus: user.driverProfile ? fromDbDriverApprovalStatus(user.driverProfile.approvalStatus) : undefined,
    available: user.driverProfile?.available,
    pricingMode: user.driverProfile ? fromDbDriverPricingMode(user.driverProfile.pricingMode) : undefined,
    homeState: user.driverProfile?.homeState ?? undefined,
    homeCity: user.driverProfile?.homeCity ?? undefined,
    acceptedPaymentMethods,
    vehicle: mapVehicle(user.driverProfile?.vehicle)
  };
}

export function mapRouteLocation(
  address: string,
  lat: number,
  lng: number,
  stateCode?: string | null
): RouteLocation {
  return {
    address,
    displayName: address,
    lat,
    lng,
    stateCode: stateCode ?? null
  };
}

export function mapRideOffer(offer: {
  id: string;
  rideId: string;
  driverId: string;
  status: DbRideOfferStatus;
  offeredAt: Date;
  respondedAt: Date | null;
  expiresAt: Date;
}): RideOffer {
  return {
    id: offer.id,
    rideId: offer.rideId,
    driverId: offer.driverId,
    status: fromDbRideOfferStatus(offer.status),
    offeredAt: offer.offeredAt.toISOString(),
    respondedAt: toIso(offer.respondedAt),
    expiresAt: offer.expiresAt.toISOString()
  };
}

export function mapPricingRule(rule: {
  id: string;
  marketKey: string;
  rideType: DbRideType;
  baseFare: Prisma.Decimal | number;
  perMile: Prisma.Decimal | number;
  perMinute: Prisma.Decimal | number;
  multiplier: Prisma.Decimal | number;
  updatedAt: Date;
}): PricingRule {
  return {
    id: rule.id,
    marketKey: rule.marketKey,
    rideType: fromDbRideType(rule.rideType),
    baseFare: Number(rule.baseFare),
    perMile: Number(rule.perMile),
    perMinute: Number(rule.perMinute),
    multiplier: Number(rule.multiplier),
    updatedAt: rule.updatedAt.toISOString()
  };
}

export function mapDriverRateRule(rule: DriverRateCardRecord): DriverRateRule {
  return {
    id: rule.id,
    rideType: fromDbRideType(rule.rideType),
    baseFare: Number(rule.baseFare),
    perMile: Number(rule.perMile),
    perMinute: Number(rule.perMinute),
    multiplier: Number(rule.multiplier),
    updatedAt: rule.updatedAt.toISOString()
  };
}

export function mapDriverRateCard(user: UserWithDriver): DriverRateCard {
  return {
    pricingMode: user.driverProfile ? fromDbDriverPricingMode(user.driverProfile.pricingMode) : "platform",
    rules: (user.driverRateCards ?? []).map(mapDriverRateRule)
  };
}

export function mapDriverAccount(user: UserWithDriver): DriverAccount {
  if (!user.driverProfile) {
    throw new Error("Driver profile missing");
  }

  const documents = (user.driverDocuments ?? []).map(mapDriverOnboardingDocument);

  return {
    ...mapSessionUser(user),
    approvalStatus: fromDbDriverApprovalStatus(user.driverProfile.approvalStatus),
    approved: user.driverProfile.approved,
    available: user.driverProfile.available,
    pricingMode: fromDbDriverPricingMode(user.driverProfile.pricingMode),
    homeState: user.driverProfile.homeState,
    homeCity: user.driverProfile.homeCity,
    acceptedPaymentMethods:
      user.driverProfile.acceptedPaymentMethods?.map(fromDbPaymentMethod) ?? ["jim", "cashapp", "cash"],
    dispatchSettings: mapDispatchSettings(user.driverProfile),
    customRates: (user.driverRateCards ?? []).map(mapDriverRateRule),
    documents,
    documentReview: mapDriverDocumentReviewSummary(documents),
    collectorAdminId: user.driverProfile.collectorAdminId,
    collectorAdmin: mapCollectorAdminSummary(user.driverProfile.collectorAdmin),
    createdAt: user.createdAt?.toISOString(),
    bgCheckExternalId: user.driverProfile.bgCheckExternalId,
    bgCheckOrderedAt: user.driverProfile.bgCheckOrderedAt?.toISOString() ?? null
  };
}

type RideWithRelations = Prisma.RideGetPayload<{
  include: {
    rider: {
      include: {
        driverProfile: {
          include: {
            vehicle: true;
          };
        };
        driverRateCards: true;
      };
    };
    driver: {
      include: {
        driverProfile: {
          include: {
            vehicle: true;
          };
        };
        driverRateCards: true;
      };
    };
    offers: true;
    locationPings: {
      orderBy: {
        createdAt: "desc";
      };
      take: 1;
    };
  };
}>;

export function mapRide(ride: RideWithRelations): Ride {
  const latestLocation = ride.locationPings[0]
    ? {
        id: ride.locationPings[0].id,
        rideId: ride.locationPings[0].rideId,
        driverId: ride.locationPings[0].driverId,
        lat: ride.locationPings[0].lat,
        lng: ride.locationPings[0].lng,
        heading: ride.locationPings[0].heading,
        speed: ride.locationPings[0].speed,
        createdAt: ride.locationPings[0].createdAt.toISOString()
      }
    : null;

  const estimatedSubtotal = Number(ride.quotedFare);
  const estimatedPlatformDue = Number(ride.estimatedPlatformDue);
  const estimatedCustomerTotal = Number(ride.estimatedCustomerTotal);
  const finalSubtotal = decimalToNumber(ride.finalFare);
  const finalPlatformDue = decimalToNumber(ride.finalPlatformDue);
  const finalCustomerTotal = decimalToNumber(ride.finalCustomerTotal);
  const amountDue = finalCustomerTotal ?? estimatedCustomerTotal;

  // SMS_RIDER_FEE / SMS_DRIVER_FEE are constants included in the totals above (for new rides).
  // We surface them separately so the frontend can show a line-item breakdown.
  const SMS_RIDER_FEE = 0.05;
  const SMS_DRIVER_FEE = 0.05;

  return {
    id: ride.id,
    riderId: ride.riderId,
    driverId: ride.driverId,
    publicTrackingToken: ride.publicTrackingToken,
    referredByUserId: ride.referredByUserId,
    referredByCode: ride.referredByCode,
    status: fromDbRideStatus(ride.status),
    rideType: fromDbRideType(ride.rideType),
    pickup: mapRouteLocation(ride.pickupAddress, ride.pickupLat, ride.pickupLng, ride.pickupStateCode),
    dropoff: mapRouteLocation(ride.dropoffAddress, ride.dropoffLat, ride.dropoffLng, ride.dropoffStateCode),
    estimatedMiles: ride.estimatedMiles,
    estimatedMinutes: ride.estimatedMinutes,
    routeProvider: ride.routeProvider === "mapbox" ? "mapbox" : "fallback",
    routeFallbackMiles: ride.routeFallbackMiles,
    platformMarketKey: ride.platformMarketKey,
    estimatedPricingSource: fromDbRidePricingSource(ride.estimatedPricingSource),
    finalPricingSource: ride.finalPricingSource ? fromDbRidePricingSource(ride.finalPricingSource) : null,
    matchedDriverPricingMode: ride.matchedDriverPricingMode
      ? fromDbDriverPricingMode(ride.matchedDriverPricingMode)
      : null,
    quotedFare: estimatedSubtotal,
    fareOverride: decimalToNumber(ride.fareOverride),
    finalFare: finalSubtotal,
    pricing: {
      platformDuePercent: 0.05,
      estimatedSubtotal,
      estimatedPlatformDue,
      estimatedCustomerTotal,
      estimatedDriverNet: estimatedSubtotal,
      finalSubtotal,
      finalPlatformDue,
      finalCustomerTotal,
      finalDriverNet: finalSubtotal,
      smsRiderFee: SMS_RIDER_FEE,
      smsDriverFee: SMS_DRIVER_FEE,
    },
    payment: {
      method: fromDbPaymentMethod(ride.paymentMethod),
      status: fromDbPaymentStatus(ride.paymentStatus),
      amountDue,
      collectedAt: toIso(ride.paymentCollectedAt),
      collectedById: ride.paymentCollectedById
    },
    requestedAt: toIso(ride.requestedAt),
    scheduledFor: toIso(ride.scheduledFor),
    acceptedAt: toIso(ride.acceptedAt),
    startedAt: toIso(ride.startedAt),
    completedAt: toIso(ride.completedAt),
    canceledAt: toIso(ride.canceledAt),
    rider: mapSessionUser(ride.rider),
    driver: ride.driver ? mapSessionUser(ride.driver) : null,
    offers: ride.offers.map(mapRideOffer),
    latestLocation
  };
}

export function mapRiderLead(lead: {
  id: string;
  userId: string | null;
  name: string;
  email: string;
  phone: string | null;
  referredByUserId: string | null;
  referredByCode: string | null;
  createdAt: Date;
  updatedAt: Date;
}): RiderLead {
  return {
    id: lead.id,
    userId: lead.userId,
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    referredByUserId: lead.referredByUserId,
    referredByCode: lead.referredByCode,
    createdAt: lead.createdAt.toISOString(),
    updatedAt: lead.updatedAt.toISOString()
  };
}

export function mapDriverInterest(interest: {
  id: string;
  name: string;
  email: string;
  phone: string;
  serviceArea: string;
  vehicleInfo: string;
  availabilityNotes: string | null;
  status: DbDriverInterestStatus;
  createdAt: Date;
  updatedAt: Date;
}): DriverInterest {
  return {
    id: interest.id,
    name: interest.name,
    email: interest.email,
    phone: interest.phone,
    serviceArea: interest.serviceArea,
    vehicleInfo: interest.vehicleInfo,
    availabilityNotes: interest.availabilityNotes,
    status: fromDbDriverInterestStatus(interest.status),
    createdAt: interest.createdAt.toISOString(),
    updatedAt: interest.updatedAt.toISOString()
  };
}

export function mapPlatformPayoutSettings(settings: {
  adminId?: string | null;
  cashAppHandle: string | null;
  zelleHandle: string | null;
  jimHandle: string | null;
  cashInstructions: string | null;
  otherInstructions: string | null;
  updatedAt: Date;
}): PlatformPayoutSettings {
  return {
    adminId: settings.adminId ?? null,
    cashAppHandle: settings.cashAppHandle,
    zelleHandle: settings.zelleHandle,
    jimHandle: settings.jimHandle,
    cashInstructions: settings.cashInstructions,
    otherInstructions: settings.otherInstructions,
    updatedAt: settings.updatedAt.toISOString()
  };
}

type PlatformDueRecord = Prisma.PlatformDueGetPayload<{
  include: {
    driver: {
      include: {
        driverProfile: true;
      };
    };
    ride: {
      include: {
        rider: true;
      };
    };
  };
}>;

export function mapPlatformDue(due: PlatformDueRecord): PlatformDue {
  return {
    id: due.id,
    rideId: due.rideId,
    driverId: due.driverId,
    batchId: due.batchId,
    amount: Number(due.amount),
    status: fromDbPlatformDueStatus(due.status),
    collectibleAt: due.collectibleAt.toISOString(),
    dueAt: due.dueAt.toISOString(),
    paidAt: toIso(due.paidAt),
    paymentMethod: due.paymentMethod ? fromDbDuePaymentMethod(due.paymentMethod) : null,
    stripeCheckoutSessionId: due.stripeCheckoutSessionId ?? null,
    stripeCheckoutUrl: due.stripeCheckoutUrl ?? null,
    note: due.note,
    resolvedById: due.resolvedById,
    createdAt: due.createdAt.toISOString(),
    updatedAt: due.updatedAt.toISOString(),
    driver: {
      id: due.driver.id,
      name: due.driver.name,
      email: due.driver.email,
      phone: due.driver.phone,
      available: due.driver.driverProfile?.available ?? false
    },
    ride: {
      id: due.ride.id,
      riderName: due.ride.rider.name,
      pickupAddress: due.ride.pickupAddress,
      dropoffAddress: due.ride.dropoffAddress,
      completedAt: toIso(due.ride.completedAt),
      paymentMethod: fromDbPaymentMethod(due.ride.paymentMethod),
      subtotal: Number(due.ride.finalFare ?? due.ride.quotedFare),
      customerTotal: Number(due.ride.finalCustomerTotal ?? due.ride.estimatedCustomerTotal)
    }
  };
}

type PlatformDueBatchRecord = Prisma.PlatformDueBatchGetPayload<{
  include: {
    driver: {
      include: {
        driverProfile: true;
      };
    };
    collectorAdmin: {
      select: {
        id: true;
        name: true;
        email: true;
        phone: true;
        referralCode: true;
      };
    };
    dues: {
      include: {
        driver: {
          include: {
            driverProfile: true;
          };
        };
        ride: {
          include: {
            rider: true;
          };
        };
      };
      orderBy: {
        createdAt: "asc";
      };
    };
  };
}>;

export function mapPlatformDueBatch(batch: PlatformDueBatchRecord): PlatformDueBatch {
  return {
    id: batch.id,
    referenceCode: batch.referenceCode,
    driverId: batch.driverId,
    collectorAdminId: batch.collectorAdminId,
    amount: Number(batch.amount),
    status: fromDbPlatformDueBatchStatus(batch.status),
    paymentMethod: batch.paymentMethod ? fromDbDuePaymentMethod(batch.paymentMethod) : null,
    observedTitle: batch.observedTitle,
    observedNote: batch.observedNote,
    adminNote: batch.adminNote,
    generatedAt: batch.generatedAt.toISOString(),
    dueAt: batch.dueAt.toISOString(),
    paidAt: toIso(batch.paidAt),
    createdAt: batch.createdAt.toISOString(),
    updatedAt: batch.updatedAt.toISOString(),
    driver: {
      id: batch.driver.id,
      name: batch.driver.name,
      email: batch.driver.email,
      phone: batch.driver.phone,
      available: batch.driver.driverProfile?.available ?? false
    },
    collector: mapCollectorAdminSummary(batch.collectorAdmin),
    dues: batch.dues.map(mapPlatformDue)
  };
}

export function mapDriverDueSnapshot(input: {
  driver: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    available: boolean;
  };
  collector?: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    referralCode?: string | null;
  } | null;
  collectibleUnbatchedTotal: number;
  collectibleUnbatchedCount: number;
  openBatchCount: number;
  openBatchTotal: number;
  overdueBatchCount: number;
  overdueBatchTotal: number;
  lastCompletedRideAt: Date | null;
}): DriverDueSnapshot {
  return {
    driver: input.driver,
    collector: mapCollectorAdminSummary(input.collector),
    collectibleUnbatchedTotal: Number(input.collectibleUnbatchedTotal.toFixed(2)),
    collectibleUnbatchedCount: input.collectibleUnbatchedCount,
    openBatchCount: input.openBatchCount,
    openBatchTotal: Number(input.openBatchTotal.toFixed(2)),
    overdueBatchCount: input.overdueBatchCount,
    overdueBatchTotal: Number(input.overdueBatchTotal.toFixed(2)),
    lastCompletedRideAt: toIso(input.lastCompletedRideAt)
  };
}

type CommunityProposalRecord = Prisma.CommunityProposalGetPayload<{
  include: {
    author: true;
    votes: true;
    comments: true;
  };
}>;

export function mapCommunityProposal(
  proposal: CommunityProposalRecord,
  viewerId?: string | null
): CommunityProposal {
  const yesVotes = proposal.votes.filter((vote) => vote.choice === "YES").length;
  const noVotes = proposal.votes.filter((vote) => vote.choice === "NO").length;
  const viewerVote =
    viewerId != null
      ? proposal.votes.find((vote) => vote.userId === viewerId)?.choice ?? null
      : null;

  return {
    id: proposal.id,
    title: proposal.title,
    body: proposal.body,
    pinned: proposal.pinned,
    closed: proposal.closed,
    hidden: proposal.hidden,
    author: {
      id: proposal.author.id,
      name: proposal.author.name,
      role: fromDbRole(proposal.author.role)
    },
    yesVotes,
    noVotes,
    totalVotes: proposal.votes.length,
    commentCount: proposal.comments.filter((comment) => !comment.hidden).length,
    viewerVote: viewerVote ? fromDbCommunityVoteChoice(viewerVote) : null,
    createdAt: proposal.createdAt.toISOString(),
    updatedAt: proposal.updatedAt.toISOString()
  };
}

type CommunityCommentRecord = Prisma.CommunityCommentGetPayload<{
  include: {
    author: true;
  };
}>;

export function mapCommunityComment(comment: CommunityCommentRecord): CommunityComment {
  return {
    id: comment.id,
    proposalId: comment.proposalId,
    body: comment.body,
    hidden: comment.hidden,
    author: {
      id: comment.author.id,
      name: comment.author.name,
      role: fromDbRole(comment.author.role)
    },
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString()
  };
}
