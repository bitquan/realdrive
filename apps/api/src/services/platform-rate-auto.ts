import type { RideType } from "@shared/contracts";

export interface FeedRateRule {
  marketKey: string;
  rideType: RideType;
  baseFare: number;
  perMile: number;
  perMinute: number;
  multiplier: number;
}

const RIDE_TYPES: RideType[] = ["standard", "suv", "xl"];

function asNumber(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return Number(parsed.toFixed(2));
}

function normalizeRideType(value: unknown): RideType | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.toLowerCase();
  if (!RIDE_TYPES.includes(normalized as RideType)) {
    return null;
  }

  return normalized as RideType;
}

function normalizeMarketKey(value: unknown): string {
  if (typeof value !== "string") {
    return "DEFAULT";
  }

  return value.trim().toUpperCase() || "DEFAULT";
}

function isRateObject(value: unknown): value is {
  baseFare?: unknown;
  perMile?: unknown;
  perMinute?: unknown;
  multiplier?: unknown;
} {
  return typeof value === "object" && value !== null;
}

function toFeedRule(raw: {
  marketKey?: unknown;
  rideType?: unknown;
  baseFare?: unknown;
  perMile?: unknown;
  perMinute?: unknown;
  multiplier?: unknown;
}): FeedRateRule | null {
  const rideType = normalizeRideType(raw.rideType);
  if (!rideType) {
    return null;
  }

  const baseFare = asNumber(raw.baseFare);
  const perMile = asNumber(raw.perMile);
  const perMinute = asNumber(raw.perMinute);
  const multiplier = asNumber(raw.multiplier);

  if (baseFare == null || perMile == null || perMinute == null || multiplier == null) {
    return null;
  }

  return {
    marketKey: normalizeMarketKey(raw.marketKey),
    rideType,
    baseFare,
    perMile,
    perMinute,
    multiplier
  };
}

export function parseBenchmarkFeed(payload: unknown): FeedRateRule[] {
  const collected: FeedRateRule[] = [];

  if (Array.isArray(payload)) {
    for (const item of payload) {
      if (!isRateObject(item)) {
        continue;
      }

      const next = toFeedRule(item as Record<string, unknown>);
      if (next) {
        collected.push(next);
      }
    }

    return collected;
  }

  if (isRateObject(payload) && Array.isArray((payload as { rules?: unknown }).rules)) {
    return parseBenchmarkFeed((payload as { rules: unknown[] }).rules);
  }

  if (isRateObject(payload) && isRateObject((payload as { markets?: unknown }).markets)) {
    const markets = (payload as { markets: Record<string, unknown> }).markets;

    for (const [marketKey, marketValue] of Object.entries(markets)) {
      if (!isRateObject(marketValue)) {
        continue;
      }

      for (const rideType of RIDE_TYPES) {
        const rateCandidate = (marketValue as Record<string, unknown>)[rideType];
        if (!isRateObject(rateCandidate)) {
          continue;
        }

        const next = toFeedRule({
          marketKey,
          rideType,
          ...(rateCandidate as Record<string, unknown>)
        });

        if (next) {
          collected.push(next);
        }
      }
    }
  }

  return collected;
}

export function buildUndercutRules(
  uberRules: FeedRateRule[],
  lyftRules: FeedRateRule[],
  undercutAmount: number
): FeedRateRule[] {
  const keyed = new Map<string, { uber?: FeedRateRule; lyft?: FeedRateRule }>();

  for (const rule of uberRules) {
    const key = `${rule.marketKey}:${rule.rideType}`;
    keyed.set(key, {
      ...(keyed.get(key) ?? {}),
      uber: rule
    });
  }

  for (const rule of lyftRules) {
    const key = `${rule.marketKey}:${rule.rideType}`;
    keyed.set(key, {
      ...(keyed.get(key) ?? {}),
      lyft: rule
    });
  }

  const result: FeedRateRule[] = [];

  for (const [key, source] of keyed.entries()) {
    const [marketKey, rideTypeRaw] = key.split(":");
    const rideType = normalizeRideType(rideTypeRaw);
    if (!rideType) {
      continue;
    }

    const baseCandidates = [source.uber?.baseFare, source.lyft?.baseFare].filter((value): value is number => value != null);
    const perMileCandidates = [source.uber?.perMile, source.lyft?.perMile].filter((value): value is number => value != null);
    const perMinuteCandidates = [source.uber?.perMinute, source.lyft?.perMinute].filter((value): value is number => value != null);
    const multiplierCandidates = [source.uber?.multiplier, source.lyft?.multiplier].filter((value): value is number => value != null);

    if (!baseCandidates.length || !perMileCandidates.length || !perMinuteCandidates.length || !multiplierCandidates.length) {
      continue;
    }

    result.push({
      marketKey,
      rideType,
      baseFare: Math.max(0, Number((Math.min(...baseCandidates) - undercutAmount).toFixed(2))),
      perMile: Math.max(0, Number((Math.min(...perMileCandidates) - undercutAmount).toFixed(2))),
      perMinute: Math.max(0, Number((Math.min(...perMinuteCandidates) - undercutAmount).toFixed(2))),
      multiplier: Number(Math.min(...multiplierCandidates).toFixed(2))
    });
  }

  return result.sort((a, b) => {
    if (a.marketKey !== b.marketKey) {
      return a.marketKey.localeCompare(b.marketKey);
    }

    return a.rideType.localeCompare(b.rideType);
  });
}

export async function fetchFeed(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      headers: {
        Accept: "application/json"
      }
    });

    if (!response.ok) {
      throw new Error(`Feed request failed (${response.status})`);
    }

    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}
