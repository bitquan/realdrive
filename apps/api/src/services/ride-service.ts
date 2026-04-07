import type {
  AdminUpdateRideInput,
  CreateRideInput,
  DriverLocationInput,
  PaymentMethod,
  Ride,
  RideStatus,
  SessionUser
} from "@shared/contracts";
import {
  calculateCustomerTotal,
  calculateFare,
  calculatePlatformDue,
  findDriverRateRule,
  findPlatformPricingRule
} from "./pricing.js";
import type { MapsService, RideEventPublisher, Store } from "./types.js";

const ACTIVE_DRIVER_STATUSES = new Set<RideStatus>(["accepted", "en_route", "arrived", "in_progress"]);
const DISPATCH_TOTAL_WINDOW_MS = 5 * 60 * 1000;
const DISPATCH_OFFER_WINDOW_MS = 60 * 1000;

const DRIVER_TRANSITIONS: Record<string, RideStatus[]> = {
  accepted: ["en_route"],
  en_route: ["arrived"],
  arrived: ["in_progress"],
  in_progress: ["completed"]
};

const paymentMethodLabels: Record<PaymentMethod, string> = {
  jim: "Jim",
  cashapp: "Cash App",
  cash: "Cash"
};

function formatPaymentMethod(method: PaymentMethod) {
  return paymentMethodLabels[method];
}

function isDriverPaymentCompatible(driver: { acceptedPaymentMethods?: PaymentMethod[] }, method: PaymentMethod) {
  const acceptedPaymentMethods = driver.acceptedPaymentMethods;
  if (!acceptedPaymentMethods?.length) {
    return true;
  }

  return acceptedPaymentMethods.includes(method);
}

function getDriverAcceptedPaymentMethods(driver: { acceptedPaymentMethods?: PaymentMethod[] }): PaymentMethod[] {
  return driver.acceptedPaymentMethods?.length ? driver.acceptedPaymentMethods : (["jim", "cashapp", "cash"] as const);
}

export function canTransitionRide(current: RideStatus, next: RideStatus): boolean {
  if (current === next) {
    return true;
  }

  return DRIVER_TRANSITIONS[current]?.includes(next) ?? false;
}

