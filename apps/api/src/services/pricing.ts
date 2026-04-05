import type { DriverRateRule, PricingRule, RideType } from "@shared/contracts";

type FareRule = Pick<PricingRule, "baseFare" | "perMile" | "perMinute" | "multiplier">;
export const PLATFORM_DUE_RATE = 0.05;

/**
 * Flat per-ride SMS notification fee charged to each party.
 * Rider fee is added to their customer total.
 * Driver fee is surfaced in the pricing breakdown (deducted from their net).
 * Covers Twilio messaging costs (~$0.008/msg) with platform margin.
 */
export const SMS_RIDER_FEE = 0.05;
export const SMS_DRIVER_FEE = 0.05;

export function calculateFare(rule: FareRule, miles: number, minutes: number): number {
  const subtotal = rule.baseFare + miles * rule.perMile + minutes * rule.perMinute;
  return Number((subtotal * rule.multiplier).toFixed(2));
}

export function calculatePlatformDue(subtotal: number): number {
  return Number((subtotal * PLATFORM_DUE_RATE).toFixed(2));
}

export function calculateCustomerTotal(subtotal: number): number {
  return Number((subtotal + calculatePlatformDue(subtotal) + SMS_RIDER_FEE).toFixed(2));
}

export function calculateDriverNet(subtotal: number): number {
  return Number((subtotal - SMS_DRIVER_FEE).toFixed(2));
}

export function buildRidePricingSnapshot(subtotal: number, finalSubtotal?: number | null) {
  const normalizedFinalSubtotal = finalSubtotal == null ? null : Number(finalSubtotal.toFixed(2));
  const estimatedPlatformDue = calculatePlatformDue(subtotal);
  const finalPlatformDue = normalizedFinalSubtotal == null ? null : calculatePlatformDue(normalizedFinalSubtotal);

  return {
    platformDuePercent: PLATFORM_DUE_RATE,
    estimatedSubtotal: subtotal,
    estimatedPlatformDue,
    estimatedCustomerTotal: calculateCustomerTotal(subtotal),
    estimatedDriverNet: calculateDriverNet(subtotal),
    finalSubtotal: normalizedFinalSubtotal,
    finalPlatformDue,
    finalCustomerTotal: normalizedFinalSubtotal == null ? null : calculateCustomerTotal(normalizedFinalSubtotal),
    finalDriverNet: normalizedFinalSubtotal == null ? null : calculateDriverNet(normalizedFinalSubtotal),
    smsRiderFee: SMS_RIDER_FEE,
    smsDriverFee: SMS_DRIVER_FEE,
  };
}

export function findPlatformPricingRule(
  rules: PricingRule[],
  rideType: RideType,
  marketKey?: string | null
): PricingRule | undefined {
  const normalizedMarketKey = marketKey?.trim().toUpperCase() || "DEFAULT";

  return (
    rules.find((rule) => rule.marketKey.toUpperCase() === normalizedMarketKey && rule.rideType === rideType) ??
    rules.find((rule) => rule.marketKey.toUpperCase() === "DEFAULT" && rule.rideType === rideType)
  );
}

export function findDriverRateRule(
  rules: DriverRateRule[],
  rideType: RideType
): DriverRateRule | undefined {
  return rules.find((rule) => rule.rideType === rideType);
}
