import { env } from "../config/env.js";
import { buildUndercutRules } from "./platform-rate-auto.js";
import type { Store } from "./types.js";

export interface AutoPricingRunResult {
  appliedRuleCount: number;
  sourceRuleCount: {
    uber: number;
    lyft: number;
  };
  runAt: string;
  undercutAmount: number;
}

export async function applyAutoPlatformRates(store: Store, trigger: "manual" | "scheduled" | "startup"): Promise<AutoPricingRunResult> {
  const undercutAmount = Math.max(0, Number(env.platformRateUndercutAmount.toFixed(2)));

  const snapshotRules = await store.listPlatformRateBenchmarks();
  const uberRules = snapshotRules
    .filter((rule) => rule.provider === "uber")
    .map((rule) => ({
      marketKey: rule.marketKey,
      rideType: rule.rideType,
      baseFare: rule.baseFare,
      perMile: rule.perMile,
      perMinute: rule.perMinute,
      multiplier: rule.multiplier
    }));

  const lyftRules = snapshotRules
    .filter((rule) => rule.provider === "lyft")
    .map((rule) => ({
      marketKey: rule.marketKey,
      rideType: rule.rideType,
      baseFare: rule.baseFare,
      perMile: rule.perMile,
      perMinute: rule.perMinute,
      multiplier: rule.multiplier
    }));

  if (!uberRules.length || !lyftRules.length) {
    throw new Error("Save Uber and Lyft benchmark snapshots in Admin Pricing to enable auto-apply");
  }

  const computedRules = buildUndercutRules(uberRules, lyftRules, undercutAmount);
  if (!computedRules.length) {
    throw new Error("No usable pricing rules computed from benchmark snapshots");
  }

  await store.replacePlatformPricingRules(computedRules);

  const nowIso = new Date().toISOString();

  await store.addAuditLog({
    action: "pricing.auto_apply.completed",
    entityType: "platformRates",
    entityId: "auto",
    metadata: {
      trigger,
      appliedRuleCount: computedRules.length,
      uberSourceRules: uberRules.length,
      lyftSourceRules: lyftRules.length,
      undercutAmount
    }
  });

  return {
    appliedRuleCount: computedRules.length,
    sourceRuleCount: {
      uber: uberRules.length,
      lyft: lyftRules.length
    },
    runAt: nowIso,
    undercutAmount
  };
}
