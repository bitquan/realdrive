import type { DriverDispatchSettings, Ride } from "@shared/contracts";
import { formatMoney } from "@/lib/utils";

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
  return getDriverOfferCountdownMeta(ride, now).label;
}

export function getDriverOfferCountdownMeta(ride: Ride, now: number) {
  const pendingOffer = ride.offers.find((offer) => offer.status === "pending");
  if (!pendingOffer) {
    return {
      label: null,
      tone: "queued" as const,
      detail: "Dispatch is still preparing this job.",
      progressPercent: null,
      expired: false
    };
  }

  const expiresAtMs = new Date(pendingOffer.expiresAt).getTime();
  const offeredAtMs = new Date(pendingOffer.offeredAt).getTime();
  const remainingMs = new Date(pendingOffer.expiresAt).getTime() - now;
  if (remainingMs <= 0) {
    return {
      label: "Expired",
      tone: "expired" as const,
      detail: "This request timed out. Wait for the next live offer or refresh the inbox.",
      progressPercent: 0,
      expired: true
    };
  }

  const totalSeconds = Math.ceil(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const totalMs = Math.max(expiresAtMs - offeredAtMs, 1);
  const tone = remainingMs <= 30_000 ? "warning" : "active";

  return {
    label: `${minutes}:${String(seconds).padStart(2, "0")}`,
    tone,
    detail:
      remainingMs <= 30_000
        ? "Expiring soon — respond now before dispatch moves on."
        : "Offer is live and ready to accept from this work surface.",
    progressPercent: Math.max(0, Math.min(100, Math.round((remainingMs / totalMs) * 100))),
    expired: false
  };
}

export function formatDriverMoneyCompact(amount: number) {
  if (!Number.isFinite(amount) || amount <= 0) {
    return "$0";
  }

  if (amount >= 1_000) {
    return "$999+";
  }

  return formatMoney(amount);
}

export function formatDriverMinutesCompact(minutes: number) {
  if (!Number.isFinite(minutes) || minutes <= 0) {
    return "—";
  }

  if (minutes >= 100) {
    return "99+ min";
  }

  return `${Math.round(minutes)} min`;
}

export function formatDriverMilesCompact(miles: number) {
  if (!Number.isFinite(miles) || miles <= 0) {
    return "—";
  }

  if (miles >= 100) {
    return "99+ mi";
  }

  if (miles >= 10) {
    return `${Math.round(miles)} mi`;
  }

  return `${miles.toFixed(1).replace(/\.0$/, "")} mi`;
}
