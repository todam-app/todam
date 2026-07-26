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
    env: {
      ...process.env,
      EXPO_PUBLIC_LEGAL_OPERATOR_NAME: "Nom éditeur test",
      EXPO_PUBLIC_PRIMARY_HOST_PHONE: "numéro contractuel test",
    },
    reuseExistingServer: true,
    timeout: 120_000,
    url: "http://localhost:8081",
  },
});
