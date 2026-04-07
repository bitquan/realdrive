import { describe, expect, it, vi } from "vitest";
import type { DriverAccount, Ride, SessionUser } from "@shared/contracts";
import { createRideService, canTransitionRide } from "../services/ride-service.js";
import type { Store } from "../services/types.js";

const rider: SessionUser = {
  id: "rider-1",
  role: "rider",
  roles: ["rider"],
  name: "Jordan Smith",
  phone: "+15551234567",
  email: null
};

const driver: SessionUser = {
  id: "driver-1",
  role: "driver",
  roles: ["driver"],
  name: "Marcus",
  phone: "+15552101991",
  email: "marcus@example.com",
  approved: true,
  approvalStatus: "approved",
  available: true,
  pricingMode: "platform",
  homeState: "VA",
  homeCity: "Richmond",
  vehicle: null
};

const driverAccount: DriverAccount = {
  ...driver,
  approved: true,
  approvalStatus: "approved",
  available: true,
  pricingMode: "platform",
  homeState: "VA",
  homeCity: "Richmond",
  acceptedPaymentMethods: ["jim", "cashapp", "cash"],
  dispatchSettings: {
    localEnabled: true,
    localRadiusMiles: 25,
    serviceAreaEnabled: true,
    serviceAreaStates: ["VA"],
    nationwideEnabled: false
  },
  customRates: [],
  vehicle: null,
  documents: [],
  documentReview: {
    requiredTypes: [],
    submittedTypes: [],
    approvedTypes: [],
    missingTypes: [],
    rejectedTypes: [],
    pendingCount: 0,
    readyForApproval: false
  }
};

function makeRide(overrides: Partial<Ride> = {}): Ride {
  return {
    id: "ride-1",
    riderId: rider.id,
    driverId: null,
    status: "requested",
    rideType: "standard",
    pickup: {
      address: "123 Main St, Richmond, VA",
      lat: 33.75,
      lng: -84.39,
      stateCode: "VA"
    },
    dropoff: {
      address: "Airport, Richmond, VA",
      lat: 33.63,
      lng: -84.44,
      stateCode: "VA"
    },
    estimatedMiles: 7,
    estimatedMinutes: 18,
    routeProvider: "fallback",
    routeFallbackMiles: null,
    platformMarketKey: "VA",
    estimatedPricingSource: "platform_market",
    finalPricingSource: null,
    matchedDriverPricingMode: null,
    quotedFare: 28.6,
    fareOverride: null,
    finalFare: null,
    pricing: {
      platformDuePercent: 0.05,
      estimatedSubtotal: 28.6,
      estimatedPlatformDue: 1.43,
      estimatedCustomerTotal: 30.03,
      estimatedDriverNet: 28.6,
      finalSubtotal: null,
      finalPlatformDue: null,
      finalCustomerTotal: null,
      finalDriverNet: null
    },
    payment: {
      method: "jim",
      status: "pending",
      amountDue: 30.03,
      collectedAt: null,
      collectedById: null
    },
    requestedAt: new Date().toISOString(),
    scheduledFor: null,
    acceptedAt: null,
    startedAt: null,
    completedAt: null,
    canceledAt: null,
    rider,
    driver: null,
    offers: [],
    latestLocation: null,
    test: {
      isTest: false,
      label: null,
      createdByAdminId: null,
      targetDriverId: null
    },
    ...overrides
  };
}

