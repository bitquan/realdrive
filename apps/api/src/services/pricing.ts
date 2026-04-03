import type { DriverRateRule, PricingRule, RideType } from "@shared/contracts";

type FareRule = Pick<PricingRule, "baseFare" | "perMile" | "perMinute" | "multiplier">;
export const PLATFORM_DUE_RATE = 0.05;

export function calculateFare(rule: FareRule, miles: number, minutes: number): number {
  const subtotal = rule.baseFare + miles * rule.perMile + minutes * rule.perMinute;
  return Number((subtotal * rule.multiplier).toFixed(2));
}

export function calculatePlatformDue(subtotal: number): number {
  return Number((subtotal * PLATFORM_DUE_RATE).toFixed(2));
}

export function calculateCustomerTotal(subtotal: number): number {
  return Number((subtotal + calculatePlatformDue(subtotal)).toFixed(2));
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
    estimatedDriverNet: subtotal,
    finalSubtotal: normalizedFinalSubtotal,
    finalPlatformDue,
    finalCustomerTotal: normalizedFinalSubtotal == null ? null : calculateCustomerTotal(normalizedFinalSubtotal),
    finalDriverNet: normalizedFinalSubtotal
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
