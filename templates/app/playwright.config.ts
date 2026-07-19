import { defineConfig, devices } from "@playwright/test";

/**
 * The sweep harness.
 *
 * These aren't feature tests — they're a systematic pass over every surface for
 * the defect classes that static analysis CANNOT see: layout shear from long
 * strings, missing validation, unreachable routes, states that only appear on a
 * slow network. `tsc` and ESLint will never catch a table that widens past its
 * container; a browser will.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",

  use: {
    baseURL: process.env.SWEEP_BASE_URL ?? "http://localhost:3100",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    // Narrow viewport catches actions stranded off-screen and horizontal
    // overflow that a wide desktop window hides. Pixel 5 rather than an iPhone
    // so the sweep runs on Chromium alone — no second browser to download in CI.
    { name: "mobile", use: { ...devices["Pixel 5"] } },
  ],

  webServer: {
    command: "npm run dev -- -p 3100",
    url: "http://localhost:3100/login",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
