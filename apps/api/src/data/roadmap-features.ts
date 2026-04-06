/**
 * Roadmap Features Data
 * 
 * Source of truth for features displayed in the public roadmap page.
 * Maps to: docs/13-roadmap-baseline-25-features.md
 *
 * Release hygiene:
 * - Move shipped items to phase: "completed" in the same PR that ships them.
 * - Keep public endpoint visibility limited to now/next/completed.
 */

export type RoadmapPhase = "now" | "next" | "completed" | "later" | "deferred";

export interface RoadmapFeature {
  id: string;
  title: string;
  description: string;
  category: "rider" | "driver" | "admin" | "shared" | "product";
  area: string;
  phase: RoadmapPhase;
  impact: "high" | "medium" | "low";
  order: number;
}

export const ROADMAP_FEATURES: RoadmapFeature[] = [
  {
    id: "feature_1",
    title: "Rider booking form UX refresh",
    description: "Faster booking with clearer input states and validation",
    category: "rider",
    area: "UI / Rider",
    phase: "completed",
    impact: "high",
    order: 1
  },
  {
    id: "feature_2",
    title: "Driver dashboard layout cleanup",
    description: "Better readability for offers, active rides, and dues",
    category: "driver",
    area: "UI / Driver",
    phase: "now",
    impact: "high",
    order: 2
  },
  {
    id: "feature_3",
    title: "Admin dashboard KPI cards v2",
    description: "Faster operational visibility for rides, dues, drivers",
    category: "admin",
    area: "UI / Admin",
    phase: "next",
    impact: "high",
    order: 3
  },
  {
    id: "feature_4",
    title: "Notification center polish",
    description: "Clearer push status, test actions, and log readability",
    category: "shared",
    area: "UI / Shared",
    phase: "completed",
    impact: "medium",
    order: 4
  },
  {
    id: "feature_5",
    title: "Global toasts + action confirmations",
    description: "Reduce user confusion after mutations",
    category: "shared",
    area: "UI / Shared",
    phase: "completed",
    impact: "medium",
    order: 5
  },
  {
    id: "feature_6",
    title: "Ride timeline component (all roles)",
    description: "Standardized status history and event visibility",
    category: "shared",
    area: "UI / Shared",
    phase: "next",
    impact: "high",
    order: 6
  },
  {
    id: "feature_7",
    title: "Driver onboarding checklist UI",
    description: "Better completion rate for signup and approval readiness",
    category: "driver",
    area: "Driver Ops",
    phase: "next",
    impact: "medium",
    order: 7
  },
  {
    id: "feature_8",
    title: "Admin driver review workflow upgrades",
    description: "Faster approvals, fewer mistakes, clearer audit trail",
    category: "admin",
    area: "Admin Ops",
    phase: "next",
    impact: "high",
    order: 8
  },
  {
    id: "feature_9",
    title: "Dispatch queue prioritization controls",
    description: "Better matching controls during high-volume windows",
    category: "admin",
    area: "Dispatch",
    phase: "next",
    impact: "high",
    order: 9
  },
  {
    id: "feature_10",
    title: "Offer expiration UX + countdown clarity",
    description: "Improve offer response quality and reduce misses",
    category: "driver",
    area: "Dispatch / Driver",
    phase: "completed",
    impact: "high",
    order: 10
  },
  {
    id: "feature_11",
    title: "Scheduled rides operations panel",
    description: "Better handling of future rides and release timing",
    category: "admin",
    area: "Admin / Dispatch",
    phase: "next",
    impact: "medium",
    order: 11
  },
  {
    id: "feature_12",
    title: "Rider cancellation reason capture",
    description: "Better diagnostics for service quality and churn",
    category: "rider",
    area: "Rider / Analytics",
    phase: "next",
    impact: "medium",
    order: 12
  },
  {
    id: "feature_13",
    title: "Driver cancellation reason capture",
    description: "Better supply-side quality insights",
    category: "driver",
    area: "Driver / Analytics",
    phase: "next",
    impact: "medium",
    order: 13
  },
  {
    id: "feature_14",
    title: "Dues collection workflow hardening",
    description: "Cleaner reconciliation and reduced overdue risk",
    category: "admin",
    area: "Admin / Finance",
    phase: "completed",
    impact: "high",
    order: 14
  },
  {
    id: "feature_15",
    title: "Payout instructions UX upgrade",
    description: "Fewer payment support issues",
    category: "driver",
    area: "Admin / Driver",
    phase: "completed",
    impact: "medium",
    order: 15
  },
  {
    id: "feature_16",
    title: "Community moderation queue improvements",
    description: "Keep community quality healthy at scale",
    category: "admin",
    area: "Community / Admin",
    phase: "next",
    impact: "medium",
    order: 16
  },
  {
    id: "feature_17",
    title: "Feature request triage dashboard",
    description: "Faster review of incoming feature requests",
    category: "admin",
    area: "Product / Admin",
    phase: "next",
    impact: "low",
    order: 17
  },
  {
    id: "feature_18",
    title: "Public tracking page v2 layout",
    description: "Clearer status + trust signals during active rides",
    category: "rider",
    area: "Rider / Public",
    phase: "completed",
    impact: "high",
    order: 18
  },
  {
    id: "feature_19",
    title: "Share/referral analytics panel",
    description: "Measure referral and campaign effectiveness",
    category: "admin",
    area: "Growth / Admin",
    phase: "completed",
    impact: "medium",
    order: 19
  },
  {
    id: "feature_20",
    title: "Service-area map editor",
    description: "Better geographic dispatch control",
    category: "admin",
    area: "Driver / Admin",
    phase: "later",
    impact: "medium",
    order: 20
  },
  {
    id: "feature_21",
    title: "Surge/market condition indicators",
    description: "Improved transparency and pricing context",
    category: "rider",
    area: "Pricing / Rider",
    phase: "later",
    impact: "medium",
    order: 21
  },
  {
    id: "feature_22",
    title: "Automated anomaly alerts (ops)",
    description: "Earlier detection of system or dispatch issues",
    category: "admin",
    area: "Reliability / Admin",
    phase: "later",
    impact: "high",
    order: 22
  },
  {
    id: "feature_23",
    title: "Native iOS/Android apps",
    description: "Better mobile UX and retention",
    category: "product",
    area: "Platform",
    phase: "deferred",
    impact: "high",
    order: 23
  },
  {
    id: "feature_24",
    title: "Fully automated payments integration",
    description: "Real-time collection and settlement",
    category: "product",
    area: "Finance",
    phase: "deferred",
    impact: "high",
    order: 24
  },
  {
    id: "feature_25",
    title: "Multi-language localization framework",
    description: "Broader audience support",
    category: "product",
    area: "Platform / UX",
    phase: "deferred",
    impact: "medium",
    order: 25
  },
  {
    id: "feature_26",
    title: "Public roadmap page in app",
    description: "Build community trust, manage expectations, gather feature demand",
    category: "product",
    area: "Product / Growth",
    phase: "completed",
    impact: "medium",
    order: 26
  }
];

/**
 * Filter features by phase(s)
 * Don't expose deferred items publicly
 */
export function getRoadmapFeatures(publicOnly: boolean = true): RoadmapFeature[] {
  let features = ROADMAP_FEATURES;
  
  if (publicOnly) {
    // Hide deferred and later items from public view
    features = features.filter(f => f.phase === "now" || f.phase === "next" || f.phase === "completed");
  }
  
  return features.sort((a, b) => a.order - b.order);
}

/**
 * Get feature by ID
 */
export function getFeatureById(id: string): RoadmapFeature | undefined {
  return ROADMAP_FEATURES.find(f => f.id === id);
}