export function createRideService(deps: {
  store: Store;
  maps: MapsService;
  events: RideEventPublisher;
}) {
  const { store, maps, events } = deps;

  function hasRole(user: SessionUser, role: SessionUser["role"]) {
    return user.role === role || user.roles.includes(role);
  }

  async function listDispatchCandidates(options: {
    pickup: Ride["pickup"];
    pickupStateCode?: string | null;
    paymentMethod: PaymentMethod;
    targetDriverId?: string | null;
  }) {
    const eligibleDrivers = await store.listEligibleDriversForRide(options.pickup, options.pickupStateCode);
    const targetedDriver = options.targetDriverId
      ? eligibleDrivers.find((driver) => driver.id === options.targetDriverId) ?? null
      : null;

    if (options.targetDriverId && !targetedDriver) {
      throw new Error("Selected driver is unavailable for this pickup area or is not currently dispatch eligible.");
    }

    if (targetedDriver && !isDriverPaymentCompatible(targetedDriver, options.paymentMethod)) {
      const acceptedPaymentMethods = getDriverAcceptedPaymentMethods(targetedDriver);
      throw new Error(
        `Driver does not accept ${formatPaymentMethod(options.paymentMethod)}. Accepted payment methods: ${acceptedPaymentMethods
          .map(formatPaymentMethod)
          .join(", ")}.`
      );
    }

    const compatibleDrivers = eligibleDrivers.filter((driver) => isDriverPaymentCompatible(driver, options.paymentMethod));
    const dispatchDrivers = targetedDriver
      ? [targetedDriver, ...compatibleDrivers.filter((driver) => driver.id !== targetedDriver.id)]
      : compatibleDrivers;

    return {
      eligibleDrivers,
      dispatchDrivers
    };
  }

  async function cancelUnacceptedRide(ride: Ride, reason: string) {
    const canceled = await store.updateRideAdmin(ride.id, {
      status: "canceled"
    });

    await store.addAuditLog({
      action: "ride.dispatch.canceled",
      entityType: "ride",
      entityId: ride.id,
      metadata: {
        reason,
        offerCount: ride.offers.length,
        targetedDriverId: ride.test.targetDriverId ?? null
      }
    });

    events.rideUpdated(canceled);
    return canceled;
  }

  async function dispatchRide(rideId: string, now = new Date()): Promise<Ride> {
    const ride = await store.getRideById(rideId);
    if (!ride) {
      throw new Error("Ride not found");
    }

    if (["accepted", "en_route", "arrived", "in_progress", "completed", "canceled"].includes(ride.status)) {
      return ride;
    }

    const pendingOffers = ride.offers.filter((offer) => offer.status === "pending");
    const hasLivePendingOffer = pendingOffers.some((offer) => new Date(offer.expiresAt).getTime() > now.getTime());

    if (hasLivePendingOffer) {
      return ride;
    }

    let refreshedRide = ride;

    if (pendingOffers.length) {
      refreshedRide = await store.expireRideOffers(ride.id);
    }

    const { dispatchDrivers } = await listDispatchCandidates({
      pickup: refreshedRide.pickup,
      pickupStateCode: refreshedRide.pickup.stateCode,
      paymentMethod: refreshedRide.payment.method,
      targetDriverId: refreshedRide.test.targetDriverId
    });

    const attemptedDriverIds = new Set(refreshedRide.offers.map((offer) => offer.driverId));
    const nextDriver = dispatchDrivers.find((driver) => !attemptedDriverIds.has(driver.id));
    const queueStartedAt = refreshedRide.offers.length
      ? Math.min(...refreshedRide.offers.map((offer) => new Date(offer.offeredAt).getTime()))
      : now.getTime();
    const remainingWindowMs = DISPATCH_TOTAL_WINDOW_MS - (now.getTime() - queueStartedAt);

    if (!nextDriver || remainingWindowMs <= 0) {
      return cancelUnacceptedRide(
        refreshedRide,
        remainingWindowMs <= 0 ? "dispatch_window_elapsed" : "no_eligible_drivers_remaining"
      );
    }

    const expiresAt = new Date(now.getTime() + Math.min(DISPATCH_OFFER_WINDOW_MS, remainingWindowMs));
    const offeredRide = await store.createRideOffers(ride.id, [nextDriver.id], expiresAt);
    events.rideOffered(offeredRide, [nextDriver.id]);

    return offeredRide;
  }

  return {
    async createRide(
      rider: SessionUser,
      input: CreateRideInput,
      options?: {
        publicTrackingToken?: string;
        referredByUserId?: string | null;
        referredByCode?: string | null;
        isTest?: boolean;
        testLabel?: string | null;
        createdByAdminId?: string | null;
        targetDriverId?: string | null;
      }
    ) {
      const route = await maps.estimateRoute(input.pickupAddress, input.dropoffAddress);
      const platformMarketKey = route.pickup.stateCode?.toUpperCase() ?? "DEFAULT";
      const pricingRules = await store.listPlatformPricingRules();
      const rule = findPlatformPricingRule(pricingRules, input.rideType, platformMarketKey);

      if (!rule) {
        throw new Error(`Missing platform pricing rule for ${input.rideType}`);
      }

      await listDispatchCandidates({
        pickup: route.pickup,
        pickupStateCode: route.pickup.stateCode,
        paymentMethod: input.paymentMethod,
        targetDriverId: options?.targetDriverId
      });

      const status: RideStatus = input.scheduledFor ? "scheduled" : "requested";
      const quotedFare = calculateFare(rule, route.distanceMiles, route.durationMinutes);
      const created = await store.createRide({
        riderId: rider.id,
        isTest: options?.isTest ?? false,
        testLabel: options?.testLabel ?? null,
        createdByAdminId: options?.createdByAdminId ?? null,
        targetDriverId: options?.targetDriverId ?? null,
        rideType: input.rideType,
        paymentMethod: input.paymentMethod,
        route,
        quotedFare,
        estimatedPlatformDue: calculatePlatformDue(quotedFare),
        estimatedCustomerTotal: calculateCustomerTotal(quotedFare),
        publicTrackingToken: options?.publicTrackingToken,
        referredByUserId: options?.referredByUserId ?? null,
        referredByCode: options?.referredByCode ?? null,
        platformMarketKey,
        estimatedPricingSource: "platform_market",
        status,
        requestedAt: input.scheduledFor ? null : new Date(),
        scheduledFor: input.scheduledFor ? new Date(input.scheduledFor) : null
      });

      await store.addAuditLog({
        actorId: rider.id,
        action: "ride.created",
        entityType: "ride",
        entityId: created.id,
        metadata: {
          scheduledFor: created.scheduledFor,
          platformMarketKey
        }
      });

      if (status === "scheduled") {
        events.rideUpdated(created);
        return created;
      }

      return dispatchRide(created.id);
    },

    async dispatchRide(rideId: string) {
      return dispatchRide(rideId);
    },

    async releaseDueScheduledRides(now = new Date()) {
      const dueRides = await store.findDueScheduledRides(new Date(now.getTime() + 30 * 60 * 1000));
      const released: Ride[] = [];

      for (const ride of dueRides) {
        const dispatched = await dispatchRide(ride.id);
        released.push(dispatched);
      }

      return released;
    },

    async processDispatchQueues(now = new Date()) {
      const rides = await store.findRidesWithExpiredPendingOffers(now);
      const updated: Ride[] = [];

      for (const ride of rides) {
        updated.push(await dispatchRide(ride.id, now));
      }

      return updated;
    },

    async acceptRideOffer(rideId: string, driverId: string) {
      if (await store.driverHasOverdueDues(driverId)) {
        throw new Error("Driver has overdue platform dues and cannot accept new rides");
      }

      const accepted = await store.claimRideOffer(rideId, driverId, new Date());
      if (!accepted) {
        throw new Error("Offer is no longer available");
      }

      const driverAccount = await store.getDriverAccount(driverId);
      if (!driverAccount) {
        throw new Error("Driver account not found");
      }

      if (!isDriverPaymentCompatible(driverAccount, accepted.payment.method)) {
        const acceptedPaymentMethods = getDriverAcceptedPaymentMethods(driverAccount);
        throw new Error(
          `Driver does not accept ${formatPaymentMethod(accepted.payment.method)}. Rider must choose one of: ${acceptedPaymentMethods
            .map(formatPaymentMethod)
            .join(", ")}.`
        );
      }

      let pricedRide = accepted;
      if (driverAccount.pricingMode === "custom") {
        const rateCard = await store.getDriverRateCard(driverId);
        const customRule = findDriverRateRule(rateCard.rules, accepted.rideType);
        if (!customRule) {
          throw new Error(`Missing custom driver rate for ${accepted.rideType}`);
        }

        const subtotal = calculateFare(customRule, accepted.estimatedMiles, accepted.estimatedMinutes);
        pricedRide = await store.applyAcceptedRidePricing(rideId, {
          finalFare: subtotal,
          finalPlatformDue: calculatePlatformDue(subtotal),
          finalCustomerTotal: calculateCustomerTotal(subtotal),
          finalPricingSource: "driver_custom",
          matchedDriverPricingMode: "custom"
        });
      } else {
        const subtotal = accepted.fareOverride ?? accepted.quotedFare;
        pricedRide = await store.applyAcceptedRidePricing(rideId, {
          finalFare: subtotal,
          finalPlatformDue: calculatePlatformDue(subtotal),
          finalCustomerTotal: calculateCustomerTotal(subtotal),
          finalPricingSource: accepted.fareOverride != null ? "admin_override" : "platform_market",
          matchedDriverPricingMode: "platform"
        });
      }

      await store.addAuditLog({
        actorId: driverId,
        action: "ride.accepted",
        entityType: "ride",
        entityId: rideId,
        metadata: {
          pricingMode: driverAccount.pricingMode
        }
      });

      events.rideUpdated(pricedRide);
      return pricedRide;
    },

    async declineRideOffer(rideId: string, driverId: string) {
      const declined = await store.declineRideOffer(rideId, driverId);
      if (!declined) {
        throw new Error("Offer not found");
      }

      return dispatchRide(rideId);
    },

    async cancelRide(rideId: string, actor: SessionUser, input?: { reason?: string }) {
      const ride = await store.getRideById(rideId);
      if (!ride) {
        throw new Error("Ride not found");
      }

      const driverOwnsRide = hasRole(actor, "driver") && ride.driverId === actor.id;

      if (!hasRole(actor, "admin") && ride.riderId !== actor.id && !driverOwnsRide) {
        throw new Error("Not allowed to cancel this ride");
      }

      if (["completed", "canceled"].includes(ride.status)) {
        return ride;
      }

      if (ride.status === "offered") {
        await store.expireRideOffers(rideId);
      }

      const canceled = await store.updateRideAdmin(rideId, {
        status: "canceled"
      });

      await store.addAuditLog({
        actorId: actor.id,
        action: "ride.canceled",
        entityType: "ride",
        entityId: rideId,
        metadata: {
          canceledByRole: actor.role,
          reason: input?.reason?.trim() || null
        }
      });

      events.rideUpdated(canceled);
      return canceled;
    },

    async updateRideStatus(rideId: string, driverId: string, nextStatus: RideStatus) {
      const ride = await store.getRideById(rideId);
      if (!ride) {
        throw new Error("Ride not found");
      }

      if (ride.driverId !== driverId) {
        throw new Error("Only the assigned driver can update this ride");
      }

      if (!canTransitionRide(ride.status, nextStatus)) {
        throw new Error(`Cannot move ride from ${ride.status} to ${nextStatus}`);
      }

      const finalFare =
        nextStatus === "completed"
          ? ride.finalFare ?? ride.fareOverride ?? ride.quotedFare
          : null;
      const updated = await store.updateRideStatus(rideId, {
        status: nextStatus,
        finalFare,
        finalPlatformDue:
          nextStatus === "completed" && finalFare != null ? calculatePlatformDue(finalFare) : undefined,
        finalCustomerTotal:
          nextStatus === "completed" && finalFare != null ? calculateCustomerTotal(finalFare) : undefined
      });

      if (nextStatus === "completed") {
        await store.syncPlatformDueForRide(rideId);
      }

      await store.addAuditLog({
        actorId: driverId,
        action: `ride.status.${nextStatus}`,
        entityType: "ride",
        entityId: rideId
      });

      events.rideUpdated(updated);
      return updated;
    },

    async recordDriverLocation(driverId: string, input: DriverLocationInput) {
      const ride = await store.getRideById(input.rideId);
      if (!ride) {
        throw new Error("Ride not found");
      }

      if (ride.driverId !== driverId) {
        throw new Error("Only the assigned driver can report location");
      }

      if (!ride.driver || !ACTIVE_DRIVER_STATUSES.has(ride.status)) {
        throw new Error("Ride is not currently tracking live location");
      }

      const updated = await store.recordLocation({
        driverId,
        rideId: input.rideId,
        lat: input.lat,
        lng: input.lng,
        heading: input.heading,
        speed: input.speed,
        available: input.available
      });

      events.rideLocationUpdated(updated);

      const refreshedDriver = await store.setDriverAvailability(
        driverId,
        input.available ?? updated.driver?.available ?? false
      );
      events.driverAvailabilityChanged(refreshedDriver);

      return updated;
    },

    async updateRideFromAdmin(rideId: string, actorId: string, input: AdminUpdateRideInput) {
      const ride = await store.getRideById(rideId);
      if (!ride) {
        throw new Error("Ride not found");
      }

      const patch: {
        status?: RideStatus;
        paymentStatus?: Ride["payment"]["status"];
        fareOverride?: number | null;
        routeFallbackMiles?: number | null;
        quotedFare?: number;
        estimatedPlatformDue?: number;
        estimatedCustomerTotal?: number;
        finalFare?: number | null;
        finalPlatformDue?: number | null;
        finalCustomerTotal?: number | null;
        finalPricingSource?: Ride["finalPricingSource"];
        paymentCollectedById?: string | null;
        paymentCollectedAt?: Date | null;
      } = {
        status: input.status,
        paymentStatus: input.paymentStatus,
        fareOverride: input.fareOverride,
        finalFare: input.fareOverride ?? undefined,
        finalPlatformDue: input.fareOverride != null ? calculatePlatformDue(input.fareOverride) : undefined,
        finalCustomerTotal: input.fareOverride != null ? calculateCustomerTotal(input.fareOverride) : undefined,
        finalPricingSource: input.fareOverride != null ? "admin_override" : undefined,
        paymentCollectedById:
          input.paymentStatus === "collected" ? (input.paymentCollectedById ?? actorId) : undefined,
        paymentCollectedAt: input.paymentStatus === "collected" ? new Date() : undefined
      };

      if (input.fallbackMiles && ride.routeProvider === "fallback") {
        const pricingRules = await store.listPlatformPricingRules();
        const rule = findPlatformPricingRule(pricingRules, ride.rideType, ride.platformMarketKey);

        if (!rule) {
          throw new Error(`Missing platform pricing rule for ${ride.rideType}`);
        }

        patch.routeFallbackMiles = input.fallbackMiles;
        patch.quotedFare = calculateFare(rule, input.fallbackMiles, ride.estimatedMinutes);
        patch.estimatedPlatformDue = calculatePlatformDue(patch.quotedFare);
        patch.estimatedCustomerTotal = calculateCustomerTotal(patch.quotedFare);
        if (ride.finalPricingSource !== "driver_custom") {
          patch.finalFare = patch.fareOverride ?? patch.quotedFare;
          patch.finalPlatformDue = patch.finalFare != null ? calculatePlatformDue(patch.finalFare) : null;
          patch.finalCustomerTotal = patch.finalFare != null ? calculateCustomerTotal(patch.finalFare) : null;
          patch.finalPricingSource = patch.fareOverride != null ? "admin_override" : "platform_market";
        }
      }

      const updated = await store.updateRideAdmin(rideId, patch);
      if (updated.status === "completed") {
        await store.syncPlatformDueForRide(rideId);
      }
      await store.addAuditLog({
        actorId,
        action: "ride.admin.updated",
        entityType: "ride",
        entityId: rideId,
        metadata: input
      });

      events.rideUpdated(updated);
      return updated;
    }
  };
}
