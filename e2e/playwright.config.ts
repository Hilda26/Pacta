import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.APP_URL ?? "http://localhost:3000";
const localWebServer = process.env.APP_URL
  ? {}
  : {
      webServer: {
        command: "pnpm --dir ../frontend dev",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000
      }
    };

export default defineConfig({
  testDir: "./tests",
  retries: process.env.CI ? 2 : 0,
  ...localWebServer,
  use: {
    baseURL,
    trace: "on-first-retry"
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } }
  ]
});
