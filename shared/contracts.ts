import { z } from "zod";

export const roleSchema = z.enum(["rider", "driver", "admin"]);
export const rideTypeSchema = z.enum(["standard", "suv", "xl"]);
export const paymentMethodSchema = z.enum(["jim", "cashapp", "cash"]);
export const paymentStatusSchema = z.enum(["pending", "collected", "waived"]);
export const duePaymentMethodSchema = z.enum(["cashapp", "zelle", "jim", "cash", "other", "stripe"]);
export const platformDueStatusSchema = z.enum(["pending", "paid", "waived", "overdue"]);
export const platformDueBatchStatusSchema = z.enum(["open", "paid", "waived", "overdue", "void"]);
export const driverInterestStatusSchema = z.enum(["pending", "approved", "rejected"]);
export const driverApprovalStatusSchema = z.enum(["pending", "approved", "rejected"]);
export const driverPricingModeSchema = z.enum(["platform", "custom"]);
export const driverDocumentTypeSchema = z.enum(["insurance", "registration", "background_check", "mvr"]);
export const driverDocumentStatusSchema = z.enum(["pending", "approved", "rejected"]);
export const adSubmissionStatusSchema = z.enum(["submitted", "approved", "payment_pending", "paid", "published", "rejected", "expired"]);
export const driverAdCreditStatusSchema = z.enum(["pending", "applied", "void"]);
export const dispatchModeSchema = z.enum(["local", "service_area", "nationwide"]);
export const ridePricingSourceSchema = z.enum(["platform_market", "driver_custom", "admin_override"]);
export const communityVoteChoiceSchema = z.enum(["yes", "no"]);
export const issueReportSourceSchema = z.enum(["rider_app", "driver_app", "admin_dashboard"]);
export const issueReportStatusSchema = z.enum(["pending", "synced", "failed"]);
export const rideStatusSchema = z.enum([
  "draft",
  "requested",
  "scheduled",
  "offered",
  "accepted",
  "en_route",
  "arrived",
  "in_progress",
  "completed",
  "canceled",
  "expired"
]);
export const rideOfferStatusSchema = z.enum(["pending", "accepted", "declined", "expired"]);

export const coordinatesSchema = z.object({
  lat: z.number(),
  lng: z.number()
});

export const routeLocationSchema = z.object({
  address: z.string().min(3),
  lat: z.number(),
  lng: z.number(),
  placeId: z.string().optional(),
  displayName: z.string().optional(),
  stateCode: z.string().nullable().optional()
});

export const addressSuggestionSchema = z.object({
  id: z.string(),
  address: z.string().min(3),
  placeId: z.string().nullable().optional(),
  stateCode: z.string().nullable().optional()
});

export const vehicleSchema = z.object({
  id: z.string(),
  makeModel: z.string(),
  plate: z.string(),
  color: z.string().nullable(),
  rideType: rideTypeSchema,
  seats: z.number()
});

export const vehicleInputSchema = z.object({
  makeModel: z.string().min(2),
  plate: z.string().min(2),
  color: z.string().min(2).optional(),
  rideType: rideTypeSchema,
  seats: z.number().int().min(1).max(12)
});

export const driverDispatchSettingsSchema = z.object({
  localEnabled: z.boolean(),
  localRadiusMiles: z.number().int().min(1).max(500),
  serviceAreaEnabled: z.boolean(),
  serviceAreaStates: z.array(z.string().min(2).max(2)).max(50),
  nationwideEnabled: z.boolean()
});

export const driverAcceptedPaymentMethodsSchema = z.array(paymentMethodSchema).min(1).max(3);

const rateRuleFields = {
  rideType: rideTypeSchema,
  baseFare: z.number().nonnegative(),
  perMile: z.number().nonnegative(),
  perMinute: z.number().nonnegative(),
  multiplier: z.number().positive()
} as const;

export const pricingRuleSchema = z.object({
  id: z.string(),
  marketKey: z.string(),
  ...rateRuleFields,
  updatedAt: z.string()
});

export const driverRateRuleSchema = z.object({
  id: z.string(),
  ...rateRuleFields,
  updatedAt: z.string()
});

export const driverRateCardSchema = z.object({
  pricingMode: driverPricingModeSchema,
  rules: z.array(driverRateRuleSchema)
});

export const driverDocumentUploadSchema = z.object({
  type: driverDocumentTypeSchema,
  fileName: z.string().min(1).max(180),
  mimeType: z.string().min(3).max(120),
  contentBase64: z.string().min(16).max(12_000_000)
});

