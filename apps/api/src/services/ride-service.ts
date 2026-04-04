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

function getDriverAcceptedPaymentMethods(driver: { acceptedPaymentMethods?: PaymentMethod[] }) {
  return driver.acceptedPaymentMethods?.length ? driver.acceptedPaymentMethods : ["jim", "cashapp", "cash"];
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

  async function dispatchRide(rideId: string): Promise<Ride> {
    const ride = await store.getRideById(rideId);
    if (!ride) {
      throw new Error("Ride not found");
    }

    const eligibleDrivers = await store.listEligibleDriversForRide(ride.pickup, ride.pickup.stateCode);
    const compatibleDrivers = eligibleDrivers.filter((driver) => isDriverPaymentCompatible(driver, ride.payment.method));
    const offeredRide = await store.createRideOffers(
      ride.id,
      compatibleDrivers.map((driver) => driver.id),
      new Date(Date.now() + 2 * 60 * 1000)
    );

    if (compatibleDrivers.length) {
      events.rideOffered(offeredRide, compatibleDrivers.map((driver) => driver.id));
    } else {
      events.rideUpdated(offeredRide);
    }

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
      }
    ) {
      const route = await maps.estimateRoute(input.pickupAddress, input.dropoffAddress);
      const platformMarketKey = route.pickup.stateCode?.toUpperCase() ?? "DEFAULT";
      const pricingRules = await store.listPlatformPricingRules();
      const rule = findPlatformPricingRule(pricingRules, input.rideType, platformMarketKey);

      if (!rule) {
        throw new Error(`Missing platform pricing rule for ${input.rideType}`);
      }

      const eligibleDrivers = await store.listEligibleDriversForRide(route.pickup, route.pickup.stateCode);
      if (eligibleDrivers.length) {
        const compatibleDrivers = eligibleDrivers.filter((driver) => isDriverPaymentCompatible(driver, input.paymentMethod));
        if (!compatibleDrivers.length) {
          const acceptedPaymentMethods = Array.from(
            new Set(eligibleDrivers.flatMap((driver) => driver.acceptedPaymentMethods ?? []))
          );
          const acceptedLabel = acceptedPaymentMethods.length
            ? acceptedPaymentMethods.map(formatPaymentMethod).join(", ")
            : "none";

          throw new Error(
            `Driver does not accept ${formatPaymentMethod(input.paymentMethod)}. Accepted payment methods: ${acceptedLabel}.`
          );
        }
      }

      const status: RideStatus = input.scheduledFor ? "scheduled" : "requested";
      const quotedFare = calculateFare(rule, route.distanceMiles, route.durationMinutes);
      const created = await store.createRide({
        riderId: rider.id,
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

      events.rideUpdated(declined);
      return declined;
    },

    async cancelRide(rideId: string, actor: SessionUser) {
      const ride = await store.getRideById(rideId);
      if (!ride) {
        throw new Error("Ride not found");
      }

      if (!hasRole(actor, "admin") && ride.riderId !== actor.id) {
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
        entityId: rideId
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
