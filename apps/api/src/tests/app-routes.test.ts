import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockStore, mockMaps } = vi.hoisted(() => ({
  mockStore: {
    findSessionUserById: vi.fn(),
    ensureUserReferralCode: vi.fn(),
    listDriverOffers: vi.fn(),
    listPlatformPricingRules: vi.fn(),
    getFeatureVoteCount: vi.fn(),
    hasUserVotedForFeature: vi.fn(),
    getRideById: vi.fn(),
    listIssueReports: vi.fn(),
    updateRideAdmin: vi.fn(),
    addAuditLog: vi.fn(),
    getNotificationPreference: vi.fn(),
    listPushSubscriptions: vi.fn(),
    logNotificationDelivery: vi.fn()
  },
  mockMaps: {
    estimateRoute: vi.fn(),
    autocompleteAddress: vi.fn()
  }
}));

vi.mock("../lib/store.js", () => ({
  store: mockStore
}));

vi.mock("../services/maps.js", () => ({
  createMapsService: () => mockMaps
}));

import { buildApp } from "../app.js";

const approvedDriver = {
  id: "driver-1",
  role: "driver",
  roles: ["driver"],
  name: "Driver One",
  phone: "+15555550101",
  email: "driver@example.com",
  approved: true,
  approvalStatus: "approved",
  available: true,
  referralCode: "driver-code"
} as const;

const pendingDriver = {
  ...approvedDriver,
  approvalStatus: "pending" as const,
  approved: false
};

const adminUser = {
  id: "admin-1",
  role: "admin",
  roles: ["admin"],
  name: "Admin One",
  phone: "+15555550102",
  email: "admin@example.com",
  approved: true,
  approvalStatus: "approved",
  available: false,
  referralCode: "admin-code"
} as const;

