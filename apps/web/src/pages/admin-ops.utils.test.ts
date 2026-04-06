import type { CommunityProposal, DriverAccount, IssueReport, Ride } from "@shared/contracts";
import { describe, expect, it } from "vitest";
import {
  getCommunityModerationMeta,
  getDispatchPriorityMeta,
  getDriverReviewQueueMeta,
  getDueWorkflowValidation,
  getIssueReportKind,
  getScheduledRideOpsMeta,
  summarizeIssueReports
} from "./admin-ops.utils";

function createDriver(overrides: Partial<DriverAccount> = {}): DriverAccount {
  return {
    id: "driver-1",
    role: "driver",
    roles: ["driver"],
    name: "Driver One",
    phone: "+15555550101",
    email: "driver@example.com",
    referralCode: "driver-code",
    available: false,
    approved: false,
    approvalStatus: "pending",
    homeState: "VA",
    homeCity: "Richmond",
    acceptedPaymentMethods: ["cashapp", "cash", "jim"],
    pricingMode: "platform",
    createdAt: new Date("2026-04-06T10:00:00.000Z").toISOString(),
    collectorAdminId: null,
    collectorAdmin: null,
    dispatchSettings: {
      localEnabled: true,
      localRadiusMiles: 25,
      serviceAreaEnabled: true,
      serviceAreaStates: ["VA"],
      nationwideEnabled: false
    },
    vehicle: {
      id: "vehicle-1",
      makeModel: "2022 Toyota Camry",
      plate: "TEST123",
      color: "Black",
      rideType: "standard",
      seats: 4
    },
    bgCheckExternalId: null,
    bgCheckOrderedAt: null,
    documents: [],
    documentReview: {
      requiredTypes: ["insurance", "registration", "background_check", "mvr"],
      submittedTypes: ["insurance", "registration"],
      approvedTypes: ["insurance", "registration"],
      missingTypes: ["background_check", "mvr"],
      rejectedTypes: [],
      pendingCount: 0,
      readyForApproval: false
    },
    ...overrides
  };
}

function createRide(overrides: Partial<Ride> = {}): Ride {
  return {
    id: "ride-1",
    riderId: "rider-1",
    driverId: null,
    publicTrackingToken: null,
    referredByUserId: null,
    referredByCode: null,
    status: "scheduled",
    rideType: "standard",
    pickup: { address: "801 E Main St, Richmond, VA", lat: 37.54, lng: -77.43, stateCode: "VA" },
    dropoff: { address: "1001 Haxall Point, Richmond, VA", lat: 37.53, lng: -77.43, stateCode: "VA" },
    estimatedMiles: 8,
    estimatedMinutes: 20,
    scheduledFor: new Date("2026-04-06T12:10:00.000Z").toISOString(),
    requestedAt: new Date("2026-04-06T11:10:00.000Z").toISOString(),
    acceptedAt: null,
    arrivedAt: null,
    startedAt: null,
    completedAt: null,
    canceledAt: null,
    expiredAt: null,
    latestLocation: null,
    rider: { id: "rider-1", name: "Jordan Smith", phone: "+15555550123", email: "rider@example.com" },
    driver: null,
    offers: [],
    payment: { method: "cashapp", status: "pending" },
    pricing: {
      marketKey: "VA",
      estimatedSubtotal: 28,
      estimatedPlatformDue: 1.4,
      estimatedCustomerTotal: 29.4,
      finalSubtotal: null,
      finalPlatformDue: null,
      finalCustomerTotal: null,
      estimatedPricingSource: "platform_market",
      finalPricingSource: null
    },
    share: null,
    test: { isTest: false, label: null, targetDriverId: null, createdByAdminId: null },
    createdAt: new Date("2026-04-06T11:10:00.000Z").toISOString(),
    updatedAt: new Date("2026-04-06T11:10:00.000Z").toISOString(),
    ...overrides
  } as Ride;
}

function createIssueReport(overrides: Partial<IssueReport> = {}): IssueReport {
  return {
    id: "issue-1",
    reporterId: "driver-1",
    reporterRole: "driver",
    source: "driver_app",
    summary: "Add dispatch filter",
    details: null,
    page: "/driver",
    rideId: null,
    metadata: { kind: "feature_request" },
    githubIssueNumber: null,
    githubIssueUrl: null,
    githubSyncStatus: "pending",
    githubSyncError: null,
    createdAt: new Date("2026-04-06T09:00:00.000Z").toISOString(),
    updatedAt: new Date("2026-04-06T09:00:00.000Z").toISOString(),
    ...overrides
  };
}

function createProposal(overrides: Partial<CommunityProposal> = {}): CommunityProposal {
  return {
    id: "proposal-1",
    title: "Improve driver inbox",
    body: "Need faster triage.",
    pinned: false,
    closed: false,
    hidden: false,
    author: { id: "driver-1", name: "Driver One", role: "driver" },
    yesVotes: 5,
    noVotes: 1,
    totalVotes: 6,
    commentCount: 2,
    viewerVote: null,
    createdAt: new Date("2026-04-06T09:00:00.000Z").toISOString(),
    updatedAt: new Date("2026-04-06T10:00:00.000Z").toISOString(),
    ...overrides
  };
}

describe("admin ops utils", () => {
  it("prioritizes driver packets that are ready for final approval", () => {
    const meta = getDriverReviewQueueMeta(
      createDriver({
        documentReview: {
          requiredTypes: ["insurance", "registration", "background_check", "mvr"],
          submittedTypes: ["insurance", "registration", "background_check", "mvr"],
          approvedTypes: ["insurance", "registration", "background_check", "mvr"],
          missingTypes: [],
          rejectedTypes: [],
          pendingCount: 0,
          readyForApproval: true
        }
      })
    );

    expect(meta.stage).toBe("ready");
    expect(meta.priority).toBe(0);
  });

  it("flags scheduled rides that should release now", () => {
    const meta = getScheduledRideOpsMeta(createRide(), new Date("2026-04-06T12:15:00.000Z"));
    expect(meta.bucket).toBe("release_now");
  });

  it("raises manual-attention priority for active rides without a live ping", () => {
    const meta = getDispatchPriorityMeta(
      createRide({ status: "accepted", scheduledFor: null, driverId: "driver-1" }),
      "manual_attention",
      new Date("2026-04-06T12:00:00.000Z")
    );

    expect(meta.label).toBe("Needs live ping");
    expect(meta.score).toBeGreaterThanOrEqual(80);
  });

  it("requires memo evidence or admin notes for dues reconciliation", () => {
    const validation = getDueWorkflowValidation({
      status: "paid",
      paymentMethod: "cashapp",
      observedTitle: "",
      observedNote: "",
      referenceText: ""
    });

    expect(validation.ready).toBe(false);
    expect(validation.warnings).toHaveLength(2);
  });

  it("summarizes feature requests and sync failures", () => {
    const summary = summarizeIssueReports([
      createIssueReport(),
      createIssueReport({
        id: "issue-2",
        metadata: { kind: "bug_report" },
        githubSyncStatus: "failed"
      })
    ]);

    expect(summary.featureRequests).toBe(1);
    expect(summary.bugReports).toBe(1);
    expect(summary.failedSync).toBe(1);
    expect(getIssueReportKind(createIssueReport())).toBe("feature_request");
  });

  it("pushes hidden community proposals to the top of moderation queues", () => {
    const meta = getCommunityModerationMeta(createProposal({ hidden: true }));
    expect(meta.label).toBe("Hidden");
    expect(meta.priority).toBeGreaterThan(90);
  });
});