export const adAssetUploadSchema = z.object({
  fileName: z.string().min(1).max(180),
  mimeType: z.string().regex(/^image\//i, "Ad creative must be an image."),
  contentBase64: z.string().min(16).max(12_000_000)
});

export const driverDocumentUploadsSchema = z
  .array(driverDocumentUploadSchema)
  .length(4)
  .superRefine((documents, ctx) => {
    const uniqueTypes = new Set(documents.map((document) => document.type));

    if (uniqueTypes.size !== documents.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Each required driver document can only be uploaded once."
      });
    }

    for (const type of driverDocumentTypeSchema.options) {
      if (!uniqueTypes.has(type)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Missing required driver document: ${type.replaceAll("_", " ")}.`
        });
      }
    }
  });

export const driverOnboardingDocumentSchema = z.object({
  id: z.string(),
  driverId: z.string(),
  type: driverDocumentTypeSchema,
  status: driverDocumentStatusSchema,
  fileName: z.string(),
  mimeType: z.string(),
  fileSizeBytes: z.number().int().nonnegative(),
  reviewNote: z.string().nullable(),
  reviewedAt: z.string().nullable(),
  reviewedById: z.string().nullable(),
  uploadedAt: z.string(),
  updatedAt: z.string(),
  downloadPath: z.string()
});

export const driverDocumentReviewSummarySchema = z.object({
  requiredTypes: z.array(driverDocumentTypeSchema),
  submittedTypes: z.array(driverDocumentTypeSchema),
  approvedTypes: z.array(driverDocumentTypeSchema),
  missingTypes: z.array(driverDocumentTypeSchema),
  rejectedTypes: z.array(driverDocumentTypeSchema),
  pendingCount: z.number().int().nonnegative(),
  readyForApproval: z.boolean()
});

export const sessionUserSchema = z.object({
  id: z.string(),
  role: roleSchema,
  roles: z.array(roleSchema).min(1),
  name: z.string(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  referralCode: z.string().nullable().optional(),
  approved: z.boolean().optional(),
  approvalStatus: driverApprovalStatusSchema.optional(),
  available: z.boolean().optional(),
  pricingMode: driverPricingModeSchema.optional(),
  homeState: z.string().nullable().optional(),
  homeCity: z.string().nullable().optional(),
  acceptedPaymentMethods: driverAcceptedPaymentMethodsSchema.optional(),
  vehicle: vehicleSchema.nullable().optional()
});

export const collectorAdminSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  referralCode: z.string().nullable().optional()
});

export const driverAccountSchema = sessionUserSchema.extend({
  approvalStatus: driverApprovalStatusSchema,
  approved: z.boolean(),
  available: z.boolean(),
  pricingMode: driverPricingModeSchema,
  homeState: z.string().nullable(),
  homeCity: z.string().nullable(),
  acceptedPaymentMethods: driverAcceptedPaymentMethodsSchema,
  dispatchSettings: driverDispatchSettingsSchema,
  customRates: z.array(driverRateRuleSchema).optional(),
  documents: z.array(driverOnboardingDocumentSchema),
  documentReview: driverDocumentReviewSummarySchema,
  collectorAdminId: z.string().nullable().optional(),
  collectorAdmin: collectorAdminSummarySchema.nullable().optional(),
  createdAt: z.string().optional(),
  bgCheckExternalId: z.string().nullable().optional(),
  bgCheckOrderedAt: z.string().nullable().optional()
});

export const ridePartySchema = z.object({
  id: z.string(),
  name: z.string(),
  phone: z.string().nullable(),
  email: z.string().nullable().optional(),
  referralCode: z.string().nullable().optional(),
  roles: z.array(roleSchema).optional(),
  approved: z.boolean().optional(),
  approvalStatus: driverApprovalStatusSchema.optional(),
  available: z.boolean().optional(),
  pricingMode: driverPricingModeSchema.optional(),
  vehicle: vehicleSchema.nullable().optional()
});

export const ridePricingSnapshotSchema = z.object({
  platformDuePercent: z.number().nonnegative(),
  estimatedSubtotal: z.number().nonnegative(),
  estimatedPlatformDue: z.number().nonnegative(),
  estimatedCustomerTotal: z.number().nonnegative(),
  estimatedDriverNet: z.number().nonnegative(),
  finalSubtotal: z.number().nonnegative().nullable(),
  finalPlatformDue: z.number().nonnegative().nullable(),
  finalCustomerTotal: z.number().nonnegative().nullable(),
  finalDriverNet: z.number().nonnegative().nullable(),
  smsRiderFee: z.number().nonnegative().optional(),
  smsDriverFee: z.number().nonnegative().optional()
});

export const paymentRecordSchema = z.object({
  method: paymentMethodSchema,
  status: paymentStatusSchema,
  amountDue: z.number(),
  collectedAt: z.string().nullable(),
  collectedById: z.string().nullable()
});

export const rideOfferSchema = z.object({
  id: z.string(),
  rideId: z.string(),
  driverId: z.string(),
  status: rideOfferStatusSchema,
  offeredAt: z.string(),
  respondedAt: z.string().nullable(),
  expiresAt: z.string()
});

export const locationPingSchema = z.object({
  id: z.string(),
  rideId: z.string(),
  driverId: z.string(),
  lat: z.number(),
  lng: z.number(),
  heading: z.number().nullable(),
  speed: z.number().nullable(),
  createdAt: z.string()
});

export const rideSchema = z.object({
  id: z.string(),
  riderId: z.string(),
  driverId: z.string().nullable(),
  publicTrackingToken: z.string().nullable().optional(),
  referredByUserId: z.string().nullable().optional(),
  referredByCode: z.string().nullable().optional(),
  status: rideStatusSchema,
  rideType: rideTypeSchema,
  pickup: routeLocationSchema,
  dropoff: routeLocationSchema,
  estimatedMiles: z.number(),
  estimatedMinutes: z.number(),
  routeProvider: z.enum(["mapbox", "fallback"]),
  routeFallbackMiles: z.number().nullable(),
  platformMarketKey: z.string().nullable(),
  estimatedPricingSource: ridePricingSourceSchema,
  finalPricingSource: ridePricingSourceSchema.nullable(),
  matchedDriverPricingMode: driverPricingModeSchema.nullable(),
  quotedFare: z.number(),
  fareOverride: z.number().nullable(),
  finalFare: z.number().nullable(),
  pricing: ridePricingSnapshotSchema,
  payment: paymentRecordSchema,
  requestedAt: z.string().nullable(),
  scheduledFor: z.string().nullable(),
  acceptedAt: z.string().nullable(),
  startedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  canceledAt: z.string().nullable(),
  rider: ridePartySchema,
  driver: ridePartySchema.nullable(),
  offers: z.array(rideOfferSchema),
  latestLocation: locationPingSchema.nullable()
});

export const shareInfoSchema = z.object({
  referralCode: z.string(),
  shareUrl: z.string().url(),
  ownerName: z.string(),
  ownerRole: roleSchema
});

export const communityAccessLinkSchema = z.object({
  token: z.string(),
  entryUrl: z.string().url()
});

export const riderLeadSchema = z.object({
  id: z.string(),
  userId: z.string().nullable(),
  name: z.string(),
  email: z.string().email(),
  phone: z.string().nullable(),
  referredByUserId: z.string().nullable(),
  referredByCode: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const driverInterestSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  phone: z.string(),
  serviceArea: z.string(),
  vehicleInfo: z.string(),
  availabilityNotes: z.string().nullable(),
  status: driverInterestStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string()
});

export const platformPayoutSettingsSchema = z.object({
  adminId: z.string().nullable().optional(),
  cashAppHandle: z.string().nullable(),
  zelleHandle: z.string().nullable(),
  jimHandle: z.string().nullable(),
  cashInstructions: z.string().nullable(),
  otherInstructions: z.string().nullable(),
  updatedAt: z.string().nullable()
});

export const adPricingSettingsSchema = z.object({
  baseDailyPrice: z.number().nonnegative(),
  defaultDriverCreditPerScan: z.number().nonnegative(),
  slotMultipliers: z.array(
    z.object({
      slotRank: z.number().int().positive(),
      multiplier: z.number().positive().max(100)
    })
  ),
  dedupeWindowMinutes: z.number().int().min(1).max(1440),
  updatedAt: z.string().nullable()
});

export const platformDueDriverSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  available: z.boolean()
});

export const platformDueRideSummarySchema = z.object({
  id: z.string(),
  riderName: z.string(),
  pickupAddress: z.string(),
  dropoffAddress: z.string(),
  completedAt: z.string().nullable(),
  paymentMethod: paymentMethodSchema,
  subtotal: z.number().nonnegative(),
  customerTotal: z.number().nonnegative()
});

export const platformDueSchema = z.object({
  id: z.string(),
  rideId: z.string(),
  driverId: z.string(),
  batchId: z.string().nullable().optional(),
  amount: z.number().nonnegative(),
  status: platformDueStatusSchema,
  collectibleAt: z.string(),
  dueAt: z.string(),
  paidAt: z.string().nullable(),
  paymentMethod: duePaymentMethodSchema.nullable(),
  stripeCheckoutSessionId: z.string().nullable().optional(),
  stripeCheckoutUrl: z.string().nullable().optional(),
  note: z.string().nullable(),
  resolvedById: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  driver: platformDueDriverSummarySchema,
  ride: platformDueRideSummarySchema
});

export const platformDueBatchSchema = z.object({
  id: z.string(),
  referenceCode: z.string(),
  driverId: z.string(),
  collectorAdminId: z.string().nullable(),
  amount: z.number().nonnegative(),
  adCreditAppliedTotal: z.number().nonnegative(),
  netAmountDue: z.number().nonnegative(),
  status: platformDueBatchStatusSchema,
  paymentMethod: duePaymentMethodSchema.nullable(),
  observedTitle: z.string().nullable(),
  observedNote: z.string().nullable(),
  adminNote: z.string().nullable(),
  generatedAt: z.string(),
  dueAt: z.string(),
  paidAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  driver: platformDueDriverSummarySchema,
  collector: collectorAdminSummarySchema.nullable(),
  dues: z.array(platformDueSchema)
});

export const driverDueSnapshotSchema = z.object({
  driver: platformDueDriverSummarySchema,
  collector: collectorAdminSummarySchema.nullable(),
  collectibleUnbatchedTotal: z.number().nonnegative(),
  collectibleUnbatchedCount: z.number().int().nonnegative(),
  openBatchCount: z.number().int().nonnegative(),
  openBatchTotal: z.number().nonnegative(),
  overdueBatchCount: z.number().int().nonnegative(),
  overdueBatchTotal: z.number().nonnegative(),
  lastCompletedRideAt: z.string().nullable(),
  adProgram: z.object({
    optedIn: z.boolean(),
    scanCount: z.number().int().nonnegative(),
    pendingCreditTotal: z.number().nonnegative(),
    appliedCreditTotal: z.number().nonnegative(),
    activeAdCount: z.number().int().nonnegative()
  })
});

export const overdueDriverSummarySchema = z.object({
  driverId: z.string(),
  name: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  overdueAmount: z.number().nonnegative(),
  overdueCount: z.number().int().nonnegative()
});

export const adSubmissionMetricsSchema = z.object({
  scanCount: z.number().int().nonnegative(),
  eligibleScanCount: z.number().int().nonnegative(),
  blockedDuplicateCount: z.number().int().nonnegative(),
  pendingCreditTotal: z.number().nonnegative(),
  appliedCreditTotal: z.number().nonnegative()
});

export const adSubmissionSchema = z.object({
  id: z.string(),
  businessName: z.string(),
  contactName: z.string(),
  email: z.string().email(),
  phone: z.string().nullable(),
  headline: z.string(),
  body: z.string(),
  callToAction: z.string().nullable(),
  targetUrl: z.string().url(),
  imageFileName: z.string(),
  imageMimeType: z.string(),
  imageDataUrl: z.string(),
  requestedDays: z.number().int().positive(),
  dailyPrice: z.number().nonnegative(),
  totalPrice: z.number().nonnegative(),
  displaySeconds: z.number().int().min(5),
  slotRank: z.number().int().positive(),
  driverCreditPerScan: z.number().nonnegative(),
  status: adSubmissionStatusSchema,
  redirectToken: z.string(),
  assignedDriverId: z.string().nullable(),
  paymentNote: z.string().nullable(),
  adminNote: z.string().nullable(),
  approvedAt: z.string().nullable(),
  paymentConfirmedAt: z.string().nullable(),
  publishedAt: z.string().nullable(),
  startsAt: z.string().nullable(),
  endsAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  assignedDriver: platformDueDriverSummarySchema.nullable(),
  metrics: adSubmissionMetricsSchema
});

export const createAdSubmissionSchema = z.object({
  businessName: z.string().min(2).max(120),
  contactName: z.string().min(2).max(120),
  email: z.string().email(),
  phone: z.string().min(8).max(30).optional(),
  headline: z.string().min(4).max(120),
  body: z.string().min(10).max(1000),
  callToAction: z.string().min(2).max(80).optional(),
  targetUrl: z.string().url(),
  requestedDays: z.number().int().min(1).max(31),
  slotRank: z.number().int().min(1).max(99).optional(),
  image: adAssetUploadSchema
});

export const adminUpdateAdSubmissionSchema = z.object({
  status: adSubmissionStatusSchema.optional(),
  assignedDriverId: z.string().nullable().optional(),
  paymentNote: z.string().max(1000).nullable().optional(),
  adminNote: z.string().max(1000).nullable().optional(),
  displaySeconds: z.number().int().min(5).max(60).optional(),
  slotRank: z.number().int().min(1).max(99).optional(),
  driverCreditPerScan: z.number().min(0).max(100).optional(),
  startsAt: z.string().datetime().nullable().optional(),
  endsAt: z.string().datetime().nullable().optional()
});

export const driverAdProgramEnrollmentSchema = z.object({
  driverId: z.string(),
  optedIn: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const updateDriverAdProgramSchema = z.object({
  optedIn: z.boolean()
});

export const driverAdCreditSummarySchema = z.object({
  scanCount: z.number().int().nonnegative(),
  pendingTotal: z.number().nonnegative(),
  appliedTotal: z.number().nonnegative(),
  availableOffsetTotal: z.number().nonnegative(),
  activeAdCount: z.number().int().nonnegative()
});

export const driverAdProgramActiveAdSchema = z.object({
  id: z.string(),
  businessName: z.string(),
  headline: z.string(),
  slotRank: z.number().int().positive(),
  displaySeconds: z.number().int().min(5),
  status: adSubmissionStatusSchema,
  startsAt: z.string().nullable(),
  endsAt: z.string().nullable(),
  publishedAt: z.string().nullable()
});

export const driverAdProgramResponseSchema = z.object({
  enrollment: driverAdProgramEnrollmentSchema,
  summary: driverAdCreditSummarySchema,
  activeAds: z.array(driverAdProgramActiveAdSchema)
});

export const adminDriverAdCreditSummarySchema = z.object({
  driver: platformDueDriverSummarySchema,
  optedIn: z.boolean(),
  scanCount: z.number().int().nonnegative(),
  pendingTotal: z.number().nonnegative(),
  appliedTotal: z.number().nonnegative(),
  activeAdCount: z.number().int().nonnegative()
});

export const adminAdsResponseSchema = z.object({
  submissions: z.array(adSubmissionSchema),
  driverCredits: z.array(adminDriverAdCreditSummarySchema),
  pricingSettings: adPricingSettingsSchema
});

export const updateAdPricingSettingsSchema = z.object({
  baseDailyPrice: z.number().nonnegative().max(10000).optional(),
  defaultDriverCreditPerScan: z.number().nonnegative().max(1000).optional(),
  slotMultipliers: z.array(
    z.object({
      slotRank: z.number().int().min(1).max(99),
      multiplier: z.number().positive().max(100)
    })
  ).max(12).optional(),
  dedupeWindowMinutes: z.number().int().min(1).max(1440).optional()
}).refine((value) => Object.values(value).some((entry) => entry !== undefined), {
  message: "At least one pricing field is required."
});

export const applyDriverAdCreditsSchema = z.object({
  note: z.string().max(1000).nullable().optional(),
  appliedPlatformDueId: z.string().nullable().optional(),
  platformDueBatchId: z.string().nullable().optional()
});

export const adVisitResolveResponseSchema = z.object({
  destinationUrl: z.string().url(),
  businessName: z.string(),
  headline: z.string()
});

export const adDisplayItemSchema = z.object({
  id: z.string(),
  businessName: z.string(),
  headline: z.string(),
  body: z.string(),
  callToAction: z.string().nullable(),
  targetUrl: z.string().url(),
  qrUrl: z.string().url(),
  imageDataUrl: z.string(),
  displaySeconds: z.number().int().min(5),
  slotRank: z.number().int().positive()
});

export const publicAdDisplayResponseSchema = z.object({
  driverName: z.string(),
  referralCode: z.string(),
  optedIn: z.boolean(),
  items: z.array(adDisplayItemSchema)
});

export const publicAdPricingResponseSchema = z.object({
  pricing: adPricingSettingsSchema
});

export const communityEligibilitySchema = z.object({
  canRead: z.boolean(),
  canCreateProposal: z.boolean(),
  canVote: z.boolean(),
  canComment: z.boolean(),
  completedRideCount: z.number().int().nonnegative(),
  threshold: z.number().int().nonnegative(),
  reason: z.string().nullable()
});

export const communityAuthorSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: roleSchema
});

export const communityProposalSchema = z.object({
  id: z.string(),
  title: z.string(),
  body: z.string(),
  pinned: z.boolean(),
  closed: z.boolean(),
  hidden: z.boolean(),
  author: communityAuthorSchema,
  yesVotes: z.number().int().nonnegative(),
  noVotes: z.number().int().nonnegative(),
  totalVotes: z.number().int().nonnegative(),
  commentCount: z.number().int().nonnegative(),
  viewerVote: communityVoteChoiceSchema.nullable(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const communityCommentSchema = z.object({
  id: z.string(),
  proposalId: z.string(),
  body: z.string(),
  hidden: z.boolean(),
  author: communityAuthorSchema,
  createdAt: z.string(),
  updatedAt: z.string()
});

export const authOtpRequestSchema = z.object({
  phone: z.string().min(8),
  role: z.enum(["rider", "driver"])
});

export const authOtpVerifySchema = z.object({
  phone: z.string().min(8),
  code: z.string().min(4),
  role: z.enum(["rider", "driver"]),
  name: z.string().min(2).optional()
});

export const adminLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

export const driverBootstrapInputSchema = z.object({
  phone: z.string().min(8),
  homeState: z.string().min(2).max(2),
  homeCity: z.string().min(2),
  vehicle: vehicleInputSchema
});

export const driverApplicationInputSchema = driverBootstrapInputSchema.extend({
  documents: driverDocumentUploadsSchema,
  collectorCode: z.string().min(4).max(40).optional()
});

export const adminSetupInputSchema = z
  .object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(8),
    createDriverProfile: z.boolean().optional(),
    driverProfile: driverBootstrapInputSchema.optional()
  })
  .superRefine((value, ctx) => {
    if (value.createDriverProfile && !value.driverProfile) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["driverProfile"],
        message: "Driver profile details are required when creating an admin driver profile."
      });
    }
  });

export const driverSignupInputSchema = driverApplicationInputSchema.extend({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8)
});

export const driverLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

export const createRideSchema = z.object({
  pickupAddress: z.string().min(3),
  dropoffAddress: z.string().min(3),
  rideType: rideTypeSchema,
  paymentMethod: paymentMethodSchema,
  scheduledFor: z.string().datetime().nullable().optional()
});

export const publicRideRequestSchema = createRideSchema.extend({
  riderName: z.string().min(2),
  phone: z.string().min(8),
  email: z.string().email().optional(),
  referredByCode: z.string().min(4).max(40).optional()
});

export const riderLeadInputSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(8).optional(),
  referredByCode: z.string().min(4).max(40).optional()
});

export const driverInterestInputSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(8),
  serviceArea: z.string().min(2),
  vehicleInfo: z.string().min(2),
  availabilityNotes: z.string().min(2).optional()
});

export const driverProfileUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().min(8).optional(),
  homeState: z.string().min(2).max(2).optional(),
  homeCity: z.string().min(2).optional(),
  acceptedPaymentMethods: driverAcceptedPaymentMethodsSchema.optional(),
  vehicle: vehicleInputSchema.partial().optional()
});

export const driverDispatchSettingsUpdateSchema = driverDispatchSettingsSchema;

export const driverRateCardUpdateSchema = z.object({
  pricingMode: driverPricingModeSchema,
  rules: z.array(
    z.object({
      ...rateRuleFields
    })
  )
});

export const updateRideStatusSchema = z.object({
  status: z.enum(["accepted", "en_route", "arrived", "in_progress", "completed"])
});

export const driverLocationSchema = z.object({
  rideId: z.string(),
  lat: z.number(),
  lng: z.number(),
  heading: z.number().optional(),
  speed: z.number().optional(),
  available: z.boolean().optional()
});

export const driverIdleLocationSchema = driverLocationSchema.omit({
  rideId: true
});

export const adminUpdateRideSchema = z.object({
  status: rideStatusSchema.optional(),
  paymentStatus: paymentStatusSchema.optional(),
  fareOverride: z.number().nonnegative().optional(),
  fallbackMiles: z.number().positive().optional(),
  paymentCollectedById: z.string().nullable().optional()
});

export const adminUpdateDriverApprovalSchema = z.object({
  approvalStatus: driverApprovalStatusSchema
});

export const adminReviewDriverDocumentSchema = z.object({
  status: driverDocumentStatusSchema,
  reviewNote: z.string().max(500).nullable().optional()
});

export const adminUpdateDriverSchema = z.object({
  name: z.string().min(2).optional(),
  available: z.boolean().optional(),
  approvalStatus: driverApprovalStatusSchema.optional(),
  homeState: z.string().min(2).max(2).nullable().optional(),
  homeCity: z.string().min(2).nullable().optional(),
  pricingMode: driverPricingModeSchema.optional(),
  dispatchSettings: driverDispatchSettingsSchema.optional()
});

export const updatePlatformRatesSchema = z.object({
  rules: z.array(
    z.object({
      marketKey: z.string().min(2),
      ...rateRuleFields
    })
  )
});

export const benchmarkProviderSchema = z.enum(["uber", "lyft"]);

export const platformRateBenchmarkRuleSchema = z.object({
  provider: benchmarkProviderSchema,
  marketKey: z.string().min(2),
  ...rateRuleFields,
  observedAt: z.string().optional()
});

export const updatePlatformRateBenchmarksSchema = z.object({
  rules: z.array(platformRateBenchmarkRuleSchema.omit({ observedAt: true }))
});

export const platformRateBenchmarksResponseSchema = z.object({
  rules: z.array(platformRateBenchmarkRuleSchema)
});

export const platformRateAutoStatusSchema = z.object({
  enabled: z.boolean(),
  runnerMode: z.enum(["api", "worker"]).optional(),
  intervalMinutes: z.number().int().positive(),
  undercutAmount: z.number().nonnegative(),
  uberFeedConfigured: z.boolean(),
  lyftFeedConfigured: z.boolean(),
  benchmarkCounts: z
    .object({
      uber: z.number().int().nonnegative(),
      lyft: z.number().int().nonnegative()
    })
    .optional(),
  lastRunAt: z.string().nullable(),
  lastAppliedRuleCount: z.number().int().nonnegative(),
  lastError: z.string().nullable()
});

export const platformRateAutoApplyResponseSchema = z.object({
  appliedRuleCount: z.number().int().nonnegative(),
  sourceRuleCount: z.object({
    uber: z.number().int().nonnegative(),
    lyft: z.number().int().nonnegative()
  }),
  runAt: z.string(),
  undercutAmount: z.number().nonnegative()
});

export const marketConfigSchema = z.object({
  marketKey: z.string().min(2),
  rideTypeCount: z.number().int().nonnegative()
});

export const marketConfigsResponseSchema = z.object({
  markets: z.array(marketConfigSchema)
});

export const createMarketConfigSchema = z.object({
  marketKey: z.string().min(2).max(12),
  copyFromMarketKey: z.string().min(2).max(12).optional()
});

export const adminAuditLogSchema = z.object({
  id: z.string(),
  actorId: z.string().nullable(),
  actorName: z.string().nullable(),
  action: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  metadata: z.record(z.unknown()).nullable(),
  createdAt: z.string()
});

export const adminAuditLogsResponseSchema = z.object({
  logs: z.array(adminAuditLogSchema)
});

// Market Region (full multi-city region config)
export const marketRegionSchema = z.object({
  id: z.string(),
  marketKey: z.string(),
  displayName: z.string(),
  timezone: z.string(),
  serviceStates: z.array(z.string()),
  serviceHours: z.record(z.object({ open: z.string(), close: z.string() })).nullable(),
  dispatchWeightMultiplier: z.number(),
  active: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const createMarketRegionSchema = z.object({
  marketKey: z.string().min(2).max(20),
  displayName: z.string().min(2).max(80),
  timezone: z.string().min(3).max(60).optional(),
  serviceStates: z.array(z.string().min(2).max(2)).max(60).optional(),
  serviceHours: z.record(z.object({ open: z.string(), close: z.string() })).nullable().optional(),
  dispatchWeightMultiplier: z.number().min(0.1).max(10).optional()
});

export const updateMarketRegionSchema = createMarketRegionSchema.partial().extend({
  active: z.boolean().optional()
});

export const marketRegionsResponseSchema = z.object({
  regions: z.array(marketRegionSchema)
});

// API Keys
export const apiKeyScopeSchema = z.enum(["rides:read", "drivers:read", "pricing:read", "reports:read", "webhooks:write"]);

export const apiKeySchema = z.object({
  id: z.string(),
  label: z.string(),
  keyPrefix: z.string(),
  scopes: z.array(apiKeyScopeSchema),
  ownerId: z.string(),
  lastUsedAt: z.string().nullable(),
  createdAt: z.string(),
  revokedAt: z.string().nullable()
});

export const createApiKeySchema = z.object({
  label: z.string().min(2).max(80),
  scopes: z.array(apiKeyScopeSchema).min(1)
});

export const createApiKeyResponseSchema = z.object({
  key: apiKeySchema,
  plaintext: z.string() // returned ONCE, never stored
});

export const apiKeysResponseSchema = z.object({
  keys: z.array(apiKeySchema)
});

// Admin broadcast notification
export const adminBroadcastNotificationSchema = z.object({
  title: z.string().min(2).max(100),
  body: z.string().min(2).max(500),
  url: z.string().max(500).optional(),
  targetRoles: z.array(z.enum(["rider", "driver"])).min(1)
});

// Admin bg-check order
export const adminOrderBgCheckSchema = z.object({
  externalId: z.string().min(2).max(120).optional(),
  note: z.string().max(500).nullable().optional()
});

// Reporting
export const adminReportOverviewSchema = z.object({
  period: z.enum(["7d", "30d", "90d", "all"]),
  revenue: z.object({
    total: z.number().nonnegative(),
    platformDuesCollected: z.number().nonnegative(),
    platformDuesPending: z.number().nonnegative()
  }),
  rides: z.object({
    total: z.number().int().nonnegative(),
    completed: z.number().int().nonnegative(),
    canceled: z.number().int().nonnegative(),
    requested: z.number().int().nonnegative()
  }),
  drivers: z.object({
    total: z.number().int().nonnegative(),
    approved: z.number().int().nonnegative(),
    available: z.number().int().nonnegative(),
    pendingApproval: z.number().int().nonnegative()
  }),
  riders: z.object({
    total: z.number().int().nonnegative(),
    newInPeriod: z.number().int().nonnegative()
  }),
  topDrivers: z.array(z.object({
    driverId: z.string(),
    name: z.string(),
    rideCount: z.number().int().nonnegative(),
    revenue: z.number().nonnegative()
  })),
  ads: z.object({
    submissions: z.number().int().nonnegative(),
    awaitingPayment: z.number().int().nonnegative(),
    published: z.number().int().nonnegative(),
    scanCount: z.number().int().nonnegative(),
    eligibleScanCount: z.number().int().nonnegative(),
    duplicateBlockedCount: z.number().int().nonnegative(),
    pendingDriverCredits: z.number().nonnegative(),
    appliedDriverCredits: z.number().nonnegative(),
    pendingRevenue: z.number().nonnegative(),
    collectedRevenue: z.number().nonnegative()
  }),
  ridesPerDay: z.array(z.object({
    date: z.string(),
    count: z.number().int().nonnegative()
  }))
});

export const updatePricingRulesSchema = updatePlatformRatesSchema;

export const createDriverRoleSchema = driverApplicationInputSchema;

export const adminUpdatePlatformDueSchema = z.object({
  status: z.enum(["pending", "paid", "waived"]),
  paymentMethod: duePaymentMethodSchema.nullable().optional(),
  note: z.string().max(500).nullable().optional()
});

export const adminUpdatePlatformDueBatchSchema = z.object({
  status: z.enum(["open", "paid", "waived", "void"]),
  paymentMethod: duePaymentMethodSchema.nullable().optional(),
  observedTitle: z.string().max(500).nullable().optional(),
  observedNote: z.string().max(500).nullable().optional(),
  adminNote: z.string().max(1000).nullable().optional()
});

export const adminReconcilePlatformDueBatchSchema = z.object({
  referenceText: z.string().min(3),
  paymentMethod: duePaymentMethodSchema,
  observedTitle: z.string().max(500).nullable().optional(),
  observedNote: z.string().max(500).nullable().optional(),
  adminNote: z.string().max(1000).nullable().optional()
});

export const adminTransferDriverCollectorSchema = z.object({
  collectorAdminId: z.string().nullable()
});

export const updatePlatformPayoutSettingsSchema = z.object({
  cashAppHandle: z.string().max(120).nullable().optional(),
  zelleHandle: z.string().max(120).nullable().optional(),
  jimHandle: z.string().max(120).nullable().optional(),
  cashInstructions: z.string().max(500).nullable().optional(),
  otherInstructions: z.string().max(500).nullable().optional()
});

export const communityAccessExchangeSchema = z.object({
  token: z.string().min(8)
});

export const createCommunityProposalSchema = z.object({
  title: z.string().min(4).max(140),
  body: z.string().min(10).max(2000)
});

export const communityVoteInputSchema = z.object({
  choice: communityVoteChoiceSchema
});

export const createCommunityCommentSchema = z.object({
  body: z.string().min(1).max(2000)
});

export const adminUpdateCommunityProposalSchema = z.object({
  pinned: z.boolean().optional(),
  closed: z.boolean().optional(),
  hidden: z.boolean().optional()
});

export const adminUpdateCommunityCommentSchema = z.object({
  hidden: z.boolean()
});

export const createIssueReportSchema = z.object({
  source: issueReportSourceSchema,
  summary: z.string().min(5).max(280),
  details: z.string().max(4000).optional(),
  page: z.string().max(240).optional(),
  rideId: z.string().optional(),
  metadata: z
    .record(z.union([z.string(), z.number(), z.boolean(), z.null()]))
    .optional()
});

export const issueReportSchema = z.object({
  id: z.string(),
  reporterId: z.string(),
  reporterRole: roleSchema,
  source: issueReportSourceSchema,
  summary: z.string(),
  details: z.string().nullable(),
  page: z.string().nullable(),
  rideId: z.string().nullable(),
  metadata: z.record(z.unknown()).nullable(),
  githubIssueNumber: z.number().int().nullable(),
  githubIssueUrl: z.string().nullable(),
  githubSyncStatus: issueReportStatusSchema,
  githubSyncError: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const otpRequestResponseSchema = z.object({
  ok: z.literal(true),
  devCode: z.string().optional()
});

export const authResponseSchema = z.object({
  token: z.string(),
  user: sessionUserSchema
});

export const adminSetupStatusResponseSchema = z.object({
  needsSetup: z.boolean()
});

export const adminInviteStatusSchema = z.enum(["pending", "accepted", "expired", "revoked"]);

export const adminInviteSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  token: z.string(),
  inviteUrl: z.string().url(),
  status: adminInviteStatusSchema,
  inviter: collectorAdminSummarySchema,
  acceptedBy: collectorAdminSummarySchema.nullable(),
  expiresAt: z.string(),
  acceptedAt: z.string().nullable(),
  revokedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const createAdminInviteSchema = z.object({
  email: z.string().email()
});

export const acceptAdminInviteSchema = z.object({
  token: z.string().min(12),
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8)
});

export const rideQuoteResponseSchema = z.object({
  estimatedMiles: z.number().nonnegative(),
  estimatedMinutes: z.number().nonnegative(),
  routeProvider: z.enum(["mapbox", "fallback"]),
  platformMarketKey: z.string(),
  estimatedSubtotal: z.number().nonnegative(),
  estimatedPlatformDue: z.number().nonnegative(),
  estimatedCustomerTotal: z.number().nonnegative()
});

export const addressSuggestionsResponseSchema = z.array(addressSuggestionSchema);

export const publicRideResponseSchema = z.object({
  ride: rideSchema,
  trackingUrl: z.string().url(),
  share: shareInfoSchema.nullable(),
  communityAccess: communityAccessLinkSchema.nullable()
});

export const publicRideTrackingResponseSchema = z.object({
  ride: rideSchema,
  share: shareInfoSchema.nullable(),
  communityAccess: communityAccessLinkSchema.nullable()
});

export const riderLeadResponseSchema = z.object({
  lead: riderLeadSchema,
  share: shareInfoSchema.nullable()
});

export const publicShareResolveResponseSchema = z.object({
  referralCode: z.string(),
  destinationUrl: z.string().url(),
  ownerName: z.string().nullable(),
  ownerRole: roleSchema.nullable()
});

export const adminLeadsResponseSchema = z.object({
  riderLeads: z.array(riderLeadSchema),
  driverInterests: z.array(driverInterestSchema)
});

export const driverDuesResponseSchema = z.object({
  collectibleAccrued: z.array(platformDueSchema),
  openBatches: z.array(platformDueBatchSchema),
  overdueBatches: z.array(platformDueBatchSchema),
  history: z.array(platformDueBatchSchema),
  payoutSettings: platformPayoutSettingsSchema.nullable(),
  collector: collectorAdminSummarySchema.nullable(),
  blocked: z.boolean(),
  blockedReason: z.string().nullable(),
  overdueCount: z.number().int().nonnegative(),
  outstandingTotal: z.number().nonnegative()
});

export const adminDuesResponseSchema = z.object({
  needsBatching: z.array(driverDueSnapshotSchema),
  openBatches: z.array(platformDueBatchSchema),
  overdueBatches: z.array(platformDueBatchSchema),
  history: z.array(platformDueBatchSchema),
  payoutSettings: platformPayoutSettingsSchema.nullable(),
  overdueDrivers: z.array(overdueDriverSummarySchema),
  adminUsers: z.array(collectorAdminSummarySchema),
  ownedByDefault: z.boolean()
});

export const adminInvitesResponseSchema = z.object({
  invites: z.array(adminInviteSchema)
});

export const adminTeamResponseSchema = z.object({
  admins: z.array(sessionUserSchema),
  invites: z.array(adminInviteSchema)
});

export const communityBoardResponseSchema = z.object({
  proposals: z.array(communityProposalSchema),
  eligibility: communityEligibilitySchema
});

export const communityCommentsResponseSchema = z.object({
  proposal: communityProposalSchema,
  comments: z.array(communityCommentSchema),
  eligibility: communityEligibilitySchema
});

export const issueReportResponseSchema = z.object({
  report: issueReportSchema
});

export const adSubmissionResponseSchema = z.object({
  submission: adSubmissionSchema
});

export const pushSubscriptionKeysSchema = z.object({
  p256dh: z.string().min(8),
  auth: z.string().min(8)
});

export const pushSubscriptionSchema = z.object({
  id: z.string(),
  endpoint: z.string().url(),
  keys: pushSubscriptionKeysSchema,
  userAgent: z.string().nullable(),
  enabled: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const notificationPreferenceSchema = z.object({
  pushEnabled: z.boolean(),
  smsCriticalOnly: z.boolean()
});

export const updateNotificationPreferenceSchema = z
  .object({
    pushEnabled: z.boolean().optional(),
    smsCriticalOnly: z.boolean().optional()
  })
  .refine((value) => value.pushEnabled !== undefined || value.smsCriticalOnly !== undefined, {
    message: "At least one preference field is required."
  });

export const upsertPushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: pushSubscriptionKeysSchema,
  userAgent: z.string().max(500).optional()
});

export const removePushSubscriptionSchema = z.object({
  endpoint: z.string().url()
});

export const notificationDeliveryLogSchema = z.object({
  id: z.string(),
  rideId: z.string().nullable(),
  channel: z.enum(["push", "sms"]),
  eventKey: z.string(),
  status: z.enum(["sent", "failed", "skipped"]),
  errorCode: z.string().nullable(),
  errorText: z.string().nullable(),
  metadata: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).nullable(),
  createdAt: z.string()
});

export const notificationPreferencesResponseSchema = z.object({
  preferences: notificationPreferenceSchema,
  subscriptionCount: z.number().int().nonnegative(),
  subscriptions: z.array(pushSubscriptionSchema)
});

export const notificationDeliveryLogsResponseSchema = z.object({
  logs: z.array(notificationDeliveryLogSchema)
});

export const trackSiteHeartbeatSchema = z.object({
  sessionId: z.string().min(8).max(120),
  path: z.string().min(1).max(500).optional(),
  referrer: z.string().max(500).optional()
});

export const trackSiteHeartbeatResponseSchema = z.object({
  ok: z.literal(true)
});

export const adminActivityTopPathSchema = z.object({
  path: z.string(),
  hits: z.number().int().nonnegative()
});

export const adminActivityRecentVisitorSchema = z.object({
  sessionId: z.string(),
  userId: z.string().nullable(),
  firstSeenAt: z.string(),
  lastSeenAt: z.string(),
  lastPath: z.string().nullable(),
  referrer: z.string().nullable(),
  heartbeatCount: z.number().int().nonnegative()
});

export const adminActivityResponseSchema = z.object({
  windowMinutes: z.number().int().positive(),
  activeVisitors: z.number().int().nonnegative(),
  visitors24h: z.number().int().nonnegative(),
  heartbeats24h: z.number().int().nonnegative(),
  topPaths: z.array(adminActivityTopPathSchema),
  recentVisitors: z.array(adminActivityRecentVisitorSchema)
});

export const ridesResponseSchema = z.array(rideSchema);
export const pricingRulesResponseSchema = z.array(pricingRuleSchema);
export const driverRatesResponseSchema = driverRateCardSchema;
export const driversResponseSchema = z.array(driverAccountSchema);
export const driverApplicationsResponseSchema = z.array(driverAccountSchema);

export type Role = z.infer<typeof roleSchema>;
export type RideType = z.infer<typeof rideTypeSchema>;
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;
export type PaymentStatus = z.infer<typeof paymentStatusSchema>;
export type DuePaymentMethod = z.infer<typeof duePaymentMethodSchema>;
export type PlatformDueStatus = z.infer<typeof platformDueStatusSchema>;
export type PlatformDueBatchStatus = z.infer<typeof platformDueBatchStatusSchema>;
export type DriverInterestStatus = z.infer<typeof driverInterestStatusSchema>;
export type DriverApprovalStatus = z.infer<typeof driverApprovalStatusSchema>;
export type DriverPricingMode = z.infer<typeof driverPricingModeSchema>;
export type DriverDocumentType = z.infer<typeof driverDocumentTypeSchema>;
export type DriverDocumentStatus = z.infer<typeof driverDocumentStatusSchema>;
export type AdSubmissionStatus = z.infer<typeof adSubmissionStatusSchema>;
export type DriverAdCreditStatus = z.infer<typeof driverAdCreditStatusSchema>;
export type DispatchMode = z.infer<typeof dispatchModeSchema>;
export type RidePricingSource = z.infer<typeof ridePricingSourceSchema>;
export type CommunityVoteChoice = z.infer<typeof communityVoteChoiceSchema>;
export type IssueReportSource = z.infer<typeof issueReportSourceSchema>;
export type IssueReportStatus = z.infer<typeof issueReportStatusSchema>;
export type RideStatus = z.infer<typeof rideStatusSchema>;
export type RideOfferStatus = z.infer<typeof rideOfferStatusSchema>;
export type Coordinates = z.infer<typeof coordinatesSchema>;
export type RouteLocation = z.infer<typeof routeLocationSchema>;
export type AddressSuggestion = z.infer<typeof addressSuggestionSchema>;
export type Vehicle = z.infer<typeof vehicleSchema>;
export type VehicleInput = z.infer<typeof vehicleInputSchema>;
export type DriverDispatchSettings = z.infer<typeof driverDispatchSettingsSchema>;
export type PricingRule = z.infer<typeof pricingRuleSchema>;
export type DriverRateRule = z.infer<typeof driverRateRuleSchema>;
export type DriverRateCard = z.infer<typeof driverRateCardSchema>;
export type DriverDocumentUpload = z.infer<typeof driverDocumentUploadSchema>;
export type AdAssetUpload = z.infer<typeof adAssetUploadSchema>;
export type DriverOnboardingDocument = z.infer<typeof driverOnboardingDocumentSchema>;
export type DriverDocumentReviewSummary = z.infer<typeof driverDocumentReviewSummarySchema>;
export type SessionUser = z.infer<typeof sessionUserSchema>;
export type CollectorAdminSummary = z.infer<typeof collectorAdminSummarySchema>;
export type DriverAccount = z.infer<typeof driverAccountSchema>;
export type RidePricingSnapshot = z.infer<typeof ridePricingSnapshotSchema>;
export type PaymentRecord = z.infer<typeof paymentRecordSchema>;
export type RideOffer = z.infer<typeof rideOfferSchema>;
export type LocationPing = z.infer<typeof locationPingSchema>;
export type Ride = z.infer<typeof rideSchema>;
export type ShareInfo = z.infer<typeof shareInfoSchema>;
export type CommunityAccessLink = z.infer<typeof communityAccessLinkSchema>;
export type RiderLead = z.infer<typeof riderLeadSchema>;
export type DriverInterest = z.infer<typeof driverInterestSchema>;
export type PlatformPayoutSettings = z.infer<typeof platformPayoutSettingsSchema>;
export type AdPricingSettings = z.infer<typeof adPricingSettingsSchema>;
export type PlatformDue = z.infer<typeof platformDueSchema>;
export type PlatformDueBatch = z.infer<typeof platformDueBatchSchema>;
export type DriverDueSnapshot = z.infer<typeof driverDueSnapshotSchema>;
export type OverdueDriverSummary = z.infer<typeof overdueDriverSummarySchema>;
export type AdSubmissionMetrics = z.infer<typeof adSubmissionMetricsSchema>;
export type AdSubmission = z.infer<typeof adSubmissionSchema>;
export type CreateAdSubmissionInput = z.infer<typeof createAdSubmissionSchema>;
export type AdminUpdateAdSubmissionInput = z.infer<typeof adminUpdateAdSubmissionSchema>;
export type DriverAdProgramEnrollment = z.infer<typeof driverAdProgramEnrollmentSchema>;
export type UpdateDriverAdProgramInput = z.infer<typeof updateDriverAdProgramSchema>;
export type DriverAdCreditSummary = z.infer<typeof driverAdCreditSummarySchema>;
export type DriverAdProgramActiveAd = z.infer<typeof driverAdProgramActiveAdSchema>;
export type DriverAdProgramResponse = z.infer<typeof driverAdProgramResponseSchema>;
export type AdminDriverAdCreditSummary = z.infer<typeof adminDriverAdCreditSummarySchema>;
export type AdminAdsResponse = z.infer<typeof adminAdsResponseSchema>;
export type UpdateAdPricingSettingsInput = z.infer<typeof updateAdPricingSettingsSchema>;
export type ApplyDriverAdCreditsInput = z.infer<typeof applyDriverAdCreditsSchema>;
export type AdVisitResolveResponse = z.infer<typeof adVisitResolveResponseSchema>;
export type AdDisplayItem = z.infer<typeof adDisplayItemSchema>;
export type PublicAdDisplayResponse = z.infer<typeof publicAdDisplayResponseSchema>;
export type PublicAdPricingResponse = z.infer<typeof publicAdPricingResponseSchema>;
export type CommunityEligibility = z.infer<typeof communityEligibilitySchema>;
export type CommunityAuthor = z.infer<typeof communityAuthorSchema>;
export type CommunityProposal = z.infer<typeof communityProposalSchema>;
export type CommunityComment = z.infer<typeof communityCommentSchema>;
export type AuthOtpRequest = z.infer<typeof authOtpRequestSchema>;
export type AuthOtpVerify = z.infer<typeof authOtpVerifySchema>;
export type AdminLogin = z.infer<typeof adminLoginSchema>;
export type DriverBootstrapInput = z.infer<typeof driverBootstrapInputSchema>;
export type DriverApplicationInput = z.infer<typeof driverApplicationInputSchema>;
export type AdminSetupInput = z.infer<typeof adminSetupInputSchema>;
export type DriverSignupInput = z.infer<typeof driverSignupInputSchema>;
export type DriverLoginInput = z.infer<typeof driverLoginSchema>;
export type CreateRideInput = z.infer<typeof createRideSchema>;
export type PublicRideRequest = z.infer<typeof publicRideRequestSchema>;
export type RiderLeadInput = z.infer<typeof riderLeadInputSchema>;
export type DriverInterestInput = z.infer<typeof driverInterestInputSchema>;
export type DriverProfileUpdateInput = z.infer<typeof driverProfileUpdateSchema>;
export type DriverDispatchSettingsUpdateInput = z.infer<typeof driverDispatchSettingsUpdateSchema>;
export type DriverRateCardUpdateInput = z.infer<typeof driverRateCardUpdateSchema>;
export type DriverLocationInput = z.infer<typeof driverLocationSchema>;
export type UpdateRideStatusInput = z.infer<typeof updateRideStatusSchema>;
export type DriverIdleLocationInput = z.infer<typeof driverIdleLocationSchema>;
export type AdminUpdateRideInput = z.infer<typeof adminUpdateRideSchema>;
export type AdminUpdateDriverApprovalInput = z.infer<typeof adminUpdateDriverApprovalSchema>;
export type AdminReviewDriverDocumentInput = z.infer<typeof adminReviewDriverDocumentSchema>;
export type AdminUpdateDriverInput = z.infer<typeof adminUpdateDriverSchema>;
export type UpdatePlatformRatesInput = z.infer<typeof updatePlatformRatesSchema>;
export type UpdatePricingRulesInput = z.infer<typeof updatePricingRulesSchema>;
export type BenchmarkProvider = z.infer<typeof benchmarkProviderSchema>;
export type PlatformRateBenchmarkRule = z.infer<typeof platformRateBenchmarkRuleSchema>;
export type UpdatePlatformRateBenchmarksInput = z.infer<typeof updatePlatformRateBenchmarksSchema>;
export type PlatformRateBenchmarksResponse = z.infer<typeof platformRateBenchmarksResponseSchema>;
export type PlatformRateAutoStatus = z.infer<typeof platformRateAutoStatusSchema>;
export type PlatformRateAutoApplyResponse = z.infer<typeof platformRateAutoApplyResponseSchema>;
export type MarketConfig = z.infer<typeof marketConfigSchema>;
export type MarketConfigsResponse = z.infer<typeof marketConfigsResponseSchema>;
export type CreateMarketConfigInput = z.infer<typeof createMarketConfigSchema>;
export type AdminAuditLog = z.infer<typeof adminAuditLogSchema>;
export type AdminAuditLogsResponse = z.infer<typeof adminAuditLogsResponseSchema>;
export type MarketRegion = z.infer<typeof marketRegionSchema>;
export type MarketRegionsResponse = z.infer<typeof marketRegionsResponseSchema>;
export type CreateMarketRegionInput = z.infer<typeof createMarketRegionSchema>;
export type UpdateMarketRegionInput = z.infer<typeof updateMarketRegionSchema>;
export type ApiKeyScope = z.infer<typeof apiKeyScopeSchema>;
export type ApiKey = z.infer<typeof apiKeySchema>;
export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;
export type CreateApiKeyResponse = z.infer<typeof createApiKeyResponseSchema>;
export type ApiKeysResponse = z.infer<typeof apiKeysResponseSchema>;
export type AdminBroadcastNotificationInput = z.infer<typeof adminBroadcastNotificationSchema>;
export type AdminOrderBgCheckInput = z.infer<typeof adminOrderBgCheckSchema>;
export type AdminReportOverview = z.infer<typeof adminReportOverviewSchema>;
export type CreateDriverRoleInput = z.infer<typeof createDriverRoleSchema>;
export type AdminUpdatePlatformDueInput = z.infer<typeof adminUpdatePlatformDueSchema>;
export type AdminUpdatePlatformDueBatchInput = z.infer<typeof adminUpdatePlatformDueBatchSchema>;
export type AdminReconcilePlatformDueBatchInput = z.infer<typeof adminReconcilePlatformDueBatchSchema>;
export type AdminTransferDriverCollectorInput = z.infer<typeof adminTransferDriverCollectorSchema>;
export type UpdatePlatformPayoutSettingsInput = z.infer<typeof updatePlatformPayoutSettingsSchema>;
export type CommunityAccessExchangeInput = z.infer<typeof communityAccessExchangeSchema>;
export type CreateCommunityProposalInput = z.infer<typeof createCommunityProposalSchema>;
export type CommunityVoteInput = z.infer<typeof communityVoteInputSchema>;
export type CreateCommunityCommentInput = z.infer<typeof createCommunityCommentSchema>;
export type AdminUpdateCommunityProposalInput = z.infer<typeof adminUpdateCommunityProposalSchema>;
export type AdminUpdateCommunityCommentInput = z.infer<typeof adminUpdateCommunityCommentSchema>;
export type CreateIssueReportInput = z.infer<typeof createIssueReportSchema>;
export type IssueReport = z.infer<typeof issueReportSchema>;
export type PushSubscription = z.infer<typeof pushSubscriptionSchema>;
export type PushSubscriptionKeys = z.infer<typeof pushSubscriptionKeysSchema>;
export type NotificationPreference = z.infer<typeof notificationPreferenceSchema>;
export type UpdateNotificationPreferenceInput = z.infer<typeof updateNotificationPreferenceSchema>;
export type UpsertPushSubscriptionInput = z.infer<typeof upsertPushSubscriptionSchema>;
export type RemovePushSubscriptionInput = z.infer<typeof removePushSubscriptionSchema>;
export type NotificationDeliveryLog = z.infer<typeof notificationDeliveryLogSchema>;
export type RideQuoteResponse = z.infer<typeof rideQuoteResponseSchema>;
export type AddressSuggestionsResponse = z.infer<typeof addressSuggestionsResponseSchema>;
export type AdminInviteStatus = z.infer<typeof adminInviteStatusSchema>;
export type AdminInvite = z.infer<typeof adminInviteSchema>;
export type CreateAdminInviteInput = z.infer<typeof createAdminInviteSchema>;
export type AcceptAdminInviteInput = z.infer<typeof acceptAdminInviteSchema>;
export type PublicRideResponse = z.infer<typeof publicRideResponseSchema>;
export type PublicRideTrackingResponse = z.infer<typeof publicRideTrackingResponseSchema>;
export type RiderLeadResponse = z.infer<typeof riderLeadResponseSchema>;
export type PublicShareResolveResponse = z.infer<typeof publicShareResolveResponseSchema>;
export type AdminLeadsResponse = z.infer<typeof adminLeadsResponseSchema>;
export type AdminSetupStatusResponse = z.infer<typeof adminSetupStatusResponseSchema>;
export type DriverDuesResponse = z.infer<typeof driverDuesResponseSchema>;
export type AdminDuesResponse = z.infer<typeof adminDuesResponseSchema>;
export type AdminInvitesResponse = z.infer<typeof adminInvitesResponseSchema>;
export type AdminTeamResponse = z.infer<typeof adminTeamResponseSchema>;
export type CommunityBoardResponse = z.infer<typeof communityBoardResponseSchema>;
export type CommunityCommentsResponse = z.infer<typeof communityCommentsResponseSchema>;
export type IssueReportResponse = z.infer<typeof issueReportResponseSchema>;
export type AdSubmissionResponse = z.infer<typeof adSubmissionResponseSchema>;
export type NotificationPreferencesResponse = z.infer<typeof notificationPreferencesResponseSchema>;
export type NotificationDeliveryLogsResponse = z.infer<typeof notificationDeliveryLogsResponseSchema>;
export type TrackSiteHeartbeatInput = z.infer<typeof trackSiteHeartbeatSchema>;
export type TrackSiteHeartbeatResponse = z.infer<typeof trackSiteHeartbeatResponseSchema>;
export type AdminActivityTopPath = z.infer<typeof adminActivityTopPathSchema>;
export type AdminActivityRecentVisitor = z.infer<typeof adminActivityRecentVisitorSchema>;
export type AdminActivityResponse = z.infer<typeof adminActivityResponseSchema>;
