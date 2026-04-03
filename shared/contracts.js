import { z } from "zod";
export const roleSchema = z.enum(["rider", "driver", "admin"]);
export const rideTypeSchema = z.enum(["standard", "suv", "xl"]);
export const paymentMethodSchema = z.enum(["jim", "cashapp", "cash"]);
export const paymentStatusSchema = z.enum(["pending", "collected", "waived"]);
export const duePaymentMethodSchema = z.enum(["cashapp", "zelle", "jim", "cash", "other"]);
export const platformDueStatusSchema = z.enum(["pending", "paid", "waived", "overdue"]);
export const driverInterestStatusSchema = z.enum(["pending", "approved", "rejected"]);
export const driverApprovalStatusSchema = z.enum(["pending", "approved", "rejected"]);
export const driverPricingModeSchema = z.enum(["platform", "custom"]);
export const dispatchModeSchema = z.enum(["local", "service_area", "nationwide"]);
export const ridePricingSourceSchema = z.enum(["platform_market", "driver_custom", "admin_override"]);
export const communityVoteChoiceSchema = z.enum(["yes", "no"]);
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
const rateRuleFields = {
    rideType: rideTypeSchema,
    baseFare: z.number().nonnegative(),
    perMile: z.number().nonnegative(),
    perMinute: z.number().nonnegative(),
    multiplier: z.number().positive()
};
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
    vehicle: vehicleSchema.nullable().optional()
});
export const driverAccountSchema = sessionUserSchema.extend({
    approvalStatus: driverApprovalStatusSchema,
    approved: z.boolean(),
    available: z.boolean(),
    pricingMode: driverPricingModeSchema,
    homeState: z.string().nullable(),
    homeCity: z.string().nullable(),
    dispatchSettings: driverDispatchSettingsSchema,
    customRates: z.array(driverRateRuleSchema).optional(),
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
    finalDriverNet: z.number().nonnegative().nullable()
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
    subtotal: z.number().nonnegative(),
    customerTotal: z.number().nonnegative()
});
export const platformDueSchema = z.object({
    id: z.string(),
    rideId: z.string(),
    driverId: z.string(),
    amount: z.number().nonnegative(),
    status: platformDueStatusSchema,
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
export const driverSignupInputSchema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(8),
    phone: z.string().min(8),
    homeState: z.string().min(2).max(2),
    homeCity: z.string().min(2),
    vehicle: vehicleInputSchema
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
    vehicle: vehicleInputSchema.partial().optional()
});
export const driverDispatchSettingsUpdateSchema = driverDispatchSettingsSchema;
export const driverRateCardUpdateSchema = z.object({
    pricingMode: driverPricingModeSchema,
    rules: z.array(z.object({
        ...rateRuleFields
    }))
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
    rules: z.array(z.object({
        marketKey: z.string().min(2),
        ...rateRuleFields
    }))
});
export const updatePricingRulesSchema = updatePlatformRatesSchema;
export const createDriverRoleSchema = driverBootstrapInputSchema;
export const adminUpdatePlatformDueSchema = z.object({
    status: z.enum(["pending", "paid", "waived"]),
    paymentMethod: duePaymentMethodSchema.nullable().optional(),
    note: z.string().max(500).nullable().optional()
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
export const rideQuoteResponseSchema = z.object({
    estimatedMiles: z.number().nonnegative(),
    estimatedMinutes: z.number().nonnegative(),
    routeProvider: z.enum(["mapbox", "fallback"]),
    platformMarketKey: z.string(),
    estimatedSubtotal: z.number().nonnegative(),
    estimatedPlatformDue: z.number().nonnegative(),
    estimatedCustomerTotal: z.number().nonnegative()
});
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
    outstanding: z.array(platformDueSchema),
    history: z.array(platformDueSchema),
    payoutSettings: platformPayoutSettingsSchema.nullable(),
    suspended: z.boolean(),
    overdueCount: z.number().int().nonnegative(),
    outstandingTotal: z.number().nonnegative()
});
export const adminDuesResponseSchema = z.object({
    dues: z.array(platformDueSchema),
    payoutSettings: platformPayoutSettingsSchema.nullable(),
    overdueDrivers: z.array(overdueDriverSummarySchema)
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
export const ridesResponseSchema = z.array(rideSchema);
export const pricingRulesResponseSchema = z.array(pricingRuleSchema);
export const driverRatesResponseSchema = driverRateCardSchema;
export const driversResponseSchema = z.array(driverAccountSchema);
export const driverApplicationsResponseSchema = z.array(driverAccountSchema);
