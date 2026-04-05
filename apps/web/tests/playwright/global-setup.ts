import fs from "node:fs/promises";
import { request, type FullConfig } from "@playwright/test";
import { adminStoragePath, authDir, driverStoragePath } from "./paths";

type SessionUser = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: "rider" | "driver" | "admin";
  roles: Array<"rider" | "driver" | "admin">;
  approvalStatus?: "pending" | "approved" | "rejected";
};

type StoredAuth = {
  token: string;
  user: SessionUser;
};

const ADMIN_EMAIL = process.env.PLAYWRIGHT_ADMIN_EMAIL ?? "playwright-admin@realdrive.test";
const ADMIN_PASSWORD = process.env.PLAYWRIGHT_ADMIN_PASSWORD ?? "Playwright123!";
const ADMIN_NAME = process.env.PLAYWRIGHT_ADMIN_NAME ?? "Playwright Admin";

function buildStorageState(origin: string, auth: StoredAuth) {
  return {
    cookies: [],
    origins: [
      {
        origin,
        localStorage: [
          {
            name: "realdrive.auth",
            value: JSON.stringify(auth)
          }
        ]
      }
    ]
  };
}

async function ensureAdminAuth(apiBaseURL: string) {
  const api = await request.newContext({
    baseURL: apiBaseURL,
    extraHTTPHeaders: {
      "Content-Type": "application/json"
    }
  });

  try {
    const statusResponse = await api.get("/admin/setup/status");
    if (!statusResponse.ok()) {
      throw new Error(`Unable to read admin setup status: ${statusResponse.status()}`);
    }

    const status = (await statusResponse.json()) as { needsSetup: boolean };

    if (status.needsSetup) {
      const setupResponse = await api.post("/admin/setup", {
        data: {
          name: ADMIN_NAME,
          email: ADMIN_EMAIL,
          password: ADMIN_PASSWORD,
          createDriverProfile: true,
          driverProfile: {
            phone: "+15555550101",
            homeState: "VA",
            homeCity: "Richmond",
            vehicle: {
              makeModel: "2024 Toyota Camry",
              plate: "PW-1001",
              color: "Black",
              rideType: "standard",
              seats: 4
            }
          }
        }
      });

      if (!setupResponse.ok()) {
        const message = await setupResponse.text();
        throw new Error(`Unable to create Playwright admin account: ${message}`);
      }

      return (await setupResponse.json()) as StoredAuth;
    }

    const loginResponse = await api.post("/admin/auth/login", {
      data: {
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD
      }
    });

    if (!loginResponse.ok()) {
      throw new Error(
        "Playwright could not log in with the configured admin credentials. Set PLAYWRIGHT_ADMIN_EMAIL and PLAYWRIGHT_ADMIN_PASSWORD to an existing admin account, or reset the local database so the test admin can be created."
      );
    }

    return (await loginResponse.json()) as StoredAuth;
  } finally {
    await api.dispose();
  }
}

export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use?.baseURL;
  if (!baseURL || typeof baseURL !== "string") {
    throw new Error("Playwright baseURL is required for screenshot auth setup.");
  }

  const apiBaseURL = process.env.PLAYWRIGHT_API_URL ?? "http://127.0.0.1:4005";
  const auth = await ensureAdminAuth(apiBaseURL);

  if (!auth.user.roles.includes("driver")) {
    throw new Error("The Playwright admin account must also have an approved driver role for dashboard screenshots.");
  }

  await fs.mkdir(authDir, { recursive: true });

  const adminState = buildStorageState(baseURL, auth);
  const driverState = buildStorageState(baseURL, {
    ...auth,
    user: {
      ...auth.user,
      role: "driver"
    }
  });

  await fs.writeFile(adminStoragePath, JSON.stringify(adminState, null, 2));
  await fs.writeFile(driverStoragePath, JSON.stringify(driverState, null, 2));
}
