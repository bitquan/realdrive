import {
  AdSubmissionStatus as DbAdSubmissionStatus,
  BenchmarkProvider as DbBenchmarkProvider,
  DriverAdCreditStatus as DbDriverAdCreditStatus,
  PlatformDueBatchStatus as DbPlatformDueBatchStatus,
  Prisma,
  Role as DbRole,
  type IssueReport as DbIssueReport
} from "@prisma/client";
import type {
  AdPricingSettings,
  AdSubmission,
  AdSubmissionMetrics,
  AdSubmissionStatus,
  AdVisitResolveResponse,
  AdminAdsResponse,
  AdminDriverAdCreditSummary,
  AdminUpdateAdSubmissionInput,
  ApplyDriverAdCreditsInput,
  BenchmarkProvider,
  CollectorAdminSummary,
  CreateAdSubmissionInput,
  DriverAdCreditSummary,
  DriverAdProgramResponse,
  IssueReport,
  IssueReportStatus,
  NotificationDeliveryLog,
  NotificationPreference,
  PublicAdDisplayResponse,
  UpdateAdPricingSettingsInput,
  UpdateNotificationPreferenceInput,
  UpsertPushSubscriptionInput,
  PlatformRateBenchmarkRule,
  DriverDocumentType,
  DriverDocumentUpload,
  CommunityEligibility,
  DriverProfileUpdateInput,
  DuePaymentMethod,
  PaymentMethod,
  RideType,
  ApiKey,
  CreateApiKeyInput,
  CreateMarketRegionInput,
  UpdateMarketRegionInput,
  MarketRegion,
  AdminOrderBgCheckInput,
  AdminReportOverview
} from "@shared/contracts";
import { env } from "../config/env.js";
import { calculateDistanceMiles } from "../services/maps.js";
import type {
  AuthIdentity,
  DriverCandidate,
  Store,
  UpdateRideAdminPatch
} from "../services/types.js";
import { createCommunityAccessToken, createPublicTrackingToken, createReferralCode } from "./codes.js";
import { prisma } from "./db.js";
import {
  persistDriverDocumentUpload,
  removeStoredDriverDocument,
  resolveStoredDriverDocumentPath
} from "./driver-document-storage.js";
import {
  fromDbPaymentStatus,
  mapCommunityComment,
  mapCommunityProposal,
  mapDispatchSettings,
  mapDriverAccount,
  mapDriverDueSnapshot,
  mapDriverOnboardingDocument,
  mapDriverInterest,
  mapDriverRateCard,
  mapPlatformDue,
  mapPlatformDueBatch,
  mapPlatformPayoutSettings,
  mapPricingRule,
  mapRide,
  mapRiderLead,
  mapSessionUser,
  toIso,
  toDbCommunityVoteChoice,
  toDbDriverApprovalStatus,
  toDbDriverDocumentStatus,
  toDbDriverDocumentType,
  toDbDriverPricingMode,
  toDbDuePaymentMethod,
  toDbPaymentMethod,
  toDbPaymentStatus,
  toDbPlatformDueBatchStatus,
  toDbPlatformDueStatus,
  toDbRidePricingSource,
  toDbRideStatus,
  toDbRideType
} from "./mappers.js";

const DEFAULT_PLATFORM_RULES: Array<{
  rideType: RideType;
  baseFare: number;
  perMile: number;
  perMinute: number;
  multiplier: number;
}> = [
  { rideType: "standard", baseFare: 6, perMile: 2.2, perMinute: 0.4, multiplier: 1 },
  { rideType: "suv", baseFare: 10, perMile: 3.4, perMinute: 0.55, multiplier: 1.1 },
  { rideType: "xl", baseFare: 12, perMile: 4.1, perMinute: 0.65, multiplier: 1.2 }
];

const COMMUNITY_COMPLETED_RIDE_THRESHOLD = 51;

const userInclude = {
  driverProfile: {
    include: {
      vehicle: true,
      collectorAdmin: true
    }
  },
  driverDocuments: {
    orderBy: {
      createdAt: "asc"
    }
  },
  driverRateCards: {
    orderBy: {
      rideType: "asc"
    }
  }
} as const;

const rideInclude = {
  rider: {
    include: userInclude
  },
  driver: {
    include: userInclude
  },
  offers: true,
  locationPings: {
    orderBy: {
      createdAt: "desc"
    },
    take: 1
  }
} as const;

type UserWithDriver = Prisma.UserGetPayload<{
  include: typeof userInclude;
}>;

function asAuthIdentity(user: UserWithDriver): AuthIdentity {
  return {
    ...mapSessionUser(user),
    passwordHash: user.passwordHash
  };
}

function hasDbRole(user: { role: DbRole; roles?: DbRole[] }, role: DbRole) {
  return user.role === role || user.roles?.includes(role) || false;
}

function isClaimableSeedAdmin(user: { role: DbRole; roles?: DbRole[]; email: string | null; name: string }) {
  return (
    hasDbRole(user, DbRole.ADMIN) &&
    (user.email?.toLowerCase() === "admin@realdrive.app" || user.name === "RealDrive Admin")
  );
}

function normalizeMarketKey(value?: string | null) {
  return value?.trim().toUpperCase() || "DEFAULT";
}

function toDbBenchmarkProvider(provider: BenchmarkProvider): DbBenchmarkProvider {
  return provider === "uber" ? DbBenchmarkProvider.UBER : DbBenchmarkProvider.LYFT;
}

function fromDbBenchmarkProvider(provider: DbBenchmarkProvider): BenchmarkProvider {
  return provider === DbBenchmarkProvider.UBER ? "uber" : "lyft";
}

function normalizeStateList(states: string[]) {
  return Array.from(
    new Set(
      states
        .map((state) => state.trim().toUpperCase())
        .filter(Boolean)
    )
  );
}

function normalizeAcceptedPaymentMethods(methods: PaymentMethod[]) {
  return Array.from(new Set(methods));
}

const requiredDriverDocumentTypes: DriverDocumentType[] = [
  "insurance",
  "registration",
  "background_check",
  "mvr"
];

const requiredDriverDocumentDbTypes = requiredDriverDocumentTypes.map(toDbDriverDocumentType);

async function createDriverDocumentRecords(
  tx: Prisma.TransactionClient,
  driverId: string,
  uploads: DriverDocumentUpload[]
) {
  const storedPaths: string[] = [];

  try {
    for (const upload of uploads) {
      const stored = await persistDriverDocumentUpload(driverId, upload);
      storedPaths.push(stored.storagePath);

      await tx.driverOnboardingDocument.create({
        data: {
          driverId,
          type: toDbDriverDocumentType(upload.type),
          status: toDbDriverDocumentStatus("pending"),
          fileName: upload.fileName,
          mimeType: upload.mimeType,
          fileSizeBytes: stored.fileSizeBytes,
          storagePath: stored.storagePath
        }
      });
    }
  } catch (error) {
    await Promise.all(storedPaths.map((storagePath) => removeStoredDriverDocument(storagePath)));
    throw error;
  }
}

async function driverDocumentsReadyForApproval(
  tx: Prisma.TransactionClient | typeof prisma,
  driverId: string
) {
  const documents = await tx.driverOnboardingDocument.findMany({
    where: { driverId }
  });

  if (documents.length < requiredDriverDocumentDbTypes.length) {
    return false;
  }

  return requiredDriverDocumentDbTypes.every((requiredType) =>
    documents.some((document) => document.type === requiredType && document.status === "APPROVED")
  );
}

async function getDriverDocumentOrThrow(
  tx: Prisma.TransactionClient | typeof prisma,
  driverId: string,
  documentId: string
) {
  const document = await tx.driverOnboardingDocument.findFirst({
    where: {
      id: documentId,
      driverId
    }
  });

  if (!document) {
    throw new Error("Driver document not found");
  }

  return document;
}

function ownerDriverFilter() {
  if (env.launchMode !== "solo_driver") {
    return {};
  }

  return {
    ...(env.ownerDriverUserId ? { id: env.ownerDriverUserId } : {}),
    ...(env.ownerDriverPhone ? { phone: env.ownerDriverPhone } : {})
  };
}

const collectorSummarySelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  referralCode: true
} as const;

const platformDueInclude = {
  driver: {
    include: {
      driverProfile: true
    }
  },
  ride: {
    include: {
      rider: true
    }
  }
} as const;

const platformDueBatchInclude = {
  driver: {
    include: {
      driverProfile: true
    }
  },
  collectorAdmin: {
    select: collectorSummarySelect
  },
  adCredits: {
    select: {
      amount: true,
      status: true
    }
  },
  dues: {
    include: platformDueInclude,
    orderBy: {
      createdAt: "asc"
    }
  }
} as const;

const adDriverSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  driverProfile: {
    select: {
      available: true
    }
  }
} as const;

const adSubmissionInclude = {
  assignedDriver: {
    select: adDriverSelect
  },
  scans: {
    select: {
      id: true,
      creditEligible: true,
      blockedReason: true
    }
  },
  credits: {
    select: {
      amount: true,
      status: true
    }
  }
} as const;

function toCollectorSummary(
  user:
    | {
        id: string;
        name: string;
        email: string | null;
        phone: string | null;
        referralCode?: string | null;
      }
    | null
    | undefined
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

function fromDbAdSubmissionStatus(status: DbAdSubmissionStatus): AdSubmissionStatus {
  return status.toLowerCase() as AdSubmissionStatus;
}

function toDbAdSubmissionStatus(status: AdSubmissionStatus): DbAdSubmissionStatus {
  return status.toUpperCase() as DbAdSubmissionStatus;
}

function fromDbDriverAdCreditStatus(status: DbDriverAdCreditStatus) {
  return status.toLowerCase() as "pending" | "applied" | "void";
}

function toAdDriverSummary(
  user:
    | {
        id: string;
        name: string;
        email: string | null;
        phone: string | null;
        driverProfile?: { available: boolean } | null;
      }
    | null
    | undefined
) {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    available: user.driverProfile?.available ?? false
  };
}

function toFixedMoney(value: number) {
  return Number(value.toFixed(2));
}

const DEFAULT_AD_SLOT_MULTIPLIERS = [
  { slotRank: 1, multiplier: 1.5 },
  { slotRank: 2, multiplier: 1 },
  { slotRank: 3, multiplier: 0.85 }
] as const;

function normalizeAdSlotMultipliers(value: Prisma.JsonValue | null | undefined) {
  if (!Array.isArray(value)) {
    return [...DEFAULT_AD_SLOT_MULTIPLIERS];
  }

  const normalized = value
    .map((entry) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        return null;
      }

      const slotRank = Number((entry as Record<string, unknown>).slotRank);
      const multiplier = Number((entry as Record<string, unknown>).multiplier);
      if (!Number.isInteger(slotRank) || slotRank < 1 || !Number.isFinite(multiplier) || multiplier <= 0) {
        return null;
      }

      return { slotRank, multiplier: toFixedMoney(multiplier) };
    })
    .filter((entry): entry is { slotRank: number; multiplier: number } => Boolean(entry))
    .sort((left, right) => left.slotRank - right.slotRank);

  return normalized.length ? normalized : [...DEFAULT_AD_SLOT_MULTIPLIERS];
}

function getAdSlotMultiplier(slotMultipliers: Array<{ slotRank: number; multiplier: number }>, slotRank: number) {
  return slotMultipliers.find((entry) => entry.slotRank === slotRank)?.multiplier ?? 1;
}

function calculateAdPricing(input: {
  baseDailyPrice: Prisma.Decimal | number;
  requestedDays: number;
  slotRank: number;
  slotMultipliers: Array<{ slotRank: number; multiplier: number }>;
}) {
  const multiplier = getAdSlotMultiplier(input.slotMultipliers, input.slotRank);
  const dailyPrice = toFixedMoney(Number(input.baseDailyPrice) * multiplier);

  return {
    dailyPrice,
    totalPrice: toFixedMoney(dailyPrice * input.requestedDays)
  };
}

function mapAdPricingSettingsRecord(settings: {
  baseDailyPrice: Prisma.Decimal | number;
  defaultDriverCreditPerScan: Prisma.Decimal | number;
  slotMultipliers?: Prisma.JsonValue | null;
  dedupeWindowMinutes: number;
  updatedAt: Date;
}): AdPricingSettings {
  return {
    baseDailyPrice: Number(settings.baseDailyPrice),
    defaultDriverCreditPerScan: Number(settings.defaultDriverCreditPerScan),
    slotMultipliers: normalizeAdSlotMultipliers(settings.slotMultipliers),
    dedupeWindowMinutes: settings.dedupeWindowMinutes,
    updatedAt: settings.updatedAt.toISOString()
  };
}

function normalizeFingerprintPart(value?: string | null) {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .slice(0, 160);
}

function buildAdScanFingerprint(input: { ipAddress?: string | null; userAgent?: string | null; redirectToken: string }) {
  const ipAddress = normalizeFingerprintPart(input.ipAddress);
  const userAgent = normalizeFingerprintPart(input.userAgent);
  if (!ipAddress && !userAgent) {
    return `token:${input.redirectToken}`;
  }

  return `${ipAddress}|${userAgent}|${input.redirectToken}`;
}

function mapAdSubmissionRecord(
  submission: {
    id: string;
    businessName: string;
    contactName: string;
    email: string;
    phone: string | null;
    headline: string;
    body: string;
    callToAction: string | null;
    targetUrl: string;
    imageFileName: string;
    imageMimeType: string;
    imageDataUrl: string;
    requestedDays: number;
    dailyPrice: Prisma.Decimal | number;
    totalPrice: Prisma.Decimal | number;
    displaySeconds: number;
    slotRank: number;
    driverCreditPerScan: Prisma.Decimal | number;
    status: DbAdSubmissionStatus;
    redirectToken: string;
    assignedDriverId: string | null;
    paymentNote: string | null;
    adminNote: string | null;
    approvedAt: Date | null;
    paymentConfirmedAt: Date | null;
    publishedAt: Date | null;
    startsAt: Date | null;
    endsAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    assignedDriver?: {
      id: string;
      name: string;
      email: string | null;
      phone: string | null;
      driverProfile?: { available: boolean } | null;
    } | null;
    scans?: Array<{ id: string; creditEligible: boolean; blockedReason: string | null }>;
    credits?: Array<{ amount: Prisma.Decimal | number; status: DbDriverAdCreditStatus }>;
  }
): AdSubmission {
  const pendingCreditTotal = toFixedMoney(
    (submission.credits ?? [])
      .filter((credit) => fromDbDriverAdCreditStatus(credit.status) === "pending")
      .reduce((sum, credit) => sum + Number(credit.amount), 0)
  );
  const appliedCreditTotal = toFixedMoney(
    (submission.credits ?? [])
      .filter((credit) => fromDbDriverAdCreditStatus(credit.status) === "applied")
      .reduce((sum, credit) => sum + Number(credit.amount), 0)
  );
  const metrics: AdSubmissionMetrics = {
    scanCount: submission.scans?.length ?? 0,
    eligibleScanCount: (submission.scans ?? []).filter((scan) => scan.creditEligible).length,
    blockedDuplicateCount: (submission.scans ?? []).filter((scan) => !scan.creditEligible && scan.blockedReason === "duplicate_window").length,
    pendingCreditTotal,
    appliedCreditTotal
  };

  return {
    id: submission.id,
    businessName: submission.businessName,
    contactName: submission.contactName,
    email: submission.email,
    phone: submission.phone,
    headline: submission.headline,
    body: submission.body,
    callToAction: submission.callToAction,
    targetUrl: submission.targetUrl,
    imageFileName: submission.imageFileName,
    imageMimeType: submission.imageMimeType,
    imageDataUrl: submission.imageDataUrl,
    requestedDays: submission.requestedDays,
    dailyPrice: Number(submission.dailyPrice),
    totalPrice: Number(submission.totalPrice),
    displaySeconds: submission.displaySeconds,
    slotRank: submission.slotRank,
    driverCreditPerScan: Number(submission.driverCreditPerScan),
    status: fromDbAdSubmissionStatus(submission.status),
    redirectToken: submission.redirectToken,
    assignedDriverId: submission.assignedDriverId,
    paymentNote: submission.paymentNote,
    adminNote: submission.adminNote,
    approvedAt: toIso(submission.approvedAt),
    paymentConfirmedAt: toIso(submission.paymentConfirmedAt),
    publishedAt: toIso(submission.publishedAt),
    startsAt: toIso(submission.startsAt),
    endsAt: toIso(submission.endsAt),
    createdAt: submission.createdAt.toISOString(),
    updatedAt: submission.updatedAt.toISOString(),
    assignedDriver: toAdDriverSummary(submission.assignedDriver),
    metrics
  };
}

