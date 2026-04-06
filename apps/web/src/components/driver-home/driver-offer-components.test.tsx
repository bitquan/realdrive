import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { DriverAccount, DriverDispatchSettings, Ride } from "@shared/contracts";
import { DriverLiveOfferCard } from "./DriverLiveOfferCard";
import { DriverOnboardingChecklist } from "./DriverOnboardingChecklist";
import { DriverOfferInbox } from "./DriverOfferInbox";

function makeRide(overrides: Partial<Ride> = {}): Ride {
  return {
    id: "ride-1",
    riderId: "rider-1",
    driverId: null,
    status: "offered",
    rideType: "standard",
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
      method: "cashapp",
      status: "pending",
      amountDue: 30.03,
      collectedAt: null,
      collectedById: null
    },
    requestedAt: new Date("2026-04-05T12:00:00.000Z").toISOString(),
    scheduledFor: null,
    acceptedAt: null,
    startedAt: null,
    completedAt: null,
    canceledAt: null,
    rider: {
      id: "rider-1",
      roles: ["rider"],
      name: "Jordan Smith",
      phone: "+15555550155",
      email: null
    },
    driver: null,
    offers: [],
    latestLocation: null,
    test: {
      isTest: true,
      label: "Driver mobile continuity",
      createdByAdminId: "admin-1",
      targetDriverId: null
    },
    ...overrides
  };
}

function makeDriverProfile(overrides: Partial<DriverAccount> = {}): DriverAccount {
  return {
    id: "driver-1",
    role: "driver",
    roles: ["driver"],
    name: "Taylor Driver",
    phone: "+15555550101",
    email: "driver@example.com",
    referralCode: "driver-code",
    approvalStatus: "pending",
    approved: false,
    available: false,
    pricingMode: "platform",
    homeState: "VA",
    homeCity: "Richmond",
    acceptedPaymentMethods: ["cashapp"],
    dispatchSettings: {
      localEnabled: true,
      localRadiusMiles: 25,
      serviceAreaEnabled: true,
      serviceAreaStates: ["VA"],
      nationwideEnabled: false
    },
    documents: [],
    documentReview: {
      requiredTypes: ["insurance", "registration", "background_check", "mvr"],
      submittedTypes: ["insurance", "registration"],
      approvedTypes: ["insurance"],
      missingTypes: ["background_check", "mvr"],
      rejectedTypes: [],
      pendingCount: 0,
      readyForApproval: false
    },
    collectorAdminId: null,
    collectorAdmin: null,
    createdAt: new Date("2026-04-05T12:00:00.000Z").toISOString(),
    bgCheckExternalId: null,
    bgCheckOrderedAt: null,
    vehicle: {
      id: "vehicle-1",
      makeModel: "Toyota Camry",
      plate: "RIDE123",
      color: "Black",
      rideType: "standard",
      seats: 4
    },
    ...overrides
  };
}

const readyDispatchSettings: DriverDispatchSettings = {
  localEnabled: true,
  localRadiusMiles: 25,
  serviceAreaEnabled: true,
  serviceAreaStates: ["VA"],
  nationwideEnabled: false
};

describe("driver offer components", () => {
  it("hides and shows the mobile live offer card", async () => {
    const user = userEvent.setup();
    const acceptMutation = { isPending: false, mutate: vi.fn() };
    const declineMutation = { isPending: false, mutate: vi.fn() };

    render(
      <DriverLiveOfferCard
        offer={makeRide()}
        suspended={false}
        countdown="1m left"
        acceptMutation={acceptMutation}
        declineMutation={declineMutation}
        mobile
      />
    );

    expect(screen.getByRole("button", { name: "Accept Ride" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Hide" }));
    expect(screen.getByText("Live request hidden")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Show" }));
    expect(screen.getByRole("button", { name: "Accept Ride" })).toBeInTheDocument();
  });

  it("expands route-mode inbox rows and sends offer actions", async () => {
    const user = userEvent.setup();
    const acceptMutation = { isPending: false, mutate: vi.fn() };
    const declineMutation = { isPending: false, mutate: vi.fn() };
    const ride = makeRide();

    render(
      <DriverOfferInbox
        offers={[ride]}
        suspended={false}
        available
        now={Date.now()}
        acceptMutation={acceptMutation}
        declineMutation={declineMutation}
        mobile
        shellMode="route"
      />
    );

    expect(screen.queryByText(/Customer \$30\.03/)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Expand offer details" }));
    expect(screen.getByText(/Customer \$30\.03/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Accept" }));
    expect(acceptMutation.mutate).toHaveBeenCalledWith(ride.id);

    await user.click(screen.getByRole("button", { name: "Decline" }));
    expect(declineMutation.mutate).toHaveBeenCalledWith(ride.id);
  });

  it("disables accept actions when an offer has expired", () => {
    const acceptMutation = { isPending: false, mutate: vi.fn() };
    const declineMutation = { isPending: false, mutate: vi.fn() };
    const expiredRide = makeRide({
      offers: [
        {
          id: "offer-1",
          rideId: "ride-1",
          driverId: "driver-1",
          status: "pending",
          offeredAt: new Date(Date.now() - 60_000).toISOString(),
          respondedAt: null,
          expiresAt: new Date(Date.now() - 1_000).toISOString()
        }
      ]
    });

    render(
      <DriverLiveOfferCard
        offer={expiredRide}
        suspended={false}
        countdown="Expired"
        acceptMutation={acceptMutation}
        declineMutation={declineMutation}
        mobile
      />
    );

    expect(screen.getByRole("button", { name: "Offer expired" })).toBeDisabled();
    expect(screen.getByText(/request timed out/i)).toBeInTheDocument();
  });

  it("shows remaining onboarding work for drivers", () => {
    render(<DriverOnboardingChecklist profile={makeDriverProfile()} dispatchSettings={readyDispatchSettings} />);

    expect(screen.getByText("Finish driver onboarding")).toBeInTheDocument();
    expect(screen.getByText(/2 required uploads still missing/i)).toBeInTheDocument();
    expect(screen.getByText(/pending admin approval/i)).toBeInTheDocument();
  });
});