describe("app route integration", () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(async () => {
    vi.clearAllMocks();

    mockStore.ensureUserReferralCode.mockImplementation(async () => approvedDriver);
    mockStore.listDriverOffers.mockResolvedValue([{ id: "offer-1" }]);
    mockStore.listPlatformPricingRules.mockResolvedValue([
      {
        id: "standard-va",
        marketKey: "VA",
        rideType: "standard",
        baseFare: 6,
        perMile: 2.2,
        perMinute: 0.4,
        multiplier: 1,
        updatedAt: new Date("2026-04-05T12:00:00.000Z").toISOString()
      }
    ]);
    mockStore.getFeatureVoteCount.mockResolvedValue(0);
    mockStore.hasUserVotedForFeature.mockResolvedValue(false);
    mockStore.getRideById.mockResolvedValue({
      id: "ride-1",
      riderId: "rider-1",
      driverId: approvedDriver.id,
      status: "accepted",
      pickup: { address: "801 E Main St, Richmond, VA" },
      dropoff: { address: "1001 Haxall Point, Richmond, VA" },
      rider: { id: "rider-1", name: "Jordan Smith", phone: "+15555550155" },
      driver: { id: approvedDriver.id, name: approvedDriver.name, phone: approvedDriver.phone }
    });
    mockStore.updateRideAdmin.mockResolvedValue({
      id: "ride-1",
      riderId: "rider-1",
      driverId: approvedDriver.id,
      status: "canceled",
      pickup: { address: "801 E Main St, Richmond, VA" },
      dropoff: { address: "1001 Haxall Point, Richmond, VA" },
      rider: { id: "rider-1", name: "Jordan Smith", phone: "+15555550155" },
      driver: { id: approvedDriver.id, name: approvedDriver.name, phone: approvedDriver.phone }
    });
    mockStore.addAuditLog.mockResolvedValue(undefined);
    mockStore.listIssueReports.mockResolvedValue([]);
    mockStore.getNotificationPreference.mockResolvedValue({
      pushEnabled: false,
      smsCriticalOnly: false
    });
    mockStore.listPushSubscriptions.mockResolvedValue([]);
    mockStore.logNotificationDelivery.mockResolvedValue(undefined);
    mockMaps.autocompleteAddress.mockResolvedValue([]);
    mockMaps.estimateRoute.mockResolvedValue({
      distanceMiles: 7,
      durationMinutes: 18,
      provider: "fallback",
      pickup: {
        address: "801 E Main St, Richmond, VA",
        lat: 37.5407,
        lng: -77.436,
        stateCode: "VA"
      },
      dropoff: {
        address: "1001 Haxall Point, Richmond, VA",
        lat: 37.5316,
        lng: -77.4377,
        stateCode: "VA"
      }
    });

    app = buildApp();
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it("rejects protected driver routes without a bearer token", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/driver/offers"
    });

    expect(response.statusCode).toBe(401);
    expect(response.json().message).toBe("Missing bearer token");
  });

  it("blocks pending drivers from protected driver routes", async () => {
    mockStore.findSessionUserById.mockResolvedValue(pendingDriver);
    const token = app.jwt.sign({ sub: pendingDriver.id });

    const response = await app.inject({
      method: "GET",
      url: "/driver/offers",
      headers: {
        authorization: `Bearer ${token}`
      }
    });

    expect(response.statusCode).toBe(403);
    expect(response.json().message).toBe("Driver account is not approved");
  });

  it("returns driver offers for approved drivers", async () => {
    mockStore.findSessionUserById.mockResolvedValue(approvedDriver);
    const token = app.jwt.sign({ sub: approvedDriver.id });

    const response = await app.inject({
      method: "GET",
      url: "/driver/offers",
      headers: {
        authorization: `Bearer ${token}`
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([{ id: "offer-1" }]);
  });

  it("calculates quote pricing through the route layer", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/quotes/ride",
      payload: {
        pickupAddress: "801 E Main St, Richmond, VA",
        dropoffAddress: "1001 Haxall Point, Richmond, VA",
        rideType: "standard"
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      estimatedMiles: 7,
      estimatedMinutes: 18,
      routeProvider: "fallback",
      platformMarketKey: "VA",
      estimatedSubtotal: 28.6,
      estimatedPlatformDue: 1.43,
      estimatedCustomerTotal: 30.08
    });
  });

  it("serves public roadmap data without authentication", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/public/roadmap"
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(
      expect.objectContaining({
        features: expect.any(Array),
        totalVotes: expect.any(Number)
      })
    );
  });

  it("accepts driver cancellation reasons through the route layer", async () => {
    mockStore.findSessionUserById.mockResolvedValue(approvedDriver);
    const token = app.jwt.sign({ sub: approvedDriver.id });

    const response = await app.inject({
      method: "POST",
      url: "/rides/ride-1/cancel",
      headers: {
        authorization: `Bearer ${token}`
      },
      payload: {
        reason: "Unsafe pickup — blocked entrance"
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ status: "canceled", id: "ride-1" });
    expect(mockStore.addAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: {
          canceledByRole: "driver",
          reason: "Unsafe pickup — blocked entrance"
        }
      })
    );
  });

  it("filters admin issue reports for feature request triage", async () => {
    mockStore.findSessionUserById.mockResolvedValue(adminUser);
    mockStore.listIssueReports.mockResolvedValue([
      {
        id: "issue-1",
        reporterId: approvedDriver.id,
        reporterRole: "driver",
        source: "driver_app",
        summary: "Add dispatch sort",
        details: null,
        page: "/driver",
        rideId: null,
        metadata: { kind: "feature_request" },
        githubIssueNumber: null,
        githubIssueUrl: null,
        githubSyncStatus: "pending",
        githubSyncError: null,
        createdAt: new Date("2026-04-06T10:00:00.000Z").toISOString(),
        updatedAt: new Date("2026-04-06T10:00:00.000Z").toISOString()
      },
      {
        id: "issue-2",
        reporterId: approvedDriver.id,
        reporterRole: "driver",
        source: "driver_app",
        summary: "Driver map froze",
        details: null,
        page: "/driver",
        rideId: null,
        metadata: { kind: "bug_report" },
        githubIssueNumber: 44,
        githubIssueUrl: "https://github.com/example/repo/issues/44",
        githubSyncStatus: "synced",
        githubSyncError: null,
        createdAt: new Date("2026-04-06T09:00:00.000Z").toISOString(),
        updatedAt: new Date("2026-04-06T09:00:00.000Z").toISOString()
      }
    ]);
    const token = app.jwt.sign({ sub: adminUser.id });

    const response = await app.inject({
      method: "GET",
      url: "/admin/issue-reports?kind=feature_request",
      headers: {
        authorization: `Bearer ${token}`
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      reports: [
        expect.objectContaining({
          id: "issue-1",
          summary: "Add dispatch sort"
        })
      ]
    });
  });
});