function summarizeDriverAdCredits(input: {
  scans: Array<{ id: string }>;
  credits: Array<{ amount: Prisma.Decimal | number; status: DbDriverAdCreditStatus }>;
  activeAdCount: number;
}): DriverAdCreditSummary {
  const pendingTotal = toFixedMoney(
    input.credits
      .filter((credit) => fromDbDriverAdCreditStatus(credit.status) === "pending")
      .reduce((sum, credit) => sum + Number(credit.amount), 0)
  );
  const appliedTotal = toFixedMoney(
    input.credits
      .filter((credit) => fromDbDriverAdCreditStatus(credit.status) === "applied")
      .reduce((sum, credit) => sum + Number(credit.amount), 0)
  );

  return {
    scanCount: input.scans.length,
    pendingTotal,
    appliedTotal,
    availableOffsetTotal: pendingTotal,
    activeAdCount: input.activeAdCount
  };
}

function mapIssueReport(report: DbIssueReport): IssueReport {
  return {
    id: report.id,
    reporterId: report.reporterId,
    reporterRole: report.reporterRole.toLowerCase() as IssueReport["reporterRole"],
    source: report.source as IssueReport["source"],
    summary: report.summary,
    details: report.details,
    page: report.page,
    rideId: report.rideId,
    metadata: (report.metadata as Record<string, unknown> | null) ?? null,
    githubIssueNumber: report.githubIssueNumber,
    githubIssueUrl: report.githubIssueUrl,
    githubSyncStatus: report.githubSyncStatus as IssueReportStatus,
    githubSyncError: report.githubSyncError,
    createdAt: report.createdAt.toISOString(),
    updatedAt: report.updatedAt.toISOString()
  };
}

async function getRideOrThrow(rideId: string) {
  const ride = await prisma.ride.findUnique({
    where: { id: rideId },
    include: rideInclude
  });

  if (!ride) {
    throw new Error("Ride not found");
  }

  return mapRide(ride);
}

async function ensureReferralCode(user: UserWithDriver): Promise<UserWithDriver> {
  if (user.referralCode) {
    return user;
  }

  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      const updated = await prisma.user.update({
        where: { id: user.id },
        data: {
          referralCode: createReferralCode(user.name)
        },
        include: userInclude
      });

      return updated;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        continue;
      }

      throw error;
    }
  }

  throw new Error("Unable to generate a referral code");
}

async function ensureCommunityAccessToken(user: UserWithDriver): Promise<UserWithDriver> {
  if (user.communityAccessToken) {
    return user;
  }

  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      const updated = await prisma.user.update({
        where: { id: user.id },
        data: {
          communityAccessToken: createCommunityAccessToken()
        },
        include: userInclude
      });

      return updated;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        continue;
      }

      throw error;
    }
  }

  throw new Error("Unable to generate a community access token");
}

async function findUserByContact(phone?: string | null, email?: string | null) {
  const [phoneUser, emailUser] = await Promise.all([
    phone
      ? prisma.user.findUnique({
          where: { phone },
          include: userInclude
        })
      : Promise.resolve(null),
    email
      ? prisma.user.findUnique({
          where: { email },
          include: userInclude
        })
      : Promise.resolve(null)
  ]);

  if (phoneUser && emailUser && phoneUser.id !== emailUser.id) {
    throw new Error("Phone number and email belong to different accounts");
  }

  return phoneUser ?? emailUser;
}

async function getDriverUserOrThrow(driverId: string) {
  const user = await prisma.user.findUnique({
    where: { id: driverId },
    include: userInclude
  });

  if (!user || !hasDbRole(user, DbRole.DRIVER) || !user.driverProfile) {
    throw new Error("Driver not found");
  }

  return user;
}

async function ensureDriverRateCards(tx: Prisma.TransactionClient, driverId: string) {
  const existing = await tx.driverRateCard.findMany({
    where: { driverId },
    orderBy: { rideType: "asc" }
  });

  if (existing.length >= 3) {
    return existing;
  }

  const defaultPlatformRules = await tx.pricingRule.findMany({
    where: { marketKey: "DEFAULT" },
    orderBy: { rideType: "asc" }
  });

  const sourceRules =
    defaultPlatformRules.length >= 3
      ? defaultPlatformRules.map((rule) => ({
          rideType: rule.rideType,
          baseFare: Number(rule.baseFare),
          perMile: Number(rule.perMile),
          perMinute: Number(rule.perMinute),
          multiplier: Number(rule.multiplier)
        }))
      : DEFAULT_PLATFORM_RULES.map((rule) => ({
          rideType: toDbRideType(rule.rideType),
          baseFare: rule.baseFare,
          perMile: rule.perMile,
          perMinute: rule.perMinute,
          multiplier: rule.multiplier
        }));

  for (const rule of sourceRules) {
    await tx.driverRateCard.upsert({
      where: {
        driverId_rideType: {
          driverId,
          rideType: rule.rideType
        }
      },
      update: {
        baseFare: rule.baseFare,
        perMile: rule.perMile,
        perMinute: rule.perMinute,
        multiplier: rule.multiplier
      },
      create: {
        driverId,
        rideType: rule.rideType,
        baseFare: rule.baseFare,
        perMile: rule.perMile,
        perMinute: rule.perMinute,
        multiplier: rule.multiplier
      }
    });
  }

  return tx.driverRateCard.findMany({
    where: { driverId },
    orderBy: { rideType: "asc" }
  });
}

async function ensureRoles(
  tx: Prisma.TransactionClient,
  userId: string,
  roles: DbRole[],
  nextPrimaryRole?: DbRole
) {
  const user = await tx.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      role: true,
      roles: true
    }
  });

  const mergedRoles = Array.from(new Set([...(user.roles ?? []), user.role, ...roles]));
  await tx.user.update({
    where: { id: userId },
    data: {
      role: nextPrimaryRole ?? user.role,
      roles: mergedRoles
    }
  });
}

async function ensurePayoutSettingsRecord(tx: Prisma.TransactionClient = prisma) {
  return tx.platformPayoutSettings.findFirst({
    where: {
      adminId: null
    }
  });
}

async function ensureCollectorPayoutSettingsRecord(
  adminId: string,
  tx: Prisma.TransactionClient | typeof prisma = prisma
) {
  return tx.platformPayoutSettings.upsert({
    where: { adminId },
    update: {},
    create: {
      adminId
    }
  });
}

async function ensureAdPricingSettingsRecord(tx: Prisma.TransactionClient | typeof prisma = prisma) {
  const existing = await tx.adPricingSettings.findFirst();
  if (existing) {
    return existing;
  }

  return tx.adPricingSettings.create({
    data: {
      slotMultipliers: DEFAULT_AD_SLOT_MULTIPLIERS as unknown as Prisma.InputJsonValue
    }
  });
}

function buildTrustedOperatorVehicle(seed: string) {
  const normalizedSeed = seed.replace(/[^A-Z0-9]/gi, "").toUpperCase();
  const suffix = normalizedSeed.slice(-6) || "OPS001";

  return {
    makeModel: "RealDrive Operator Vehicle",
    plate: `OPS-${suffix}`,
    color: "Black",
    rideType: toDbRideType("standard"),
    seats: 4
  };
}

async function ensureTrustedOperatorDriverProfile(
  tx: Prisma.TransactionClient,
  userId: string,
  collectorAdminId: string,
  seed: string
) {
  const existingProfile = await tx.driverProfile.findUnique({
    where: { userId },
    include: {
      vehicle: true
    }
  });

  if (existingProfile) {
    await tx.driverProfile.update({
      where: { id: existingProfile.id },
      data: {
        collectorAdminId,
        approved: true,
        approvalStatus: "APPROVED",
        available: false,
        vehicle: existingProfile.vehicle
          ? undefined
          : {
              create: buildTrustedOperatorVehicle(seed)
            }
      }
    });

    return;
  }

  await tx.driverProfile.create({
    data: {
      userId,
      collectorAdminId,
      approved: true,
      approvalStatus: "APPROVED",
      available: false,
      homeState: null,
      homeCity: null,
      localDispatchEnabled: true,
      localRadiusMiles: 25,
      serviceAreaDispatchEnabled: false,
      serviceAreaStates: [],
      nationwideDispatchEnabled: false,
      pricingMode: "PLATFORM",
      vehicle: {
        create: buildTrustedOperatorVehicle(seed)
      }
    }
  });
}

async function markOverduePlatformDuesInternal(now = new Date()) {
  const overdueUnbatched = await prisma.platformDue.findMany({
    where: {
      status: "PENDING",
      batchId: null,
      dueAt: {
        lt: now
      }
    },
    select: {
      driverId: true
    }
  });

  const overdueDriverIds = Array.from(new Set(overdueUnbatched.map((due) => due.driverId)));

  for (const driverId of overdueDriverIds) {
    await createDueBatchForDriverInternal(prisma, driverId, undefined, {
      markOverdue: true,
      adminNote: "Automatically generated after 48 hours with collectible completed-trip dues."
    });
  }

  const openBatches = await prisma.platformDueBatch.findMany({
    where: {
      status: "OPEN",
      dueAt: {
        lt: now
      }
    },
    include: platformDueBatchInclude
  });

  const openBatchIds = openBatches.map((batch) => batch.id);
  const driverIds = Array.from(new Set([...overdueDriverIds, ...openBatches.map((batch) => batch.driverId)]));

  if (openBatchIds.length) {
    await prisma.$transaction([
      prisma.platformDueBatch.updateMany({
        where: {
          id: {
            in: openBatchIds
          }
        },
        data: {
          status: "OVERDUE"
        }
      }),
      prisma.platformDue.updateMany({
        where: {
          batchId: {
            in: openBatchIds
          }
        },
        data: {
          status: "OVERDUE"
        }
      })
    ]);
  }

  if (!driverIds.length) {
    return [];
  }

  await prisma.driverProfile.updateMany({
    where: {
      userId: {
        in: driverIds
      }
    },
    data: {
      available: false
    }
  });

  const refreshed = await prisma.platformDue.findMany({
    where: {
      driverId: {
        in: driverIds
      },
      status: "OVERDUE"
    },
    include: platformDueInclude
  });

  return refreshed.map(mapPlatformDue);
}

async function findCollectorAdminByCode(
  tx: Prisma.TransactionClient | typeof prisma,
  collectorCode?: string | null
) {
  if (!collectorCode) {
    return null;
  }

  const user = await tx.user.findFirst({
    where: {
      referralCode: collectorCode,
      OR: [{ role: DbRole.ADMIN }, { roles: { has: DbRole.ADMIN } }]
    },
    select: collectorSummarySelect
  });

  return user ?? null;
}

async function resolveCollectorAdminId(
  tx: Prisma.TransactionClient | typeof prisma,
  options: {
    collectorCode?: string | null;
    fallbackUserId?: string | null;
  }
) {
  const referredAdmin = await findCollectorAdminByCode(tx, options.collectorCode);
  if (referredAdmin) {
    return referredAdmin.id;
  }

  if (!options.fallbackUserId) {
    return null;
  }

  const fallbackUser = await tx.user.findUnique({
    where: { id: options.fallbackUserId },
    select: {
      id: true,
      role: true,
      roles: true
    }
  });

  if (fallbackUser && hasDbRole(fallbackUser, DbRole.ADMIN)) {
    return fallbackUser.id;
  }

  return null;
}

async function generateDueReferenceCode(tx: Prisma.TransactionClient) {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const count = await tx.platformDueBatch.count();
    const code = `#DUES${String(count + attempt + 1).padStart(6, "0")}`;
    const existing = await tx.platformDueBatch.findUnique({
      where: { referenceCode: code },
      select: { id: true }
    });

    if (!existing) {
      return code;
    }
  }

  throw new Error("Unable to generate a unique dues reference");
}

async function createDueBatchForDriverInternal(
  tx: Prisma.TransactionClient | typeof prisma,
  driverId: string,
  collectorAdminId?: string | null,
  options?: { markOverdue?: boolean; adminNote?: string | null; dueIds?: string[] }
) {
  const dues = await tx.platformDue.findMany({
    where: {
      driverId,
      ...(options?.dueIds?.length
        ? {
            id: {
              in: options.dueIds
            }
          }
        : {}),
      batchId: null,
      status: "PENDING"
    },
    include: platformDueInclude,
    orderBy: [{ collectibleAt: "asc" }, { createdAt: "asc" }]
  });

  if (!dues.length) {
    return null;
  }

  const resolvedCollectorAdminId =
    collectorAdminId ??
    (
      await tx.driverProfile.findUnique({
        where: { userId: driverId },
        select: { collectorAdminId: true }
      })
    )?.collectorAdminId ??
    null;

  const generatedAt = new Date();
  const referenceCode = "platformDueBatch" in tx ? await generateDueReferenceCode(tx as Prisma.TransactionClient) : `#DUES${generatedAt.getTime()}`;
  const amount = Number(dues.reduce((total, due) => total + Number(due.amount), 0).toFixed(2));
  const dueAt = options?.markOverdue ? generatedAt : new Date(generatedAt.getTime() + 48 * 60 * 60 * 1000);
  const status: DbPlatformDueBatchStatus = options?.markOverdue ? DbPlatformDueBatchStatus.OVERDUE : DbPlatformDueBatchStatus.OPEN;

  const batch = await tx.platformDueBatch.create({
    data: {
      referenceCode,
      driverId,
      collectorAdminId: resolvedCollectorAdminId,
      amount,
      status,
      adminNote: options?.adminNote ?? null,
      generatedAt,
      dueAt,
      dues: {
        connect: dues.map((due) => ({ id: due.id }))
      }
    },
    include: platformDueBatchInclude
  });

  await tx.platformDue.updateMany({
    where: {
      id: {
        in: dues.map((due) => due.id)
      }
    },
    data: {
      batchId: batch.id,
      status: options?.markOverdue ? "OVERDUE" : "PENDING"
    }
  });

  const refreshed = await tx.platformDueBatch.findUniqueOrThrow({
    where: { id: batch.id },
    include: platformDueBatchInclude
  });

  return mapPlatformDueBatch(refreshed);
}

async function listDriverDueBatchesInternal(
  tx: Prisma.TransactionClient | typeof prisma,
  driverId: string
) {
  const batches = await tx.platformDueBatch.findMany({
    where: { driverId },
    orderBy: [{ status: "asc" }, { generatedAt: "desc" }],
    include: platformDueBatchInclude
  });

  return batches.map(mapPlatformDueBatch);
}

async function buildDriverDueSnapshotInternal(
  tx: Prisma.TransactionClient | typeof prisma,
  driverId: string
) {
  const driver = await tx.user.findUnique({
    where: { id: driverId },
    include: userInclude
  });

  if (!driver?.driverProfile) {
    throw new Error("Driver not found");
  }

  const [unbatchedDues, batches, adProgram, adScans, adCredits, activeAds] = await Promise.all([
    tx.platformDue.findMany({
      where: {
        driverId,
        batchId: null,
        status: "PENDING"
      },
      orderBy: {
        collectibleAt: "desc"
      }
    }),
    tx.platformDueBatch.findMany({
      where: { driverId },
      orderBy: [{ status: "asc" }, { generatedAt: "desc" }]
    }),
    tx.driverAdProgramEnrollment.findUnique({
      where: { driverId }
    }),
    tx.adScanEvent.findMany({
      where: { driverId },
      select: { id: true }
    }),
    tx.driverAdCredit.findMany({
      where: { driverId },
      select: {
        amount: true,
        status: true
      }
    }),
    tx.adSubmission.count({
      where: {
        assignedDriverId: driverId,
        status: DbAdSubmissionStatus.PUBLISHED,
        AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: new Date() } }] }, { OR: [{ endsAt: null }, { endsAt: { gte: new Date() } }] }]
      }
    })
  ]);

  const openBatches = batches.filter((batch) => batch.status === "OPEN");
  const overdueBatches = batches.filter((batch) => batch.status === "OVERDUE");
  const lastCompletedRideAt = unbatchedDues[0]?.collectibleAt ?? null;

  return mapDriverDueSnapshot({
    driver: {
      id: driver.id,
      name: driver.name,
      email: driver.email,
      phone: driver.phone,
      available: driver.driverProfile.available
    },
    collector: toCollectorSummary(driver.driverProfile.collectorAdmin),
    collectibleUnbatchedTotal: unbatchedDues.reduce((total, due) => total + Number(due.amount), 0),
    collectibleUnbatchedCount: unbatchedDues.length,
    openBatchCount: openBatches.length,
    openBatchTotal: openBatches.reduce((total, batch) => total + Number(batch.amount), 0),
    overdueBatchCount: overdueBatches.length,
    overdueBatchTotal: overdueBatches.reduce((total, batch) => total + Number(batch.amount), 0),
    lastCompletedRideAt,
    adProgram: {
      optedIn: adProgram?.optedIn ?? false,
      scanCount: adScans.length,
      pendingCreditTotal: toFixedMoney(
        adCredits.filter((credit) => fromDbDriverAdCreditStatus(credit.status) === "pending").reduce((total, credit) => total + Number(credit.amount), 0)
      ),
      appliedCreditTotal: toFixedMoney(
        adCredits.filter((credit) => fromDbDriverAdCreditStatus(credit.status) === "applied").reduce((total, credit) => total + Number(credit.amount), 0)
      ),
      activeAdCount: activeAds
    }
  });
}

