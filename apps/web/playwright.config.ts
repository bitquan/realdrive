import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(currentDir, "../..");
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:4173";
const apiURL = process.env.PLAYWRIGHT_API_URL ?? "http://127.0.0.1:4005";
const reuseExistingServer = process.env.PLAYWRIGHT_REUSE_SERVER === "true";

export default defineConfig({
  testDir: "./tests/playwright",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 60_000,
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "playwright-report" }]
  ],
  outputDir: "test-results",
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    viewport: { width: 1440, height: 1200 }
  },
  globalSetup: "./tests/playwright/global-setup.ts",
  webServer: [
    {
      command: "pnpm --filter @realdrive/api dev",
      cwd: repoRoot,
      url: `${apiURL}/health`,
      reuseExistingServer,
      stdout: "pipe",
      stderr: "pipe",
      env: {
        ...process.env,
        PORT: "4005",
        CLIENT_ORIGIN: baseURL,
        PUBLIC_BASE_URL: baseURL
      }
    },
    {
      command: "pnpm --filter @realdrive/web exec vite --host 127.0.0.1 --port 4173",
      cwd: repoRoot,
      url: baseURL,
      reuseExistingServer,
      stdout: "pipe",
      stderr: "pipe",
      env: {
        ...process.env,
        VITE_API_URL: apiURL,
        VITE_MAPBOX_TOKEN: process.env.VITE_MAPBOX_TOKEN ?? ""
      }
    }
  ],
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"]
      }
    }
  ]
});
