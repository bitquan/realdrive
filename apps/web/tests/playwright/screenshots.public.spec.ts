import { expect, test } from "@playwright/test";

type ScreenConfig = {
  name: string;
  route: string;
  readySelector: string;
};

const publicScreens: ScreenConfig[] = [
  {
    name: "home",
    route: "/",
    readySelector: "#riderName"
  },
  {
    name: "advertise",
    route: "/advertise",
    readySelector: "#businessName"
  },
  {
    name: "driver-login",
    route: "/driver/login",
    readySelector: "#driverEmail"
  },
  {
    name: "admin-login",
    route: "/admin/login",
    readySelector: "#adminEmail"
  },
  {
    name: "tablet-login",
    route: "/tablet/ads/login",
    readySelector: "#tabletDriverEmail"
  }
];

for (const screen of publicScreens) {
  test(`public screenshot: ${screen.name}`, async ({ page }, testInfo) => {
    await page.goto(screen.route, { waitUntil: "domcontentloaded" });
    await expect.poll(() => new URL(page.url()).pathname).toBe(screen.route);
    await expect(page.locator(screen.readySelector)).toBeVisible();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(300);

    await page.screenshot({
      path: testInfo.outputPath(`${screen.name}.png`),
      fullPage: true
    });
  });
}
