import type { DriverDispatchSettings, Ride } from "@shared/contracts";

export function getDriverRidePricing(ride: Ride) {
  return {
    subtotal: ride.pricing.finalSubtotal ?? ride.pricing.estimatedSubtotal,
    platformDue: ride.pricing.finalPlatformDue ?? ride.pricing.estimatedPlatformDue,
    customerTotal: ride.pricing.finalCustomerTotal ?? ride.pricing.estimatedCustomerTotal
  };
}

export function formatDriverDispatchSummary(settings: DriverDispatchSettings | undefined) {
  if (!settings) {
    return "Loading dispatch";
  }

  const parts: string[] = [];

  if (settings.localEnabled) {
    parts.push(`Local ${settings.localRadiusMiles} mi`);
  }

  if (settings.serviceAreaEnabled) {
    parts.push(settings.serviceAreaStates.length ? `States ${settings.serviceAreaStates.join(", ")}` : "Service area");
  }

  if (settings.nationwideEnabled) {
    parts.push("Nationwide");
  }

  return parts.length ? parts.join(" · ") : "Dispatch off";
}

export function getDriverOfferCountdown(ride: Ride, now: number) {
  const pendingOffer = ride.offers.find((offer) => offer.status === "pending");
  if (!pendingOffer) {
    return null;
  }

  const remainingMs = new Date(pendingOffer.expiresAt).getTime() - now;
  if (remainingMs <= 0) {
    return "Expired";
  }

  const totalSeconds = Math.ceil(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
