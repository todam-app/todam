import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  use: {
    baseURL: "http://localhost:8081",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "pnpm dev",
    reuseExistingServer: true,
    timeout: 120_000,
    url: "http://localhost:8081",
  },
});