function createStore(stubs: Partial<Store>): Store {
  const notImplemented = async () => {
    throw new Error("Not implemented");
  };

  const defaults: Store = {
    findSessionUserById: notImplemented,
    getUserAuthStamp: async () => null,
    invalidateUserAuthStamp: async () => undefined,
    findUserForOtp: notImplemented,
    createRiderIdentity: notImplemented,
    getAdminSetupStatus: async () => ({ needsSetup: false }),
    setupAdmin: notImplemented,
    findAdminByEmail: notImplemented,
    findDriverByEmail: notImplemented,
    createDriverRole: notImplemented,
    createDriverAccount: notImplemented,
    getDriverAccount: async () => driverAccount,
    updateDriverProfile: notImplemented,
    getDriverDispatchSettings: async () => driverAccount.dispatchSettings,
    updateDriverDispatchSettings: async () => driverAccount.dispatchSettings,
    getDriverRateCard: async () => ({
      pricingMode: "platform",
      rules: []
    }),
    replaceDriverRateCard: notImplemented,
    findUserByReferralCode: async () => null,
    findUserByCommunityAccessToken: async () => null,
    ensureUserReferralCode: async () => rider,
    ensureUserCommunityAccessToken: async () => "community-token",
    listPlatformPricingRules: async () => [
      {
        id: "standard-va",
        marketKey: "VA",
        rideType: "standard",
        baseFare: 6,
        perMile: 2.2,
        perMinute: 0.4,
        multiplier: 1,
        updatedAt: new Date().toISOString()
      }
    ],
    replacePlatformPricingRules: notImplemented,
    listPlatformRateBenchmarks: async () => [],
    upsertPlatformRateBenchmarks: async () => [],
    listMarketConfigs: async () => [],
    createMarketConfig: async (input) => ({
      marketKey: input.marketKey,
      rideTypeCount: 3
    }),
    listAdminAuditLogs: async () => [],
    createRide: async () => makeRide(),
    getRideById: async () => makeRide(),
    getRideByPublicTrackingToken: async () => makeRide(),
    listRiderRides: async () => [],
    listEligibleDriversForRide: async () => [{ ...driverAccount, lat: 33.76, lng: -84.38, rating: 4.9, distanceMiles: 1.2 }],
    createRideOffers: async () =>
      makeRide({
        status: "offered",
        offers: [
          {
            id: "offer-1",
            rideId: "ride-1",
            driverId: driver.id,
            status: "pending",
            offeredAt: new Date().toISOString(),
            respondedAt: null,
            expiresAt: new Date(Date.now() + 60000).toISOString()
          }
        ]
      }),
    claimRideOffer: async () => makeRide({ status: "accepted", driverId: driver.id, driver }),
    applyAcceptedRidePricing: async (_rideId, pricing) =>
      makeRide({
        status: "accepted",
        driverId: driver.id,
        driver,
        finalFare: pricing.finalFare,
        pricing: {
          platformDuePercent: 0.05,
          estimatedSubtotal: 28.6,
          estimatedPlatformDue: 1.43,
          estimatedCustomerTotal: 30.03,
          estimatedDriverNet: 28.6,
          finalSubtotal: pricing.finalFare,
          finalPlatformDue: pricing.finalPlatformDue,
          finalCustomerTotal: pricing.finalCustomerTotal,
          finalDriverNet: pricing.finalFare
        },
        finalPricingSource: pricing.finalPricingSource,
        matchedDriverPricingMode: pricing.matchedDriverPricingMode
      }),
    declineRideOffer: async () => makeRide({ status: "offered" }),
    expireRideOffers: async () => makeRide({ status: "expired" }),
    listDriverOffers: async () => [],
    listActiveDriverRides: async () => [],
    updateRideStatus: async (_rideId, patch) =>
      makeRide({
        status: patch.status,
        driverId: driver.id,
        driver,
        finalFare: patch.finalFare ?? null,
        pricing: {
          platformDuePercent: 0.05,
          estimatedSubtotal: 28.6,
          estimatedPlatformDue: 1.43,
          estimatedCustomerTotal: 30.03,
          estimatedDriverNet: 28.6,
          finalSubtotal: patch.finalFare ?? null,
          finalPlatformDue: patch.finalPlatformDue ?? null,
          finalCustomerTotal: patch.finalCustomerTotal ?? null,
          finalDriverNet: patch.finalFare ?? null
        }
      }),
    updateRideAdmin: async (_rideId, patch) =>
      makeRide({
        status: patch.status ?? "requested",
        fareOverride: patch.fareOverride ?? null,
        finalFare: patch.finalFare ?? null,
        pricing: {
          platformDuePercent: 0.05,
          estimatedSubtotal: patch.quotedFare ?? 28.6,
          estimatedPlatformDue: patch.estimatedPlatformDue ?? 1.43,
          estimatedCustomerTotal: patch.estimatedCustomerTotal ?? 30.03,
          estimatedDriverNet: patch.quotedFare ?? 28.6,
          finalSubtotal: patch.finalFare ?? null,
          finalPlatformDue: patch.finalPlatformDue ?? null,
          finalCustomerTotal: patch.finalCustomerTotal ?? null,
          finalDriverNet: patch.finalFare ?? null
        },
        finalPricingSource: patch.finalPricingSource ?? null
      }),
    syncPlatformDueForRide: async () => null,
    listDriverDues: async () => [],
    listAllPlatformDues: async () => [],
    updatePlatformDue: notImplemented,
    getPlatformPayoutSettings: async () => null,
    updatePlatformPayoutSettings: notImplemented,
    getCollectorPayoutSettings: async () => null,
    updateCollectorPayoutSettings: notImplemented,
    listDriverDueBatches: async () => [],
    listAllDueBatches: async () => [],
    getDriverDueSnapshot: async () => ({
      driver: { id: "", name: "", email: null, phone: null, available: false },
      collector: null,
      collectibleUnbatchedTotal: 0,
      collectibleUnbatchedCount: 0,
      openBatchCount: 0,
      openBatchTotal: 0,
      overdueBatchCount: 0,
      overdueBatchTotal: 0,
      lastCompletedRideAt: null,
      adProgram: {
        optedIn: false,
        scanCount: 0,
        pendingCreditTotal: 0,
        appliedCreditTotal: 0,
        activeAdCount: 0
      }
    }),
    listDriverDueSnapshots: async () => [],
    createDueBatchForDriver: notImplemented,
    updateDueBatch: notImplemented,
    reconcileDueBatch: notImplemented,
    assignDriverCollector: async () => driverAccount,
    createAdminInvite: notImplemented,
    listAdminInvites: async () => [],
    listAdminTeamUsers: async () => [],
    revokeAdminInvite: notImplemented,
    acceptAdminInvite: notImplemented,
    recordIdleLocation: async () => driver,
    createRiderLead: notImplemented,
    reviewDriverDocument: notImplemented,
    getDriverDocumentFile: async () => ({
      absolutePath: "",
      fileName: "",
      mimeType: ""
    }),
    getNotificationPreference: async () => ({
      pushEnabled: true,
      smsCriticalOnly: false
    }),
    updateNotificationPreference: notImplemented,
    upsertPushSubscription: async () => undefined,
    removePushSubscription: async () => undefined,
    listPushSubscriptions: async () => [],
    listNotificationDeliveryLogs: async () => [],
    logNotificationDelivery: async () => undefined,
    trackSiteHeartbeat: async () => undefined,
    getAdminActivityOverview: async () => ({
      windowMinutes: 30,
      activeVisitors: 0,
      visitors24h: 0,
      heartbeats24h: 0,
      topPaths: [],
      recentVisitors: []
    }),
    createRoadmapFeatureVote: async () => undefined,
    removeRoadmapFeatureVote: async () => undefined,
    hasUserVotedForFeature: async () => false,
    getFeatureVoteCount: async () => 0,
    createIssueReport: notImplemented,
    listIssueReports: async () => [],
    updateIssueReportGitHubSync: notImplemented,
    driverHasOverdueDues: async () => false,
    markOverduePlatformDues: async () => [],
    recordLocation: async () => makeRide({ status: "en_route", driverId: driver.id, driver }),
    listRiderLeads: async () => [],
    createDriverInterest: notImplemented,
    createAdSubmission: notImplemented,
    listAdminAds: async () => ({
      submissions: [],
      driverCredits: [],
      pricingSettings: {
        baseDailyPrice: 10,
        defaultDriverCreditPerScan: 0.25,
        slotMultipliers: [
          { slotRank: 1, multiplier: 1.5 },
          { slotRank: 2, multiplier: 1 },
          { slotRank: 3, multiplier: 0.85 }
        ],
        dedupeWindowMinutes: 30,
        updatedAt: new Date().toISOString()
      }
    }),
    getAdPricingSettings: async () => ({
      baseDailyPrice: 10,
      defaultDriverCreditPerScan: 0.25,
      slotMultipliers: [
        { slotRank: 1, multiplier: 1.5 },
        { slotRank: 2, multiplier: 1 },
        { slotRank: 3, multiplier: 0.85 }
      ],
      dedupeWindowMinutes: 30,
      updatedAt: new Date().toISOString()
    }),
    updateAdPricingSettings: async () => ({
      baseDailyPrice: 10,
      defaultDriverCreditPerScan: 0.25,
      slotMultipliers: [
        { slotRank: 1, multiplier: 1.5 },
        { slotRank: 2, multiplier: 1 },
        { slotRank: 3, multiplier: 0.85 }
      ],
      dedupeWindowMinutes: 30,
      updatedAt: new Date().toISOString()
    }),
    updateAdSubmission: notImplemented,
    getDriverAdProgram: async () => ({
      enrollment: {
        driverId: driver.id,
        optedIn: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      summary: {
        scanCount: 0,
        pendingTotal: 0,
        appliedTotal: 0,
        availableOffsetTotal: 0,
        activeAdCount: 0
      },
      activeAds: []
    }),
    updateDriverAdProgram: async () => ({
      enrollment: {
        driverId: driver.id,
        optedIn: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      summary: {
        scanCount: 0,
        pendingTotal: 0,
        appliedTotal: 0,
        availableOffsetTotal: 0,
        activeAdCount: 0
      },
      activeAds: []
    }),
    getPublicAdDisplay: async () => ({
      driverName: driver.name,
      referralCode: "DRIV1234",
      optedIn: false,
      items: []
    }),
    resolveAdVisit: async () => ({
      destinationUrl: "https://example.com",
      businessName: "Example",
      headline: "Example ad"
    }),
    applyDriverAdCredits: async () => ({
      enrollment: {
        driverId: driver.id,
        optedIn: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      summary: {
        scanCount: 0,
        pendingTotal: 0,
        appliedTotal: 0,
        availableOffsetTotal: 0,
        activeAdCount: 0
      },
      activeAds: []
    }),
    listDriverInterests: async () => [],
    listAdminRides: async () => [],
    listAdminUsers: async () => [],
    listDrivers: async () => [driverAccount],
    listDriverApplications: async () => [driverAccount],
    updateDriver: async () => driverAccount,
    setDriverAvailability: async () => driver,
    findDueScheduledRides: async () => [],
      findRidesWithExpiredPendingOffers: async () => [],
    getCommunityEligibility: async () => ({
      canRead: true,
      canCreateProposal: true,
      canVote: true,
      canComment: true,
      completedRideCount: 60,
      threshold: 51,
      reason: null
    }),
    listCommunityProposals: async () => [],
    listAdminCommunityProposals: async () => [],
    createCommunityProposal: notImplemented,
    getCommunityProposalById: async () => null,
    getAdminCommunityProposalById: async () => null,
    voteOnCommunityProposal: notImplemented,
    listCommunityComments: async () => [],
    listAdminCommunityComments: async () => [],
    createCommunityComment: notImplemented,
    updateCommunityProposal: notImplemented,
    updateCommunityComment: notImplemented,
    addAuditLog: async () => undefined,
    listMarketRegions: async () => [],
    createMarketRegion: async (input) => ({
      id: "region-1",
      marketKey: input.marketKey,
      displayName: input.displayName,
      timezone: input.timezone ?? "America/New_York",
      serviceStates: input.serviceStates ?? [],
      serviceHours: null,
      dispatchWeightMultiplier: input.dispatchWeightMultiplier ?? 1.0,
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }),
    updateMarketRegion: async (_id, input) => ({
      id: "region-1",
      marketKey: "DEFAULT",
      displayName: input.displayName ?? "Default",
      timezone: "America/New_York",
      serviceStates: [],
      serviceHours: null,
      dispatchWeightMultiplier: 1.0,
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }),
    deleteMarketRegion: async () => undefined,
    listApiKeys: async () => [],
    createApiKey: async (input) => ({
      id: "key-1",
      label: input.label,
      keyPrefix: "rd_test12",
      scopes: input.scopes,
      ownerId: input.ownerId,
      lastUsedAt: null,
      createdAt: new Date().toISOString(),
      revokedAt: null
    }),
    revokeApiKey: async () => undefined,
    findApiKeyByHash: async () => null,
    touchApiKeyLastUsed: async () => undefined,
    getAdminReportOverview: async (period) => ({
      period,
      revenue: { total: 0, platformDuesCollected: 0, platformDuesPending: 0 },
      rides: { total: 0, completed: 0, canceled: 0, requested: 0 },
      drivers: { total: 0, approved: 0, available: 0, pendingApproval: 0 },
      riders: { total: 0, newInPeriod: 0 },
      topDrivers: [],
      ads: {
        submissions: 0,
        awaitingPayment: 0,
        published: 0,
        scanCount: 0,
        eligibleScanCount: 0,
        duplicateBlockedCount: 0,
        pendingDriverCredits: 0,
        appliedDriverCredits: 0,
        pendingRevenue: 0,
        collectedRevenue: 0
      },
      ridesPerDay: []
    }),
    orderDriverBgCheck: async (driverId) => ({ ...driverAccount, id: driverId }),
    resolveStripeDue: async () => undefined,
    listUserIdsForBroadcast: async () => [],
  };

  return {
    ...defaults,
    ...stubs
  } as Store;
}

describe("ride service", () => {
  it("allows only sequential driver transitions", () => {
    expect(canTransitionRide("accepted", "en_route")).toBe(true);
    expect(canTransitionRide("accepted", "completed")).toBe(false);
  });

  it("dispatches due scheduled rides", async () => {
    const rideOffered = vi.fn();
    const service = createRideService({
      store: createStore({
        findDueScheduledRides: async () => [
          makeRide({ id: "scheduled-1", status: "scheduled", scheduledFor: new Date().toISOString() })
        ]
      }),
      maps: {
        estimateRoute: vi.fn(),
        autocompleteAddress: vi.fn()
      },
      events: {
        rideOffered,
        rideUpdated: vi.fn(),
        rideLocationUpdated: vi.fn(),
        driverAvailabilityChanged: vi.fn()
      }
    });

    const released = await service.releaseDueScheduledRides(new Date());
    expect(released).toHaveLength(1);
    expect(rideOffered).toHaveBeenCalledTimes(1);
  });

  it("rejects booking when eligible drivers do not accept the selected payment method", async () => {
    const service = createRideService({
      store: createStore({
        listEligibleDriversForRide: async () => [
          {
            ...driverAccount,
            acceptedPaymentMethods: ["cashapp"],
            lat: 33.76,
            lng: -84.38,
            rating: 4.9,
            distanceMiles: 1.4
          }
        ]
      }),
      maps: {
        estimateRoute: vi.fn().mockResolvedValue({
          pickup: {
            address: "123 Main St, Richmond, VA",
            lat: 33.75,
            lng: -84.39,
            stateCode: "VA"
          },
          dropoff: {
            address: "Airport, Richmond, VA",
            lat: 33.63,
            lng: -84.44,
            stateCode: "VA"
          },
          distanceMiles: 7,
          durationMinutes: 18,
          provider: "fallback"
        }),
        autocompleteAddress: vi.fn()
      },
      events: {
        rideOffered: vi.fn(),
        rideUpdated: vi.fn(),
        rideLocationUpdated: vi.fn(),
        driverAvailabilityChanged: vi.fn()
      }
    });

    await expect(
      service.createRide(
        rider,
        {
          pickupAddress: "123 Main St, Richmond, VA",
          dropoffAddress: "Airport, Richmond, VA",
          rideType: "standard",
          paymentMethod: "jim"
        },
        {
          targetDriverId: driver.id
        }
      )
    ).rejects.toThrow("Accepted payment methods: Cash App");
  });

    it("offers the next eligible driver after a decline", async () => {
      const rideOffered = vi.fn();
      const fallbackDriver = {
        ...driverAccount,
        id: "driver-2",
        name: "Nina Lane",
        email: "nina@example.com",
        lat: 33.8,
        lng: -84.35,
        rating: 4.8,
        distanceMiles: 2.1
      };

      let currentRide = makeRide({
        status: "offered",
        offers: [
          {
            id: "offer-1",
            rideId: "ride-1",
            driverId: driver.id,
            status: "pending",
            offeredAt: new Date().toISOString(),
            respondedAt: null,
            expiresAt: new Date(Date.now() + 60_000).toISOString()
          }
        ],
        test: {
          isTest: false,
          label: null,
          createdByAdminId: null,
          targetDriverId: driver.id
        }
      });

      const service = createRideService({
        store: createStore({
          getRideById: async () => currentRide,
          listEligibleDriversForRide: async () => [
            { ...driverAccount, lat: 33.76, lng: -84.38, rating: 4.9, distanceMiles: 1.2 },
            fallbackDriver
          ],
          declineRideOffer: async () => {
            currentRide = makeRide({
              status: "expired",
              offers: [
                {
                  id: "offer-1",
                  rideId: "ride-1",
                  driverId: driver.id,
                  status: "declined",
                  offeredAt: new Date().toISOString(),
                  respondedAt: new Date().toISOString(),
                  expiresAt: new Date(Date.now() + 60_000).toISOString()
                }
              ],
              test: {
                isTest: false,
                label: null,
                createdByAdminId: null,
                targetDriverId: driver.id
              }
            });
            return currentRide;
          },
          createRideOffers: async (_rideId, driverIds) => {
            currentRide = makeRide({
              status: "offered",
              offers: [
                {
                  id: "offer-1",
                  rideId: "ride-1",
                  driverId: driver.id,
                  status: "declined",
                  offeredAt: new Date().toISOString(),
                  respondedAt: new Date().toISOString(),
                  expiresAt: new Date(Date.now() + 60_000).toISOString()
                },
                {
                  id: "offer-2",
                  rideId: "ride-1",
                  driverId: driverIds[0],
                  status: "pending",
                  offeredAt: new Date().toISOString(),
                  respondedAt: null,
                  expiresAt: new Date(Date.now() + 60_000).toISOString()
                }
              ],
              test: {
                isTest: false,
                label: null,
                createdByAdminId: null,
                targetDriverId: driver.id
              }
            });
            return currentRide;
          }
        }),
        maps: {
          estimateRoute: vi.fn(),
          autocompleteAddress: vi.fn()
        },
        events: {
          rideOffered,
          rideUpdated: vi.fn(),
          rideLocationUpdated: vi.fn(),
          driverAvailabilityChanged: vi.fn()
        }
      });

      const updated = await service.declineRideOffer("ride-1", driver.id);

      expect(updated.status).toBe("offered");
      expect(updated.offers.find((offer) => offer.driverId === fallbackDriver.id)?.status).toBe("pending");
      expect(rideOffered).toHaveBeenCalledWith(expect.objectContaining({ status: "offered" }), [fallbackDriver.id]);
    });

    it("cancels the ride after the five minute dispatch window closes", async () => {
      const rideUpdated = vi.fn();
      const updateRideAdmin = vi.fn(async () => makeRide({ status: "canceled", offers: [] }));
      const addAuditLog = vi.fn();
      const sixMinutesAgo = new Date(Date.now() - 6 * 60 * 1000).toISOString();
      let currentRide = makeRide({
        status: "offered",
        offers: [
          {
            id: "offer-1",
            rideId: "ride-1",
            driverId: driver.id,
            status: "pending",
            offeredAt: sixMinutesAgo,
            respondedAt: null,
            expiresAt: new Date(Date.now() - 1_000).toISOString()
          }
        ]
      });

      const service = createRideService({
        store: createStore({
          findRidesWithExpiredPendingOffers: async () => [currentRide],
          getRideById: async () => currentRide,
          expireRideOffers: async () => {
            currentRide = makeRide({
              status: "expired",
              offers: [
                {
                  id: "offer-1",
                  rideId: "ride-1",
                  driverId: driver.id,
                  status: "expired",
                  offeredAt: sixMinutesAgo,
                  respondedAt: new Date().toISOString(),
                  expiresAt: new Date(Date.now() - 1_000).toISOString()
                }
              ]
            });
            return currentRide;
          },
          listEligibleDriversForRide: async () => [{ ...driverAccount, lat: 33.76, lng: -84.38, rating: 4.9, distanceMiles: 1.2 }],
          updateRideAdmin,
          addAuditLog
        }),
        maps: {
          estimateRoute: vi.fn(),
          autocompleteAddress: vi.fn()
        },
        events: {
          rideOffered: vi.fn(),
          rideUpdated,
          rideLocationUpdated: vi.fn(),
          driverAvailabilityChanged: vi.fn()
        }
      });

      const processed = await service.processDispatchQueues(new Date());

      expect(processed).toHaveLength(1);
      expect(processed[0]?.status).toBe("canceled");
      expect(updateRideAdmin).toHaveBeenCalledWith("ride-1", { status: "canceled" });
      expect(addAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "ride.dispatch.canceled",
          metadata: expect.objectContaining({ reason: "dispatch_window_elapsed" })
        })
      );
      expect(rideUpdated).toHaveBeenCalledWith(expect.objectContaining({ status: "canceled" }));
    });

  it("rejects a second acceptance once the offer is gone", async () => {
    let claimed = false;
    const service = createRideService({
      store: createStore({
        claimRideOffer: async () => {
          if (claimed) {
            return null;
          }
          claimed = true;
          return makeRide({ status: "accepted", driverId: driver.id, driver });
        }
      }),
      maps: {
        estimateRoute: vi.fn(),
        autocompleteAddress: vi.fn()
      },
      events: {
        rideOffered: vi.fn(),
        rideUpdated: vi.fn(),
        rideLocationUpdated: vi.fn(),
        driverAvailabilityChanged: vi.fn()
      }
    });

    await expect(service.acceptRideOffer("ride-1", driver.id)).resolves.toMatchObject({
      status: "accepted"
    });
    await expect(service.acceptRideOffer("ride-1", driver.id)).rejects.toThrow("Offer is no longer available");
  });

  it("lets the assigned driver cancel a live ride and logs the reason", async () => {
    const addAuditLog = vi.fn();
    const service = createRideService({
      store: createStore({
        getRideById: async () => makeRide({ status: "accepted", driverId: driver.id, driver }),
        updateRideAdmin: async () => makeRide({ status: "canceled", driverId: driver.id, driver }),
        addAuditLog
      }),
      maps: {
        estimateRoute: vi.fn(),
        autocompleteAddress: vi.fn()
      },
      events: {
        rideOffered: vi.fn(),
        rideUpdated: vi.fn(),
        rideLocationUpdated: vi.fn(),
        driverAvailabilityChanged: vi.fn()
      }
    });

    const canceled = await service.cancelRide("ride-1", driver, {
      reason: "Vehicle issue — flat tire"
    });

    expect(canceled.status).toBe("canceled");
    expect(addAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: driver.id,
        action: "ride.canceled",
        metadata: {
          canceledByRole: "driver",
          reason: "Vehicle issue — flat tire"
        }
      })
    );
  });

  it("blocks drivers from canceling rides they do not own", async () => {
    const service = createRideService({
      store: createStore({
        getRideById: async () => makeRide({ status: "accepted", driverId: "driver-2", driver: { ...driver, id: "driver-2" } })
      }),
      maps: {
        estimateRoute: vi.fn(),
        autocompleteAddress: vi.fn()
      },
      events: {
        rideOffered: vi.fn(),
        rideUpdated: vi.fn(),
        rideLocationUpdated: vi.fn(),
        driverAvailabilityChanged: vi.fn()
      }
    });

    await expect(service.cancelRide("ride-1", driver, { reason: "Unsafe pickup" })).rejects.toThrow(
      "Not allowed to cancel this ride"
    );
  });
});
