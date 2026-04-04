import type { AddressSuggestion } from "@shared/contracts";
import type { MapsService, RouteEstimate } from "./types.js";

const DEFAULT_CENTER = {
  lat: 33.749,
  lng: -84.388
};

const US_STATE_CODES = new Set([
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
  "DC"
]);

function hashString(input: string): number {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function calculateDistanceMiles(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadiusMiles = 3958.8;
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const haversine =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * earthRadiusMiles * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function fallbackCoordinate(seed: string, axis: "lat" | "lng"): number {
  const hash = hashString(`${seed}:${axis}`);
  const normalized = (hash % 1000) / 1000;
  const offset = (normalized - 0.5) * 0.2;
  return Number(((axis === "lat" ? DEFAULT_CENTER.lat : DEFAULT_CENTER.lng) + offset).toFixed(6));
}

function normalizeStateCode(value?: string | null) {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toUpperCase();
  return US_STATE_CODES.has(normalized) ? normalized : null;
}

function extractStateCodeFromText(address: string) {
  const exactCodeMatch = address.match(/\b([A-Z]{2})\b/g);
  if (exactCodeMatch) {
    for (const match of exactCodeMatch) {
      const normalized = normalizeStateCode(match);
      if (normalized) {
        return normalized;
      }
    }
  }

  return null;
}

async function mapboxGeocode(token: string, address: string) {
  const url = new URL(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json`
  );
  url.searchParams.set("access_token", token);
  url.searchParams.set("limit", "1");
  url.searchParams.set("country", "us");

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Mapbox geocoding failed with ${response.status}`);
  }

  const payload = (await response.json()) as {
    features?: Array<{
      center: [number, number];
      id: string;
      place_name: string;
      properties?: {
        short_code?: string;
      };
      context?: Array<{
        id: string;
        short_code?: string;
        text?: string;
      }>;
    }>;
  };

  const feature = payload.features?.[0];
  if (!feature) {
    throw new Error("Mapbox returned no geocoding matches");
  }

  const regionContext = feature.context?.find((entry) => entry.id.startsWith("region"));
  const shortCode = regionContext?.short_code ?? feature.properties?.short_code ?? null;
  const stateCode = normalizeStateCode(shortCode?.split("-").at(-1) ?? extractStateCodeFromText(feature.place_name));

  return {
    lat: feature.center[1],
    lng: feature.center[0],
    placeId: feature.id,
    displayName: feature.place_name,
    stateCode
  };
}

async function mapboxAutocomplete(token: string, query: string): Promise<AddressSuggestion[]> {
  const url = new URL(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`
  );
  url.searchParams.set("access_token", token);
  url.searchParams.set("autocomplete", "true");
  url.searchParams.set("limit", "6");
  url.searchParams.set("country", "us");
  url.searchParams.set("types", "address,place,poi");

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Mapbox autocomplete failed with ${response.status}`);
  }

  const payload = (await response.json()) as {
    features?: Array<{
      id: string;
      place_name: string;
      properties?: {
        short_code?: string;
      };
      context?: Array<{
        id: string;
        short_code?: string;
      }>;
    }>;
  };

  return (payload.features ?? []).map((feature) => {
    const regionContext = feature.context?.find((entry) => entry.id.startsWith("region"));
    const shortCode = regionContext?.short_code ?? feature.properties?.short_code ?? null;
    const stateCode = normalizeStateCode(shortCode?.split("-").at(-1) ?? extractStateCodeFromText(feature.place_name));

    return {
      id: feature.id,
      address: feature.place_name,
      placeId: feature.id,
      stateCode
    } satisfies AddressSuggestion;
  });
}

async function mapboxDirections(
  token: string,
  pickup: { lat: number; lng: number },
  dropoff: { lat: number; lng: number }
) {
  const coordinates = `${pickup.lng},${pickup.lat};${dropoff.lng},${dropoff.lat}`;
  const url = new URL(`https://api.mapbox.com/directions/v5/mapbox/driving/${coordinates}`);
  url.searchParams.set("access_token", token);
  url.searchParams.set("overview", "full");
  url.searchParams.set("geometries", "geojson");

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Mapbox directions failed with ${response.status}`);
  }

  const payload = (await response.json()) as {
    routes?: Array<{
      distance: number;
      duration: number;
    }>;
  };

  const route = payload.routes?.[0];
  if (!route) {
    throw new Error("Mapbox returned no route");
  }

  return {
    distanceMiles: Number((route.distance / 1609.344).toFixed(2)),
    durationMinutes: Math.max(5, Math.round(route.duration / 60))
  };
}

function fallbackRoute(pickupAddress: string, dropoffAddress: string): RouteEstimate {
  const pickup = {
    address: pickupAddress,
    displayName: pickupAddress,
    lat: fallbackCoordinate(pickupAddress, "lat"),
    lng: fallbackCoordinate(pickupAddress, "lng"),
    stateCode: extractStateCodeFromText(pickupAddress)
  };
  const dropoff = {
    address: dropoffAddress,
    displayName: dropoffAddress,
    lat: fallbackCoordinate(dropoffAddress, "lat"),
    lng: fallbackCoordinate(dropoffAddress, "lng"),
    stateCode: extractStateCodeFromText(dropoffAddress)
  };
  const directMiles = calculateDistanceMiles(pickup, dropoff);
  const distanceMiles = Number(Math.max(1.2, directMiles * 1.28).toFixed(2));
  const durationMinutes = Math.max(6, Math.round((distanceMiles / 22) * 60));

  return {
    pickup,
    dropoff,
    distanceMiles,
    durationMinutes,
    provider: "fallback"
  };
}

export function createMapsService(token: string): MapsService {
  return {
    async autocompleteAddress(query) {
      const normalized = query.trim();
      if (normalized.length < 3 || !token) {
        return [];
      }

      try {
        return await mapboxAutocomplete(token, normalized);
      } catch {
        return [];
      }
    },

    async estimateRoute(pickupAddress, dropoffAddress) {
      if (!token) {
        return fallbackRoute(pickupAddress, dropoffAddress);
      }

      try {
        const [pickup, dropoff] = await Promise.all([
          mapboxGeocode(token, pickupAddress),
          mapboxGeocode(token, dropoffAddress)
        ]);
        const directions = await mapboxDirections(token, pickup, dropoff);

        return {
          pickup: {
            address: pickupAddress,
            lat: pickup.lat,
            lng: pickup.lng,
            placeId: pickup.placeId,
            displayName: pickup.displayName,
            stateCode: pickup.stateCode
          },
          dropoff: {
            address: dropoffAddress,
            lat: dropoff.lat,
            lng: dropoff.lng,
            placeId: dropoff.placeId,
            displayName: dropoff.displayName,
            stateCode: dropoff.stateCode
          },
          distanceMiles: directions.distanceMiles,
          durationMinutes: directions.durationMinutes,
          provider: "mapbox"
        };
      } catch {
        return fallbackRoute(pickupAddress, dropoffAddress);
      }
    }
  };
}
