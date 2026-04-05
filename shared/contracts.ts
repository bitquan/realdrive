import { z } from "zod";

export const roleSchema = z.enum(["rider", "driver", "admin"]);
export const rideTypeSchema = z.enum(["standard", "suv", "xl"]);
export const paymentMethodSchema = z.enum(["jim", "cashapp", "cash"]);
export const paymentStatusSchema = z.enum(["pending", "collected", "waived"]);
export const duePaymentMethodSchema = z.enum(["cashapp", "zelle", "jim", "cash", "other"]);
export const platformDueStatusSchema = z.enum(["pending", "paid", "waived", "overdue"]);
export const platformDueBatchStatusSchema = z.enum(["open", "paid", "waived", "overdue", "void"]);
export const driverInterestStatusSchema = z.enum(["pending", "approved", "rejected"]);
export const driverApprovalStatusSchema = z.enum(["pending", "approved", "rejected"]);
export const driverPricingModeSchema = z.enum(["platform", "custom"]);
export const driverDocumentTypeSchema = z.enum(["insurance", "registration", "background_check", "mvr"]);
export const driverDocumentStatusSchema = z.enum(["pending", "approved", "rejected"]);
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
  createdAt: z.string().optional()
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
  lastCompletedRideAt: z.string().nullable()
});

export const overdueDriverSummarySchema = z.object({
  driverId: z.string(),
  name: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  overdueAmount: z.number().nonnegative(),
  overdueCount: z.number().int().nonnegative()
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
export type PlatformDue = z.infer<typeof platformDueSchema>;
export type PlatformDueBatch = z.infer<typeof platformDueBatchSchema>;
export type DriverDueSnapshot = z.infer<typeof driverDueSnapshotSchema>;
export type OverdueDriverSummary = z.infer<typeof overdueDriverSummarySchema>;
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
export type NotificationPreferencesResponse = z.infer<typeof notificationPreferencesResponseSchema>;
export type NotificationDeliveryLogsResponse = z.infer<typeof notificationDeliveryLogsResponseSchema>;
