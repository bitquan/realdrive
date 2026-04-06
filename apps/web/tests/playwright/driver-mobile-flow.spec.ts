import { expect, request as playwrightRequest, test } from "@playwright/test";
import { driverStoragePath } from "./paths";

type SessionUser = {
  id: string;
  role: "rider" | "driver" | "admin";
  roles: Array<"rider" | "driver" | "admin">;
};

type StoredAuth = {
  token: string;
  user: SessionUser;
};

type DriverOffer = {
  id: string;
};

type DriverRide = {
  id: string;
  status: string;
};

const ADMIN_EMAIL = process.env.PLAYWRIGHT_ADMIN_EMAIL ?? "playwright-admin@realdrive.test";
const ADMIN_PASSWORD = process.env.PLAYWRIGHT_ADMIN_PASSWORD ?? "Playwright123!";
const API_BASE_URL = process.env.PLAYWRIGHT_API_URL ?? "http://127.0.0.1:4005";

async function loginAdmin() {
  const api = await playwrightRequest.newContext({
    baseURL: API_BASE_URL,
    extraHTTPHeaders: {
      "Content-Type": "application/json"
    }
  });

  const response = await api.post("/admin/auth/login", {
    data: {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    }
  });

  if (!response.ok()) {
    throw new Error(`Unable to log in Playwright admin: ${response.status()} ${await response.text()}`);
  }

  const auth = (await response.json()) as StoredAuth;
  return { api, auth };
}

async function resetDriverState(api: Awaited<ReturnType<typeof playwrightRequest.newContext>>, auth: StoredAuth) {
  const availabilityResponse = await api.post("/driver/availability", {
    headers: {
      authorization: `Bearer ${auth.token}`
    },
    data: {
      available: true
    }
  });

  if (!availabilityResponse.ok()) {
    throw new Error(`Unable to set driver availability: ${availabilityResponse.status()} ${await availabilityResponse.text()}`);
  }

  const offersResponse = await api.get("/driver/offers", {
    headers: {
      authorization: `Bearer ${auth.token}`
    }
  });

  if (!offersResponse.ok()) {
    throw new Error(`Unable to load driver offers: ${offersResponse.status()} ${await offersResponse.text()}`);
  }

  const offers = (await offersResponse.json()) as DriverOffer[];
  for (const offer of offers) {
    const declineResponse = await api.post(`/driver/offers/${offer.id}/decline`, {
      headers: {
        authorization: `Bearer ${auth.token}`
      },
      data: {}
    });

    if (!declineResponse.ok()) {
      throw new Error(`Unable to decline stale offer ${offer.id}: ${declineResponse.status()} ${await declineResponse.text()}`);
    }
  }

  const ridesResponse = await api.get("/driver/rides/active", {
    headers: {
      authorization: `Bearer ${auth.token}`
    }
  });

  if (!ridesResponse.ok()) {
    throw new Error(`Unable to load active driver rides: ${ridesResponse.status()} ${await ridesResponse.text()}`);
  }

  const rides = (await ridesResponse.json()) as DriverRide[];
  for (const ride of rides) {
    const closeResponse = await api.patch(`/admin/rides/${ride.id}`, {
      headers: {
        authorization: `Bearer ${auth.token}`
      },
      data: {
        status: "completed"
      }
    });

    if (!closeResponse.ok()) {
      throw new Error(`Unable to complete active ride ${ride.id}: ${closeResponse.status()} ${await closeResponse.text()}`);
    }
  }
}

async function createTargetedRide(api: Awaited<ReturnType<typeof playwrightRequest.newContext>>, auth: StoredAuth) {
  const tag = `${Date.now()}`;
  const pickupAddress = "801 E Main St, Richmond, VA";
  const dropoffAddress = "1001 Haxall Point, Richmond, VA";

  const response = await api.post("/admin/test-rides", {
    headers: {
      authorization: `Bearer ${auth.token}`
    },
    data: {
      riderName: `Playwright Driver Flow ${tag}`,
      pickupAddress,
      dropoffAddress,
      rideType: "standard",
      paymentMethod: "cashapp",
      label: `Driver mobile continuity ${tag}`,
      targetDriverId: auth.user.id
    }
  });

  if (!response.ok()) {
    throw new Error(`Unable to create targeted test ride: ${response.status()} ${await response.text()}`);
  }

  const payload = (await response.json()) as { ride: DriverRide };
  return {
    rideId: payload.ride.id,
    pickupAddress
  };
}

test.describe("driver mobile interactive flow", () => {
  test.use({
    storageState: driverStoragePath,
    viewport: { width: 390, height: 844 }
  });

  test("accepts a mobile live offer and continues the trip flow", async ({ page }) => {
    const { api, auth } = await loginAdmin();

    try {
      await resetDriverState(api, auth);
      const { rideId, pickupAddress } = await createTargetedRide(api, auth);

      await page.goto("/driver", { waitUntil: "domcontentloaded" });
      await expect(page.getByText("Driver work surface")).toBeVisible();
      await expect(page.getByText(pickupAddress).first()).toBeVisible();

      await page.getByRole("button", { name: "Accept Ride" }).click();

      await expect(page).toHaveURL(new RegExp(`/driver/rides/${rideId}$`));
      await expect(page.getByText("Trip cockpit").first()).toBeVisible();
      await expect(page.getByRole("button", { name: "Mark as Arriving" })).toBeVisible();

      await page.getByRole("button", { name: "Mark as Arriving" }).click();
      await expect(page.getByRole("button", { name: "Mark as At pickup" })).toBeVisible();
    } finally {
      await api.dispose();
    }
  });
});