import { defineConfig, devices } from "@playwright/test";

/**
 * E2E tests against the build, served by the mock qBittorrent the way qBittorrent serves an
 * alternative WebUI (dev/mock-server.ts --static). Tests tagged @phone run on a phone.
 * `bun run screenshots` (SCREENSHOTS=1) writes the pictures in docs/screenshots/.
 */
const port = Number(process.env.MOCK_PORT ?? 8899);
const screenshots = !!process.env.SCREENSHOTS;

export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  // One mock qBittorrent with shared state: the tests reset it and run one after another
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL: `http://localhost:${port}/`,
    locale: "de-DE",
    timezoneId: "Europe/Berlin",
    trace: "off",
  },
  projects: screenshots
    ? [{ name: "screenshots", testMatch: /screenshots\.spec\.ts/ }]
    : [
        {
          name: "desktop",
          testIgnore: /screenshots\.spec\.ts/,
          grepInvert: /@phone/,
          use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
        },
        {
          name: "phone",
          testIgnore: /screenshots\.spec\.ts/,
          grep: /@phone/,
          use: { ...devices["Pixel 7"] },
        },
      ],
  webServer: {
    command: `bun run build && bun dev/mock-server.ts --static dist/public`,
    url: `http://localhost:${port}/api/v2/app/version`,
    env: { MOCK_PORT: String(port), MOCK_FROZEN: "1" },
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
