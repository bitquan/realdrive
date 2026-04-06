import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Ride } from "@shared/contracts";
import { DriverLiveOfferCard } from "./DriverLiveOfferCard";
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
});