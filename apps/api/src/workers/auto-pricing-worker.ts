import { env } from "../config/env.js";
import { prisma } from "../lib/db.js";
import { store } from "../lib/store.js";
import { applyAutoPlatformRates } from "../services/platform-rate-auto-runner.js";

async function runOnce(trigger: "startup" | "scheduled") {
  try {
    const result = await applyAutoPlatformRates(store, trigger);
    console.log(
      `[auto-pricing-worker] applied ${result.appliedRuleCount} rules from ${result.sourceRuleCount.uber}/${result.sourceRuleCount.lyft} snapshots`
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    console.error(`[auto-pricing-worker] run failed: ${message}`);
  }
}

async function start() {
  const runnerMode = env.platformRateAutoApplyRunner === "worker" ? "worker" : "api";
  if (runnerMode !== "worker") {
    console.log("[auto-pricing-worker] skipped: set PLATFORM_RATE_AUTO_APPLY_RUNNER=worker to enable this process");
    return;
  }

  if (!env.platformRateAutoApplyEnabled) {
    console.log("[auto-pricing-worker] skipped: PLATFORM_RATE_AUTO_APPLY_ENABLED=false");
    return;
  }

  const intervalMinutes = Math.max(1, Math.floor(env.platformRateAutoApplyMinutes));

  await prisma.$connect();

  await runOnce("startup");
  setInterval(() => {
    void runOnce("scheduled");
  }, intervalMinutes * 60 * 1000);

  console.log(`[auto-pricing-worker] running every ${intervalMinutes} minute(s)`);
}

void start();
