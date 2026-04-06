import type { Ride, RidePricingSource } from "@shared/contracts";

export interface MarketCondition {
  label: string;
  detail: string;
  toneClassName: string;
}

function sourceCopy(source: RidePricingSource) {
  if (source === "admin_override") {
    return "Admin adjustment";
  }

  if (source === "driver_custom") {
    return "Driver custom pricing";
  }

  return "Platform market";
}

export function deriveMarketCondition(ride: Ride): MarketCondition {
  const source = ride.finalPricingSource ?? ride.estimatedPricingSource;
  const customerTotal = ride.pricing.finalCustomerTotal ?? ride.pricing.estimatedCustomerTotal;
  const miles = Math.max(ride.estimatedMiles, 1);
  const dollarsPerMile = customerTotal / miles;

  if (source === "admin_override") {
    return {
      label: "Manual pricing",
      detail: sourceCopy(source),
      toneClassName: "border-ops-warning/30 bg-ops-warning/12 text-ops-warning"
    };
  }

  if (source === "driver_custom") {
    return {
      label: "Driver custom",
      detail: sourceCopy(source),
      toneClassName: "border-ops-primary/35 bg-ops-primary/14 text-ops-text"
    };
  }

  if (dollarsPerMile >= 3.2) {
    return {
      label: "Surge",
      detail: "High demand detected",
      toneClassName: "border-ops-destructive/30 bg-ops-destructive/12 text-ops-destructive"
    };
  }

  if (dollarsPerMile >= 2.4) {
    return {
      label: "Busy market",
      detail: "Elevated demand",
      toneClassName: "border-ops-warning/30 bg-ops-warning/12 text-ops-warning"
    };
  }

  return {
    label: "Normal market",
    detail: sourceCopy(source),
    toneClassName: "border-ops-border-soft bg-ops-panel/60 text-ops-muted"
  };
}
