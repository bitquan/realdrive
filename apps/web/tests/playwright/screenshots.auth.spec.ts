import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { adminStoragePath, driverStoragePath } from "./paths";

type ScreenConfig = {
  name: string;
  route: string;
  readySelector: string;
  open?: (page: Page) => Promise<void>;
};

async function captureScreen(
  screen: ScreenConfig,
  name: string,
  page: Page,
  testInfo: TestInfo
) {
  if (screen.open) {
    await screen.open(page);
  } else {
    await page.goto(screen.route, { waitUntil: "domcontentloaded" });
  }

  await expect.poll(() => new URL(page.url()).pathname).toBe(screen.route);
  await expect(page.locator(screen.readySelector)).toBeVisible();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(400);
  await page.screenshot({
    path: testInfo.outputPath(`${name}.png`),
    fullPage: true
  });
}

const adminScreens: ScreenConfig[] = [
  {
    name: "request-feature",
    route: "/request-feature",
    readySelector: "#featureSummary",
    open: async (page) => {
      await page.goto("/admin", { waitUntil: "domcontentloaded" });
      await expect(page.locator("text=Action queues")).toBeVisible();
      await page.getByRole("link", { name: "Request feature" }).first().click();
    }
  },
  {
    name: "report-bug",
    route: "/report-bug",
    readySelector: "#bugSummary",
    open: async (page) => {
      await page.goto("/admin", { waitUntil: "domcontentloaded" });
      await expect(page.locator("text=Action queues")).toBeVisible();
      await page.getByRole("link", { name: "Report bug" }).first().click();
    }
  },
  {
    name: "admin-dashboard",
    route: "/admin",
    readySelector: "text=Action queues"
  }
];

const driverScreens: ScreenConfig[] = [
  {
    name: "driver-dashboard",
    route: "/driver",
    readySelector: "text=Driver cockpit"
  }
];

test.describe("authenticated screenshots: admin", () => {
  test.use({ storageState: adminStoragePath });

  for (const screen of adminScreens) {
    test(screen.name, async ({ page }, testInfo) => {
      await captureScreen(screen, screen.name, page, testInfo);
    });
  }
});

test.describe("authenticated screenshots: driver", () => {
  test.use({ storageState: driverStoragePath });

  for (const screen of driverScreens) {
    test(screen.name, async ({ page }, testInfo) => {
      await captureScreen(screen, screen.name, page, testInfo);
    });
  }
});
