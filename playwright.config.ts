import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: process.env.BASE_URL || "http://localhost:19006",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    reducedMotion: "reduce",
  },

  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 2,
        reducedMotion: "reduce",
      },
    },
  ],

  webServer: process.env.CI
    ? {
        command: "npx expo start --web --port 19006",
        port: 19006,
        timeout: 120 * 1000,
        reuseExistingServer: !process.env.CI,
        env: {
          EXPO_PUBLIC_DEV_MOCK_SESSION: "true",
        },
      }
    : undefined,
});
