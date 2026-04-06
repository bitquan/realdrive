import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockStore, mockMaps } = vi.hoisted(() => ({
  mockStore: {
    findSessionUserById: vi.fn(),
    ensureUserReferralCode: vi.fn(),
    listDriverOffers: vi.fn(),
    listPlatformPricingRules: vi.fn()
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
});