async function releaseDriverBlockIfClear(
  tx: Prisma.TransactionClient | typeof prisma,
  driverId: string
) {
  const overdueCount = await tx.platformDueBatch.count({
    where: {
      driverId,
      status: "OVERDUE"
    }
  });

  if (overdueCount === 0) {
    await tx.driverProfile.updateMany({
      where: { userId: driverId },
      data: {
        available: false
      }
    });
  }
}

function buildVehicleUpdate(patch: DriverProfileUpdateInput["vehicle"]) {
  if (!patch) {
    return undefined;
  }

  const data: Record<string, unknown> = {};
  if (patch.makeModel !== undefined) {
    data.makeModel = patch.makeModel;
  }
  if (patch.plate !== undefined) {
    data.plate = patch.plate;
  }
  if (patch.color !== undefined) {
    data.color = patch.color ?? null;
  }
  if (patch.rideType !== undefined) {
    data.rideType = toDbRideType(patch.rideType);
  }
  if (patch.seats !== undefined) {
    data.seats = patch.seats;
  }

  if (Object.keys(data).length === 0) {
    return undefined;
  }

  return data;
}

export const store: Store = {
  async findSessionUserById(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: userInclude
    });

    return user ? mapSessionUser(user) : null;
  },

  async findUserForOtp(phone, role) {
    const user = await prisma.user.findFirst({
      where: {
        phone,
        OR: [
          { role: role === "driver" ? DbRole.DRIVER : DbRole.RIDER },
          { roles: { has: role === "driver" ? DbRole.DRIVER : DbRole.RIDER } }
        ]
      },
      include: userInclude
    });

    return user ? asAuthIdentity(await ensureCommunityAccessToken(await ensureReferralCode(user))) : null;
  },

  async createRiderIdentity(input) {
    const normalizedPhone = input.phone ?? null;
    const normalizedEmail = input.email?.toLowerCase() ?? null;
    const existing = await findUserByContact(normalizedPhone, normalizedEmail);

    if (existing && !hasDbRole(existing, DbRole.RIDER)) {
      throw new Error("Contact information is already assigned to a non-rider account");
    }

    const user = existing
      ? await prisma.user.update({
          where: { id: existing.id },
          data: {
            name: input.name,
            phone: normalizedPhone ?? existing.phone,
            email: normalizedEmail ?? existing.email,
            roles: {
              set: Array.from(new Set([...(existing.roles ?? []), existing.role, DbRole.RIDER]))
            },
            riderProfile: {
              upsert: {
                update: {},
                create: {}
              }
            }
          },
          include: userInclude
        })
      : await prisma.user.create({
          data: {
            role: DbRole.RIDER,
            roles: [DbRole.RIDER],
            name: input.name,
            phone: normalizedPhone,
            email: normalizedEmail,
            riderProfile: {
              create: {}
            }
          },
          include: userInclude
        });

    return asAuthIdentity(await ensureCommunityAccessToken(await ensureReferralCode(user)));
  },

  async getAdminSetupStatus() {
    const admins = await prisma.user.findMany({
      where: {
        OR: [{ role: DbRole.ADMIN }, { roles: { has: DbRole.ADMIN } }]
      },
      select: {
        id: true,
        role: true,
        roles: true,
        email: true,
        name: true
      }
    });

    const needsSetup =
      admins.length === 0 ||
      (admins.length === 1 && isClaimableSeedAdmin(admins[0]));

    return { needsSetup };
  },

  async setupAdmin(input) {
    const email = input.email.toLowerCase();
    const admins = await prisma.user.findMany({
      where: {
        OR: [{ role: DbRole.ADMIN }, { roles: { has: DbRole.ADMIN } }]
      },
      include: userInclude,
      orderBy: { createdAt: "asc" }
    });

    if (admins.length === 0) {
      const created = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            role: DbRole.ADMIN,
            roles: input.driverProfile ? [DbRole.ADMIN, DbRole.DRIVER] : [DbRole.ADMIN],
            name: input.name,
            email,
            passwordHash: input.passwordHash,
            phone: input.driverProfile?.phone,
            driverProfile: input.driverProfile
              ? {
                  create: {
                    approved: true,
                    approvalStatus: "APPROVED",
                    available: false,
                    homeState: input.driverProfile.homeState.toUpperCase(),
                    homeCity: input.driverProfile.homeCity,
                    localDispatchEnabled: true,
                    localRadiusMiles: 25,
                    serviceAreaDispatchEnabled: true,
                    serviceAreaStates: [input.driverProfile.homeState.toUpperCase()],
                    nationwideDispatchEnabled: false,
                    pricingMode: "PLATFORM",
                    vehicle: {
                      create: {
                        makeModel: input.driverProfile.vehicle.makeModel,
                        plate: input.driverProfile.vehicle.plate,
                        color: input.driverProfile.vehicle.color ?? null,
                        rideType: toDbRideType(input.driverProfile.vehicle.rideType),
                        seats: input.driverProfile.vehicle.seats
                      }
                    }
                  }
                }
              : undefined
          },
          include: userInclude
        });

        if (input.driverProfile) {
          await ensureDriverRateCards(tx, user.id);
        }

        return tx.user.findUniqueOrThrow({
          where: { id: user.id },
          include: userInclude
        });
      });

      return asAuthIdentity(await ensureCommunityAccessToken(await ensureReferralCode(created)));
    }

    if (admins.length === 1 && isClaimableSeedAdmin(admins[0])) {
      const updated = await prisma.$transaction(async (tx) => {
        if (input.driverProfile) {
          await ensureRoles(tx, admins[0].id, [DbRole.ADMIN, DbRole.DRIVER], DbRole.ADMIN);
        } else {
          await ensureRoles(tx, admins[0].id, [DbRole.ADMIN], DbRole.ADMIN);
        }

        const user = await tx.user.update({
          where: { id: admins[0].id },
          data: {
            name: input.name,
            email,
            passwordHash: input.passwordHash,
            phone: input.driverProfile?.phone ?? undefined,
            driverProfile: input.driverProfile
              ? {
                  upsert: {
                    update: {
                      approved: true,
                      approvalStatus: "APPROVED",
                      available: false,
                      homeState: input.driverProfile.homeState.toUpperCase(),
                      homeCity: input.driverProfile.homeCity,
                      localDispatchEnabled: true,
                      localRadiusMiles: 25,
                      serviceAreaDispatchEnabled: true,
                      serviceAreaStates: [input.driverProfile.homeState.toUpperCase()],
                      nationwideDispatchEnabled: false,
                      pricingMode: "PLATFORM",
                      vehicle: {
                        upsert: {
                          update: {
                            makeModel: input.driverProfile.vehicle.makeModel,
                            plate: input.driverProfile.vehicle.plate,
                            color: input.driverProfile.vehicle.color ?? null,
                            rideType: toDbRideType(input.driverProfile.vehicle.rideType),
                            seats: input.driverProfile.vehicle.seats
                          },
                          create: {
                            makeModel: input.driverProfile.vehicle.makeModel,
                            plate: input.driverProfile.vehicle.plate,
                            color: input.driverProfile.vehicle.color ?? null,
                            rideType: toDbRideType(input.driverProfile.vehicle.rideType),
                            seats: input.driverProfile.vehicle.seats
                          }
                        }
                      }
                    },
                    create: {
                      collectorAdminId: admins[0].id,
                      approved: true,
                      approvalStatus: "APPROVED",
                      available: false,
                      homeState: input.driverProfile.homeState.toUpperCase(),
                      homeCity: input.driverProfile.homeCity,
                      localDispatchEnabled: true,
                      localRadiusMiles: 25,
                      serviceAreaDispatchEnabled: true,
                      serviceAreaStates: [input.driverProfile.homeState.toUpperCase()],
                      nationwideDispatchEnabled: false,
                      pricingMode: "PLATFORM",
                      vehicle: {
                        create: {
                          makeModel: input.driverProfile.vehicle.makeModel,
                          plate: input.driverProfile.vehicle.plate,
                          color: input.driverProfile.vehicle.color ?? null,
                          rideType: toDbRideType(input.driverProfile.vehicle.rideType),
                          seats: input.driverProfile.vehicle.seats
                        }
                      }
                    }
                  }
                }
              : undefined
          },
          include: userInclude
        });

        await ensureCollectorPayoutSettingsRecord(user.id, tx);

        if (input.driverProfile) {
          await ensureDriverRateCards(tx, user.id);
        }

        return tx.user.findUniqueOrThrow({
          where: { id: user.id },
          include: userInclude
        });
      });

      return asAuthIdentity(await ensureCommunityAccessToken(await ensureReferralCode(updated)));
    }

    throw new Error("Admin setup has already been completed");
  },

  async findAdminByEmail(email) {
    const user = await prisma.user.findFirst({
      where: {
        email,
        OR: [{ role: DbRole.ADMIN }, { roles: { has: DbRole.ADMIN } }]
      },
      include: userInclude
    });

    return user ? asAuthIdentity(await ensureCommunityAccessToken(await ensureReferralCode(user))) : null;
  },

  async findDriverByEmail(email) {
    const user = await prisma.user.findFirst({
      where: {
        email,
        OR: [{ role: DbRole.DRIVER }, { roles: { has: DbRole.DRIVER } }]
      },
      include: userInclude
    });

    return user ? asAuthIdentity(await ensureCommunityAccessToken(await ensureReferralCode(user))) : null;
  },

  async createDriverRole(userId, input) {
    const existing = await prisma.user.findUnique({
      where: { id: userId },
      include: userInclude
    });

    if (!existing) {
      throw new Error("User not found");
    }

    if (existing.driverProfile) {
      throw new Error("Driver profile already exists");
    }

    const updated = await prisma.$transaction(async (tx) => {
      const collectorAdminId = await resolveCollectorAdminId(tx, {
        collectorCode: input.collectorCode,
        fallbackUserId: userId
      });

      await ensureRoles(tx, userId, [DbRole.DRIVER], existing.role);

      const user = await tx.user.update({
        where: { id: userId },
        data: {
          phone: input.phone,
          driverProfile: {
            create: {
              collectorAdminId,
              approved: false,
              approvalStatus: "PENDING",
              available: false,
              homeState: input.homeState.toUpperCase(),
              homeCity: input.homeCity,
              localDispatchEnabled: true,
              localRadiusMiles: 25,
              serviceAreaDispatchEnabled: true,
              serviceAreaStates: [input.homeState.toUpperCase()],
              nationwideDispatchEnabled: false,
              pricingMode: "PLATFORM",
              vehicle: {
                create: {
                  makeModel: input.vehicle.makeModel,
                  plate: input.vehicle.plate,
                  color: input.vehicle.color ?? null,
                  rideType: toDbRideType(input.vehicle.rideType),
                  seats: input.vehicle.seats
                }
              }
            }
          }
        },
        include: userInclude
      });

      await createDriverDocumentRecords(tx, user.id, input.documents);
      await ensureDriverRateCards(tx, user.id);

      return tx.user.findUniqueOrThrow({
        where: { id: user.id },
        include: userInclude
      });
    });

    return mapDriverAccount(await ensureCommunityAccessToken(await ensureReferralCode(updated)));
  },

  async createDriverAccount(input) {
    const email = input.email.toLowerCase();
    const phone = input.phone;
    const existing = await findUserByContact(phone, email);

    if (existing) {
      throw new Error("A user with that phone number or email already exists");
    }

    const created = await prisma.$transaction(async (tx) => {
      const collectorAdminId = await resolveCollectorAdminId(tx, {
        collectorCode: input.collectorCode
      });

      const user = await tx.user.create({
        data: {
          role: DbRole.DRIVER,
          roles: [DbRole.DRIVER],
          name: input.name,
          email,
          phone,
          passwordHash: input.passwordHash,
          driverProfile: {
            create: {
              collectorAdminId,
              approved: false,
              approvalStatus: "PENDING",
              available: false,
              homeState: input.homeState.toUpperCase(),
              homeCity: input.homeCity,
              localDispatchEnabled: true,
              localRadiusMiles: 25,
              serviceAreaDispatchEnabled: true,
              serviceAreaStates: [input.homeState.toUpperCase()],
              nationwideDispatchEnabled: false,
              pricingMode: "PLATFORM",
              vehicle: {
                create: {
                  makeModel: input.vehicle.makeModel,
                  plate: input.vehicle.plate,
                  color: input.vehicle.color ?? null,
                  rideType: toDbRideType(input.vehicle.rideType),
                  seats: input.vehicle.seats
                }
              }
            }
          }
        },
        include: userInclude
      });

      await createDriverDocumentRecords(tx, user.id, input.documents);
      await ensureDriverRateCards(tx, user.id);

      return tx.user.findUniqueOrThrow({
        where: { id: user.id },
        include: userInclude
      });
    });

    return mapDriverAccount(await ensureCommunityAccessToken(await ensureReferralCode(created)));
  },

  async getDriverAccount(driverId) {
    const user = await prisma.user.findUnique({
      where: { id: driverId },
      include: userInclude
    });

    if (!user || !hasDbRole(user, DbRole.DRIVER) || !user.driverProfile) {
      return null;
    }

    await ensureDriverRateCards(prisma, user.id);
    const refreshed = await prisma.user.findUnique({
      where: { id: driverId },
      include: userInclude
    });

    return refreshed?.driverProfile
      ? mapDriverAccount(await ensureCommunityAccessToken(await ensureReferralCode(refreshed)))
      : null;
  },

  async updateDriverProfile(driverId, patch) {
    await getDriverUserOrThrow(driverId);
    const vehicleUpdate = buildVehicleUpdate(patch.vehicle);

    const updated = await prisma.user.update({
      where: { id: driverId },
      data: {
        name: patch.name,
        phone: patch.phone,
        driverProfile: {
          update: {
            homeState: patch.homeState?.toUpperCase(),
            homeCity: patch.homeCity,
            acceptedPaymentMethods: patch.acceptedPaymentMethods
              ? normalizeAcceptedPaymentMethods(patch.acceptedPaymentMethods).map(toDbPaymentMethod)
              : undefined,
            vehicle: vehicleUpdate
              ? {
                  update: vehicleUpdate
                }
              : undefined
          }
        }
      },
      include: userInclude
    });

    if (!updated.driverProfile) {
      throw new Error("Driver profile missing");
    }

    return mapDriverAccount(await ensureCommunityAccessToken(await ensureReferralCode(updated)));
  },

  async getDriverDispatchSettings(driverId) {
    const user = await getDriverUserOrThrow(driverId);
    return mapDispatchSettings(user.driverProfile!);
  },

  async updateDriverDispatchSettings(driverId, settings) {
    const updated = await prisma.user.update({
      where: { id: driverId },
      data: {
        driverProfile: {
          update: {
            localDispatchEnabled: settings.localEnabled,
            localRadiusMiles: settings.localRadiusMiles,
            serviceAreaDispatchEnabled: settings.serviceAreaEnabled,
            serviceAreaStates: normalizeStateList(settings.serviceAreaStates),
            nationwideDispatchEnabled: settings.nationwideEnabled
          }
        }
      },
      include: userInclude
    });

    if (!updated.driverProfile) {
      throw new Error("Driver profile missing");
    }

    return mapDispatchSettings(updated.driverProfile);
  },

  async getDriverRateCard(driverId) {
    await getDriverUserOrThrow(driverId);
    await ensureDriverRateCards(prisma, driverId);
    const refreshed = await prisma.user.findUnique({
      where: { id: driverId },
      include: userInclude
    });

    if (!refreshed) {
      throw new Error("Driver not found");
    }

    return mapDriverRateCard(refreshed);
  },

  async replaceDriverRateCard(driverId, input) {
    await getDriverUserOrThrow(driverId);

    const updated = await prisma.$transaction(async (tx) => {
      await tx.driverProfile.update({
        where: { userId: driverId },
        data: {
          pricingMode: toDbDriverPricingMode(input.pricingMode)
        }
      });

      for (const rule of input.rules) {
        await tx.driverRateCard.upsert({
          where: {
            driverId_rideType: {
              driverId,
              rideType: toDbRideType(rule.rideType)
            }
          },
          update: {
            baseFare: rule.baseFare,
            perMile: rule.perMile,
            perMinute: rule.perMinute,
            multiplier: rule.multiplier
          },
          create: {
            driverId,
            rideType: toDbRideType(rule.rideType),
            baseFare: rule.baseFare,
            perMile: rule.perMile,
            perMinute: rule.perMinute,
            multiplier: rule.multiplier
          }
        });
      }

      if (input.rules.length) {
        await tx.driverRateCard.deleteMany({
          where: {
            driverId,
            rideType: {
              notIn: input.rules.map((rule) => toDbRideType(rule.rideType))
            }
          }
        });
      }

      return tx.user.findUniqueOrThrow({
        where: { id: driverId },
        include: userInclude
      });
    });

    return mapDriverRateCard(updated);
  },

  async findUserByReferralCode(referralCode) {
    const user = await prisma.user.findUnique({
      where: { referralCode },
      include: userInclude
    });

    return user ? mapSessionUser(user) : null;
  },

  async findUserByCommunityAccessToken(token) {
    const user = await prisma.user.findUnique({
      where: { communityAccessToken: token },
      include: userInclude
    });

    return user ? mapSessionUser(user) : null;
  },

  async ensureUserReferralCode(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: userInclude
    });

    if (!user) {
      throw new Error("User not found");
    }

    return mapSessionUser(await ensureReferralCode(user));
  },

  async ensureUserCommunityAccessToken(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: userInclude
    });

    if (!user) {
      throw new Error("User not found");
    }

    return (await ensureCommunityAccessToken(user)).communityAccessToken!;
  },

  async listPlatformPricingRules() {
    const rules = await prisma.pricingRule.findMany({
      orderBy: [{ marketKey: "asc" }, { rideType: "asc" }]
    });

    return rules.map(mapPricingRule);
  },

  async listPlatformRateBenchmarks() {
    const rules = await prisma.platformRateBenchmark.findMany({
      orderBy: [{ marketKey: "asc" }, { provider: "asc" }, { rideType: "asc" }]
    });

    return rules.map((rule): PlatformRateBenchmarkRule => ({
      provider: fromDbBenchmarkProvider(rule.provider),
      marketKey: normalizeMarketKey(rule.marketKey),
      rideType: rule.rideType.toLowerCase() as PlatformRateBenchmarkRule["rideType"],
      baseFare: Number(rule.baseFare),
      perMile: Number(rule.perMile),
      perMinute: Number(rule.perMinute),
      multiplier: Number(rule.multiplier),
      observedAt: rule.observedAt.toISOString()
    }));
  },

  async upsertPlatformRateBenchmarks(rules) {
    await prisma.$transaction(
      rules.map((rule) =>
        prisma.platformRateBenchmark.upsert({
          where: {
            provider_marketKey_rideType: {
              provider: toDbBenchmarkProvider(rule.provider),
              marketKey: normalizeMarketKey(rule.marketKey),
              rideType: toDbRideType(rule.rideType)
            }
          },
          update: {
            baseFare: rule.baseFare,
            perMile: rule.perMile,
            perMinute: rule.perMinute,
            multiplier: rule.multiplier,
            observedAt: new Date()
          },
          create: {
            provider: toDbBenchmarkProvider(rule.provider),
            marketKey: normalizeMarketKey(rule.marketKey),
            rideType: toDbRideType(rule.rideType),
            baseFare: rule.baseFare,
            perMile: rule.perMile,
            perMinute: rule.perMinute,
            multiplier: rule.multiplier,
            observedAt: new Date()
          }
        })
      )
    );

    return this.listPlatformRateBenchmarks();
  },

  async replacePlatformPricingRules(rules) {
    await prisma.$transaction(
      rules.map((rule) =>
        prisma.pricingRule.upsert({
          where: {
            marketKey_rideType: {
              marketKey: normalizeMarketKey(rule.marketKey),
              rideType: toDbRideType(rule.rideType)
            }
          },
          update: {
            baseFare: rule.baseFare,
            perMile: rule.perMile,
            perMinute: rule.perMinute,
            multiplier: rule.multiplier
          },
          create: {
            marketKey: normalizeMarketKey(rule.marketKey),
            rideType: toDbRideType(rule.rideType),
            baseFare: rule.baseFare,
            perMile: rule.perMile,
            perMinute: rule.perMinute,
            multiplier: rule.multiplier
          }
        })
      )
    );

    return this.listPlatformPricingRules();
  },

  async createRide(input) {
    const ride = await prisma.ride.create({
      data: {
        riderId: input.riderId,
        isTest: input.isTest ?? false,
        testLabel: input.testLabel ?? null,
        createdByAdminId: input.createdByAdminId ?? null,
        targetDriverId: input.targetDriverId ?? null,
        rideType: toDbRideType(input.rideType),
        status: toDbRideStatus(input.status),
        publicTrackingToken: input.publicTrackingToken,
        referredByUserId: input.referredByUserId ?? null,
        referredByCode: input.referredByCode ?? null,
        pickupAddress: input.route.pickup.address,
        pickupLat: input.route.pickup.lat,
        pickupLng: input.route.pickup.lng,
        pickupStateCode: input.route.pickup.stateCode?.toUpperCase() ?? null,
        dropoffAddress: input.route.dropoff.address,
        dropoffLat: input.route.dropoff.lat,
        dropoffLng: input.route.dropoff.lng,
        dropoffStateCode: input.route.dropoff.stateCode?.toUpperCase() ?? null,
        estimatedMiles: input.route.distanceMiles,
        estimatedMinutes: input.route.durationMinutes,
        routeProvider: input.route.provider,
        platformMarketKey: normalizeMarketKey(input.platformMarketKey),
        estimatedPricingSource: toDbRidePricingSource(input.estimatedPricingSource ?? "platform_market"),
        quotedFare: input.quotedFare,
        estimatedPlatformDue: input.estimatedPlatformDue,
        estimatedCustomerTotal: input.estimatedCustomerTotal,
        paymentMethod: toDbPaymentMethod(input.paymentMethod),
        paymentStatus: toDbPaymentStatus("pending"),
        requestedAt: input.requestedAt,
        scheduledFor: input.scheduledFor
      },
      include: rideInclude
    });

    return mapRide(ride);
  },

  async getRideById(rideId) {
    const ride = await prisma.ride.findUnique({
      where: { id: rideId },
      include: rideInclude
    });

    return ride ? mapRide(ride) : null;
  },

  async getRideByPublicTrackingToken(token) {
    const ride = await prisma.ride.findUnique({
      where: { publicTrackingToken: token },
      include: rideInclude
    });

    return ride ? mapRide(ride) : null;
  },

  async listRiderRides(riderId) {
    const rides = await prisma.ride.findMany({
      where: { riderId },
      orderBy: { createdAt: "desc" },
      include: rideInclude
    });

    return rides.map(mapRide);
  },

  async listEligibleDriversForRide(pickup, pickupStateCode) {
    await markOverduePlatformDuesInternal();

    const drivers = await prisma.user.findMany({
      where: {
        OR: [{ role: DbRole.DRIVER }, { roles: { has: DbRole.DRIVER } }],
        ...ownerDriverFilter(),
        platformDues: {
          none: {
            status: "OVERDUE"
          }
        },
        driverProfile: {
          is: {
            approved: true,
            available: true
          }
        }
      },
      include: userInclude
    });

    const normalizedPickupState = pickupStateCode?.toUpperCase() ?? null;

    return drivers
      .map((driver) => {
        if (!driver.driverProfile) {
          return null;
        }

        const profile = driver.driverProfile;
        const lat = profile.currentLat;
        const lng = profile.currentLng;
        const lastLocationAt = profile.lastLocationAt;
        const localDistance =
          profile.localDispatchEnabled && lat != null && lng != null
            ? calculateDistanceMiles(pickup, { lat, lng })
            : null;
        const hasFreshLocation =
          lastLocationAt != null && Date.now() - lastLocationAt.getTime() <= 30 * 60 * 1000;
        const localMatch =
          profile.localDispatchEnabled &&
          localDistance != null &&
          localDistance <= profile.localRadiusMiles &&
          hasFreshLocation;
        const serviceAreaMatch =
          profile.serviceAreaDispatchEnabled &&
          normalizedPickupState != null &&
          profile.serviceAreaStates.map((state) => state.toUpperCase()).includes(normalizedPickupState);
        const nationwideMatch = profile.nationwideDispatchEnabled;

        if (!localMatch && !serviceAreaMatch && !nationwideMatch) {
          return null;
        }

        const matchScore = localMatch ? 30 : serviceAreaMatch ? 20 : nationwideMatch ? 10 : 0;
        const distanceScore = localDistance != null ? Math.max(0, 15 - localDistance) : 0;
        const ratingScore = Math.max(0, Math.min(10, profile.rating * 2));
        const freshnessScore = hasFreshLocation ? 6 : 0;
        const dispatchScore = Number((matchScore + distanceScore + ratingScore + freshnessScore).toFixed(2));

        return {
          ...mapDriverAccount(driver),
          lat,
          lng,
          rating: profile.rating,
          distance: localDistance,
          dispatchScore
        };
      })
      .filter(
        (driver): driver is DriverCandidate & { distance: number | null; dispatchScore: number } =>
          Boolean(driver)
      )
      .sort((left, right) => {
        if (left.dispatchScore !== right.dispatchScore) {
          return right.dispatchScore - left.dispatchScore;
        }
        if (left.distance != null && right.distance != null) {
          return left.distance - right.distance;
        }
        if (left.distance != null) {
          return -1;
        }
        if (right.distance != null) {
          return 1;
        }
        return left.name.localeCompare(right.name);
      })
      .map(({ distance: _distance, dispatchScore: _dispatchScore, ...driver }) => driver);
  },

  async listMarketConfigs() {
    const grouped = await prisma.pricingRule.groupBy({
      by: ["marketKey"],
      _count: {
        rideType: true
      },
      orderBy: {
        marketKey: "asc"
      }
    });

    return grouped.map((row) => ({
      marketKey: row.marketKey,
      rideTypeCount: row._count.rideType
    }));
  },

  async createMarketConfig(input) {
    const marketKey = normalizeMarketKey(input.marketKey);
    const sourceMarketKey = normalizeMarketKey(input.copyFromMarketKey);

    const existingCount = await prisma.pricingRule.count({
      where: { marketKey }
    });

    if (existingCount === 0) {
      const sourceRules = await prisma.pricingRule.findMany({
        where: { marketKey: sourceMarketKey },
        orderBy: { rideType: "asc" }
      });

      const seedRules = sourceRules.length
        ? sourceRules.map((rule) => ({
            marketKey,
            rideType: rule.rideType,
            baseFare: rule.baseFare,
            perMile: rule.perMile,
            perMinute: rule.perMinute,
            multiplier: rule.multiplier
          }))
        : DEFAULT_PLATFORM_RULES.map((rule) => ({
            marketKey,
            rideType: toDbRideType(rule.rideType),
            baseFare: rule.baseFare,
            perMile: rule.perMile,
            perMinute: rule.perMinute,
            multiplier: rule.multiplier
          }));

      await prisma.pricingRule.createMany({
        data: seedRules
      });
    }

    const rideTypeCount = await prisma.pricingRule.count({
      where: { marketKey }
    });

    return {
      marketKey,
      rideTypeCount
    };
  },

  async listAdminAuditLogs(options) {
    const rows = await prisma.auditLog.findMany({
      where: {
        ...(options?.action ? { action: { contains: options.action, mode: "insensitive" } } : {}),
        ...(options?.entityType ? { entityType: { equals: options.entityType, mode: "insensitive" } } : {})
      },
      include: {
        actor: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      take: Math.min(500, Math.max(1, options?.limit ?? 100))
    });

    return rows.map((row) => ({
      id: row.id,
      actorId: row.actorId,
      actorName: row.actor?.name ?? null,
      action: row.action,
      entityType: row.entityType,
      entityId: row.entityId,
      metadata: row.metadata as Record<string, unknown> | null,
      createdAt: row.createdAt.toISOString()
    }));
  },

  async createRideOffers(rideId, driverIds, expiresAt) {
    if (driverIds.length) {
      await prisma.rideOffer.createMany({
        data: driverIds.map((driverId) => ({
          rideId,
          driverId,
          expiresAt
        })),
        skipDuplicates: true
      });
    }

    await prisma.ride.update({
      where: { id: rideId },
      data: {
        status: toDbRideStatus(driverIds.length ? "offered" : "expired")
      }
    });

    return getRideOrThrow(rideId);
  },

  async claimRideOffer(rideId, driverId, acceptedAt) {
    return prisma.$transaction(async (tx) => {
      const offer = await tx.rideOffer.findUnique({
        where: {
          rideId_driverId: {
            rideId,
            driverId
          }
        }
      });

      if (!offer || offer.status !== "PENDING") {
        return null;
      }

      const claim = await tx.ride.updateMany({
        where: {
          id: rideId,
          driverId: null,
          status: "OFFERED"
        },
        data: {
          driverId,
          status: "ACCEPTED",
          acceptedAt
        }
      });

      if (claim.count === 0) {
        return null;
      }

      await tx.rideOffer.update({
        where: {
          rideId_driverId: {
            rideId,
            driverId
          }
        },
        data: {
          status: "ACCEPTED",
          respondedAt: acceptedAt
        }
      });

      await tx.rideOffer.updateMany({
        where: {
          rideId,
          driverId: { not: driverId },
          status: "PENDING"
        },
        data: {
          status: "EXPIRED",
          respondedAt: acceptedAt
        }
      });

      const ride = await tx.ride.findUnique({
        where: { id: rideId },
        include: rideInclude
      });

      return ride ? mapRide(ride) : null;
    });
  },

  async applyAcceptedRidePricing(rideId, pricing) {
    const ride = await prisma.ride.update({
      where: { id: rideId },
      data: {
        finalFare: pricing.finalFare ?? undefined,
        finalPlatformDue: pricing.finalPlatformDue ?? undefined,
        finalCustomerTotal: pricing.finalCustomerTotal ?? undefined,
        finalPricingSource: pricing.finalPricingSource
          ? toDbRidePricingSource(pricing.finalPricingSource)
          : undefined,
        matchedDriverPricingMode: toDbDriverPricingMode(pricing.matchedDriverPricingMode)
      },
      include: rideInclude
    });

    return mapRide(ride);
  },

  async declineRideOffer(rideId, driverId) {
    return prisma.$transaction(async (tx) => {
      await tx.rideOffer.update({
        where: {
          rideId_driverId: {
            rideId,
            driverId
          }
        },
        data: {
          status: "DECLINED",
          respondedAt: new Date()
        }
      });

      const pendingOffers = await tx.rideOffer.count({
        where: {
          rideId,
          status: "PENDING"
        }
      });

      if (pendingOffers === 0) {
        await tx.ride.update({
          where: { id: rideId },
          data: {
            status: "EXPIRED"
          }
        });
      }

      const ride = await tx.ride.findUnique({
        where: { id: rideId },
        include: rideInclude
      });

      return ride ? mapRide(ride) : null;
    });
  },

  async expireRideOffers(rideId) {
    await prisma.$transaction([
      prisma.rideOffer.updateMany({
        where: {
          rideId,
          status: "PENDING"
        },
        data: {
          status: "EXPIRED",
          respondedAt: new Date()
        }
      }),
      prisma.ride.update({
        where: { id: rideId },
        data: {
          status: "EXPIRED"
        }
      })
    ]);

    return getRideOrThrow(rideId);
  },

  async listDriverOffers(driverId) {
    const rides = await prisma.ride.findMany({
      where: {
        offers: {
          some: {
            driverId,
            status: "PENDING"
          }
        }
      },
      orderBy: { createdAt: "desc" },
      include: rideInclude
    });

    return rides.map(mapRide);
  },

  async listActiveDriverRides(driverId) {
    const rides = await prisma.ride.findMany({
      where: {
        driverId,
        status: {
          in: ["ACCEPTED", "EN_ROUTE", "ARRIVED", "IN_PROGRESS"]
        }
      },
      orderBy: { createdAt: "desc" },
      include: rideInclude
    });

    return rides.map(mapRide);
  },

  async updateRideStatus(rideId, patch) {
    const ride = await prisma.ride.update({
      where: { id: rideId },
      data: {
        status: toDbRideStatus(patch.status),
        startedAt: patch.status === "in_progress" ? new Date() : undefined,
        completedAt: patch.status === "completed" ? new Date() : undefined,
        finalFare: patch.finalFare === null ? null : patch.finalFare ?? undefined,
        finalPlatformDue: patch.finalPlatformDue === null ? null : patch.finalPlatformDue ?? undefined,
        finalCustomerTotal: patch.finalCustomerTotal === null ? null : patch.finalCustomerTotal ?? undefined
      },
      include: rideInclude
    });

    return mapRide(ride);
  },

  async updateRideAdmin(rideId, patch: UpdateRideAdminPatch) {
    const explicitPaymentStatus = patch.paymentStatus ? toDbPaymentStatus(patch.paymentStatus) : null;
    const ride = await prisma.ride.update({
      where: { id: rideId },
      data: {
        status: patch.status ? toDbRideStatus(patch.status) : undefined,
        canceledAt: patch.status === "canceled" ? new Date() : undefined,
        paymentStatus: explicitPaymentStatus ?? undefined,
        fareOverride: patch.fareOverride === null ? null : patch.fareOverride ?? undefined,
        routeFallbackMiles: patch.routeFallbackMiles ?? undefined,
        quotedFare: patch.quotedFare ?? undefined,
        estimatedPlatformDue: patch.estimatedPlatformDue ?? undefined,
        estimatedCustomerTotal: patch.estimatedCustomerTotal ?? undefined,
        finalFare:
          patch.finalFare === null
            ? null
            : patch.finalFare ??
              (explicitPaymentStatus && fromDbPaymentStatus(explicitPaymentStatus) !== "pending"
                ? patch.fareOverride ?? patch.quotedFare ?? undefined
                : undefined),
        finalPlatformDue:
          patch.finalPlatformDue === null ? null : patch.finalPlatformDue ?? undefined,
        finalCustomerTotal:
          patch.finalCustomerTotal === null ? null : patch.finalCustomerTotal ?? undefined,
        finalPricingSource: patch.finalPricingSource
          ? toDbRidePricingSource(patch.finalPricingSource)
          : undefined,
        paymentCollectedById: patch.paymentCollectedById,
        paymentCollectedAt: patch.paymentCollectedAt
      },
      include: rideInclude
    });

    return mapRide(ride);
  },

  async syncPlatformDueForRide(rideId) {
    const ride = await prisma.ride.findUnique({
      where: { id: rideId }
    });

    if (!ride || !ride.driverId || ride.status !== "COMPLETED") {
      return null;
    }

    const amount = Number(ride.finalPlatformDue ?? ride.estimatedPlatformDue);
    if (ride.paymentStatus === "WAIVED" || amount <= 0) {
      const existing = await prisma.platformDue.findUnique({
        where: { rideId },
        include: platformDueInclude
      });

      if (!existing) {
        return null;
      }

      const waived = await prisma.platformDue.update({
        where: { rideId },
        data: {
          status: "WAIVED",
          amount: 0
        },
        include: platformDueInclude
      });

      return mapPlatformDue(waived);
    }

    const collectibleAt = ride.completedAt ?? new Date();
    const dueAt = new Date(collectibleAt.getTime() + 48 * 60 * 60 * 1000);

    const due = await prisma.platformDue.upsert({
      where: { rideId },
      update: {
        driverId: ride.driverId,
        amount,
        collectibleAt,
        dueAt,
        status: "PENDING"
      },
      create: {
        rideId,
        driverId: ride.driverId,
        amount,
        collectibleAt,
        dueAt,
        status: "PENDING"
      },
      include: platformDueInclude
    });

    if (ride.paymentMethod === "CASH") {
      await prisma.$transaction(async (tx) => {
        const refreshed = await tx.platformDue.findUnique({
          where: { rideId },
          select: { batchId: true }
        });

        if (!refreshed?.batchId) {
          await createDueBatchForDriverInternal(tx, ride.driverId!, undefined, {
            dueIds: [due.id],
            adminNote: "Auto-generated because the rider paid cash and the trip completed."
          });
        }
      });
    }

    return mapPlatformDue(due);
  },

  async listDriverDues(driverId) {
    await markOverduePlatformDuesInternal();

    const dues = await prisma.platformDue.findMany({
      where: { driverId },
      orderBy: [{ status: "asc" }, { dueAt: "asc" }],
      include: platformDueInclude
    });

    return dues.map(mapPlatformDue);
  },

  async listAllPlatformDues() {
    await markOverduePlatformDuesInternal();

    const dues = await prisma.platformDue.findMany({
      orderBy: [{ status: "asc" }, { dueAt: "asc" }],
      include: platformDueInclude
    });

    return dues.map(mapPlatformDue);
  },

  async updatePlatformDue(dueId, patch) {
    const due = await prisma.platformDue.update({
      where: { id: dueId },
      data: {
        status: toDbPlatformDueStatus(patch.status),
        paymentMethod: patch.paymentMethod ? toDbDuePaymentMethod(patch.paymentMethod) : null,
        note: patch.note ?? null,
        resolvedById: patch.resolvedById ?? null,
        paidAt: patch.status === "paid" ? new Date() : null
      },
      include: platformDueInclude
    });

    const hasOverdue = await prisma.platformDue.count({
      where: {
        driverId: due.driverId,
        status: "OVERDUE"
      }
    });

    if (hasOverdue === 0) {
      await prisma.driverProfile.updateMany({
        where: {
          userId: due.driverId
        },
        data: {
          available: false
        }
      });
    }

    return mapPlatformDue(due);
  },

  async getPlatformPayoutSettings() {
    const settings = await ensurePayoutSettingsRecord();
    return settings ? mapPlatformPayoutSettings(settings) : null;
  },

  async updatePlatformPayoutSettings(input) {
    const existing = await ensurePayoutSettingsRecord();
    const settings = existing
      ? await prisma.platformPayoutSettings.update({
          where: { id: existing.id },
          data: {
            cashAppHandle: input.cashAppHandle ?? undefined,
            zelleHandle: input.zelleHandle ?? undefined,
            jimHandle: input.jimHandle ?? undefined,
            cashInstructions: input.cashInstructions ?? undefined,
            otherInstructions: input.otherInstructions ?? undefined
          }
        })
      : await prisma.platformPayoutSettings.create({
          data: {
            cashAppHandle: input.cashAppHandle ?? null,
            zelleHandle: input.zelleHandle ?? null,
            jimHandle: input.jimHandle ?? null,
            cashInstructions: input.cashInstructions ?? null,
            otherInstructions: input.otherInstructions ?? null
          }
        });

    return mapPlatformPayoutSettings(settings);
  },

  async listAdminUsers() {
    const users = await prisma.user.findMany({
      where: {
        OR: [{ role: DbRole.ADMIN }, { roles: { has: DbRole.ADMIN } }]
      },
      orderBy: {
        name: "asc"
      },
      select: collectorSummarySelect
    });

    return users.map((user) => ({
      ...user,
      referralCode: user.referralCode ?? null
    }));
  },

  async getCollectorPayoutSettings(adminId) {
    const settings = await ensureCollectorPayoutSettingsRecord(adminId);
    return mapPlatformPayoutSettings(settings);
  },

  async updateCollectorPayoutSettings(adminId, input) {
    const settings = await prisma.platformPayoutSettings.upsert({
      where: { adminId },
      update: {
        cashAppHandle: input.cashAppHandle ?? undefined,
        zelleHandle: input.zelleHandle ?? undefined,
        jimHandle: input.jimHandle ?? undefined,
        cashInstructions: input.cashInstructions ?? undefined,
        otherInstructions: input.otherInstructions ?? undefined
      },
      create: {
        adminId,
        cashAppHandle: input.cashAppHandle ?? null,
        zelleHandle: input.zelleHandle ?? null,
        jimHandle: input.jimHandle ?? null,
        cashInstructions: input.cashInstructions ?? null,
        otherInstructions: input.otherInstructions ?? null
      }
    });

    return mapPlatformPayoutSettings(settings);
  },

  async listDriverDueBatches(driverId) {
    await markOverduePlatformDuesInternal();
    return listDriverDueBatchesInternal(prisma, driverId);
  },

  async listAllDueBatches() {
    await markOverduePlatformDuesInternal();

    const batches = await prisma.platformDueBatch.findMany({
      orderBy: [{ status: "asc" }, { generatedAt: "desc" }],
      include: platformDueBatchInclude
    });

    return batches.map(mapPlatformDueBatch);
  },

  async getDriverDueSnapshot(driverId) {
    await markOverduePlatformDuesInternal();
    return buildDriverDueSnapshotInternal(prisma, driverId);
  },

  async listDriverDueSnapshots() {
    await markOverduePlatformDuesInternal();

    const drivers = await prisma.user.findMany({
      where: {
        OR: [{ role: DbRole.DRIVER }, { roles: { has: DbRole.DRIVER } }]
      },
      orderBy: {
        name: "asc"
      },
      select: {
        id: true
      }
    });

    return Promise.all(drivers.map((driver) => buildDriverDueSnapshotInternal(prisma, driver.id)));
  },

  async createDueBatchForDriver(driverId, collectorAdminId, options) {
    await markOverduePlatformDuesInternal();
    return prisma.$transaction((tx) => createDueBatchForDriverInternal(tx, driverId, collectorAdminId, options));
  },

  async updateDueBatch(batchId, patch) {
    const batch = await prisma.platformDueBatch.findUnique({
      where: { id: batchId },
      include: platformDueBatchInclude
    });

    if (!batch) {
      throw new Error("Due batch not found");
    }

    const memoCapable: DuePaymentMethod[] = ["cashapp", "zelle", "jim"];
    if (patch.status === "paid") {
      if (patch.paymentMethod && memoCapable.includes(patch.paymentMethod) && !patch.observedTitle && !patch.observedNote) {
        throw new Error("Memo-capable payments require the dues code in the title, note, or both.");
      }

      if ((patch.paymentMethod === "cash" || patch.paymentMethod === "other") && !patch.adminNote?.trim()) {
        throw new Error("Cash and other payments require an admin note.");
      }
    }

    return prisma.$transaction(async (tx) => {
      const now = new Date();
      const nextStatus = toDbPlatformDueBatchStatus(patch.status);

      await tx.platformDueBatch.update({
        where: { id: batchId },
        data: {
          status: nextStatus,
          paymentMethod:
            patch.status === "open" || patch.status === "void"
              ? null
              : patch.paymentMethod
                ? toDbDuePaymentMethod(patch.paymentMethod)
                : null,
          observedTitle: patch.observedTitle ?? null,
          observedNote: patch.observedNote ?? null,
          adminNote: patch.adminNote ?? null,
          paidAt: patch.status === "paid" ? now : null,
          dueAt: patch.status === "open" ? new Date(now.getTime() + 48 * 60 * 60 * 1000) : undefined
        }
      });

      if (patch.status === "void") {
        await tx.platformDue.updateMany({
          where: { batchId },
          data: {
            batchId: null,
            status: "PENDING",
            paymentMethod: null,
            note: null,
            paidAt: null,
            resolvedById: null
          }
        });
      } else {
        await tx.platformDue.updateMany({
          where: { batchId },
          data: {
            status:
              patch.status === "paid"
                ? "PAID"
                : patch.status === "waived"
                  ? "WAIVED"
                  : patch.status === "open"
                    ? "PENDING"
                    : "OVERDUE",
            paymentMethod:
              patch.status === "paid" && patch.paymentMethod ? toDbDuePaymentMethod(patch.paymentMethod) : null,
            note: patch.adminNote ?? null,
            paidAt: patch.status === "paid" ? now : null,
            resolvedById: patch.status === "paid" || patch.status === "waived" ? patch.resolvedById ?? null : null
          }
        });
      }

      await releaseDriverBlockIfClear(tx, batch.driverId);

      const refreshed = await tx.platformDueBatch.findUniqueOrThrow({
        where: { id: batchId },
        include: platformDueBatchInclude
      });

      return mapPlatformDueBatch(refreshed);
    });
  },

  async reconcileDueBatch(input) {
    const match = `${input.referenceText} ${input.observedTitle ?? ""} ${input.observedNote ?? ""}`.match(/#DUES\d{6}/i);
    const referenceCode = match?.[0]?.toUpperCase();

    if (!referenceCode) {
      throw new Error("A valid dues reference like #DUES000001 is required.");
    }

    const batch = await prisma.platformDueBatch.findFirst({
      where: {
        referenceCode,
        status: {
          in: ["OPEN", "OVERDUE"]
        }
      },
      select: { id: true }
    });

    if (!batch) {
      throw new Error("Open dues batch not found for that reference.");
    }

    return store.updateDueBatch(batch.id, {
      status: "paid",
      paymentMethod: input.paymentMethod,
      observedTitle: input.observedTitle ?? null,
      observedNote: input.observedNote ?? null,
      adminNote: input.adminNote ?? null,
      resolvedById: input.resolvedById ?? null
    });
  },

  async markOverduePlatformDues(now) {
    return markOverduePlatformDuesInternal(now);
  },

  async driverHasOverdueDues(driverId) {
    await markOverduePlatformDuesInternal();

    const count = await prisma.platformDueBatch.count({
      where: {
        driverId,
        status: "OVERDUE"
      }
    });

    return count > 0;
  },

  async assignDriverCollector(driverId, collectorAdminId) {
    const updated = await prisma.$transaction(async (tx) => {
      await tx.driverProfile.update({
        where: { userId: driverId },
        data: {
          collectorAdminId
        }
      });

      await tx.platformDueBatch.updateMany({
        where: {
          driverId,
          status: {
            in: ["OPEN", "OVERDUE"]
          }
        },
        data: {
          collectorAdminId
        }
      });

      return tx.user.findUniqueOrThrow({
        where: { id: driverId },
        include: userInclude
      });
    });

    return mapDriverAccount(updated);
  },

  async createAdminInvite(inviterId, input, baseUrl) {
    const email = input.email.toLowerCase();
    const invite = await prisma.$transaction(async (tx) => {
      await tx.adminInvite.updateMany({
        where: {
          inviterId,
          email,
          acceptedAt: null,
          revokedAt: null,
          expiresAt: {
            gt: new Date()
          }
        },
        data: {
          revokedAt: new Date()
        }
      });

      return tx.adminInvite.create({
        data: {
          inviterId,
          email,
          token: createCommunityAccessToken(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        },
        include: {
          inviter: {
            select: collectorSummarySelect
          },
          acceptedBy: {
            select: collectorSummarySelect
          }
        }
      });
    });

    const now = new Date();
    return {
      id: invite.id,
      email: invite.email,
      token: invite.token,
      inviteUrl: `${baseUrl}/admin/invite/${invite.token}`,
      status: invite.revokedAt
        ? "revoked"
        : invite.acceptedAt
          ? "accepted"
          : invite.expiresAt < now
            ? "expired"
            : "pending",
      inviter: toCollectorSummary(invite.inviter)!,
      acceptedBy: toCollectorSummary(invite.acceptedBy),
      expiresAt: invite.expiresAt.toISOString(),
      acceptedAt: invite.acceptedAt?.toISOString() ?? null,
      revokedAt: invite.revokedAt?.toISOString() ?? null,
      createdAt: invite.createdAt.toISOString(),
      updatedAt: invite.updatedAt.toISOString()
    };
  },

  async listAdminInvites(inviterId, baseUrl = env.publicBaseUrl || env.clientOrigin) {
    const invites = await prisma.adminInvite.findMany({
      where: inviterId ? { inviterId } : undefined,
      orderBy: {
        createdAt: "desc"
      },
      include: {
        inviter: {
          select: collectorSummarySelect
        },
        acceptedBy: {
          select: collectorSummarySelect
        }
      }
    });

    const now = new Date();
    return invites.map((invite) => ({
      id: invite.id,
      email: invite.email,
      token: invite.token,
      inviteUrl: `${baseUrl}/admin/invite/${invite.token}`,
      status: invite.revokedAt
        ? "revoked"
        : invite.acceptedAt
          ? "accepted"
          : invite.expiresAt < now
            ? "expired"
            : "pending",
      inviter: toCollectorSummary(invite.inviter)!,
      acceptedBy: toCollectorSummary(invite.acceptedBy),
      expiresAt: invite.expiresAt.toISOString(),
      acceptedAt: invite.acceptedAt?.toISOString() ?? null,
      revokedAt: invite.revokedAt?.toISOString() ?? null,
      createdAt: invite.createdAt.toISOString(),
      updatedAt: invite.updatedAt.toISOString()
    }));
  },

  async listAdminTeamUsers() {
    const users = await prisma.user.findMany({
      where: {
        OR: [{ role: DbRole.ADMIN }, { roles: { has: DbRole.ADMIN } }]
      },
      orderBy: {
        name: "asc"
      },
      include: userInclude
    });

    const withCodes = await Promise.all(users.map((user) => ensureReferralCode(user)));
    return withCodes.map(mapSessionUser);
  },

  async revokeAdminInvite(inviteId, _adminId, baseUrl = env.publicBaseUrl || env.clientOrigin) {
    const existing = await prisma.adminInvite.findUnique({
      where: { id: inviteId },
      include: {
        inviter: {
          select: collectorSummarySelect
        },
        acceptedBy: {
          select: collectorSummarySelect
        }
      }
    });

    if (!existing) {
      throw new Error("Admin invite not found.");
    }

    if (existing.acceptedAt) {
      throw new Error("Accepted invites cannot be revoked.");
    }

    if (existing.revokedAt) {
      return {
        id: existing.id,
        email: existing.email,
        token: existing.token,
        inviteUrl: `${baseUrl}/admin/invite/${existing.token}`,
        status: "revoked",
        inviter: toCollectorSummary(existing.inviter)!,
        acceptedBy: toCollectorSummary(existing.acceptedBy),
        expiresAt: existing.expiresAt.toISOString(),
        acceptedAt: null,
        revokedAt: existing.revokedAt.toISOString(),
        createdAt: existing.createdAt.toISOString(),
        updatedAt: existing.updatedAt.toISOString()
      };
    }

    const invite = await prisma.adminInvite.update({
      where: { id: inviteId },
      data: {
        revokedAt: new Date()
      },
      include: {
        inviter: {
          select: collectorSummarySelect
        },
        acceptedBy: {
          select: collectorSummarySelect
        }
      }
    });

    return {
      id: invite.id,
      email: invite.email,
      token: invite.token,
      inviteUrl: `${baseUrl}/admin/invite/${invite.token}`,
      status: "revoked",
      inviter: toCollectorSummary(invite.inviter)!,
      acceptedBy: toCollectorSummary(invite.acceptedBy),
      expiresAt: invite.expiresAt.toISOString(),
      acceptedAt: invite.acceptedAt?.toISOString() ?? null,
      revokedAt: invite.revokedAt?.toISOString() ?? null,
      createdAt: invite.createdAt.toISOString(),
      updatedAt: invite.updatedAt.toISOString()
    };
  },

  async acceptAdminInvite(input) {
    const invite = await prisma.adminInvite.findUnique({
      where: { token: input.token }
    });

    if (!invite || invite.revokedAt || invite.acceptedAt || invite.expiresAt < new Date()) {
      throw new Error("Admin invite is not available.");
    }

    if (invite.email.toLowerCase() !== input.email.toLowerCase()) {
      throw new Error("Invite email does not match.");
    }

    const existing = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
      include: userInclude
    });

    if (existing && hasDbRole(existing, DbRole.ADMIN)) {
      throw new Error("A user with that email already has admin access.");
    }

    const created = await prisma.$transaction(async (tx) => {
      const user = existing
        ? await tx.user.update({
            where: { id: existing.id },
            data: {
              role: DbRole.ADMIN,
              roles: {
                set: Array.from(new Set([...(existing.roles ?? []), existing.role, DbRole.ADMIN, DbRole.DRIVER, DbRole.RIDER]))
              },
              name: input.name,
              email: input.email.toLowerCase(),
              passwordHash: input.passwordHash,
              riderProfile: {
                upsert: {
                  update: {},
                  create: {}
                }
              }
            },
            include: userInclude
          })
        : await tx.user.create({
            data: {
              role: DbRole.ADMIN,
              roles: [DbRole.ADMIN, DbRole.DRIVER, DbRole.RIDER],
              name: input.name,
              email: input.email.toLowerCase(),
              passwordHash: input.passwordHash,
              riderProfile: {
                create: {}
              }
            },
            include: userInclude
          });

      await ensureTrustedOperatorDriverProfile(tx, user.id, user.id, invite.token);
      await ensureCollectorPayoutSettingsRecord(user.id, tx);
      await ensureDriverRateCards(tx, user.id);
      await tx.adminInvite.update({
        where: { id: invite.id },
        data: {
          acceptedById: user.id,
          acceptedAt: new Date()
        }
      });

      return tx.user.findUniqueOrThrow({
        where: { id: user.id },
        include: userInclude
      });
    });

    return asAuthIdentity(await ensureCommunityAccessToken(await ensureReferralCode(created)));
  },

  async recordLocation(input) {
    await prisma.$transaction([
      prisma.locationPing.create({
        data: {
          rideId: input.rideId,
          driverId: input.driverId,
          lat: input.lat,
          lng: input.lng,
          heading: input.heading,
          speed: input.speed
        }
      }),
      prisma.driverProfile.update({
        where: { userId: input.driverId },
        data: {
          currentLat: input.lat,
          currentLng: input.lng,
          lastLocationAt: new Date(),
          available: input.available
        }
      })
    ]);

    return getRideOrThrow(input.rideId);
  },

  async recordIdleLocation(driverId, input) {
    const updated = await prisma.user.update({
      where: { id: driverId },
      data: {
        driverProfile: {
          update: {
            currentLat: input.lat,
            currentLng: input.lng,
            lastLocationAt: new Date(),
            available: input.available
          }
        }
      },
      include: userInclude
    });

    return mapSessionUser(await ensureCommunityAccessToken(await ensureReferralCode(updated)));
  },

  async createRiderLead(input) {
    const lead = await prisma.riderLead.create({
      data: {
        userId: input.userId ?? null,
        name: input.name,
        email: input.email.toLowerCase(),
        phone: input.phone ?? null,
        referredByUserId: input.referredByUserId ?? null,
        referredByCode: input.referredByCode ?? null
      }
    });

    return mapRiderLead(lead);
  },

  async listRiderLeads() {
    const leads = await prisma.riderLead.findMany({
      orderBy: { createdAt: "desc" }
    });

    return leads.map(mapRiderLead);
  },

  async createDriverInterest(input) {
    const interest = await prisma.driverInterest.create({
      data: {
        name: input.name,
        email: input.email.toLowerCase(),
        phone: input.phone,
        serviceArea: input.serviceArea,
        vehicleInfo: input.vehicleInfo,
        availabilityNotes: input.availabilityNotes ?? null
      }
    });

    return mapDriverInterest(interest);
  },

  async listDriverInterests() {
    const interests = await prisma.driverInterest.findMany({
      orderBy: { createdAt: "desc" }
    });

    return interests.map(mapDriverInterest);
  },

  async createAdSubmission(input: CreateAdSubmissionInput) {
    const pricing = await ensureAdPricingSettingsRecord();
    const slotRank = input.slotRank ?? 2;
    const priceSnapshot = calculateAdPricing({
      baseDailyPrice: pricing.baseDailyPrice,
      requestedDays: input.requestedDays,
      slotRank,
      slotMultipliers: normalizeAdSlotMultipliers(pricing.slotMultipliers)
    });

    const submission = await prisma.adSubmission.create({
      data: {
        businessName: input.businessName.trim(),
        contactName: input.contactName.trim(),
        email: input.email.trim().toLowerCase(),
        phone: input.phone?.trim() || null,
        headline: input.headline.trim(),
        body: input.body.trim(),
        callToAction: input.callToAction?.trim() || null,
        targetUrl: input.targetUrl,
        imageFileName: input.image.fileName,
        imageMimeType: input.image.mimeType,
        imageDataUrl: `data:${input.image.mimeType};base64,${input.image.contentBase64}`,
        requestedDays: input.requestedDays,
        dailyPrice: priceSnapshot.dailyPrice,
        totalPrice: priceSnapshot.totalPrice,
        slotRank,
        driverCreditPerScan: pricing.defaultDriverCreditPerScan,
        redirectToken: createPublicTrackingToken()
      },
      include: adSubmissionInclude
    });

    return mapAdSubmissionRecord(submission);
  },

  async listAdminAds(): Promise<AdminAdsResponse> {
    const [submissions, drivers, pricingSettings] = await Promise.all([
      prisma.adSubmission.findMany({
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
        include: adSubmissionInclude
      }),
      prisma.user.findMany({
        where: {
          OR: [{ role: DbRole.DRIVER }, { roles: { has: DbRole.DRIVER } }]
        },
        orderBy: { name: "asc" },
        select: {
          ...adDriverSelect,
          driverAdProgram: {
            select: {
              optedIn: true
            }
          },
          adScans: {
            select: {
              id: true
            }
          },
          adCredits: {
            select: {
              amount: true,
              status: true
            }
          },
          assignedAds: {
            where: {
              status: DbAdSubmissionStatus.PUBLISHED,
              OR: [{ endsAt: null }, { endsAt: { gte: new Date() } }]
            },
            select: {
              id: true
            }
          }
        }
      }),
      ensureAdPricingSettingsRecord()
    ]);

    const driverCredits: AdminDriverAdCreditSummary[] = drivers
      .map((driver) => {
        const summary = summarizeDriverAdCredits({
          scans: driver.adScans,
          credits: driver.adCredits,
          activeAdCount: driver.assignedAds.length
        });

        return {
          driver: toAdDriverSummary(driver)!,
          optedIn: driver.driverAdProgram?.optedIn ?? false,
          scanCount: summary.scanCount,
          pendingTotal: summary.pendingTotal,
          appliedTotal: summary.appliedTotal,
          activeAdCount: summary.activeAdCount
        };
      })
      .filter((summary) => summary.optedIn || summary.scanCount > 0 || summary.activeAdCount > 0 || summary.pendingTotal > 0 || summary.appliedTotal > 0);

    return {
      submissions: submissions.map(mapAdSubmissionRecord),
      driverCredits,
      pricingSettings: mapAdPricingSettingsRecord(pricingSettings)
    };
  },

  async getAdPricingSettings() {
    return mapAdPricingSettingsRecord(await ensureAdPricingSettingsRecord());
  },

  async updateAdPricingSettings(input: UpdateAdPricingSettingsInput) {
    const existing = await ensureAdPricingSettingsRecord();
    const mergedSlotMultipliers = input.slotMultipliers
      ? normalizeAdSlotMultipliers(input.slotMultipliers as unknown as Prisma.JsonValue)
      : normalizeAdSlotMultipliers(existing.slotMultipliers);
    const updated = await prisma.adPricingSettings.update({
      where: { id: existing.id },
      data: {
        baseDailyPrice: input.baseDailyPrice ?? undefined,
        defaultDriverCreditPerScan: input.defaultDriverCreditPerScan ?? undefined,
        slotMultipliers: input.slotMultipliers ? (mergedSlotMultipliers as unknown as Prisma.InputJsonValue) : undefined,
        dedupeWindowMinutes: input.dedupeWindowMinutes ?? undefined
      }
    });

    return mapAdPricingSettingsRecord(updated);
  },

  async updateAdSubmission(submissionId: string, input: AdminUpdateAdSubmissionInput) {
    const [current, pricingSettings] = await Promise.all([
      prisma.adSubmission.findUnique({
      where: { id: submissionId }
      }),
      ensureAdPricingSettingsRecord()
    ]);

    if (!current) {
      throw new Error("Ad submission not found");
    }

    const nextStatus = input.status ? toDbAdSubmissionStatus(input.status) : current.status;
    const assignedDriverId = input.assignedDriverId === undefined ? current.assignedDriverId : input.assignedDriverId;

    if (nextStatus === DbAdSubmissionStatus.PUBLISHED) {
      if (!assignedDriverId) {
        throw new Error("Assign a driver before publishing this ad.");
      }

      if (!current.paymentConfirmedAt && current.status !== DbAdSubmissionStatus.PAID && input.status !== "paid") {
        throw new Error("Confirm payment before publishing this ad.");
      }
    }

    const now = new Date();
    const startsAt = input.startsAt === undefined ? current.startsAt : input.startsAt ? new Date(input.startsAt) : null;
    const endsAt = input.endsAt === undefined ? current.endsAt : input.endsAt ? new Date(input.endsAt) : null;
    const nextSlotRank = input.slotRank ?? current.slotRank;
    const priceSnapshot = calculateAdPricing({
      baseDailyPrice: pricingSettings.baseDailyPrice,
      requestedDays: current.requestedDays,
      slotRank: nextSlotRank,
      slotMultipliers: normalizeAdSlotMultipliers(pricingSettings.slotMultipliers)
    });
    const submission = await prisma.adSubmission.update({
      where: { id: submissionId },
      data: {
        status: nextStatus,
        assignedDriverId,
        paymentNote: input.paymentNote === undefined ? current.paymentNote : input.paymentNote,
        adminNote: input.adminNote === undefined ? current.adminNote : input.adminNote,
        displaySeconds: input.displaySeconds ?? current.displaySeconds,
        slotRank: nextSlotRank,
        dailyPrice: input.slotRank !== undefined ? priceSnapshot.dailyPrice : current.dailyPrice,
        totalPrice: input.slotRank !== undefined ? priceSnapshot.totalPrice : current.totalPrice,
        driverCreditPerScan: input.driverCreditPerScan ?? current.driverCreditPerScan,
        startsAt:
          nextStatus === DbAdSubmissionStatus.PUBLISHED
            ? startsAt ?? current.startsAt ?? now
            : startsAt,
        endsAt:
          nextStatus === DbAdSubmissionStatus.PUBLISHED
            ? endsAt ?? current.endsAt ?? new Date((startsAt ?? current.startsAt ?? now).getTime() + current.requestedDays * 24 * 60 * 60 * 1000)
            : endsAt,
        approvedAt:
          nextStatus === DbAdSubmissionStatus.APPROVED && !current.approvedAt
            ? now
            : current.approvedAt,
        paymentConfirmedAt:
          nextStatus === DbAdSubmissionStatus.PAID && !current.paymentConfirmedAt
            ? now
            : current.paymentConfirmedAt,
        publishedAt:
          nextStatus === DbAdSubmissionStatus.PUBLISHED && !current.publishedAt
            ? now
            : nextStatus === DbAdSubmissionStatus.EXPIRED
              ? current.publishedAt
              : current.publishedAt
      },
      include: adSubmissionInclude
    });

    return mapAdSubmissionRecord(submission);
  },

  async getDriverAdProgram(driverId: string): Promise<DriverAdProgramResponse> {
    const [enrollment, activeAds, scans, credits] = await Promise.all([
      prisma.driverAdProgramEnrollment.upsert({
        where: { driverId },
        update: {},
        create: { driverId, optedIn: false }
      }),
      prisma.adSubmission.findMany({
        where: {
          assignedDriverId: driverId,
          status: DbAdSubmissionStatus.PUBLISHED,
          AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: new Date() } }] }, { OR: [{ endsAt: null }, { endsAt: { gte: new Date() } }] }]
        },
        orderBy: [{ slotRank: "asc" }, { publishedAt: "desc" }],
        select: {
          id: true,
          businessName: true,
          headline: true,
          slotRank: true,
          displaySeconds: true,
          status: true,
          startsAt: true,
          endsAt: true,
          publishedAt: true
        }
      }),
      prisma.adScanEvent.findMany({
        where: { driverId },
        select: { id: true }
      }),
      prisma.driverAdCredit.findMany({
        where: { driverId },
        select: {
          amount: true,
          status: true
        }
      })
    ]);

    return {
      enrollment: {
        driverId: enrollment.driverId,
        optedIn: enrollment.optedIn,
        createdAt: enrollment.createdAt.toISOString(),
        updatedAt: enrollment.updatedAt.toISOString()
      },
      summary: summarizeDriverAdCredits({
        scans,
        credits,
        activeAdCount: activeAds.length
      }),
      activeAds: activeAds.map((ad) => ({
        id: ad.id,
        businessName: ad.businessName,
        headline: ad.headline,
        slotRank: ad.slotRank,
        displaySeconds: ad.displaySeconds,
        status: fromDbAdSubmissionStatus(ad.status),
        startsAt: toIso(ad.startsAt),
        endsAt: toIso(ad.endsAt),
        publishedAt: toIso(ad.publishedAt)
      }))
    };
  },

  async updateDriverAdProgram(driverId: string, optedIn: boolean) {
    await prisma.driverAdProgramEnrollment.upsert({
      where: { driverId },
      update: { optedIn },
      create: { driverId, optedIn }
    });

    return this.getDriverAdProgram(driverId);
  },

  async getPublicAdDisplay(referralCode: string, baseUrl: string): Promise<PublicAdDisplayResponse> {
    const driver = await prisma.user.findFirst({
      where: {
        referralCode,
        OR: [{ role: DbRole.DRIVER }, { roles: { has: DbRole.DRIVER } }]
      },
      select: {
        id: true,
        name: true,
        referralCode: true,
        driverAdProgram: {
          select: {
            optedIn: true
          }
        }
      }
    });

    if (!driver?.referralCode) {
      throw new Error("Driver ad display not found");
    }

    const items = driver.driverAdProgram?.optedIn
      ? await prisma.adSubmission.findMany({
          where: {
            assignedDriverId: driver.id,
            status: DbAdSubmissionStatus.PUBLISHED,
            AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: new Date() } }] }, { OR: [{ endsAt: null }, { endsAt: { gte: new Date() } }] }]
          },
          orderBy: [{ slotRank: "asc" }, { publishedAt: "desc" }]
        })
      : [];

    return {
      driverName: driver.name,
      referralCode: driver.referralCode,
      optedIn: driver.driverAdProgram?.optedIn ?? false,
      items: items.map((item) => ({
        id: item.id,
        businessName: item.businessName,
        headline: item.headline,
        body: item.body,
        callToAction: item.callToAction,
        targetUrl: item.targetUrl,
        qrUrl: `${baseUrl.replace(/\/$/, "")}/ads/visit/${item.redirectToken}`,
        imageDataUrl: item.imageDataUrl,
        displaySeconds: item.displaySeconds,
        slotRank: item.slotRank
      }))
    };
  },

  async resolveAdVisit(redirectToken: string, metadata): Promise<AdVisitResolveResponse> {
    const [submission, pricingSettings] = await Promise.all([
      prisma.adSubmission.findFirst({
        where: {
          redirectToken,
          status: DbAdSubmissionStatus.PUBLISHED,
          AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: new Date() } }] }, { OR: [{ endsAt: null }, { endsAt: { gte: new Date() } }] }]
        }
      }),
      ensureAdPricingSettingsRecord()
    ]);

    if (!submission || !submission.assignedDriverId) {
      throw new Error("Ad destination not found");
    }

    const fingerprint = buildAdScanFingerprint({
      ipAddress: metadata?.ipAddress ?? null,
      userAgent: metadata?.userAgent ?? null,
      redirectToken
    });
    const dedupeSince = new Date(Date.now() - pricingSettings.dedupeWindowMinutes * 60 * 1000);

    await prisma.$transaction(async (tx) => {
      const duplicateRecent = await tx.adScanEvent.findFirst({
        where: {
          submissionId: submission.id,
          fingerprint,
          creditEligible: true,
          createdAt: { gte: dedupeSince }
        },
        select: { id: true }
      });

      const creditEligible = !duplicateRecent;
      const scan = await tx.adScanEvent.create({
        data: {
          submissionId: submission.id,
          driverId: submission.assignedDriverId!,
          redirectToken,
          ipAddress: metadata?.ipAddress ?? null,
          fingerprint,
          creditEligible,
          blockedReason: creditEligible ? null : "duplicate_window",
          referrer: metadata?.referrer ?? null,
          userAgent: metadata?.userAgent ?? null
        }
      });

      const enrollment = await tx.driverAdProgramEnrollment.findUnique({
        where: { driverId: submission.assignedDriverId! }
      });

      if (creditEligible && enrollment?.optedIn && Number(submission.driverCreditPerScan) > 0) {
        await tx.driverAdCredit.create({
          data: {
            driverId: submission.assignedDriverId!,
            submissionId: submission.id,
            scanEventId: scan.id,
            amount: submission.driverCreditPerScan
          }
        });
      }
    });

    return {
      destinationUrl: submission.targetUrl,
      businessName: submission.businessName,
      headline: submission.headline
    };
  },

  async applyDriverAdCredits(driverId: string, input: ApplyDriverAdCreditsInput) {
    if (!input.platformDueBatchId) {
      throw new Error("Select an open due batch before applying ad credits.");
    }

    await prisma.$transaction(async (tx) => {
      const batch = await tx.platformDueBatch.findFirst({
        where: {
          driverId,
          ...(input.platformDueBatchId ? { id: input.platformDueBatchId } : {}),
          status: {
            in: [DbPlatformDueBatchStatus.OPEN, DbPlatformDueBatchStatus.OVERDUE]
          }
        },
        include: {
          adCredits: {
            where: { status: DbDriverAdCreditStatus.APPLIED },
            select: { amount: true }
          }
        }
      });

      if (!batch) {
        throw new Error("Open due batch not found for this driver.");
      }

      const alreadyAppliedTotal = batch.adCredits.reduce((sum: number, credit: { amount: Prisma.Decimal | number }) => sum + Number(credit.amount), 0);
      let remainingCapacity = toFixedMoney(Number(batch.amount) - alreadyAppliedTotal);

      if (remainingCapacity <= 0) {
        throw new Error("This due batch already has enough applied ad credit.");
      }

      const pendingCredits = await tx.driverAdCredit.findMany({
        where: {
          driverId,
          status: DbDriverAdCreditStatus.PENDING
        },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: {
          id: true,
          amount: true
        }
      });

      const appliedIds: string[] = [];
      for (const credit of pendingCredits) {
        const amount = Number(credit.amount);
        if (amount <= remainingCapacity + 0.0001) {
          appliedIds.push(credit.id);
          remainingCapacity = toFixedMoney(remainingCapacity - amount);
        }
      }

      if (!appliedIds.length) {
        throw new Error("No pending ad credits fit within the remaining due balance for that batch.");
      }

      await tx.driverAdCredit.updateMany({
        where: {
          id: { in: appliedIds }
        },
        data: {
          status: DbDriverAdCreditStatus.APPLIED,
          note: input.note ?? null,
          appliedPlatformDueId: input.appliedPlatformDueId ?? null,
          appliedPlatformDueBatchId: input.platformDueBatchId,
          appliedAt: new Date()
        }
      });
    });

    return this.getDriverAdProgram(driverId);
  },

  async listAdminRides() {
    const rides = await prisma.ride.findMany({
      orderBy: { createdAt: "desc" },
      include: rideInclude
    });

    return rides.map(mapRide);
  },

  async listDrivers() {
    await markOverduePlatformDuesInternal();

    const drivers = await prisma.user.findMany({
      where: {
        OR: [{ role: DbRole.DRIVER }, { roles: { has: DbRole.DRIVER } }]
      },
      orderBy: { createdAt: "asc" },
      include: userInclude
    });

    await Promise.all(drivers.map((driver) => ensureDriverRateCards(prisma, driver.id)));
    const refreshed = await prisma.user.findMany({
      where: {
        OR: [{ role: DbRole.DRIVER }, { roles: { has: DbRole.DRIVER } }]
      },
      orderBy: { createdAt: "asc" },
      include: userInclude
    });

    return refreshed
      .filter((driver) => Boolean(driver.driverProfile))
      .map((driver) => mapDriverAccount(driver as UserWithDriver));
  },

  async listDriverApplications() {
    const drivers = await this.listDrivers();
    return drivers.filter((driver) => driver.approvalStatus === "pending");
  },

  async reviewDriverDocument(driverId, documentId, input) {
    await getDriverUserOrThrow(driverId);
    await getDriverDocumentOrThrow(prisma, driverId, documentId);

    const status = toDbDriverDocumentStatus(input.status);
    const updated = await prisma.driverOnboardingDocument.update({
      where: { id: documentId },
      data: {
        status,
        reviewNote: input.reviewNote ?? null,
        reviewedAt: input.status === "pending" ? null : new Date(),
        reviewedById: input.status === "pending" ? null : input.reviewedById
      }
    });

    if (!(await driverDocumentsReadyForApproval(prisma, driverId))) {
      await prisma.driverProfile.updateMany({
        where: {
          userId: driverId,
          approvalStatus: "APPROVED"
        },
        data: {
          approved: false,
          approvalStatus: "PENDING",
          available: false
        }
      });
    }

    return mapDriverOnboardingDocument(updated);
  },

  async getDriverDocumentFile(driverId, documentId) {
    await getDriverUserOrThrow(driverId);
    const document = await getDriverDocumentOrThrow(prisma, driverId, documentId);

    return {
      absolutePath: resolveStoredDriverDocumentPath(document.storagePath),
      fileName: document.fileName,
      mimeType: document.mimeType
    };
  },

  async updateDriver(driverId, patch) {
    await getDriverUserOrThrow(driverId);

    if (patch.approvalStatus === "approved" && !(await driverDocumentsReadyForApproval(prisma, driverId))) {
      throw new Error("Driver cannot be approved until insurance, registration, background check, and MVR documents are uploaded and approved");
    }

    const updated = await prisma.user.update({
      where: { id: driverId },
      data: {
        name: patch.name,
        driverProfile: {
          update: {
            available: patch.available,
            approvalStatus: patch.approvalStatus ? toDbDriverApprovalStatus(patch.approvalStatus) : undefined,
            approved:
              patch.approvalStatus === undefined
                ? undefined
                : patch.approvalStatus === "approved",
            homeState: patch.homeState?.toUpperCase() ?? patch.homeState,
            homeCity: patch.homeCity,
            pricingMode: patch.pricingMode ? toDbDriverPricingMode(patch.pricingMode) : undefined,
            localDispatchEnabled: patch.dispatchSettings?.localEnabled,
            localRadiusMiles: patch.dispatchSettings?.localRadiusMiles,
            serviceAreaDispatchEnabled: patch.dispatchSettings?.serviceAreaEnabled,
            serviceAreaStates: patch.dispatchSettings
              ? normalizeStateList(patch.dispatchSettings.serviceAreaStates)
              : undefined,
            nationwideDispatchEnabled: patch.dispatchSettings?.nationwideEnabled
          }
        }
      },
      include: userInclude
    });

    if (!updated.driverProfile) {
      throw new Error("Driver profile missing");
    }

    if (patch.approvalStatus && patch.approvalStatus !== "approved" && updated.driverProfile.available) {
      await prisma.driverProfile.update({
        where: { userId: driverId },
        data: { available: false }
      });
    }

    const refreshed = await prisma.user.findUniqueOrThrow({
      where: { id: driverId },
      include: userInclude
    });

    await ensureDriverRateCards(prisma, driverId);

    return mapDriverAccount(await ensureCommunityAccessToken(await ensureReferralCode(refreshed)));
  },

  async setDriverAvailability(driverId, available) {
    if (available && (await this.driverHasOverdueDues(driverId))) {
      throw new Error("Driver has overdue platform dues and cannot go available");
    }

    await prisma.driverProfile.update({
      where: { userId: driverId },
      data: { available }
    });

    const user = await prisma.user.findUnique({
      where: { id: driverId },
      include: userInclude
    });

    if (!user) {
      throw new Error("Driver not found");
    }

    return mapSessionUser(await ensureCommunityAccessToken(await ensureReferralCode(user)));
  },

  async findDueScheduledRides(releaseBefore) {
    const rides = await prisma.ride.findMany({
      where: {
        status: "SCHEDULED",
        scheduledFor: {
          lte: releaseBefore
        }
      },
      include: rideInclude
    });

    return rides.map(mapRide);
  },

  async getCommunityEligibility(user) {
    if (user.roles.includes("admin") || (user.roles.includes("driver") && user.approvalStatus === "approved")) {
      return {
        canRead: true,
        canCreateProposal: true,
        canVote: true,
        canComment: true,
        completedRideCount: user.roles.includes("rider")
          ? await prisma.ride.count({
              where: {
                riderId: user.id,
                status: "COMPLETED"
              }
            })
          : 0,
        threshold: COMMUNITY_COMPLETED_RIDE_THRESHOLD,
        reason: null
      } satisfies CommunityEligibility;
    }

    const completedRideCount = await prisma.ride.count({
      where: {
        riderId: user.id,
        status: "COMPLETED"
      }
    });
    const unlocked = completedRideCount >= COMMUNITY_COMPLETED_RIDE_THRESHOLD;

    return {
      canRead: true,
      canCreateProposal: unlocked,
      canVote: unlocked,
      canComment: unlocked,
      completedRideCount,
      threshold: COMMUNITY_COMPLETED_RIDE_THRESHOLD,
      reason: unlocked
        ? null
        : `Community voting unlocks after ${COMMUNITY_COMPLETED_RIDE_THRESHOLD} completed rides.`
    } satisfies CommunityEligibility;
  },

  async listCommunityProposals(viewerId) {
    const proposals = await prisma.communityProposal.findMany({
      where: {
        hidden: false
      },
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
      include: {
        author: true,
        votes: true,
        comments: true
      }
    });

    return proposals.map((proposal) => mapCommunityProposal(proposal, viewerId));
  },

  async createCommunityProposal(authorId, input) {
    const proposal = await prisma.communityProposal.create({
      data: {
        authorId,
        title: input.title.trim(),
        body: input.body.trim()
      },
      include: {
        author: true,
        votes: true,
        comments: true
      }
    });

    return mapCommunityProposal(proposal, authorId);
  },

  async getCommunityProposalById(proposalId, viewerId) {
    const proposal = await prisma.communityProposal.findUnique({
      where: { id: proposalId },
      include: {
        author: true,
        votes: true,
        comments: true
      }
    });

    if (!proposal || proposal.hidden) {
      return null;
    }

    return mapCommunityProposal(proposal, viewerId);
  },

  async voteOnCommunityProposal(proposalId, userId, choice) {
    await prisma.communityVote.upsert({
      where: {
        proposalId_userId: {
          proposalId,
          userId
        }
      },
      update: {
        choice: toDbCommunityVoteChoice(choice)
      },
      create: {
        proposalId,
        userId,
        choice: toDbCommunityVoteChoice(choice)
      }
    });

    const proposal = await prisma.communityProposal.findUniqueOrThrow({
      where: { id: proposalId },
      include: {
        author: true,
        votes: true,
        comments: true
      }
    });

    return mapCommunityProposal(proposal, userId);
  },

  async listCommunityComments(proposalId) {
    const comments = await prisma.communityComment.findMany({
      where: {
        proposalId,
        hidden: false
      },
      orderBy: { createdAt: "asc" },
      include: {
        author: true
      }
    });

    return comments.map(mapCommunityComment);
  },

  async createCommunityComment(proposalId, authorId, input) {
    const comment = await prisma.communityComment.create({
      data: {
        proposalId,
        authorId,
        body: input.body.trim()
      },
      include: {
        author: true
      }
    });

    return mapCommunityComment(comment);
  },

  async updateCommunityProposal(proposalId, patch) {
    const proposal = await prisma.communityProposal.update({
      where: { id: proposalId },
      data: {
        pinned: patch.pinned,
        closed: patch.closed,
        hidden: patch.hidden
      },
      include: {
        author: true,
        votes: true,
        comments: true
      }
    });

    return mapCommunityProposal(proposal, null);
  },

  async updateCommunityComment(commentId, patch) {
    const comment = await prisma.communityComment.update({
      where: { id: commentId },
      data: {
        hidden: patch.hidden
      },
      include: {
        author: true
      }
    });

    return mapCommunityComment(comment);
  },

  async getNotificationPreference(userId): Promise<NotificationPreference> {
    const preference = await prisma.notificationPreference.upsert({
      where: { userId },
      update: {},
      create: {
        userId,
        pushEnabled: true,
        smsCriticalOnly: true
      }
    });

    return {
      pushEnabled: preference.pushEnabled,
      smsCriticalOnly: preference.smsCriticalOnly
    };
  },

  async updateNotificationPreference(userId, input: UpdateNotificationPreferenceInput): Promise<NotificationPreference> {
    const preference = await prisma.notificationPreference.upsert({
      where: { userId },
      update: {
        pushEnabled: input.pushEnabled,
        smsCriticalOnly: input.smsCriticalOnly
      },
      create: {
        userId,
        pushEnabled: input.pushEnabled ?? true,
        smsCriticalOnly: input.smsCriticalOnly ?? true
      }
    });

    return {
      pushEnabled: preference.pushEnabled,
      smsCriticalOnly: preference.smsCriticalOnly
    };
  },

  async upsertPushSubscription(userId, input: UpsertPushSubscriptionInput) {
    await prisma.pushSubscription.upsert({
      where: {
        endpoint: input.endpoint
      },
      update: {
        userId,
        p256dh: input.keys.p256dh,
        auth: input.keys.auth,
        userAgent: input.userAgent ?? null,
        enabled: true
      },
      create: {
        userId,
        endpoint: input.endpoint,
        p256dh: input.keys.p256dh,
        auth: input.keys.auth,
        userAgent: input.userAgent ?? null,
        enabled: true
      }
    });
  },

  async removePushSubscription(userId, endpoint) {
    await prisma.pushSubscription.deleteMany({
      where: {
        userId,
        endpoint
      }
    });
  },

  async listPushSubscriptions(userId) {
    const subscriptions = await prisma.pushSubscription.findMany({
      where: {
        userId,
        enabled: true
      },
      orderBy: {
        updatedAt: "desc"
      }
    });

    return subscriptions.map((subscription) => ({
      id: subscription.id,
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh,
        auth: subscription.auth
      },
      userAgent: subscription.userAgent,
      enabled: subscription.enabled,
      createdAt: subscription.createdAt.toISOString(),
      updatedAt: subscription.updatedAt.toISOString()
    }));
  },

  async listNotificationDeliveryLogs(userId, limit = 50): Promise<NotificationDeliveryLog[]> {
    const rows = await prisma.notificationDeliveryLog.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: Math.min(Math.max(limit, 1), 200)
    });

    return rows.map((row) => {
      const metadata =
        row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
          ? (row.metadata as Record<string, string | number | boolean | null>)
          : null;

      return {
        id: row.id,
        rideId: row.rideId,
        channel: row.channel === "sms" ? "sms" : "push",
        eventKey: row.eventKey,
        status: row.status === "failed" ? "failed" : row.status === "skipped" ? "skipped" : "sent",
        errorCode: row.errorCode,
        errorText: row.errorText,
        metadata,
        createdAt: row.createdAt.toISOString()
      };
    });
  },

  async logNotificationDelivery(input) {
    await prisma.notificationDeliveryLog.create({
      data: {
        userId: input.userId,
        rideId: input.rideId ?? null,
        channel: input.channel,
        eventKey: input.eventKey,
        status: input.status,
        errorCode: input.errorCode ?? null,
        errorText: input.errorText ?? null,
        metadata: input.metadata ? (input.metadata as Prisma.InputJsonValue) : undefined
      }
    });
  },

  async addAuditLog(input) {
    await prisma.auditLog.create({
      data: {
        actorId: input.actorId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        metadata: input.metadata as Prisma.InputJsonValue | undefined
      }
    });
  },

  async trackSiteHeartbeat(input) {
    const seenAt = input.seenAt ?? new Date();

    await prisma.siteVisit.upsert({
      where: {
        sessionId: input.sessionId
      },
      update: {
        userId: input.userId ?? undefined,
        lastSeenAt: seenAt,
        lastPath: input.path ?? null,
        referrer: input.referrer ?? null,
        userAgent: input.userAgent ?? null,
        heartbeatCount: {
          increment: 1
        }
      },
      create: {
        sessionId: input.sessionId,
        userId: input.userId ?? null,
        firstSeenAt: seenAt,
        lastSeenAt: seenAt,
        lastPath: input.path ?? null,
        referrer: input.referrer ?? null,
        userAgent: input.userAgent ?? null,
        heartbeatCount: 1
      }
    });
  },

  async getAdminActivityOverview(windowMinutes) {
    const now = new Date();
    const activeSince = new Date(now.getTime() - windowMinutes * 60 * 1000);
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [activeVisitors, visitors24h, visitRows, recentVisitors] = await Promise.all([
      prisma.siteVisit.count({
        where: {
          lastSeenAt: {
            gte: activeSince
          }
        }
      }),
      prisma.siteVisit.count({
        where: {
          firstSeenAt: {
            gte: dayAgo
          }
        }
      }),
      prisma.siteVisit.findMany({
        where: {
          lastSeenAt: {
            gte: dayAgo
          }
        },
        select: {
          heartbeatCount: true,
          lastPath: true
        }
      }),
      prisma.siteVisit.findMany({
        where: {
          lastSeenAt: {
            gte: dayAgo
          }
        },
        orderBy: {
          lastSeenAt: "desc"
        },
        take: 20,
        select: {
          sessionId: true,
          userId: true,
          firstSeenAt: true,
          lastSeenAt: true,
          lastPath: true,
          referrer: true,
          heartbeatCount: true
        }
      })
    ]);

    const heartbeats24h = visitRows.reduce((sum, row) => sum + row.heartbeatCount, 0);
    const pathCount = new Map<string, number>();

    for (const row of visitRows) {
      if (!row.lastPath) {
        continue;
      }

      pathCount.set(row.lastPath, (pathCount.get(row.lastPath) ?? 0) + row.heartbeatCount);
    }

    const topPaths = Array.from(pathCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([path, hits]) => ({ path, hits }));

    return {
      windowMinutes,
      activeVisitors,
      visitors24h,
      heartbeats24h,
      topPaths,
      recentVisitors: recentVisitors.map((visit) => ({
        sessionId: visit.sessionId,
        userId: visit.userId,
        firstSeenAt: visit.firstSeenAt.toISOString(),
        lastSeenAt: visit.lastSeenAt.toISOString(),
        lastPath: visit.lastPath,
        referrer: visit.referrer,
        heartbeatCount: visit.heartbeatCount
      }))
    };
  },

  async createIssueReport(input) {
    const report = await prisma.issueReport.create({
      data: {
        reporterId: input.reporterId,
        reporterRole: input.reporterRole.toUpperCase() as DbRole,
        source: input.source,
        summary: input.summary,
        details: input.details ?? null,
        page: input.page ?? null,
        rideId: input.rideId ?? null,
        metadata: input.metadata ? (input.metadata as Prisma.InputJsonValue) : undefined
      }
    });

    return mapIssueReport(report);
  },

  async updateIssueReportGitHubSync(reportId, patch) {
    const report = await prisma.issueReport.update({
      where: { id: reportId },
      data: {
        githubSyncStatus: patch.status,
        githubIssueNumber: patch.githubIssueNumber ?? null,
        githubIssueUrl: patch.githubIssueUrl ?? null,
        githubSyncError: patch.error ?? null,
        githubSyncedAt: patch.status === "synced" ? new Date() : null
      }
    });

    return mapIssueReport(report);
  },

  // Roadmap feature voting
  async createRoadmapFeatureVote(userId: string, featureId: string) {
    await prisma.roadmapFeatureVote.upsert({
      where: {
        featureId_userId: {
          featureId,
          userId
        }
      },
      update: {},
      create: {
        featureId,
        userId
      }
    });
  },

  async removeRoadmapFeatureVote(userId: string, featureId: string) {
    await prisma.roadmapFeatureVote.deleteMany({
      where: {
        featureId,
        userId
      }
    });
  },

  async hasUserVotedForFeature(userId: string, featureId: string): Promise<boolean> {
    const vote = await prisma.roadmapFeatureVote.findUnique({
      where: {
        featureId_userId: {
          featureId,
          userId
        }
      }
    });
    return !!vote;
  },

  async getFeatureVoteCount(featureId: string): Promise<number> {
    return prisma.roadmapFeatureVote.count({
      where: {
        featureId
      }
    });
  },

  // ─── Market Regions ──────────────────────────────────────────────────

  async listMarketRegions(): Promise<MarketRegion[]> {
    const regions = await prisma.marketRegion.findMany({
      orderBy: { createdAt: "asc" }
    });
    return regions.map((r) => ({
      id: r.id,
      marketKey: r.marketKey,
      displayName: r.displayName,
      timezone: r.timezone,
      serviceStates: r.serviceStates,
      serviceHours: r.serviceHours as MarketRegion["serviceHours"],
      dispatchWeightMultiplier: r.dispatchWeightMultiplier,
      active: r.active,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString()
    }));
  },

  async createMarketRegion(input: CreateMarketRegionInput): Promise<MarketRegion> {
    const region = await prisma.marketRegion.create({
      data: {
        marketKey: input.marketKey.trim().toUpperCase(),
        displayName: input.displayName,
        timezone: input.timezone ?? "America/New_York",
        serviceStates: input.serviceStates ?? [],
        serviceHours: input.serviceHours ?? undefined,
        dispatchWeightMultiplier: input.dispatchWeightMultiplier ?? 1.0
      }
    });
    return {
      id: region.id,
      marketKey: region.marketKey,
      displayName: region.displayName,
      timezone: region.timezone,
      serviceStates: region.serviceStates,
      serviceHours: region.serviceHours as MarketRegion["serviceHours"],
      dispatchWeightMultiplier: region.dispatchWeightMultiplier,
      active: region.active,
      createdAt: region.createdAt.toISOString(),
      updatedAt: region.updatedAt.toISOString()
    };
  },

  async updateMarketRegion(id: string, input: UpdateMarketRegionInput): Promise<MarketRegion> {
    const region = await prisma.marketRegion.update({
      where: { id },
      data: {
        ...(input.displayName !== undefined && { displayName: input.displayName }),
        ...(input.timezone !== undefined && { timezone: input.timezone }),
        ...(input.serviceStates !== undefined && { serviceStates: input.serviceStates }),
        ...(input.serviceHours !== undefined && { serviceHours: input.serviceHours ?? Prisma.JsonNull }),
        ...(input.dispatchWeightMultiplier !== undefined && { dispatchWeightMultiplier: input.dispatchWeightMultiplier }),
        ...(input.active !== undefined && { active: input.active })
      }
    });
    return {
      id: region.id,
      marketKey: region.marketKey,
      displayName: region.displayName,
      timezone: region.timezone,
      serviceStates: region.serviceStates,
      serviceHours: region.serviceHours as MarketRegion["serviceHours"],
      dispatchWeightMultiplier: region.dispatchWeightMultiplier,
      active: region.active,
      createdAt: region.createdAt.toISOString(),
      updatedAt: region.updatedAt.toISOString()
    };
  },

  async deleteMarketRegion(id: string): Promise<void> {
    await prisma.marketRegion.delete({ where: { id } });
  },

  // ─── API Keys ─────────────────────────────────────────────────────────

  async listApiKeys(ownerId: string): Promise<ApiKey[]> {
    const keys = await prisma.apiKey.findMany({
      where: { ownerId },
      orderBy: { createdAt: "desc" }
    });
    return keys.map((k) => ({
      id: k.id,
      label: k.label,
      keyPrefix: k.keyPrefix,
      scopes: k.scopes as ApiKey["scopes"],
      ownerId: k.ownerId,
      lastUsedAt: k.lastUsedAt ? k.lastUsedAt.toISOString() : null,
      createdAt: k.createdAt.toISOString(),
      revokedAt: k.revokedAt ? k.revokedAt.toISOString() : null
    }));
  },

  async createApiKey(input: CreateApiKeyInput & { ownerId: string; keyHash: string; keyPrefix: string }): Promise<ApiKey> {
    const key = await prisma.apiKey.create({
      data: {
        label: input.label,
        keyPrefix: input.keyPrefix,
        keyHash: input.keyHash,
        scopes: input.scopes,
        ownerId: input.ownerId
      }
    });
    return {
      id: key.id,
      label: key.label,
      keyPrefix: key.keyPrefix,
      scopes: key.scopes as ApiKey["scopes"],
      ownerId: key.ownerId,
      lastUsedAt: null,
      createdAt: key.createdAt.toISOString(),
      revokedAt: null
    };
  },

  async revokeApiKey(id: string): Promise<void> {
    await prisma.apiKey.update({
      where: { id },
      data: { revokedAt: new Date() }
    });
  },

  async findApiKeyByHash(hash: string): Promise<ApiKey | null> {
    const key = await prisma.apiKey.findUnique({
      where: { keyHash: hash }
    });
    if (!key || key.revokedAt) return null;
    return {
      id: key.id,
      label: key.label,
      keyPrefix: key.keyPrefix,
      scopes: key.scopes as ApiKey["scopes"],
      ownerId: key.ownerId,
      lastUsedAt: key.lastUsedAt ? key.lastUsedAt.toISOString() : null,
      createdAt: key.createdAt.toISOString(),
      revokedAt: null
    };
  },

  async touchApiKeyLastUsed(id: string): Promise<void> {
    await prisma.apiKey.update({
      where: { id },
      data: { lastUsedAt: new Date() }
    });
  },

  // ─── Admin Reporting ─────────────────────────────────────────────────

  async getAdminReportOverview(period: "7d" | "30d" | "90d" | "all"): Promise<AdminReportOverview> {
    const now = new Date();
    const since = period === "all"
      ? undefined
      : new Date(now.getTime() - ({ "7d": 7, "30d": 30, "90d": 90 }[period] * 86400 * 1000));
    const whereCreated = since ? { createdAt: { gte: since } } : {};
    const whereCompleted = since ? { completedAt: { gte: since } } : { completedAt: { not: null } };

    const [
      totalRides,
      completedRides,
      canceledRides,
      requestedRides,
      approvedDrivers,
      pendingDrivers,
      availableDrivers,
      allDrivers,
      allRiders,
      newRiders,
      platformDues,
      adSubmissions,
      adScans,
      driverAdCredits
    ] = await Promise.all([
      prisma.ride.count({ where: whereCreated }),
      prisma.ride.count({ where: { status: "COMPLETED", ...whereCompleted } }),
      prisma.ride.count({ where: { status: "CANCELED", ...whereCreated } }),
      prisma.ride.count({ where: { status: "REQUESTED", ...whereCreated } }),
      prisma.driverProfile.count({ where: { approvalStatus: "APPROVED" } }),
      prisma.driverProfile.count({ where: { approvalStatus: "PENDING" } }),
      prisma.driverProfile.count({ where: { available: true, approvalStatus: "APPROVED" } }),
      prisma.driverProfile.count(),
      prisma.riderProfile.count(),
      prisma.riderProfile.count({ where: { ...(since ? { createdAt: { gte: since } } : {}) } }),
      prisma.platformDue.findMany({
        where: whereCreated,
        select: { amount: true, status: true }
      }),
      prisma.adSubmission.findMany({
        where: since ? { createdAt: { gte: since } } : undefined,
        select: {
          status: true,
          totalPrice: true,
          paymentConfirmedAt: true
        }
      }),
      prisma.adScanEvent.findMany({
        where: since ? { createdAt: { gte: since } } : undefined,
        select: {
          creditEligible: true,
          blockedReason: true
        }
      }),
      prisma.driverAdCredit.findMany({
        where: since ? { createdAt: { gte: since } } : undefined,
        select: {
          amount: true,
          status: true
        }
      })
    ]);

    const revenueTotal = platformDues
      .filter((d) => d.status === "PAID")
      .reduce((sum, d) => sum + Number(d.amount), 0);
    const revenuePending = platformDues
      .filter((d) => d.status === "PENDING" || d.status === "OVERDUE")
      .reduce((sum, d) => sum + Number(d.amount), 0);

    // Revenue from finalFare of completed rides in period
    const ridesRevenue = await prisma.ride.aggregate({
      where: { status: "COMPLETED", ...whereCompleted },
      _sum: { finalFare: true }
    });

    // Top drivers by ride count
    const topDriverRaw = await prisma.ride.groupBy({
      by: ["driverId"],
      where: { status: "COMPLETED", driverId: { not: null }, ...whereCompleted },
      _count: { id: true },
      _sum: { finalFare: true },
      orderBy: { _count: { id: "desc" } },
      take: 10
    });

    const driverIds = topDriverRaw.map((r) => r.driverId!).filter(Boolean);
    const driverUsers = driverIds.length > 0
      ? await prisma.user.findMany({ where: { id: { in: driverIds } }, select: { id: true, name: true } })
      : [];
    const driverNameMap = Object.fromEntries(driverUsers.map((u) => [u.id, u.name]));

    const topDrivers = topDriverRaw.map((r) => ({
      driverId: r.driverId!,
      name: driverNameMap[r.driverId!] ?? "Unknown",
      rideCount: r._count.id,
      revenue: Number(r._sum.finalFare ?? 0)
    }));

    // Rides per day (last N days, capped at 30 days for chart)
    const chartDays = period === "90d" || period === "all" ? 30 : period === "30d" ? 30 : 7;
    const chartSince = new Date(now.getTime() - chartDays * 86400 * 1000);
    const ridesPerDayRaw = await prisma.ride.findMany({
      where: { status: "COMPLETED", completedAt: { gte: chartSince } },
      select: { completedAt: true }
    });
    const perDayMap: Record<string, number> = {};
    for (let i = 0; i < chartDays; i++) {
      const d = new Date(chartSince.getTime() + i * 86400 * 1000);
      perDayMap[d.toISOString().slice(0, 10)] = 0;
    }
    for (const r of ridesPerDayRaw) {
      if (r.completedAt) {
        const key = r.completedAt.toISOString().slice(0, 10);
        if (key in perDayMap) perDayMap[key]++;
      }
    }
    const ridesPerDay = Object.entries(perDayMap).map(([date, count]) => ({ date, count }));

    const adRevenueCollected = toFixedMoney(
      adSubmissions
        .filter((submission) => submission.paymentConfirmedAt)
        .reduce((sum, submission) => sum + Number(submission.totalPrice), 0)
    );
    const adRevenuePending = toFixedMoney(
      adSubmissions
        .filter((submission) => submission.status === DbAdSubmissionStatus.APPROVED || submission.status === DbAdSubmissionStatus.PAYMENT_PENDING)
        .reduce((sum, submission) => sum + Number(submission.totalPrice), 0)
    );
    const pendingDriverCredits = toFixedMoney(
      driverAdCredits
        .filter((credit) => credit.status === DbDriverAdCreditStatus.PENDING)
        .reduce((sum, credit) => sum + Number(credit.amount), 0)
    );
    const appliedDriverCredits = toFixedMoney(
      driverAdCredits
        .filter((credit) => credit.status === DbDriverAdCreditStatus.APPLIED)
        .reduce((sum, credit) => sum + Number(credit.amount), 0)
    );

    return {
      period,
      revenue: {
        total: Number(ridesRevenue._sum.finalFare ?? 0),
        platformDuesCollected: revenueTotal,
        platformDuesPending: revenuePending
      },
      rides: {
        total: totalRides,
        completed: completedRides,
        canceled: canceledRides,
        requested: requestedRides
      },
      drivers: {
        total: allDrivers,
        approved: approvedDrivers,
        available: availableDrivers,
        pendingApproval: pendingDrivers
      },
      riders: {
        total: allRiders,
        newInPeriod: newRiders
      },
      topDrivers,
      ads: {
        submissions: adSubmissions.length,
        awaitingPayment: adSubmissions.filter((submission) => submission.status === DbAdSubmissionStatus.APPROVED || submission.status === DbAdSubmissionStatus.PAYMENT_PENDING).length,
        published: adSubmissions.filter((submission) => submission.status === DbAdSubmissionStatus.PUBLISHED).length,
        scanCount: adScans.length,
        eligibleScanCount: adScans.filter((scan) => scan.creditEligible).length,
        duplicateBlockedCount: adScans.filter((scan) => !scan.creditEligible && scan.blockedReason === "duplicate_window").length,
        pendingDriverCredits,
        appliedDriverCredits,
        pendingRevenue: adRevenuePending,
        collectedRevenue: adRevenueCollected
      },
      ridesPerDay
    };
  },

  // ─── Driver BG Check ─────────────────────────────────────────────────

  async orderDriverBgCheck(driverId: string, input: AdminOrderBgCheckInput) {
    await prisma.driverProfile.update({
      where: { userId: driverId },
      data: {
        bgCheckExternalId: input.externalId ?? null,
        bgCheckOrderedAt: new Date()
      }
    });
    const driver = await this.getDriverAccount(driverId);
    if (!driver) {
      throw new Error("Driver not found");
    }
    return driver;
  },

  // ─── Stripe Webhook ───────────────────────────────────────────────────

  async resolveStripeDue(stripeCheckoutSessionId: string): Promise<void> {
    const due = await prisma.platformDue.findFirst({
      where: { stripeCheckoutSessionId }
    });
    if (!due) return; // idempotent – session may not have a matching due
    if (due.status === "PAID") return; // already settled
    await prisma.platformDue.update({
      where: { id: due.id },
      data: {
        status: "PAID",
        paymentMethod: "STRIPE",
        paidAt: new Date()
      }
    });
  },

  // ─── Broadcast targets ────────────────────────────────────────────────

  async listUserIdsForBroadcast(roles: Array<"rider" | "driver">): Promise<string[]> {
    const dbRoles = roles.map((r) => (r === "rider" ? "RIDER" : "DRIVER"));
    const users = await prisma.user.findMany({
      where: {
        roles: { hasSome: dbRoles as never[] }
      },
      select: { id: true }
    });
    return users.map((u) => u.id);
  }
};
